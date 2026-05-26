// =============================================================================
// src/components/CustomerOrderForm.jsx
// Self-service order form for customers on the main dashboard.
// Lets a logged-in customer pick their ISP package + plan and submit.
// The admin can review the order and create the VPN account manually, OR
// you can wire it to call the backend directly (if you want self-service).
//
// Current behaviour: saves order to Firestore `orders` collection for admin review.
// =============================================================================

import { useState } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import {
  Shield, Wifi, Zap, Infinity, Globe,
  Check, AlertCircle, CheckCircle, X, MessageCircle,
} from 'lucide-react'

// ─── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#020408',
  card:    '#07111c',
  cyan:    '#00f5ff',
  purple:  '#bf00ff',
  green:   '#4ade80',
  orange:  '#f97316',
  red:     '#f87171',
  text:    '#e2e8f0',
  muted:   '#94a3b8',
  dim:     '#475569',
}

const ISP_PACKAGES = [
  { value: 'Dialog Router Zoom 724',   label: 'Dialog Router — Zoom 724',   icon: '📡', sni: 'zoom.us'      },
  { value: 'Dialog Mobile TikTok 997', label: 'Dialog Mobile — TikTok 997', icon: '🎵', sni: 'v.tiktok.com' },
  { value: 'SLT Netflix',              label: 'SLT — Netflix',              icon: '🎬', sni: 'netflix.com'  },
  { value: 'Mobitel Zoom',             label: 'Mobitel — Zoom',             icon: '🔵', sni: 'zoom.us'      },
  { value: 'Airtel Unlimited',         label: 'Airtel — Unlimited',         icon: '🌐', sni: 'zoom.us'      },
]

const PRICING_PLANS = [
  {
    id: 'standard', name: 'Standard', priceLKR: 399,
    dataLabel: '150 GB', devices: 2, days: 30,
    Icon: Wifi, accent: C.cyan,
    accentBg: 'rgba(0,245,255,0.07)', accentBorder: 'rgba(0,245,255,0.28)',
    glow: 'rgba(0,245,255,0.15)', badge: null,
  },
  {
    id: 'vip', name: 'VIP', priceLKR: 699,
    dataLabel: '300 GB', devices: 5, days: 30,
    Icon: Zap, accent: C.orange,
    accentBg: 'rgba(249,115,22,0.07)', accentBorder: 'rgba(249,115,22,0.30)',
    glow: 'rgba(249,115,22,0.15)', badge: 'HOT', badgeClr: C.orange,
  },
  {
    id: 'mvp', name: 'MVP', priceLKR: 949,
    dataLabel: 'Unlimited', devices: 8, days: 30,
    Icon: Infinity, accent: C.purple,
    accentBg: 'rgba(191,0,255,0.07)', accentBorder: 'rgba(191,0,255,0.30)',
    glow: 'rgba(191,0,255,0.15)', badge: 'BEST', badgeClr: C.purple,
  },
]

// ─── WhatsApp payment instructions text ──────────────────────────────────────
const WHATSAPP_NUM = '94771234567' // ← change to your real support number

export default function CustomerOrderForm ({ onClose }) {
  const [form, setForm]     = useState({ ispPackage: ISP_PACKAGES[0].value, plan: 'vip' })
  const [step, setStep]     = useState('form')  // 'form' | 'loading' | 'success'
  const [error, setError]   = useState('')

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectedPlan = PRICING_PLANS.find(p => p.id === form.plan) || PRICING_PLANS[1]
  const selectedPkg  = ISP_PACKAGES.find(p => p.value === form.ispPackage) || ISP_PACKAGES[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setStep('loading')

    try {
      const user = auth.currentUser
      if (!user) throw new Error('You must be logged in to place an order.')

      // Save order to Firestore — admin will see it in the dashboard
      await addDoc(collection(db, 'orders'), {
        uid:         user.uid,
        email:       user.email,
        displayName: user.displayName || '',
        ispPackage:  form.ispPackage,
        plan:        form.plan,
        planName:    selectedPlan.name,
        priceLKR:    selectedPlan.priceLKR,
        status:      'Pending',   // admin will change to Active after payment
        createdAt:   serverTimestamp(),
      })

      setStep('success')
    } catch (err) {
      console.error('[CustomerOrderForm]', err.message)
      setError(err.message || 'Failed to submit order. Please try again.')
      setStep('form')
    }
  }

  const openWhatsApp = () => {
    const msg =
      `Hello! I'd like to order ApexNet ${selectedPlan.name} plan ` +
      `(LKR ${selectedPlan.priceLKR}) for ${selectedPkg.label}.`
    window.open(`https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(0,245,255,0.14)', borderRadius: 28, padding: '32px',
        width: '100%', maxWidth: 560,
        boxShadow: '0 0 60px rgba(0,245,255,0.08),0 32px 80px rgba(0,0,0,0.8)',
        animation: 'slideUp 0.3s ease', maxHeight: '92vh', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>
              Order{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                VPN Plan
              </span>
            </h2>
            <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
              Choose your package and plan — we'll set it up for you
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* ══ FORM ══ */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} noValidate>

            {/* ISP Package */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your ISP Package
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {ISP_PACKAGES.map(pkg => {
                  const sel = form.ispPackage === pkg.value
                  return (
                    <div key={pkg.value} onClick={() => setF('ispPackage', pkg.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${sel ? 'rgba(0,245,255,0.38)' : 'rgba(255,255,255,0.06)'}`,
                      background: sel ? 'rgba(0,245,255,0.06)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: 16 }}>{pkg.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: sel ? C.cyan : C.text }}>{pkg.label}</div>
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>SNI → {pkg.sni}</div>
                      </div>
                      {sel && (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="#000" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Plan cards */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Select Plan
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {PRICING_PLANS.map(p => {
                  const sel = form.plan === p.id
                  const IconComp = p.Icon
                  return (
                    <div key={p.id} onClick={() => setF('plan', p.id)} style={{
                      position: 'relative',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 7, padding: '18px 8px 14px', borderRadius: 16,
                      cursor: 'pointer', textAlign: 'center',
                      border: `1.5px solid ${sel ? p.accentBorder : 'rgba(255,255,255,0.07)'}`,
                      background: sel ? p.accentBg : 'rgba(255,255,255,0.02)',
                      boxShadow: sel ? `0 0 20px ${p.glow}` : 'none',
                      transition: 'all 0.22s ease',
                      transform: sel ? 'translateY(-2px)' : 'translateY(0)',
                    }}>
                      {p.badge && (
                        <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: p.badgeClr, color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.8, whiteSpace: 'nowrap' }}>
                          {p.badge}
                        </div>
                      )}
                      <IconComp size={18} color={sel ? p.accent : C.dim} />
                      <div style={{ fontSize: 13, fontWeight: 800, color: sel ? p.accent : C.text }}>{p.name}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: sel ? p.accent : '#fff', fontFamily: "'Orbitron',monospace" }}>
                        LKR {p.priceLKR}
                      </div>
                      <div style={{ fontSize: 11, color: sel ? p.accent : C.muted }}>{p.dataLabel}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{p.devices} devices · {p.days} days</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, marginBottom: 18, background: 'rgba(191,0,255,0.05)', border: '1px solid rgba(191,0,255,0.16)' }}>
              <Shield size={14} color={C.purple} />
              <span style={{ fontSize: 12, color: C.muted }}>{selectedPkg.label}</span>
              <span style={{ fontSize: 12, color: C.dim }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>{selectedPlan.name} — LKR {selectedPlan.priceLKR}</span>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: C.red, fontSize: 12, fontWeight: 600 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" style={{
                flex: 1, padding: '13px', borderRadius: 14,
                background: 'linear-gradient(135deg,rgba(0,245,255,0.14),rgba(191,0,255,0.14))',
                border: '1px solid rgba(0,245,255,0.35)', color: C.cyan,
                fontFamily: "'Orbitron',monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 0.3s',
              }}>
                Submit Order
              </button>
              <button type="button" onClick={openWhatsApp} style={{
                padding: '13px 16px', borderRadius: 14,
                background: '#25d366', border: 'none', color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}>
                <MessageCircle size={14} /> WhatsApp
              </button>
            </div>
          </form>
        )}

        {/* ══ LOADING ══ */}
        {step === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,245,255,0.08)', border: '2px solid rgba(0,245,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 1.2s linear infinite' }}>
              <Globe size={22} color={C.cyan} />
            </div>
            <div style={{ color: C.cyan, fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron',monospace" }}>
              Submitting order…
            </div>
          </div>
        )}

        {/* ══ SUCCESS ══ */}
        {step === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.12)', border: '2px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} color={C.green} />
            </div>
            <div>
              <div style={{ color: C.green, fontSize: 16, fontWeight: 700, fontFamily: "'Orbitron',monospace", marginBottom: 8 }}>
                Order Submitted!
              </div>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                Your {selectedPlan.name} plan order has been received.<br />
                Our admin will activate your VPN within <strong style={{ color: C.cyan }}>a few hours</strong>.
              </p>
            </div>
            <button onClick={openWhatsApp} style={{
              padding: '12px 24px', borderRadius: 14,
              background: '#25d366', border: 'none', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <MessageCircle size={14} /> Confirm via WhatsApp
            </button>
            {onClose && (
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
