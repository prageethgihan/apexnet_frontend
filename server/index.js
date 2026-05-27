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

const express    = require('express')
const axios      = require('axios')
const cors       = require('cors')
const https      = require('https')
const path       = require('path')
const Database   = require('better-sqlite3')
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

// =============================================================================
// SQLite Database — Plans
// =============================================================================
const DB_PATH = path.join(__dirname, 'plans.db')
const db = new Database(DB_PATH)

// WAL mode = much better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create plans table
db.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    data_gb       INTEGER NOT NULL DEFAULT 0,
    devices       INTEGER NOT NULL DEFAULT 1,
    price_lkr     INTEGER NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 30,
    is_active     INTEGER NOT NULL DEFAULT 1,
    badge         TEXT    DEFAULT NULL,
    accent_color  TEXT    NOT NULL DEFAULT 'cyan',
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  )
`)

// Seed default plans on first boot (only if table is empty)
const planCount = db.prepare('SELECT COUNT(*) AS cnt FROM plans').get()
if (planCount.cnt === 0) {
  const insert = db.prepare(`
    INSERT INTO plans (name, data_gb, devices, price_lkr, validity_days, is_active, badge, accent_color)
    VALUES (@name, @data_gb, @devices, @price_lkr, @validity_days, @is_active, @badge, @accent_color)
  `)
  const seedAll = db.transaction((rows) => { for (const r of rows) insert.run(r) })
  seedAll([
    { name: 'Standard', data_gb: 500, devices: 2, price_lkr: 399, validity_days: 30, is_active: 1, badge: null,   accent_color: 'cyan'   },
    { name: 'MVP Lite', data_gb: 0,   devices: 1, price_lkr: 499, validity_days: 30, is_active: 1, badge: null,   accent_color: 'green'  },
    { name: 'VIP',      data_gb: 800, devices: 5, price_lkr: 649, validity_days: 30, is_active: 1, badge: 'HOT',  accent_color: 'orange' },
    { name: 'MVP Pro',  data_gb: 0,   devices: 8, price_lkr: 899, validity_days: 30, is_active: 1, badge: 'BEST', accent_color: 'purple' },
  ])
  console.log('[ApexNet] ✓ Seeded 4 default plans into SQLite.')
} else {
  console.log(`[ApexNet] ✓ SQLite ready — ${planCount.cnt} plan(s) loaded.`)
}

// Prepared statements (compiled once, reused)
const stmt = {
  getActivePlans:  db.prepare('SELECT id, name, data_gb, devices, price_lkr, validity_days, badge, accent_color FROM plans WHERE is_active = 1 ORDER BY price_lkr ASC'),
  getAllPlans:      db.prepare('SELECT * FROM plans ORDER BY price_lkr ASC'),
  getPlanById:     db.prepare('SELECT * FROM plans WHERE id = ?'),
  insertPlan:      db.prepare(`
    INSERT INTO plans (name, data_gb, devices, price_lkr, validity_days, is_active, badge, accent_color)
    VALUES (@name, @data_gb, @devices, @price_lkr, @validity_days, @is_active, @badge, @accent_color)
  `),
  updatePlan: db.prepare(`
    UPDATE plans
    SET name = @name, data_gb = @data_gb, devices = @devices,
        price_lkr = @price_lkr, validity_days = @validity_days,
        is_active = @is_active, badge = @badge, accent_color = @accent_color,
        updated_at = datetime('now')
    WHERE id = @id
  `),
  deletePlan: db.prepare('DELETE FROM plans WHERE id = ?'),
  getActivePlanByName: db.prepare("SELECT * FROM plans WHERE LOWER(name) = LOWER(?) AND is_active = 1 LIMIT 1"),
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
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}))

app.use(express.json())

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const plans = stmt.getAllPlans.all()
  res.json({
    status:    'ok',
    service:   'ApexNet LK Backend',
    timestamp: new Date().toISOString(),
    planCount: plans.length,
  })
})

// =============================================================================
// PUBLIC: GET /api/vpn/plans
// Returns only active plans, sorted by price ascending.
// Used by: landing page PricingSection, OrderForm, CreateVpnModal.
// =============================================================================
app.get('/api/vpn/plans', (_req, res) => {
  const plans = stmt.getActivePlans.all()
  res.json({ success: true, plans })
})

// =============================================================================
// ADMIN: GET /api/admin/plans — all plans including inactive
// =============================================================================
app.get('/api/admin/plans', (_req, res) => {
  const plans = stmt.getAllPlans.all()
  res.json({ success: true, plans })
})

// =============================================================================
// ADMIN: POST /api/admin/plans — create a new plan
// =============================================================================
app.post('/api/admin/plans', (req, res) => {
  const { name, data_gb, devices, price_lkr, validity_days, badge, accent_color, is_active } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required.' })
  }
  if (price_lkr == null || isNaN(Number(price_lkr))) {
    return res.status(400).json({ error: 'price_lkr is required and must be a number.' })
  }

  try {
    const result = stmt.insertPlan.run({
      name:          name.trim(),
      data_gb:       Number(data_gb) || 0,
      devices:       Math.max(1, Number(devices) || 1),
      price_lkr:     Number(price_lkr),
      validity_days: Number(validity_days) || 30,
      is_active:     is_active !== false && is_active !== 0 ? 1 : 0,
      badge:         badge ? String(badge).toUpperCase() : null,
      accent_color:  accent_color || 'cyan',
    })
    res.json({ success: true, id: result.lastInsertRowid })
  } catch (err) {
    console.error('[ApexNet] POST /api/admin/plans:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// ADMIN: PUT /api/admin/plans/:id — update existing plan
// =============================================================================
app.put('/api/admin/plans/:id', (req, res) => {
  const id   = Number(req.params.id)
  const plan = stmt.getPlanById.get(id)
  if (!plan) return res.status(404).json({ error: `Plan #${id} not found.` })

  const { name, data_gb, devices, price_lkr, validity_days, badge, accent_color, is_active } = req.body

  try {
    stmt.updatePlan.run({
      id,
      name:          name         != null ? String(name).trim()                 : plan.name,
      data_gb:       data_gb      != null ? Number(data_gb)                     : plan.data_gb,
      devices:       devices      != null ? Math.max(1, Number(devices))        : plan.devices,
      price_lkr:     price_lkr   != null ? Number(price_lkr)                   : plan.price_lkr,
      validity_days: validity_days != null ? Number(validity_days)              : plan.validity_days,
      is_active:     is_active    != null ? (is_active ? 1 : 0)                 : plan.is_active,
      badge:         badge        !== undefined ? (badge ? String(badge).toUpperCase() : null) : plan.badge,
      accent_color:  accent_color != null ? String(accent_color)                : plan.accent_color,
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[ApexNet] PUT /api/admin/plans/:id:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// ADMIN: DELETE /api/admin/plans/:id — hard delete
// =============================================================================
app.delete('/api/admin/plans/:id', (req, res) => {
  const id   = Number(req.params.id)
  const plan = stmt.getPlanById.get(id)
  if (!plan) return res.status(404).json({ error: `Plan #${id} not found.` })

  try {
    stmt.deletePlan.run(id)
    res.json({ success: true })
  } catch (err) {
    console.error('[ApexNet] DELETE /api/admin/plans/:id:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// POST /api/vpn/create
// =============================================================================
// Request body:
//   customerName    : string  — e.g. "Kamal Perera"
//   selectedPackage : string  — one of SNI_MAP keys
//   planId          : number  — integer plan id from DB  (preferred)
//   plan / selectedPlan : string  — legacy: plan name fallback (still works)
//
// Response (success):
//   { success, vlessUrl, clientId, remark, sni,
//     plan: { id, name, price_lkr, data_gb, devices, validity_days },
//     dataLimitLabel, expiryDate }
// =============================================================================
app.post('/api/vpn/create', async (req, res) => {
  try {
    const { customerName, selectedPackage, planId, plan: planField, selectedPlan } = req.body

    // ── 1. Validate customer name ──────────────────────────────────────────
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return res.status(400).json({ error: 'customerName is required.' })
    }

    // ── 2. Validate ISP package ────────────────────────────────────────────
    if (!selectedPackage || !SNI_MAP[selectedPackage]) {
      return res.status(400).json({
        error: `Invalid selectedPackage. Valid options: ${Object.keys(SNI_MAP).join(', ')}`,
      })
    }

    // ── 3. Resolve plan from DB ────────────────────────────────────────────
    let plan = null

    if (planId != null && !isNaN(Number(planId))) {
      // New preferred path: integer planId
      plan = stmt.getPlanById.get(Number(planId))
      if (!plan || !plan.is_active) {
        return res.status(400).json({ error: `Plan #${planId} not found or is inactive.` })
      }
    } else {
      // Legacy path: string plan name (backward compat)
      const nameKey = String(planField ?? selectedPlan ?? '').trim()
      if (!nameKey) {
        return res.status(400).json({ error: 'planId (integer) or plan name is required.' })
      }
      plan = stmt.getActivePlanByName.get(nameKey)
      if (!plan) {
        return res.status(400).json({
          error: `No active plan named "${nameKey}". Use planId instead.`,
        })
      }
    }

    const name = customerName.trim()
    const sni  = SNI_MAP[selectedPackage]

    // ── 4. Compute data cap (bytes) + expiry ──────────────────────────────
    // 3x-ui stores traffic limits in bytes; 0 means unlimited.
    const totalBytes     = plan.data_gb === 0 ? 0 : plan.data_gb * 1024 * 1024 * 1024
    const expiryMs       = Date.now() + plan.validity_days * 24 * 60 * 60 * 1000
    const expiryDate     = new Date(expiryMs).toISOString().split('T')[0]
    const dataLimitLabel = plan.data_gb === 0 ? 'Unlimited' : `${plan.data_gb} GB`

    // ── 5. Build unique remark / email ────────────────────────────────────
    const rand4    = Math.floor(1000 + Math.random() * 9000)
    const safeName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const remark   = `${safeName}_${rand4}`
    const email    = remark.toLowerCase() // 3x-ui uses "email" as unique client key

    // ── 6. Generate UUID ──────────────────────────────────────────────────
    const clientId = uuidv4()

    // ── 7. Authenticate with 3x-ui ────────────────────────────────────────
    await authenticate()

    // ── 8. Add client via /panel/api/inbounds/addClient ───────────────────
    const clientSettings = {
      clients: [
        {
          id:         clientId,
          alterId:    0,
          email,
          limitIp:    plan.devices,
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
      ` | ${plan.name} | ${dataLimitLabel} | ${plan.devices} devices | exp ${expiryDate}`
    )

    const panelRes = await panelCall('post', '/panel/api/inbounds/addClient', {
      id:       Number(INBOUND_ID),
      settings: JSON.stringify(clientSettings),
    })

    if (!panelRes.data?.success) {
      console.error('[ApexNet] addClient failed:', panelRes.data)
      throw new Error(panelRes.data?.msg || 'Panel rejected the client creation request.')
    }

    // ── 9. Build VLESS URL (TCP, no TLS, SNI injection for NetMod) ────────
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

    // ── 10. Respond ───────────────────────────────────────────────────────
    return res.json({
      success: true,
      vlessUrl,
      clientId,
      remark,
      sni,
      plan: {
        id:           plan.id,
        name:         plan.name,
        price_lkr:    plan.price_lkr,
        data_gb:      plan.data_gb,
        devices:      plan.devices,
        validity_days: plan.validity_days,
        accent_color: plan.accent_color,
        badge:        plan.badge,
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
// GET /api/vpn/server-stats
// Returns real-time server health: CPU %, memory %, active connections, uptime.
// Tries multiple 3x-ui endpoints in order until one succeeds.
// =============================================================================
app.get('/api/vpn/server-stats', async (_req, res) => {
  try {
    await authenticate()

    let cpu        = null
    let mem        = null
    let connections = null
    let uptime     = null
    let xrayState  = null
    let source     = null

    // ── Attempt 1: /server/status ─────────────────────────────────────────────
    // Standard 3x-ui v2 endpoint (may be prefixed by panel sub-path).
    // PANEL_BASE already includes the sub-path (e.g. /tzhkNcKGl1Ivgsc8s9).
    try {
      const r = await panelClient.get('/server/status')
      const obj = r.data?.obj
      if (obj) {
        cpu    = typeof obj.cpu    === 'number' ? Math.round(obj.cpu)          : null
        uptime = typeof obj.uptime === 'number' ? obj.uptime                   : null

        if (obj.mem) {
          const cur   = obj.mem.current ?? obj.mem.curr ?? null
          const total = obj.mem.total   ?? null
          if (cur !== null && total && total > 0) {
            mem = Math.round((cur / total) * 100)
          }
        }

        // xray state (running / stop)
        xrayState = obj.xray?.state ?? null

        console.log('[ApexNet] ✓ /server/status → CPU:', cpu, '% | Mem:', mem, '% | Uptime:', uptime, 's')
        source = 'server/status'
      }
    } catch (e1) {
      console.warn('[ApexNet] /server/status failed:', e1.message)
    }

    // ── Attempt 2: /xray/status ───────────────────────────────────────────────
    // Fallback: xray process info (available in some panel versions).
    if (cpu === null) {
      try {
        const r2 = await panelClient.get('/xray/status')
        if (r2.data?.obj?.state) {
          xrayState = r2.data.obj.state
          console.log('[ApexNet] /xray/status → state:', xrayState)
          source = 'xray/status'
        }
      } catch (e2) {
        console.warn('[ApexNet] /xray/status failed:', e2.message)
      }
    }

    // ── Attempt 3: derive connections from inbound list ───────────────────────
    // Always attempt — gives us live client counts regardless of above.
    try {
      const inbRes = await panelCall('get', '/panel/api/inbounds/list')
      if (inbRes.data?.success) {
        const inbounds = inbRes.data.obj || []
        let activeClients = 0
        for (const inb of inbounds) {
          for (const cs of (inb.clientStats || [])) {
            const expired = cs.expiryTime > 0 && cs.expiryTime < Date.now()
            if (cs.enable && !expired) activeClients++
          }
        }
        connections = activeClients
        console.log('[ApexNet] ✓ Inbound list → active connections:', connections)
        if (!source) source = 'inbounds/list'
      }
    } catch (e3) {
      console.warn('[ApexNet] inbound list for connections failed:', e3.message)
    }

    if (source === null) {
      // All attempts failed
      return res.status(503).json({
        success: false,
        error:   'Could not reach 3x-ui panel for server stats.',
        cpu:     null,
        mem:     null,
        connections: null,
        uptime:  null,
      })
    }

    return res.json({
      success:    true,
      cpu,
      mem,
      connections,
      uptime,
      xrayState,
      source,
      fetchedAt:  new Date().toISOString(),
    })
  } catch (err) {
    console.error('[ApexNet] /api/vpn/server-stats error:', err.message)
    return res.status(500).json({
      success: false,
      error:   err.message || 'Internal server error while fetching server stats.',
      cpu:     null,
      mem:     null,
      connections: null,
      uptime:  null,
    })
  }
})

// =============================================================================
// GET /api/vpn/client-by-name?name=Kamal+Perera
// Looks up a customer's 3x-ui VPN client by matching their name in the remark
// (3x-ui stores "email" as safeName_RAND which we can partially match).
// Also accepts ?remark=kamal_perera_1234 for exact remark match.
// Used by customer portal to display real device limit and usage stats.
// =============================================================================
app.get('/api/vpn/client-by-name', async (req, res) => {
  const { name, remark } = req.query

  if (!name && !remark) {
    return res.status(400).json({ success: false, error: 'name or remark query param required' })
  }

  try {
    await authenticate()
    const inboundsRes = await panelCall('get', '/panel/api/inbounds/list')
    if (!inboundsRes.data?.success) throw new Error('Panel error fetching inbound list.')

    const inbounds = inboundsRes.data.obj || []

    // Build a normalised search token from the name (matches the remark prefix)
    const searchToken = remark
      ? remark.toLowerCase()
      : name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 12)

    let foundClient    = null
    let foundClientCfg = null // from inbound.settings.clients

    outer:
    for (const inbound of inbounds) {
      // Parse client config from inbound settings (has limitIp, totalGB, etc.)
      let cfgClients = []
      try {
        const settings = typeof inbound.settings === 'string'
          ? JSON.parse(inbound.settings)
          : (inbound.settings || {})
        cfgClients = settings.clients || []
      } catch (_) {}

      for (const cs of (inbound.clientStats || [])) {
        const csEmail = (cs.email || '').toLowerCase()
        const isMatch = remark
          ? csEmail === searchToken
          : csEmail.startsWith(searchToken) || csEmail.includes(searchToken.split('_')[0])

        if (isMatch) {
          const expired = cs.expiryTime > 0 && cs.expiryTime < Date.now()
          foundClient = {
            email:      cs.email,
            enable:     cs.enable,
            expired,
            expiryTime: cs.expiryTime,
            up:         cs.up   || 0,
            down:       cs.down || 0,
          }
          // Find matching config entry for device limit + data cap
          foundClientCfg = cfgClients.find(c => c.email === cs.email) || null
          break outer
        }
      }
    }

    if (!foundClient) {
      return res.json({ success: true, found: false })
    }

    const toGB = (b) => (b / 1024 ** 3).toFixed(2)
    const deviceLimit = foundClientCfg?.limitIp || 1
    const totalGB     = foundClientCfg?.totalGB  || 0   // bytes; 0 = unlimited

    return res.json({
      success: true,
      found:   true,
      client: {
        email:       foundClient.email,
        active:      foundClient.enable && !foundClient.expired,
        expired:     foundClient.expired,
        expiryDate:  foundClient.expiryTime > 0
          ? new Date(foundClient.expiryTime).toISOString().split('T')[0]
          : null,
        dataUsedGB:  toGB(foundClient.up + foundClient.down),
        totalGB:     totalGB === 0 ? 0 : parseFloat(toGB(totalGB)),
        deviceLimit,
      },
    })
  } catch (err) {
    console.error('[ApexNet] /api/vpn/client-by-name error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})


app.listen(PORT, () => {
  const pad = (s, n) => String(s).substring(0, n).padEnd(n)
  console.log(`
╔══════════════════════════════════════════════════════════╗
║            ApexNet LK — Backend Server                   ║
╠══════════════════════════════════════════════════════════╣
║  Port      →  ${pad(PORT,       40)} ║
║  Panel     →  ${pad(PANEL_BASE, 40)} ║
║  Server IP →  ${pad(SERVER_IP,  40)} ║
║  CORS      →  ${pad(CORS_ORIGIN,40)} ║
║  DB        →  ${pad(DB_PATH,    40)} ║
╚══════════════════════════════════════════════════════════╝
  `)
})
