// =============================================================================
// src/services/vpnApi.js
// Thin frontend wrapper for the ApexNet LK backend API.
// ALL calls go to the Node.js backend — panel credentials never leave it.
// =============================================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ─── Generic fetch helper ─────────────────────────────────────────────────────
async function apiFetch (path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`)
  }

  return json
}

// =============================================================================
// createVpnAccount — POST /api/vpn/create
// =============================================================================
/**
 * Creates a new VLESS client on the 3x-ui panel via the backend.
 *
 * @param {object} params
 * @param {string}  params.customerName     - Customer's display name
 * @param {string}  params.selectedPackage  - ISP package key (must match SNI_MAP)
 * @param {string}  params.plan             - 'standard' | 'vip' | 'mvp'
 *
 * @returns {Promise<{
 *   success:        boolean,
 *   vlessUrl:       string,           // Ready-to-paste NetMod URL (TCP + SNI)
 *   clientId:       string,           // UUID of the VLESS client
 *   remark:         string,           // Unique remark used on the panel
 *   sni:            string,           // Bug host selected for the package
 *   plan: {
 *     id:           string,
 *     name:         string,
 *     priceLKR:     number,
 *     dataLimitGB:  number,           // 0 = unlimited
 *     deviceLimit:  number,
 *     expiryDays:   number,
 *   },
 *   dataLimitLabel: string,           // Human-readable e.g. "300 GB" | "Unlimited"
 *   expiryDate:     string,           // ISO date e.g. "2026-06-25"
 * }>}
 */
export async function createVpnAccount ({ customerName, selectedPackage, plan }) {
  return apiFetch('/api/vpn/create', {
    method: 'POST',
    body: JSON.stringify({ customerName, selectedPackage, plan }),
  })
}

// =============================================================================
// fetchVpnStats — GET /api/vpn/stats
// =============================================================================
/**
 * Fetches aggregated stats from the 3x-ui panel via the backend.
 *
 * @returns {Promise<{
 *   success: boolean,
 *   stats: {
 *     totalCustomers:     number,
 *     activeSessions:     number,
 *     totalServerUsageGB: string,
 *     uploadGB:           string,
 *     downloadGB:         string,
 *     inboundCount:       number,
 *     fetchedAt:          string,   // ISO timestamp
 *   }
 * }>}
 */
export async function fetchVpnStats () {
  return apiFetch('/api/vpn/stats')
}

// =============================================================================
// fetchVpnPlans — GET /api/vpn/plans
// =============================================================================
/**
 * Returns the backend's canonical plan list (useful for keeping UI in sync).
 *
 * @returns {Promise<{
 *   success: boolean,
 *   plans:   Array<{ id, name, priceLKR, dataLimitGB, deviceLimit, expiryDays }>
 * }>}
 */
export async function fetchVpnPlans () {
  return apiFetch('/api/vpn/plans')
}
