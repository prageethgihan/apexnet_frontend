// =============================================================================
// src/components/ManagePlans.jsx  —  ApexNet LK Admin
// Full CRUD interface for VPN Plans stored in the backend SQLite database.
//
// Features:
//  - Live plan grid (fetches GET /api/admin/plans)
//  - Add / Edit plan via modal form
//  - Toggle active / inactive per plan
//  - Delete with inline confirmation
//  - Dark neon theme matching the rest of the admin dashboard
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Wifi, Zap, Globe, Shield, Star, X,
  CheckCircle, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     '#020408',
  card:   '#07111c',
  border: '#1a2d40',
  cyan:   '#00f5ff',
  purple: '#bf00ff',
  green:  '#4ade80',
  orange: '#f97316',
  red:    '#f87171',
  text:   '#e2e8f0',
  muted:  '#94a3b8',
  dim:    '#475569',
}

// ─── Accent colour map — driven by plan.accent_color from DB ──────────────────
const ACCENT = {
  cyan:   { hex: '#00f5ff', bg: 'rgba(0,245,255,0.07)',   border: 'rgba(0,245,255,0.28)',  glow: 'rgba(0,245,255,0.12)'   },
  orange: { hex: '#f97316', bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.28)', glow: 'rgba(249,115,22,0.12)'  },
  purple: { hex: '#bf00ff', bg: 'rgba(191,0,255,0.07)',   border: 'rgba(191,0,255,0.28)',  glow: 'rgba(191,0,255,0.12)'   },
  green:  { hex: '#4ade80', bg: 'rgba(74,222,128,0.07)',  border: 'rgba(74,222,128,0.28)', glow: 'rgba(74,222,128,0.12)'  },
}
const ACCENT_DEFAULT = ACCENT.cyan
const getAccent = (color) => ACCENT[color] || ACCENT_DEFAULT

// Icon per accent color
const ACCENT_ICON = { cyan: Wifi, orange: Zap, purple: Globe, green: Shield }
const getIcon = (color) => ACCENT_ICON[color] || Star

const ACCENT_OPTIONS  = ['cyan', 'orange', 'purple', 'green']
const BADGE_OPTIONS   = ['', 'HOT', 'BEST', 'POPULAR', 'NEW']

const fmtData = (gb) => (gb === 0 || gb == null) ? 'Unlimited' : `${gb} GB`

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

// =============================================================================
// PlanFormModal — Add / Edit
// =============================================================================
function PlanFormModal({ plan, onClose, onSave }) {
  const isEdit = !!plan
  const [form, setForm] = useState({
    name:          plan?.name          ?? '',
    price_lkr:     plan?.price_lkr     ?? '',
    data_gb:       plan?.data_gb       ?? 0,
    devices:       plan?.devices       ?? 2,
    validity_days: plan?.validity_days ?? 30,
    badge:         plan?.badge         ?? '',
    accent_color:  plan?.accent_color  ?? 'cyan',
    is_active:     plan?.is_active     ?? 1,
  })
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  const setF = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())                   e.name      = 'Name is required.'
    if (!form.price_lkr || isNaN(Number(form.price_lkr))) e.price_lkr = 'Valid price is required.'
    if (isNaN(Number(form.data_gb)))         e.data_gb   = 'Must be a number (0 = Unlimited).'
    if (!form.devices || Number(form.devices) < 1) e.devices = 'At least 1 device.'
    if (!form.validity_days || Number(form.validity_days) < 1) e.validity_days = 'At least 1 day.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        name:          form.name.trim(),
        price_lkr:     Number(form.price_lkr),
        data_gb:       Number(form.data_gb),
        devices:       Number(form.devices),
        validity_days: Number(form.validity_days),
        badge:         form.badge || null,
        accent_color:  form.accent_color,
        is_active:     form.is_active ? 1 : 0,
      }
      if (isEdit) {
        await apiFetch(`/api/admin/plans/${plan.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(payload) })
      }
      onSave()
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const inp = (err, style = {}) => ({
    width: '100%', padding: '11px 13px',
    background: 'rgba(2,4,8,0.85)', color: C.text,
    border: `1px solid ${err ? C.red : 'rgba(0,245,255,0.18)'}`,
    borderRadius: 10, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
    ...style,
  })

  const lbl = { display: 'block', color: C.muted, fontSize: 11, fontWeight: 700,
    marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }

  const accent = getAccent(form.accent_color)

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'rgba(7,17,28,0.97)', border: '1px solid rgba(0,245,255,0.14)',
        borderRadius: 28, padding: '32px', width: '100%', maxWidth: 520,
        boxShadow: '0 0 60px rgba(0,245,255,0.07),0 32px 80px rgba(0,0,0,0.85)',
        animation: 'slideUp 0.28s ease', maxHeight: '92vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 17, fontWeight: 900, color: '#fff', margin: 0 }}>
              {isEdit ? 'Edit' : 'Add'}{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Plan
              </span>
            </h2>
            <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
              {isEdit ? `Editing plan #${plan.id}` : 'Create a new VPN subscription plan'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
          }}><X size={15} /></button>
        </div>

        {errors._global && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, marginBottom: 18,
            background: 'rgba(248,113,113,0.09)', border: '1px solid rgba(248,113,113,0.28)',
            color: C.red, fontSize: 12, fontWeight: 600,
          }}>
            <AlertCircle size={13} /> {errors._global}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Name */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Plan Name</label>
              <input type="text" placeholder="e.g. VIP, MVP Pro, Standard…"
                value={form.name} onChange={e => setF('name', e.target.value)}
                style={inp(errors.name)}
                onFocus={e => e.target.style.borderColor = C.cyan}
                onBlur={e => e.target.style.borderColor = errors.name ? C.red : 'rgba(0,245,255,0.18)'}
              />
              {errors.name && <p style={{ color: C.red, fontSize: 11, marginTop: 5 }}>{errors.name}</p>}
            </div>

            {/* Price */}
            <div>
              <label style={lbl}>Price (LKR)</label>
              <input type="number" min="0" placeholder="e.g. 649"
                value={form.price_lkr} onChange={e => setF('price_lkr', e.target.value)}
                style={inp(errors.price_lkr)}
                onFocus={e => e.target.style.borderColor = C.cyan}
                onBlur={e => e.target.style.borderColor = errors.price_lkr ? C.red : 'rgba(0,245,255,0.18)'}
              />
              {errors.price_lkr && <p style={{ color: C.red, fontSize: 11, marginTop: 5 }}>{errors.price_lkr}</p>}
            </div>

            {/* Data GB */}
            <div>
              <label style={lbl}>Data GB <span style={{ color: C.dim, textTransform: 'none', fontWeight: 400 }}>(0 = Unlimited)</span></label>
              <input type="number" min="0" placeholder="0"
                value={form.data_gb} onChange={e => setF('data_gb', e.target.value)}
                style={inp(errors.data_gb)}
                onFocus={e => e.target.style.borderColor = C.cyan}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.18)'}
              />
              {errors.data_gb && <p style={{ color: C.red, fontSize: 11, marginTop: 5 }}>{errors.data_gb}</p>}
            </div>

            {/* Devices */}
            <div>
              <label style={lbl}>Simultaneous Devices</label>
              <input type="number" min="1" max="20" placeholder="2"
                value={form.devices} onChange={e => setF('devices', e.target.value)}
                style={inp(errors.devices)}
                onFocus={e => e.target.style.borderColor = C.cyan}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.18)'}
              />
              {errors.devices && <p style={{ color: C.red, fontSize: 11, marginTop: 5 }}>{errors.devices}</p>}
            </div>

            {/* Validity */}
            <div>
              <label style={lbl}>Validity (Days)</label>
              <input type="number" min="1" placeholder="30"
                value={form.validity_days} onChange={e => setF('validity_days', e.target.value)}
                style={inp(errors.validity_days)}
                onFocus={e => e.target.style.borderColor = C.cyan}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.18)'}
              />
              {errors.validity_days && <p style={{ color: C.red, fontSize: 11, marginTop: 5 }}>{errors.validity_days}</p>}
            </div>

            {/* Badge */}
            <div>
              <label style={lbl}>Badge Label <span style={{ color: C.dim, textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BADGE_OPTIONS.map(b => {
                  const sel = form.badge === b
                  return (
                    <button key={b || 'none'} type="button" onClick={() => setF('badge', b)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.18s',
                        background: sel ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${sel ? C.cyan : 'rgba(255,255,255,0.09)'}`,
                        color: sel ? C.cyan : C.muted,
                      }}
                    >{b || 'None'}</button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Accent Color */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Accent Colour</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_OPTIONS.map(ac => {
                const a = getAccent(ac)
                const sel = form.accent_color === ac
                return (
                  <button key={ac} type="button" onClick={() => setF('accent_color', ac)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10,
                      background: sel ? a.bg : 'rgba(255,255,255,0.02)',
                      border: `1.5px solid ${sel ? a.border : 'rgba(255,255,255,0.07)'}`,
                      boxShadow: sel ? `0 0 16px ${a.glow}` : 'none',
                      color: sel ? a.hex : C.dim,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      textTransform: 'capitalize', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.hex, margin: '0 auto 5px' }} />
                    {ac}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Is Active toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 12, marginBottom: 24,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Show to customers</div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>Inactive plans are hidden from the public</div>
            </div>
            <button type="button" onClick={() => setF('is_active', form.is_active ? 0 : 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {form.is_active
                ? <ToggleRight size={34} color={C.cyan} />
                : <ToggleLeft  size={34} color={C.dim}  />
              }
            </button>
          </div>

          {/* Preview */}
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 22,
            background: accent.bg, border: `1px solid ${accent.border}`,
          }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, fontWeight: 600 }}>PREVIEW</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ color: accent.hex, fontWeight: 800, fontSize: 14 }}>{form.name || '—'}</span>
                {form.badge && (
                  <span style={{
                    marginLeft: 8, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: `${accent.hex}22`, color: accent.hex, border: `1px solid ${accent.hex}44`,
                  }}>{form.badge}</span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: accent.hex, fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14 }}>
                  LKR {form.price_lkr || '—'}
                </div>
                <div style={{ color: C.muted, fontSize: 11 }}>
                  {fmtData(Number(form.data_gb))} · {form.devices || '—'} devices · {form.validity_days || '—'} days
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={saving} style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: saving
              ? 'rgba(0,245,255,0.05)'
              : `linear-gradient(135deg, rgba(0,245,255,0.14), rgba(191,0,255,0.14))`,
            border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
            fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700,
            letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              : <><Plus size={15} /> {isEdit ? 'Save Changes' : 'Create Plan'}</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// PlanAdminCard — one plan in the grid
// =============================================================================
function PlanAdminCard({ plan, onEdit, onDelete, onToggle }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [toggling,   setToggling]   = useState(false)
  const accent  = getAccent(plan.accent_color)
  const Icon    = getIcon(plan.accent_color)
  const active  = Boolean(plan.is_active)

  const handleToggle = async () => {
    setToggling(true)
    await onToggle(plan)
    setToggling(false)
  }

  return (
    <div style={{
      background: active ? 'rgba(7,17,28,0.9)' : 'rgba(5,10,16,0.7)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${active ? accent.border : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 20, padding: 22,
      display: 'flex', flexDirection: 'column', gap: 14,
      opacity: active ? 1 : 0.6,
      transition: 'all 0.3s',
      boxShadow: active ? `0 0 28px ${accent.glow}` : 'none',
      position: 'relative',
    }}>

      {/* Badge */}
      {plan.badge && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: `${accent.hex}22`, color: accent.hex,
          border: `1px solid ${accent.hex}44`, letterSpacing: 1,
        }}>{plan.badge}</span>
      )}

      {/* Icon + Name + ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: accent.bg, border: `1px solid ${accent.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={accent.hex} />
        </div>
        <div>
          <div style={{ color: active ? '#fff' : C.muted, fontWeight: 700, fontSize: 15 }}>{plan.name}</div>
          <div style={{ color: C.dim, fontSize: 11 }}>ID #{plan.id} · {plan.accent_color}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[
          { label: 'Price', value: `LKR ${plan.price_lkr}` },
          { label: 'Data',  value: fmtData(plan.data_gb) },
          { label: 'Devices', value: `${plan.devices} devices` },
          { label: 'Validity', value: `${plan.validity_days} days` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '8px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ color: C.dim, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
            <div style={{ color: active ? accent.hex : C.muted, fontWeight: 700, fontSize: 13 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Status pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, letterSpacing: 0.5,
          background: active ? 'rgba(74,222,128,0.1)'  : 'rgba(255,255,255,0.04)',
          border:     active ? '1px solid rgba(74,222,128,0.28)' : '1px solid rgba(255,255,255,0.07)',
          color:      active ? '#4ade80' : C.dim,
        }}>{active ? 'Active' : 'Inactive'}</span>
        <div style={{ color: C.dim, fontSize: 11 }}>
          Updated {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>

        {/* Edit */}
        <button onClick={() => onEdit(plan)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '9px', borderRadius: 10,
          background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)',
          color: C.cyan, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,245,255,0.14)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,245,255,0.06)' }}
        ><Pencil size={12} /> Edit</button>

        {/* Toggle Active */}
        <button onClick={handleToggle} disabled={toggling} title={active ? 'Deactivate' : 'Activate'} style={{
          width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10,
          background: active ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.04)',
          border: active ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.08)',
          color: active ? '#4ade80' : C.dim,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = active ? 'rgba(74,222,128,0.14)' : 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.04)' }}
        >
          {toggling
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />
          }
        </button>

        {/* Delete */}
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} title="Delete plan" style={{
            width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10,
            background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171', cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.16)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)' }}
          ><Trash2 size={13} /></button>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => { onDelete(plan.id); setConfirmDel(false) }} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
              background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.4)',
              color: '#f87171', cursor: 'pointer',
            }}>Delete</button>
            <button onClick={() => setConfirmDel(false)} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: C.muted, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// ManagePlans — main exported component
// =============================================================================
export default function ManagePlans({ showToast }) {
  const [plans,      setPlans]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showModal,  setShowModal]  = useState(false)
  const [editPlan,   setEditPlan]   = useState(null) // null = add, object = edit

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/admin/plans')
      setPlans(data.plans || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleSave = async () => {
    setShowModal(false)
    setEditPlan(null)
    await fetchPlans()
    showToast?.(editPlan ? 'Plan updated successfully!' : 'Plan created successfully!', 'success')
  }

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/admin/plans/${id}`, { method: 'DELETE' })
      showToast?.('Plan deleted.', 'success')
      fetchPlans()
    } catch (err) {
      showToast?.(err.message, 'error')
    }
  }

  const handleToggle = async (plan) => {
    try {
      await apiFetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: plan.is_active ? 0 : 1 }),
      })
      showToast?.(`Plan ${plan.is_active ? 'deactivated' : 'activated'}.`, 'success')
      fetchPlans()
    } catch (err) {
      showToast?.(err.message, 'error')
    }
  }

  const activeCnt   = plans.filter(p => p.is_active).length
  const inactiveCnt = plans.length - activeCnt

  return (
    <>
      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 4 }}>
            Manage{' '}
            <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Plans
            </span>
          </h2>
          <p style={{ color: C.dim, fontSize: 12 }}>
            {loading ? 'Loading…' : `${plans.length} total · ${activeCnt} active · ${inactiveCnt} inactive`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchPlans} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10,
            background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.18)',
            color: C.cyan, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,245,255,0.06)'}
          ><RefreshCw size={13} /> Refresh</button>
          <button onClick={() => { setEditPlan(null); setShowModal(true) }} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(0,245,255,0.12),rgba(191,0,255,0.12))',
            border: '1px solid rgba(0,245,255,0.35)',
            color: C.cyan, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 0 14px rgba(0,245,255,0.08)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.2),rgba(191,0,255,0.2))' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.12),rgba(191,0,255,0.12))' }}
          ><Plus size={14} /> Add Plan</button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
          borderRadius: 12, marginBottom: 20,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
          color: '#f87171', fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={15} />
          Could not load plans: {error}
          <button onClick={fetchPlans} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              background: 'rgba(7,17,28,0.6)', borderRadius: 20, padding: 22,
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', gap: 14,
              animation: 'pulse 1.8s ease-in-out infinite',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} />
                  <div style={{ height: 10, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[0, 1, 2, 3].map(j => (
                  <div key={j} style={{ height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
              <div style={{ height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && plans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <Star size={48} color="rgba(0,245,255,0.12)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: C.muted, fontSize: 15, marginBottom: 8 }}>No plans yet</p>
          <p style={{ color: C.dim, fontSize: 13 }}>Click "Add Plan" to create your first VPN subscription plan.</p>
        </div>
      )}

      {/* ── Plan grid ── */}
      {!loading && plans.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map(plan => (
            <PlanAdminCard
              key={plan.id}
              plan={plan}
              onEdit={(p) => { setEditPlan(p); setShowModal(true) }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* ── Info callout ── */}
      {!loading && plans.length > 0 && (
        <div style={{
          marginTop: 24, padding: '12px 18px', borderRadius: 12,
          background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.12)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle size={14} color={C.cyan} style={{ flexShrink: 0 }} />
          <p style={{ color: C.muted, fontSize: 12 }}>
            Only <strong style={{ color: C.cyan }}>active</strong> plans are visible to customers on the landing page and order form.
            Changes take effect immediately — no redeploy needed.
          </p>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <PlanFormModal
          plan={editPlan}
          onClose={() => { setShowModal(false); setEditPlan(null) }}
          onSave={handleSave}
        />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </>
  )
}
