// =============================================================================
// src/components/CreateVpnModal.jsx  —  ApexNet LK Admin
// =============================================================================
//
//  FLOW:
//   1. Mount  → fetch GET /api/vpn/plans  → render plan cards (or skeletons)
//   2. Admin fills: Customer Name · ISP Package · selects a plan card
//   3. Submit → POST /api/vpn/create { customerName, selectedPackage, selectedPlan }
//   4. Success → display VLESS URL with Copy button
//   5. Error   → inline red alert (network / API failure)
//
//  Tailwind CSS v4 · dark neon theme · fully responsive
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import {
  X, User, Shield, Wifi, Zap, Globe,
  Copy, Check, AlertCircle, CheckCircle,
  Loader2, RefreshCw,
} from 'lucide-react'

// ─── Backend base URL ─────────────────────────────────────────────────────────
// Set VITE_API_URL on Vercel to  http://95.181.160.194:5000
// During local dev the Vite proxy forwards /api/* to localhost:5000 automatically.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── ISP packages + their SNI (bug host) ─────────────────────────────────────
const ISP_PACKAGES = [
  { value: 'Dialog Router Zoom 724',   label: 'Dialog Router — Zoom 724',   emoji: '📡', sni: 'zoom.us'      },
  { value: 'Dialog Mobile TikTok 997', label: 'Dialog Mobile — TikTok 997', emoji: '🎵', sni: 'v.tiktok.com' },
  { value: 'SLT Netflix',              label: 'SLT — Netflix',              emoji: '🎬', sni: 'netflix.com'  },
  { value: 'Mobitel Zoom',             label: 'Mobitel — Zoom',             emoji: '🔵', sni: 'zoom.us'      },
  { value: 'Airtel Unlimited',         label: 'Airtel — Unlimited',         emoji: '🌐', sni: 'zoom.us'      },
]

// ─── Static fallback plans (used if API is unreachable) ──────────────────────
const FALLBACK_PLANS = [
  { id: 'standard', name: 'Standard', price: '399 LKR', dataGB: 150, deviceLimit: 2, days: 30 },
  { id: 'vip',      name: 'VIP',      price: '699 LKR', dataGB: 300, deviceLimit: 5, days: 30 },
  { id: 'mvp',      name: 'MVP',      price: '949 LKR', dataGB: 0,   deviceLimit: 8, days: 30 },
]

// ─── Plan card visual config ──────────────────────────────────────────────────
const PLAN_THEME = {
  standard: {
    Icon:        Wifi,
    badge:       null,
    // Tailwind class strings (applied via template literals)
    selectedBorder: 'border-cyan-400/60',
    selectedBg:     'bg-cyan-500/10',
    selectedGlow:   'shadow-[0_0_30px_rgba(0,245,255,0.2)]',
    idleBorder:     'border-white/[0.07] hover:border-cyan-400/30',
    iconColor:      'text-cyan-400',
    nameColor:      'text-cyan-300',
    priceColor:     'text-cyan-200',
    checkBg:        'bg-cyan-400',
    dotColor:       'bg-cyan-400',
  },
  vip: {
    Icon:        Zap,
    badge:       'HOT',
    badgeCls:    'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.55)]',
    selectedBorder: 'border-orange-400/60',
    selectedBg:     'bg-orange-500/10',
    selectedGlow:   'shadow-[0_0_30px_rgba(249,115,22,0.22)]',
    idleBorder:     'border-white/[0.07] hover:border-orange-400/30',
    iconColor:      'text-orange-400',
    nameColor:      'text-orange-300',
    priceColor:     'text-orange-200',
    checkBg:        'bg-orange-400',
    dotColor:       'bg-orange-400',
  },
  mvp: {
    Icon:        Globe,
    badge:       'BEST',
    badgeCls:    'bg-purple-500 shadow-[0_0_10px_rgba(191,0,255,0.55)]',
    selectedBorder: 'border-purple-400/60',
    selectedBg:     'bg-purple-500/10',
    selectedGlow:   'shadow-[0_0_30px_rgba(191,0,255,0.22)]',
    idleBorder:     'border-white/[0.07] hover:border-purple-400/30',
    iconColor:      'text-purple-400',
    nameColor:      'text-purple-300',
    priceColor:     'text-purple-200',
    checkBg:        'bg-purple-400',
    dotColor:       'bg-purple-400',
  },
}
const DEFAULT_THEME = PLAN_THEME.standard

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmtData = (gb) => (gb === 0 || gb === null || gb === undefined) ? 'Unlimited' : `${gb} GB`

// =============================================================================
// Sub-components
// =============================================================================

// ── Skeleton cards (shown while loading) ─────────────────────────────────────
function PlanSkeletons () {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col items-center gap-3 animate-pulse"
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
          <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
          <div className="h-5 w-24 rounded-full bg-white/[0.06]" />
          <div className="h-2.5 w-16 rounded-full bg-white/[0.06]" />
          <div className="h-2.5 w-20 rounded-full bg-white/[0.06]" />
        </div>
      ))}
    </div>
  )
}

// ── Single plan card ─────────────────────────────────────────────────────────
function PlanCard ({ plan, selected, onSelect }) {
  const theme = PLAN_THEME[plan.id] || DEFAULT_THEME
  const { Icon } = theme

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      aria-pressed={selected}
      className={`
        relative flex flex-col items-center gap-2.5
        pt-7 pb-5 px-3 rounded-2xl border
        text-center w-full cursor-pointer
        transition-all duration-200 focus:outline-none
        ${selected
          ? `${theme.selectedBorder} ${theme.selectedBg} ${theme.selectedGlow} -translate-y-1`
          : `${theme.idleBorder} bg-white/[0.02] hover:-translate-y-0.5`
        }
      `}
    >
      {/* Badge (HOT / BEST) */}
      {theme.badge && (
        <span className={`
          absolute -top-3 left-1/2 -translate-x-1/2
          text-[9px] font-black text-white px-2.5 py-0.5
          rounded-full whitespace-nowrap ${theme.badgeCls}
        `}>
          {theme.badge}
        </span>
      )}

      {/* Icon bubble */}
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center
        transition-colors duration-200
        ${selected ? 'bg-current/10' : 'bg-white/[0.05]'}
      `}>
        <Icon size={18} className={selected ? theme.iconColor : 'text-slate-500'} />
      </div>

      {/* Plan name */}
      <span className={`text-[13px] font-extrabold leading-none ${selected ? theme.nameColor : 'text-slate-200'}`}>
        {plan.name}
      </span>

      {/* Price */}
      <span className={`
        font-['Orbitron',monospace] text-sm font-black leading-none
        ${selected ? theme.priceColor : 'text-white'}
      `}>
        {plan.price}
      </span>

      {/* Data */}
      <span className={`text-[11px] font-semibold ${selected ? theme.iconColor : 'text-slate-400'}`}>
        {fmtData(plan.dataGB)}
      </span>

      {/* Devices + days */}
      <span className="text-[10px] text-slate-500 leading-relaxed">
        {plan.deviceLimit} device{plan.deviceLimit !== 1 ? 's' : ''}
        <br />
        {plan.days} days validity
      </span>

      {/* Active checkmark pip */}
      {selected && (
        <div className={`absolute bottom-2.5 right-2.5 w-4 h-4 rounded-full ${theme.checkBg} flex items-center justify-center`}>
          <Check size={9} strokeWidth={3.5} className="text-black" />
        </div>
      )}
    </button>
  )
}

// ── Copy-to-clipboard button ─────────────────────────────────────────────────
function CopyBtn ({ text }) {
  const [done, setDone] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const el = Object.assign(document.createElement('textarea'), { value: text })
      document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }

  return (
    <button
      onClick={copy}
      className={`
        inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
        text-xs font-bold border cursor-pointer
        transition-all duration-300
        ${done
          ? 'bg-green-500/15 border-green-400/40 text-green-300'
          : 'bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border-cyan-400/35 text-cyan-300 hover:from-cyan-500/25 hover:to-purple-500/25 hover:shadow-[0_0_20px_rgba(0,245,255,0.25)]'
        }
      `}
    >
      {done ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy VLESS URL</>}
    </button>
  )
}

// ── Result card (shown after successful creation) ────────────────────────────
function ResultCard ({ result, onClose }) {
  // Normalise plan info — backend may return `plan` object or flat fields
  const plan = result.plan ?? {}
  const planName   = plan.name        ?? result.planName   ?? '—'
  const planPrice  = plan.priceLKR    ? `LKR ${plan.priceLKR}` : (plan.price ?? result.price ?? '—')
  const dataLimitL = result.dataLimitLabel ?? fmtData(plan.dataLimitGB ?? plan.dataGB ?? 0)
  const devices    = plan.deviceLimit ?? result.deviceLimit ?? '—'
  const expiry     = result.expiryDate ?? '—'
  const expiryDays = plan.expiryDays  ?? plan.days ?? 30

  const details = [
    { label: 'Plan',    value: `${planName} — ${planPrice}` },
    { label: 'Remark',  value: result.remark   ?? '—' },
    { label: 'Bug Host',value: result.sni       ?? '—' },
    { label: 'Devices', value: `${devices} simultaneous` },
    { label: 'Data',    value: dataLimitL },
    { label: 'Expiry',  value: expiry !== '—' ? expiry : `${expiryDays} days` },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* ── Success banner ── */}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-green-500/[0.07] border border-green-400/25">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
          <CheckCircle size={20} className="text-green-400" />
        </div>
        <div>
          <p className="text-green-400 font-bold text-sm leading-tight">VPN Account Created!</p>
          <p className="text-slate-500 text-[11px] mt-1">
            {planName} · {dataLimitL} · {devices} devices ·
            Expires <span className="text-cyan-400 font-semibold">{expiry}</span>
          </p>
        </div>
      </div>

      {/* ── Details grid ── */}
      <div className="grid grid-cols-2 gap-2">
        {details.map(({ label, value }) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
            <p className="text-slate-600 text-[10px] uppercase tracking-wide mb-1">{label}</p>
            <p className="text-slate-200 text-xs font-semibold break-all leading-snug">{value}</p>
          </div>
        ))}
      </div>

      {/* ── VLESS URL box ── */}
      <div>
        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-2">
          VLESS URL — paste into NetMod Senza
        </p>
        <div className="bg-black/60 border border-cyan-500/[0.18] rounded-xl p-3.5 font-mono text-[10.5px] text-cyan-300 break-all leading-relaxed max-h-28 overflow-y-auto">
          {result.vlessUrl}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <CopyBtn text={result.vlessUrl} />
        <button
          onClick={onClose}
          className="ml-auto px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 text-xs font-semibold hover:border-white/20 hover:text-slate-200 transition-all cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Main Modal
// =============================================================================
export default function CreateVpnModal ({ onClose, onSuccess }) {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState('form') // 'form' | 'submitting' | 'result'
  const [result, setResult] = useState(null)
  const [formError, setFormError] = useState('')

  // ── Form fields ───────────────────────────────────────────────────────────
  const [customerName,    setCustomerName]    = useState('')
  const [selectedPackage, setSelectedPackage] = useState(ISP_PACKAGES[0].value)
  const [selectedPlan,    setSelectedPlan]    = useState('vip')
  const [nameFocused,     setNameFocused]     = useState(false)

  // ── Plans (fetched from API) ──────────────────────────────────────────────
  const [plans,       setPlans]       = useState([])
  const [plansState,  setPlansState]  = useState('loading') // 'loading' | 'ok' | 'error'
  const [plansErrMsg, setPlansErrMsg] = useState('')

  // ── Fetch plans ───────────────────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setPlansState('loading')
    setPlansErrMsg('')

    try {
      const res  = await fetch(`${BASE}/api/vpn/plans`, { signal: AbortSignal.timeout(10_000) })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

      // ── Normalise response shape ───────────────────────────────────────
      // Shape A (object keyed by plan id):
      //   { "standard": { name, price, dataGB, deviceLimit, days }, ... }
      // Shape B (array):
      //   { success: true, plans: [{ id, name, priceLKR, dataLimitGB, ... }] }
      let list = []

      if (Array.isArray(json)) {
        // Bare array (unusual but handle it)
        list = json.map(p => ({ id: p.id ?? p.name?.toLowerCase(), ...p }))

      } else if (Array.isArray(json.plans)) {
        // Shape B — our backend returns this
        list = json.plans.map(p => ({
          id:          p.id,
          name:        p.name,
          price:       p.priceLKR ? `${p.priceLKR} LKR` : p.price,
          dataGB:      p.dataLimitGB ?? p.dataGB ?? 0,
          deviceLimit: p.deviceLimit,
          days:        p.expiryDays ?? p.days ?? 30,
        }))

      } else if (typeof json === 'object' && json !== null) {
        // Shape A — the format specified by the user
        // Ignore meta fields like `success`, `message`
        const SKIP = new Set(['success', 'message', 'error', 'plans'])
        list = Object.entries(json)
          .filter(([k]) => !SKIP.has(k))
          .map(([id, p]) => ({
            id,
            name:        p.name  ?? id,
            price:       p.price ?? (p.priceLKR ? `${p.priceLKR} LKR` : '—'),
            dataGB:      p.dataGB ?? p.dataLimitGB ?? 0,
            deviceLimit: p.deviceLimit ?? p.devices ?? 1,
            days:        p.days  ?? p.expiryDays  ?? 30,
          }))
      }

      if (!list.length) throw new Error('No plans returned by API.')

      setPlans(list)
      setPlansState('ok')

      // Keep selected plan valid
      if (!list.find(p => p.id === 'vip')) setSelectedPlan(list[0].id)

    } catch (err) {
      console.error('[CreateVpnModal] loadPlans:', err.message)
      setPlansErrMsg(err.message || 'Could not load plans.')
      setPlansState('error')
      // Fallback so the form stays usable
      setPlans(FALLBACK_PLANS)
    }
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    // Client-side validation
    if (!customerName.trim())  return setFormError('Customer name is required.')
    if (!selectedPackage)      return setFormError('Please select an ISP package.')
    if (!selectedPlan)         return setFormError('Please select a pricing plan.')

    setStep('submitting')

    try {
      const res  = await fetch(`${BASE}/api/vpn/create`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:    customerName.trim(),
          selectedPackage,
          selectedPlan,          // as requested
          plan:            selectedPlan, // alias our backend accepts
        }),
        signal: AbortSignal.timeout(20_000),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)

      setResult(json)
      setStep('result')
      onSuccess?.(json)

    } catch (err) {
      console.error('[CreateVpnModal] create:', err.message)
      const msg = err.name === 'TimeoutError'
        ? 'Request timed out. Check your backend connection.'
        : err.message || 'Failed to create VPN account.'
      setFormError(msg)
      setStep('form')
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activePkg  = ISP_PACKAGES.find(p => p.value === selectedPackage) || ISP_PACKAGES[0]
  const activePlan = plans.find(p => p.id === selectedPlan)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(2,4,8,0.85)', backdropFilter: 'blur(14px)', animation: 'fadeIn .2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create VPN Account"
        className="relative w-full max-w-[560px] rounded-3xl border border-cyan-400/[0.15] overflow-y-auto"
        style={{
          background:    'rgba(7,17,28,0.97)',
          backdropFilter:'blur(40px)',
          boxShadow:     '0 0 70px rgba(0,245,255,0.07), 0 32px 80px rgba(0,0,0,0.85)',
          maxHeight:     '93dvh',
          animation:     'slideUp .28s ease',
        }}
      >
        <div className="p-6 sm:p-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <h2 className="font-['Orbitron',monospace] text-[17px] font-black text-white tracking-tight leading-tight">
                Create&nbsp;
                <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  VPN Account
                </span>
              </h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                Generates a live 3x-ui client + VLESS URL instantly
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:border-white/25 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* ══════════════════════ FORM ══════════════════════ */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

              {/* ── Customer Name ── */}
              <fieldset>
                <legend className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  Customer Name
                </legend>
                <div className="relative">
                  <User
                    size={14}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${nameFocused ? 'text-cyan-400' : 'text-slate-500'}`}
                  />
                  <input
                    id="vpn-customer-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Kamal Perera"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    className={`
                      w-full pl-10 pr-4 py-3 rounded-xl text-sm text-slate-100
                      bg-black/40 border placeholder:text-slate-600
                      transition-all duration-200
                      ${nameFocused
                        ? 'border-cyan-400/55 shadow-[0_0_16px_rgba(0,245,255,0.12)]'
                        : 'border-cyan-500/[0.16] hover:border-cyan-500/30'
                      }
                    `}
                  />
                </div>
              </fieldset>

              {/* ── ISP Package ── */}
              <fieldset>
                <legend className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  ISP Package
                </legend>
                <div className="flex flex-col gap-2">
                  {ISP_PACKAGES.map(pkg => {
                    const sel = selectedPackage === pkg.value
                    return (
                      <button
                        key={pkg.value}
                        type="button"
                        onClick={() => setSelectedPackage(pkg.value)}
                        className={`
                          flex items-center gap-3 px-3.5 py-2.5 rounded-xl w-full text-left
                          border cursor-pointer transition-all duration-200
                          ${sel
                            ? 'border-cyan-400/45 bg-cyan-500/[0.07] shadow-[0_0_16px_rgba(0,245,255,0.09)]'
                            : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
                          }
                        `}
                      >
                        <span className="text-base shrink-0 select-none">{pkg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`block text-sm font-semibold leading-tight ${sel ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {pkg.label}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            Bug Host → {pkg.sni}
                          </span>
                        </div>
                        <div className={`
                          shrink-0 w-5 h-5 rounded-full border flex items-center justify-center
                          transition-all duration-150
                          ${sel ? 'bg-cyan-400 border-cyan-400' : 'border-white/15'}
                        `}>
                          {sel && <Check size={11} strokeWidth={3} className="text-black" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* ── Pricing Plans ── */}
              <fieldset>
                <div className="flex items-center justify-between mb-2.5 gap-2">
                  <legend className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Pricing Plan
                  </legend>
                  {plansState === 'error' && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <AlertCircle size={10} /> Using offline defaults
                      <button
                        type="button"
                        onClick={loadPlans}
                        className="ml-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        title="Retry"
                      >
                        <RefreshCw size={10} />
                      </button>
                    </span>
                  )}
                </div>

                {/* Skeleton or plan cards */}
                {plansState === 'loading' ? (
                  <PlanSkeletons />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {plans.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        selected={selectedPlan === plan.id}
                        onSelect={setSelectedPlan}
                      />
                    ))}
                  </div>
                )}
              </fieldset>

              {/* ── Summary row ── */}
              {plansState !== 'loading' && (
                <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/[0.05] border border-purple-500/[0.16] text-xs">
                  <Shield size={13} className="text-purple-400 shrink-0" />
                  <span className="text-slate-500">Bug Host:</span>
                  <code className="text-purple-300 font-bold font-mono">{activePkg.sni}</code>
                  {activePlan && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">
                        {activePlan.name} — {activePlan.price}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{fmtData(activePlan.dataGB)}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{activePlan.deviceLimit} devices</span>
                    </>
                  )}
                </div>
              )}

              {/* ── Form error ── */}
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-500/[0.09] border border-red-400/25 text-red-300 text-xs font-semibold leading-snug"
                >
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              {/* ── Submit ── */}
              <button
                id="vpn-create-submit"
                type="submit"
                disabled={plansState === 'loading'}
                className="
                  w-full py-3.5 rounded-2xl cursor-pointer
                  font-['Orbitron',monospace] text-xs font-bold uppercase tracking-[0.12em] text-cyan-300
                  bg-gradient-to-r from-cyan-500/[0.14] to-purple-500/[0.14]
                  border border-cyan-400/35
                  hover:from-cyan-500/[0.24] hover:to-purple-500/[0.24]
                  hover:-translate-y-px hover:shadow-[0_0_28px_rgba(0,245,255,0.22)]
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-300 flex items-center justify-center gap-2
                "
              >
                <Globe size={15} />
                Generate VPN Account
              </button>
            </form>
          )}

          {/* ══════════════════════ SUBMITTING ══════════════════════ */}
          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center gap-5 py-16">
              <div
                className="w-16 h-16 rounded-full border-2 border-cyan-400/25 bg-cyan-500/[0.07] flex items-center justify-center"
                style={{ animation: 'spin 1.1s linear infinite' }}
              >
                <Loader2 size={26} className="text-cyan-400" />
              </div>
              <div className="text-center">
                <p className="font-['Orbitron',monospace] text-sm font-bold text-cyan-300 mb-1.5">
                  Creating VPN Account…
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Authenticating with panel
                  <br />
                  Injecting VLESS client · Building URL
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════ RESULT ══════════════════════ */}
          {step === 'result' && result && (
            <ResultCard result={result} onClose={onClose} />
          )}

        </div>
      </div>
    </div>
  )
}
