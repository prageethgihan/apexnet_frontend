// =============================================================================
// ApexNet LK — Express Backend  (server/index.js)
// Handles all 3x-ui VPN panel API calls server-side.
// Panel credentials NEVER leave this file.
//
// ── ⚠  Sri Lankan IP warning ────────────────────────────────────────────────
// Do NOT run this backend on a Sri Lankan IP address.  Dialog / SLT / Mobitel
// actively block port-443 and VPN-related traffic, and there are legal grey
// areas around commercial VPN reselling under the Sri Lankan telecoms act.
// Your current foreign VPS (95.181.160.194) with a Cloudflare Tunnel is the
// correct and recommended setup — keep everything there.
// =============================================================================

'use strict'

const express  = require('express')
const axios    = require('axios')
const cors     = require('cors')
const https    = require('https')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

// ─── Validate required env vars ───────────────────────────────────────────────
const REQUIRED_ENV = [
  'PANEL_URL', 'PANEL_USERNAME', 'PANEL_PASSWORD',
  'INBOUND_ID', 'INBOUND_PORT', 'SERVER_IP',
]
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[ApexNet] FATAL: Missing required env var: ${key}`)
    process.exit(1)
  }
}

const {
  PANEL_URL,
  PANEL_USERNAME,
  PANEL_PASSWORD,
  INBOUND_ID,
  INBOUND_PORT,
  SERVER_IP,
  PORT        = 5000,
  CORS_ORIGIN = 'http://localhost:5173',
} = process.env

const PANEL_BASE = PANEL_URL.replace(/\/$/, '') // strip trailing slash

// ─── Pricing Plans ────────────────────────────────────────────────────────────
// planId must exactly match what the frontend sends in the `plan` field.
const PLANS = {
  standard: {
    name:        'Standard',
    priceLKR:    399,
    dataLimitGB: 150,   // 150 GB cap
    deviceLimit: 2,     // limitIp in 3x-ui
    expiryDays:  30,
  },
  vip: {
    name:        'VIP',
    priceLKR:    699,
    dataLimitGB: 300,   // 300 GB cap
    deviceLimit: 5,
    expiryDays:  30,
  },
  mvp: {
    name:        'MVP',
    priceLKR:    949,
    dataLimitGB: 0,     // 0 = unlimited in 3x-ui
    deviceLimit: 8,
    expiryDays:  30,
  },
}

// ─── ISP Package → SNI (Bug Host) mapping ────────────────────────────────────
// Keys must exactly match `selectedPackage` sent by the frontend.
const SNI_MAP = {
  'Dialog Router Zoom 724':   'zoom.us',
  'Dialog Mobile TikTok 997': 'v.tiktok.com',
  'SLT Netflix':              'netflix.com',
  'Mobitel Zoom':             'zoom.us',
  'Airtel Unlimited':         'zoom.us',
}

// ─── Axios instance for 3x-ui panel ──────────────────────────────────────────
// We persist the session cookie so we only need to log in once per run.
let sessionCookie = ''

const panelClient = axios.create({
  baseURL:  PANEL_BASE,
  timeout:  20_000,
  // Allow self-signed certs (3x-ui defaults to self-signed HTTPS)
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
})

// Attach cached cookie on every outgoing request
panelClient.interceptors.request.use((config) => {
  if (sessionCookie) config.headers['Cookie'] = sessionCookie
  return config
})

// Capture and cache Set-Cookie from every response
panelClient.interceptors.response.use((response) => {
  const setCookie = response.headers['set-cookie']
  if (setCookie) {
    sessionCookie = setCookie.map((c) => c.split(';')[0]).join('; ')
  }
  return response
})

// ─── Authenticate with panel ──────────────────────────────────────────────────
async function authenticate () {
  const res = await panelClient.post('/login', {
    username: PANEL_USERNAME,
    password: PANEL_PASSWORD,
  })
  if (!res.data?.success) {
    throw new Error(`Panel login failed: ${JSON.stringify(res.data)}`)
  }
  console.log('[ApexNet] ✓ Authenticated with 3x-ui panel.')
}

// ─── Authenticated panel call with auto-retry on 401/403 ─────────────────────
async function panelCall (method, path, data) {
  try {
    return await panelClient.request({ method, url: path, data })
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.warn('[ApexNet] Session expired — re-authenticating…')
      await authenticate()
      return panelClient.request({ method, url: path, data })
    }
    throw err
  }
}

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express()

// Support multiple CORS origins (comma-separated in CORS_ORIGIN env var)
const allowedOrigins = CORS_ORIGIN.split(',').map((o) => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin "${origin}" not allowed`))
  },
  methods:        ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}))

app.use(express.json())

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'ApexNet LK Backend',
    timestamp: new Date().toISOString(),
    plans:     Object.keys(PLANS),
  })
})

// ─── GET /api/vpn/plans  — expose plan list to frontend ──────────────────────
app.get('/api/vpn/plans', (_req, res) => {
  res.json({
    success: true,
    plans:   Object.entries(PLANS).map(([id, p]) => ({ id, ...p })),
  })
})

// =============================================================================
// POST /api/vpn/create
// =============================================================================
// Request body:
//   customerName    : string  — e.g. "Kamal Perera"
//   selectedPackage : string  — one of SNI_MAP keys  e.g. "Dialog Router Zoom 724"
//   plan            : string  — "standard" | "vip" | "mvp"
//
// Response (success):
//   { success, vlessUrl, clientId, remark, sni,
//     plan: { id, name, priceLKR, dataLimitGB, deviceLimit, expiryDays },
//     dataLimitLabel, expiryDate }
// =============================================================================
app.post('/api/vpn/create', async (req, res) => {
  try {
    // Accept both `plan` and `selectedPlan` field names (frontend may send either)
    const { customerName, selectedPackage, plan: planField, selectedPlan } = req.body
    const planId = planField ?? selectedPlan

    // ── 1. Validate ───────────────────────────────────────────────────────
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return res.status(400).json({ error: 'customerName is required.' })
    }

    if (!selectedPackage || !SNI_MAP[selectedPackage]) {
      return res.status(400).json({
        error: `Invalid selectedPackage. Valid options: ${Object.keys(SNI_MAP).join(', ')}`,
      })
    }

    const plan = PLANS[String(planId).toLowerCase()]
    if (!plan) {
      return res.status(400).json({
        error: `Invalid plan. Valid options: ${Object.keys(PLANS).join(', ')}`,
      })
    }

    const name = customerName.trim()
    const sni  = SNI_MAP[selectedPackage]

    // ── 2. Compute data cap (bytes) + expiry ──────────────────────────────
    // 3x-ui stores traffic limits in bytes; 0 means unlimited.
    const totalBytes = plan.dataLimitGB === 0
      ? 0
      : plan.dataLimitGB * 1024 * 1024 * 1024

    const expiryMs   = Date.now() + plan.expiryDays * 24 * 60 * 60 * 1000
    const expiryDate = new Date(expiryMs).toISOString().split('T')[0]
    const dataLimitLabel = plan.dataLimitGB === 0 ? 'Unlimited' : `${plan.dataLimitGB} GB`

    // ── 3. Build unique remark / email ───────────────────────────────────
    const rand4    = Math.floor(1000 + Math.random() * 9000)
    const safeName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const remark   = `${safeName}_${rand4}`
    const email    = remark.toLowerCase() // 3x-ui uses "email" as the unique client key

    // ── 4. Generate UUID ─────────────────────────────────────────────────
    const clientId = uuidv4()

    // ── 5. Authenticate with 3x-ui ───────────────────────────────────────
    await authenticate()

    // ── 6. Add client via /panel/api/inbounds/addClient ───────────────────
    // `limitIp` = concurrent device limit (0 = no limit, but we set plan limit)
    const clientSettings = {
      clients: [
        {
          id:         clientId,
          alterId:    0,
          email,
          limitIp:    plan.deviceLimit,
          totalGB:    totalBytes,
          expiryTime: expiryMs,
          enable:     true,
          tgId:       '',
          subId:      '',
          comment:    `${name} | ${selectedPackage} | ${plan.name} | ${dataLimitLabel}`,
        },
      ],
    }

    console.log(
      `[ApexNet] → Adding "${email}" | inbound #${INBOUND_ID}` +
      ` | ${plan.name} | ${dataLimitLabel} | ${plan.deviceLimit} devices | exp ${expiryDate}`
    )

    const panelRes = await panelCall('post', '/panel/api/inbounds/addClient', {
      id:       Number(INBOUND_ID),
      settings: JSON.stringify(clientSettings),
    })

    if (!panelRes.data?.success) {
      console.error('[ApexNet] addClient failed:', panelRes.data)
      throw new Error(panelRes.data?.msg || 'Panel rejected the client creation request.')
    }

    // ── 7. Build VLESS URL (TCP, no TLS, SNI injection for NetMod) ────────
    // Format that works with NetMod Senza on Sri Lankan ISPs:
    //   vless://UUID@SERVER_IP:PORT?type=tcp&security=none&sni=SNI_HOST#Remark
    const urlRemark = encodeURIComponent(`ApexNet - ${name} - ${plan.name}`)
    const vlessUrl =
      `vless://${clientId}@${SERVER_IP}:${INBOUND_PORT}` +
      `?type=tcp` +
      `&security=none` +
      `&sni=${sni}` +
      `&host=${sni}` +
      `&encryption=none` +
      `#${urlRemark}`

    // ── 8. Respond ────────────────────────────────────────────────────────
    return res.json({
      success: true,
      vlessUrl,
      clientId,
      remark,
      sni,
      plan: {
        id:          String(planId).toLowerCase(),
        name:        plan.name,
        priceLKR:    plan.priceLKR,
        dataLimitGB: plan.dataLimitGB,
        deviceLimit: plan.deviceLimit,
        expiryDays:  plan.expiryDays,
      },
      dataLimitLabel,
      expiryDate,
    })
  } catch (err) {
    console.error('[ApexNet] /api/vpn/create error:', err.message)
    return res.status(500).json({
      error: err.message || 'Internal server error while creating VPN account.',
    })
  }
})

// =============================================================================
// GET /api/vpn/stats
// =============================================================================
app.get('/api/vpn/stats', async (_req, res) => {
  try {
    await authenticate()

    const inboundsRes = await panelCall('get', '/panel/api/inbounds/list')
    if (!inboundsRes.data?.success) {
      throw new Error('Panel returned an error fetching inbound list.')
    }

    const inbounds = inboundsRes.data.obj || []
    let totalCustomers = 0, activeSessions = 0
    let totalUploadBytes = 0, totalDownloadBytes = 0

    for (const inbound of inbounds) {
      const clientStats = inbound.clientStats || []
      totalCustomers += clientStats.length
      for (const client of clientStats) {
        const expired = client.expiryTime > 0 && client.expiryTime < Date.now()
        if (client.enable && !expired) activeSessions++
        totalUploadBytes   += client.up   || 0
        totalDownloadBytes += client.down || 0
      }
    }

    const toGB = (b) => (b / 1024 ** 3).toFixed(2)

    return res.json({
      success: true,
      stats: {
        totalCustomers,
        activeSessions,
        totalServerUsageGB: toGB(totalUploadBytes + totalDownloadBytes),
        uploadGB:           toGB(totalUploadBytes),
        downloadGB:         toGB(totalDownloadBytes),
        inboundCount:       inbounds.length,
        fetchedAt:          new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[ApexNet] /api/vpn/stats error:', err.message)
    return res.status(500).json({
      error: err.message || 'Internal server error while fetching VPN stats.',
    })
  }
})

// =============================================================================
// Start server
// =============================================================================
app.listen(PORT, () => {
  const pad = (s, n) => String(s).substring(0, n).padEnd(n)
  console.log(`
╔══════════════════════════════════════════════════════════╗
║            ApexNet LK — Backend Server                   ║
╠══════════════════════════════════════════════════════════╣
║  Port      →  ${pad(PORT,      40)} ║
║  Panel     →  ${pad(PANEL_BASE,40)} ║
║  Server IP →  ${pad(SERVER_IP, 40)} ║
║  CORS      →  ${pad(CORS_ORIGIN,40)} ║
╚══════════════════════════════════════════════════════════╝
  `)
})
