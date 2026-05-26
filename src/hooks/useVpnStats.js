// =============================================================================
// src/hooks/useVpnStats.js
// Custom React hook for fetching real-time VPN server stats from the backend.
//
// Usage in AdminDashboard:
//   const { stats, loading, error, refresh } = useVpnStats({ pollInterval: 30000 })
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchVpnStats } from '../services/vpnApi'

/**
 * @typedef {Object} VpnStats
 * @property {number} totalCustomers     - Total clients across all inbounds
 * @property {number} activeSessions     - Currently enabled, non-expired clients
 * @property {string} totalServerUsageGB - Combined upload + download in GB
 * @property {string} uploadGB           - Total upload in GB
 * @property {string} downloadGB         - Total download in GB
 * @property {number} inboundCount       - Number of inbounds on the panel
 * @property {string} fetchedAt          - ISO timestamp of last fetch
 */

/**
 * useVpnStats
 *
 * @param {object}  options
 * @param {number}  [options.pollInterval=0]  - If > 0, auto-refreshes every N ms
 * @param {boolean} [options.fetchOnMount=true] - Whether to fetch immediately on mount
 *
 * @returns {{
 *   stats:   VpnStats | null,
 *   loading: boolean,
 *   error:   string | null,
 *   refresh: () => void,
 * }}
 */
export function useVpnStats ({ pollInterval = 0, fetchOnMount = true } = {}) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Keep a stable reference to the timer so we can clear it on unmount
  const timerRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchVpnStats()
      if (res.success && res.stats) {
        setStats(res.stats)
      } else {
        throw new Error('Unexpected response shape from /api/vpn/stats')
      }
    } catch (err) {
      console.error('[useVpnStats]', err.message)
      setError(err.message || 'Failed to fetch VPN stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fetchOnMount) {
      load()
    }

    if (pollInterval > 0) {
      timerRef.current = setInterval(load, pollInterval)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [load, fetchOnMount, pollInterval])

  return { stats, loading, error, refresh: load }
}
