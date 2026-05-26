// =============================================================================
// AdminDashboard.jsx  –  Fully functional, Firestore-ready
// ApexNet LK · Admin Portal
// =============================================================================
//
// ── Firestore Real-time Integration ─────────────────────────────────────────
// To enable live Firebase sync:
//   1. npm install firebase
//   2. Create src/firebase/config.js with your project credentials
//   3. Uncomment every line marked [FIREBASE] below
//
import { db } from '../firebase'
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
// =============================================================================

// ── 3x-ui Backend Integration ─────────────────────────────────────────────────
import { useVpnStats }    from '../hooks/useVpnStats'
import CreateVpnModal    from '../components/CreateVpnModal'
// =============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Users, Wifi, TrendingUp, Server, LogOut,
  Activity, Bell, RefreshCw, Download,
  ArrowUpRight, ArrowDownRight, Package, Lock,
  Plus, Trash2, RotateCcw, Search, X,
  Phone, User, Globe, Zap, Eye, EyeOff, Settings,
  AlertCircle, Clock, CheckCircle, Radio,
  ChevronDown, BarChart2, Mail,
} from 'lucide-react'

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#020408',
  card:    '#07111c',
  surface: '#0d1b2a',
  border:  '#1a2d40',
  cyan:    '#00f5ff',
  purple:  '#bf00ff',
  green:   '#4ade80',
  orange:  '#f97316',
  red:     '#f87171',
  text:    '#e2e8f0',
  muted:   '#94a3b8',
  dim:     '#475569',
}

// ─── Plan options ─────────────────────────────────────────────────────────────
const ISP_PACKAGES = [
  'Dialog Router Zoom 724',
  'Dialog Mobile TikTok 997',
  'SLT Netflix',
  'Mobitel Zoom',
  'Airtel Unlimited',
]

const DATA_LIMITS = [
  { value: '5GB',       label: '5 GB',      sub: '1-Day Free Trial', totalGB: 5    },
  { value: '150GB',     label: '150 GB',    sub: 'Standard',          totalGB: 150  },
  { value: '300GB',     label: '300 GB',    sub: 'Popular',           totalGB: 300  },
  { value: '600GB',     label: '600 GB',    sub: 'Power User',        totalGB: 600  },
  { value: 'Unlimited', label: 'Unlimited', sub: 'No Limits',         totalGB: null },
]

const DURATION_OPTIONS = [7, 14, 30, 60, 90]

// LKR price per plan / month (used for revenue calculation)
const PRICE_MAP = {
  '5GB': 0, '150GB': 850, '300GB': 1500, '600GB': 2500, 'Unlimited': 3500,
}

// ─── Initial mock orders ──────────────────────────────────────────────────────
const INITIAL_ORDERS = [
  {
    id: 'ORD-0091', name: 'Kamal Perera',      whatsapp: '+94 77 123 4567',
    ispPackage: 'Dialog Router Zoom 724',       dataLimit: '300GB',
    currentUsage: 142, totalLimit: 300,
    status: 'Active',  startDate: '2026-05-07', expiryDate: '2026-06-04',
  },
  {
    id: 'ORD-0090', name: 'Nimal Silva',        whatsapp: '+94 71 987 6543',
    ispPackage: 'SLT Netflix',                  dataLimit: 'Unlimited',
    currentUsage: 0,   totalLimit: null,
    status: 'Active',  startDate: '2026-05-01', expiryDate: '2026-05-31',
  },
  {
    id: 'ORD-0089', name: 'Amali Fernando',     whatsapp: '+94 76 234 5678',
    ispPackage: 'Mobitel Zoom',                 dataLimit: '150GB',
    currentUsage: 98,  totalLimit: 150,
    status: 'Pending', startDate: '2026-05-20', expiryDate: '2026-06-19',
  },
  {
    id: 'ORD-0088', name: 'Ruwan Bandara',      whatsapp: '+94 78 345 6789',
    ispPackage: 'Airtel Unlimited',             dataLimit: '600GB',
    currentUsage: 310, totalLimit: 600,
    status: 'Active',  startDate: '2026-04-28', expiryDate: '2026-05-28',
  },
  {
    id: 'ORD-0087', name: 'Priya Jayasinghe',   whatsapp: '+94 70 456 7890',
    ispPackage: 'Dialog Mobile TikTok 997',     dataLimit: '5GB',
    currentUsage: 4,   totalLimit: 5,
    status: 'Trial',   startDate: '2026-05-21', expiryDate: '2026-05-22',
  },
  {
    id: 'ORD-0086', name: 'Lahiru Madusanka',   whatsapp: '+94 75 567 8901',
    ispPackage: 'Dialog Router Zoom 724',       dataLimit: 'Unlimited',
    currentUsage: 0,   totalLimit: null,
    status: 'Expired', startDate: '2026-04-01', expiryDate: '2026-04-30',
  },
  {
    id: 'ORD-0085', name: 'Kasun Rajapaksa',    whatsapp: '+94 77 678 9012',
    ispPackage: 'SLT Netflix',                  dataLimit: '300GB',
    currentUsage: 265, totalLimit: 300,
    status: 'Active',  startDate: '2026-04-24', expiryDate: '2026-05-24',
  },
  {
    id: 'ORD-0084', name: 'Dinesh Kumara',      whatsapp: '+94 76 789 0123',
    ispPackage: 'Mobitel Zoom',                 dataLimit: '150GB',
    currentUsage: 12,  totalLimit: 150,
    status: 'Active',  startDate: '2026-05-15', expiryDate: '2026-06-14',
  },
]

// ─── Initial mock servers ─────────────────────────────────────────────────────
const INITIAL_SERVERS = [
  { id: 'sg-01', name: 'SG-Prime-01', region: 'Singapore',  load: 42, ping: '8ms',  status: 'Online',    activeUsers: 164 },
  { id: 'jp-02', name: 'JP-Turbo-02', region: 'Tokyo',       load: 87, ping: '22ms', status: 'High Load', activeUsers: 89  },
  { id: 'us-03', name: 'US-Core-03',  region: 'Los Angeles', load: 56, ping: '145ms',status: 'Online',    activeUsers: 72  },
  { id: 'eu-04', name: 'EU-Nexus-04', region: 'Frankfurt',   load: 31, ping: '180ms',status: 'Online',    activeUsers: 38  },
  { id: 'in-05', name: 'IN-Node-05',  region: 'Mumbai',      load: 89, ping: '18ms', status: 'High Load', activeUsers: 91  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDaysLeft  = (exp) => Math.ceil((new Date(exp) - new Date()) / 86400000)
const getUsagePct  = (u, t) => t === null ? 0 : Math.min(100, Math.round((u / t) * 100))
const getUsageClr  = (p) => p >= 90 ? C.red : p >= 70 ? C.orange : C.cyan
const getDaysClr   = (d) => d <= 0 ? C.red : d <= 3 ? C.red : d <= 7 ? C.orange : C.green
const todayStr     = () => new Date().toISOString().split('T')[0]
const addDays      = (base, n) => { const d = base ? new Date(base) : new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const genId        = () => `ORD-${Math.floor(1000 + Math.random() * 8999)}`
const fmtRevenue   = (lkr) => lkr >= 1000 ? `LKR ${(lkr / 1000).toFixed(1)}K` : `LKR ${lkr}`

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    Active:      { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)',  color: '#4ade80' },
    Pending:     { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  color: '#fb923c' },
    Trial:       { bg: 'rgba(0,245,255,0.08)', border: 'rgba(0,245,255,0.25)', color: C.cyan    },
    Expired:     { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: C.red    },
    Online:      { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)',  color: '#4ade80' },
    'High Load': { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  color: '#fb923c' },
    Offline:     { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: C.red    },
  }
  const s = cfg[status] || cfg.Pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      letterSpacing: 0.5, whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

// ─── LoadBar ──────────────────────────────────────────────────────────────────
function LoadBar({ value }) {
  const clr = value >= 80 ? C.orange : value >= 60 ? C.purple : C.cyan
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, borderRadius: 999,
          background: `linear-gradient(90deg,${clr}88,${clr})`,
          boxShadow: `0 0 8px ${clr}55`, transition: 'width 1s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: clr, fontWeight: 700, width: 34, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────
function UsageBar({ used, total }) {
  if (total === null) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)',
      }}>
        <Zap size={10} color={C.cyan} />
        <span style={{ fontSize: 11, color: C.cyan, fontWeight: 600 }}>Unlimited Plan</span>
      </div>
    )
  }
  const pct = getUsagePct(used, total)
  const clr = getUsageClr(pct)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: C.muted }}>{used} GB / {total} GB used</span>
        <span style={{ fontSize: 11, color: clr, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 999,
          background: `linear-gradient(90deg,${clr}88,${clr})`,
          boxShadow: `0 0 8px ${clr}55`, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, up, Icon, color, glow }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(13,27,42,0.95)' : 'rgba(7,17,28,0.85)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${hov ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 20, padding: '24px 22px',
        transition: 'all 0.3s ease',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hov ? `0 0 30px ${glow},0 16px 40px rgba(0,0,0,0.4)` : '0 8px 24px rgba(0,0,0,0.3)',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: glow,
          border: `1px solid ${color}30`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: `0 0 16px ${glow}`,
        }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 999,
          background: up ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${up ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          {up ? <ArrowUpRight size={12} color="#4ade80" /> : <ArrowDownRight size={12} color={C.red} />}
          <span style={{ fontSize: 11, fontWeight: 700, color: up ? '#4ade80' : C.red }}>{delta}</span>
        </div>
      </div>
      <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, fontFamily: "'Orbitron',monospace", marginBottom: 4 }}>{value}</div>
      <div style={{ color: C.dim, fontSize: 12, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, onExtend, onDelete }) {
  const daysLeft  = getDaysLeft(order.expiryDate)
  const daysClr   = getDaysClr(daysLeft)
  const [hov, setHov]         = useState(false)
  const [confirm, setConfirm] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirm(false) }}
      style={{
        background: hov ? 'rgba(10,22,36,0.98)' : 'rgba(7,17,28,0.85)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${hov ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 20, padding: '20px',
        transition: 'all 0.3s ease',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? '0 0 24px rgba(0,245,255,0.07),0 16px 40px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: 14, position: 'relative',
      }}
    >
      {/* ── Row 1: ID + status + delete ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: C.purple, fontWeight: 700, letterSpacing: 1 }}>#{order.id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={order.status} />
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              title="Delete order"
              style={{
                width: 26, height: 26, borderRadius: 7,
                border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)',
                color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.18)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)' }}
            ><Trash2 size={11} /></button>
          ) : (
            <div style={{ display: 'flex', gap: 5, animation: 'fadeIn 0.15s ease' }}>
              <button onClick={() => onDelete(order.id)} style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)',
                color: C.red, cursor: 'pointer',
              }}>Delete</button>
              <button onClick={() => setConfirm(false)} style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: C.muted, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Name + WhatsApp ── */}
      <div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{order.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.dim, fontSize: 11 }}>
          <Phone size={10} color={C.dim} />{order.whatsapp}
        </div>
      </div>

      {/* ── Row 3: ISP package ── */}
      <div style={{
        padding: '6px 10px', borderRadius: 8,
        background: 'rgba(191,0,255,0.06)', border: '1px solid rgba(191,0,255,0.14)',
        fontSize: 11, color: C.muted, fontWeight: 500,
      }}>{order.ispPackage}</div>

      {/* ── Row 4: Usage bar ── */}
      <UsageBar used={order.currentUsage} total={order.totalLimit} />

      {/* ── Row 5: Days left + Extend ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999,
          background: `${daysClr}12`, border: `1px solid ${daysClr}33`,
        }}>
          <Clock size={10} color={daysClr} />
          <span style={{ fontSize: 11, color: daysClr, fontWeight: 700 }}>
            {daysLeft <= 0 ? 'Expired' : `${daysLeft} Day${daysLeft === 1 ? '' : 's'} Left`}
          </span>
        </div>
        <button
          onClick={() => onExtend(order.id, 30)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
            color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.18)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.2)' }}
        ><RotateCcw size={11} /> Extend 30d</button>
      </div>
    </div>
  )
}

// ─── AddCustomerModal ─────────────────────────────────────────────────────────
function AddCustomerModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', whatsapp: '', email: '',
    ispPackage: ISP_PACKAGES[0],
    dataLimit: DATA_LIMITS[2].value, // default: 300GB
    duration: 30,
  })
  const [errors,  setErrors]  = useState({})
  const [focused, setFocused] = useState('')

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const setF = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Customer name is required.'
    if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp number is required.'
    else if (!/^[\d\s+\-()]{7,20}$/.test(form.whatsapp.trim())) e.whatsapp = 'Enter a valid phone number.'
    
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address.'
    }
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    await onAdd({
      name:         form.name.trim(),
      whatsapp:     form.whatsapp.trim(),
      email:        form.email.trim(),
      ispPackage:   form.ispPackage,
      dataLimit:    form.dataLimit,
      duration:     Number(form.duration),
    })
    onClose()
  }

  const inp = (err, field) => ({
    width: '100%', padding: '12px 12px 12px 40px',
    background: 'rgba(2,4,8,0.8)', color: C.text,
    border: `1px solid ${err ? C.red : focused === field ? C.cyan : 'rgba(0,245,255,0.15)'}`,
    borderRadius: 10, fontSize: 13, outline: 'none',
    boxShadow: focused === field ? '0 0 16px rgba(0,245,255,0.15)' : 'none',
    transition: 'all 0.25s', boxSizing: 'border-box',
  })

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(0,245,255,0.14)', borderRadius: 28, padding: '36px',
        width: '100%', maxWidth: 500,
        boxShadow: '0 0 60px rgba(0,245,255,0.08),0 32px 80px rgba(0,0,0,0.8)',
        animation: 'slideUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900, color: '#fff' }}>
              Add{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Customer</span>
            </h2>
            <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>Create a new VPN subscription</p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
          }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Customer Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer Name</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text" placeholder="e.g. Kamal Perera"
                value={form.name}
                onChange={e => setF('name', e.target.value)}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.name, 'name')}
              />
              <User size={14} color={focused === 'name' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
            {errors.name && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.name}</p>}
          </div>

          {/* WhatsApp */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>WhatsApp Number</label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel" placeholder="+94 77 123 4567"
                value={form.whatsapp}
                onChange={e => setF('whatsapp', e.target.value)}
                onFocus={() => setFocused('whatsapp')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.whatsapp, 'whatsapp')}
              />
              <Phone size={14} color={focused === 'whatsapp' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
            {errors.whatsapp && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.whatsapp}</p>}
          </div>

          {/* Email Address (Optional) */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email Address (Optional)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email" placeholder="customer@gmail.com"
                value={form.email}
                onChange={e => setF('email', e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.email, 'email')}
              />
              <Mail size={14} color={focused === 'email' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
            {errors.email && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.email}</p>}
          </div>

          {/* ISP Package */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>ISP Package</label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.ispPackage}
                onChange={e => setF('ispPackage', e.target.value)}
                onFocus={e => e.target.style.borderColor = C.cyan}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
                style={{
                  width: '100%', padding: '12px 36px 12px 12px',
                  background: 'rgba(2,4,8,0.8)', color: C.text,
                  border: '1px solid rgba(0,245,255,0.15)',
                  borderRadius: 10, fontSize: 13, outline: 'none',
                  appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                  transition: 'border-color 0.25s', boxSizing: 'border-box',
                }}
              >
                {ISP_PACKAGES.map(p => <option key={p} value={p} style={{ background: '#07111c' }}>{p}</option>)}
              </select>
              <ChevronDown size={14} color={C.cyan} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Data Limit */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Data Limit</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {DATA_LIMITS.map(opt => {
                const sel = form.dataLimit === opt.value
                return (
                  <div
                    key={opt.value}
                    onClick={() => setF('dataLimit', opt.value)}
                    style={{
                      padding: '10px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      border: `1px solid ${sel ? C.cyan : 'rgba(255,255,255,0.08)'}`,
                      background: sel ? 'rgba(0,245,255,0.07)' : 'rgba(255,255,255,0.02)',
                      boxShadow: sel ? '0 0 14px rgba(0,245,255,0.15)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: sel ? C.cyan : C.text }}>{opt.label}</div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map(d => {
                const sel = form.duration === d
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setF('duration', d)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${sel ? C.purple : 'rgba(255,255,255,0.08)'}`,
                      background: sel ? 'rgba(191,0,255,0.1)' : 'rgba(255,255,255,0.02)',
                      color: sel ? C.purple : C.muted,
                      fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                    }}
                  >{d} days</button>
                )
              })}
            </div>
            <p style={{ color: C.dim, fontSize: 11, marginTop: 8 }}>
              Expires on: <span style={{ color: C.cyan }}>{addDays(null, form.duration)}</span>
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))',
              border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
              fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.3s', boxShadow: '0 0 24px rgba(0,245,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.22),rgba(191,0,255,0.22))'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))'; e.currentTarget.style.transform = 'translateY(0)' }}
          ><Plus size={16} /> Add Customer</button>
        </form>
      </div>
    </div>
  )
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────
function OverviewTab({ orders, servers, stats, onViewOrders, onAddCustomer, onExtend }) {
  const recent       = useMemo(() => [...orders].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5), [orders])
  const healthyCount = servers.filter(s => s.status === 'Online').length

  return (
    <>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>

        {/* Recent Orders */}
        <div style={{ background: 'rgba(7,17,28,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,245,255,0.08)', borderRadius: 24, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={15} color={C.cyan} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Recent Orders</div>
                <div style={{ color: C.dim, fontSize: 11 }}>Latest customer activity</div>
              </div>
            </div>
            <button onClick={onViewOrders} style={{ fontSize: 11, color: C.cyan, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div>
            {recent.map((o, i) => {
              const d   = getDaysLeft(o.expiryDate)
              const clr = getDaysClr(d)
              return (
                <div key={o.id} style={{ padding: '13px 24px', borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: C.purple, fontWeight: 700 }}>#{o.id}</span>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{o.name}</span>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: C.dim }}>{o.ispPackage} · {o.dataLimit}</span>
                    <span style={{ fontSize: 11, color: clr, fontWeight: 600 }}>{d <= 0 ? 'Expired' : `${d}d left`}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Server Fleet */}
        <div style={{ background: 'rgba(7,17,28,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(191,0,255,0.08)', borderRadius: 24, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(191,0,255,0.08)', border: '1px solid rgba(191,0,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={15} color={C.purple} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Server Fleet</div>
                <div style={{ color: C.dim, fontSize: 11 }}>Global node status</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ade80', fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              {healthyCount}/{servers.length} Healthy
            </div>
          </div>
          <div>
            {servers.map((srv, i) => (
              <div key={srv.id} style={{ padding: '13px 24px', borderBottom: i < servers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(191,0,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{srv.name}</span>
                      <StatusBadge status={srv.status} />
                    </div>
                    <div style={{ fontSize: 11, color: C.dim }}>{srv.region} · {srv.ping} · {srv.activeUsers} users</div>
                  </div>
                </div>
                <LoadBar value={srv.load} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 20, padding: '18px 24px', background: 'rgba(7,17,28,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>Quick Actions:</span>
        {[
          { label: 'Add Customer', Icon: Plus,   color: C.cyan,   action: onAddCustomer },
          { label: 'View Logs',    Icon: Eye,    color: C.orange, action: null },
          { label: 'Security',     Icon: Lock,   color: C.green,  action: null },
          { label: 'New Server',   Icon: Globe,  color: C.purple, action: null },
          { label: 'Boost Nodes',  Icon: Zap,    color: C.red,    action: null },
        ].map(({ label, Icon, color, action }, i) => (
          <button key={i} onClick={action || undefined} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10,
            background: `${color}0d`, border: `1px solid ${color}25`,
            color, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}1a`; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = `${color}0d`; e.currentTarget.style.transform = 'translateY(0)' }}
          ><Icon size={13} /> {label}</button>
        ))}
      </div>
    </>
  )
}

// ─── OrdersTab ────────────────────────────────────────────────────────────────
function OrdersTab({ orders, onExtend, onDelete, onAdd }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const FILTERS = ['All', 'Active', 'Pending', 'Trial', 'Expired']

  const counts = useMemo(() => {
    const c = { All: orders.length }
    FILTERS.slice(1).forEach(f => { c[f] = orders.filter(o => o.status === f).length })
    return c
  }, [orders])

  const filtered = useMemo(() =>
    orders.filter(o => {
      const q = search.toLowerCase()
      const matchQ = !q || o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.whatsapp.includes(q)
      const matchF = filter === 'All' || o.status === filter
      return matchQ && matchF
    }), [orders, search, filter])

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <input
            type="text"
            placeholder="Search by name, ID or number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px',
              background: 'rgba(7,17,28,0.85)', color: C.text,
              border: '1px solid rgba(0,245,255,0.15)', borderRadius: 12,
              fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s',
            }}
            onFocus={e => e.target.style.borderColor = C.cyan}
            onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.15)'}
          />
          <Search size={14} color={C.dim} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: filter === f ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: filter === f ? C.cyan : C.muted,
            }}>
              {f} <span style={{ opacity: 0.7 }}>({counts[f] ?? 0})</span>
            </button>
          ))}
        </div>

        <button onClick={onAdd} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 12,
          background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)',
          color: C.cyan, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,245,255,0.16)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,245,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}
        ><Plus size={15} /> Add Customer</button>
      </div>

      <div style={{ color: C.dim, fontSize: 12, marginBottom: 16 }}>
        Showing <span style={{ color: C.cyan, fontWeight: 700 }}>{filtered.length}</span> of {orders.length} orders
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <Package size={44} color="rgba(0,245,255,0.12)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: C.dim, fontSize: 14 }}>No orders match your filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {filtered.map(o => (
            <OrderCard key={o.id} order={o} onExtend={onExtend} onDelete={onDelete} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── ServersTab ───────────────────────────────────────────────────────────────
function ServersTab({ servers }) {
  const healthy   = servers.filter(s => s.status === 'Online').length
  const totalUser = servers.reduce((sum, s) => sum + s.activeUsers, 0)
  const avgLoad   = Math.round(servers.reduce((sum, s) => sum + s.load, 0) / servers.length)

  return (
    <>
      {/* Summary mini-stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Nodes',  value: servers.length,               color: C.cyan   },
          { label: 'Online',       value: healthy,                      color: C.green  },
          { label: 'High Load',    value: servers.length - healthy,     color: C.orange },
          { label: 'Active Users', value: totalUser,                    color: C.purple },
          { label: 'Avg Load',     value: `${avgLoad}%`,                color: C.muted  },
        ].map(({ label, value, color }, i) => (
          <div key={i} style={{
            background: 'rgba(7,17,28,0.85)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px',
          }}>
            <div style={{ color, fontSize: 22, fontWeight: 800, fontFamily: "'Orbitron',monospace", marginBottom: 4 }}>{value}</div>
            <div style={{ color: C.dim, fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Server cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
        {servers.map(srv => {
          const isHigh = srv.status === 'High Load'
          return (
            <div key={srv.id} style={{
              background: 'rgba(7,17,28,0.85)', backdropFilter: 'blur(20px)',
              border: `1px solid ${isHigh ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 20, padding: '22px', transition: 'all 0.3s',
              boxShadow: isHigh ? '0 0 24px rgba(249,115,22,0.08)' : 'none',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = isHigh ? 'rgba(249,115,22,0.35)' : 'rgba(0,245,255,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isHigh ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>{srv.name}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{srv.region}</div>
                </div>
                <StatusBadge status={srv.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Ping',         value: srv.ping },
                  { label: 'Active Users', value: srv.activeUsers },
                ].map(({ label, value }, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>CPU / Load</span>
                </div>
                <LoadBar value={srv.load} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────
function SettingsTab({ onOpenCreds, onOpenPricing, onOpenFirebase, onBackupExport }) {
  const items = [
    { Icon: Lock,       label: 'Admin Credentials',    desc: 'Change admin username and password',           color: C.cyan,   action: onOpenCreds },
    { Icon: Bell,       label: 'Notifications',         desc: 'WhatsApp & email alerts for new orders',       color: C.purple, action: null },
    { Icon: BarChart2,  label: 'Pricing Configuration', desc: 'Update plan prices and duration options',      color: C.green,  action: onOpenPricing },
    { Icon: Download,   label: 'Backup & Export',       desc: 'Export order data as CSV or JSON',             color: C.orange, action: onBackupExport },
    { Icon: Globe,      label: 'Firebase Configuration',desc: 'Connect Firestore for real-time data sync',    color: C.red,    action: onOpenFirebase },
    { Icon: Eye,        label: 'Security Audit Log',    desc: 'View all admin login and action events',       color: C.muted,  action: null },
  ]
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          Portal{' '}
          <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Settings</span>
        </h2>
        <p style={{ color: C.dim, fontSize: 13 }}>Manage portal configuration and integrations.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 24 }}>
        {items.map(({ Icon, label, desc, color, action }, i) => (
          <div key={i} style={{
            background: 'rgba(7,17,28,0.85)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '22px',
            transition: 'all 0.3s', cursor: 'pointer',
          }}
            onClick={action || undefined}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}35`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 20px ${color}10` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <ArrowUpRight size={16} color={C.dim} />
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{label}</div>
            <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Firebase integration notice */}
      <div style={{ padding: '20px 24px', background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.12)', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Radio size={18} color={C.cyan} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ color: C.cyan, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Firebase Firestore — Real-time Sync Ready
            </div>
            <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.7 }}>
              This dashboard includes{' '}
              <code style={{ color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>onSnapshot</code>{' '}
              listener placeholders for the{' '}
              <code style={{ color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>orders</code>{' '}
              and{' '}
              <code style={{ color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>vpn_servers</code>{' '}
              collections. Install Firebase and uncomment every{' '}
              <code style={{ color: C.cyan, background: 'rgba(0,245,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>[FIREBASE]</code>{' '}
              line at the top of <code style={{ color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>AdminDashboard.jsx</code>{' '}
              to activate live sync with zero additional code changes.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── AdminCredentialsModal ───────────────────────────────────────────────────
function AdminCredentialsModal({ onClose, onShowToast }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })
  const [errors, setErrors] = useState({})
  const [focused, setFocused] = useState('')

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const setF = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    const activePass = localStorage.getItem('apexnet_admin_password') || 'password123'
    if (!form.currentPassword) {
      e.currentPassword = 'Current password is required.'
    } else if (form.currentPassword !== activePass) {
      e.currentPassword = 'Incorrect current password.'
    }
    if (!form.newUsername.trim()) {
      e.newUsername = 'New username is required.'
    }
    if (!form.newPassword) {
      e.newPassword = 'New password is required.'
    } else if (form.newPassword.length < 6) {
      e.newPassword = 'Password must be at least 6 characters.'
    }
    if (form.newPassword !== form.confirmNewPassword) {
      e.confirmNewPassword = 'Passwords do not match.'
    }
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    localStorage.setItem('apexnet_admin_username', form.newUsername.trim())
    localStorage.setItem('apexnet_admin_password', form.newPassword)
    onShowToast('Admin credentials updated successfully!')
    onClose()
  }

  const inp = (err, field) => ({
    width: '100%', padding: '12px 40px 12px 40px',
    background: 'rgba(2,4,8,0.8)', color: C.text,
    border: `1px solid ${err ? C.red : focused === field ? C.cyan : 'rgba(0,245,255,0.15)'}`,
    borderRadius: 10, fontSize: 13, outline: 'none',
    boxShadow: focused === field ? '0 0 16px rgba(0,245,255,0.15)' : 'none',
    transition: 'all 0.25s', boxSizing: 'border-box',
  })

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(0,245,255,0.14)', borderRadius: 28, padding: '36px',
        width: '100%', maxWidth: 450,
        boxShadow: '0 0 60px rgba(0,245,255,0.08),0 32px 80px rgba(0,0,0,0.8)',
        animation: 'slideUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900, color: '#fff' }}>
              Admin{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Credentials</span>
            </h2>
            <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>Update portal login details</p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
          }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass.current ? 'text' : 'password'} placeholder="••••••••"
                value={form.currentPassword}
                onChange={e => setF('currentPassword', e.target.value)}
                onFocus={() => setFocused('currentPassword')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.currentPassword, 'currentPassword')}
              />
              <Lock size={14} color={focused === 'currentPassword' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
              <button
                type="button"
                onClick={() => setShowPass(p => ({ ...p, current: !p.current }))}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex' }}
              >
                {showPass.current ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.currentPassword && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.currentPassword}</p>}
          </div>

          {/* New Username */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text" placeholder="e.g. admin_new"
                value={form.newUsername}
                onChange={e => setF('newUsername', e.target.value)}
                onFocus={() => setFocused('newUsername')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.newUsername, 'newUsername')}
              />
              <User size={14} color={focused === 'newUsername' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
            {errors.newUsername && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.newUsername}</p>}
          </div>

          {/* New Password */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass.new ? 'text' : 'password'} placeholder="••••••••"
                value={form.newPassword}
                onChange={e => setF('newPassword', e.target.value)}
                onFocus={() => setFocused('newPassword')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.newPassword, 'newPassword')}
              />
              <Lock size={14} color={focused === 'newPassword' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
              <button
                type="button"
                onClick={() => setShowPass(p => ({ ...p, new: !p.new }))}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex' }}
              >
                {showPass.new ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.newPassword && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.newPassword}</p>}
          </div>

          {/* Confirm New Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass.confirm ? 'text' : 'password'} placeholder="••••••••"
                value={form.confirmNewPassword}
                onChange={e => setF('confirmNewPassword', e.target.value)}
                onFocus={() => setFocused('confirmNewPassword')}
                onBlur={() => setFocused('')}
                style={inp(!!errors.confirmNewPassword, 'confirmNewPassword')}
              />
              <Lock size={14} color={focused === 'confirmNewPassword' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
              <button
                type="button"
                onClick={() => setShowPass(p => ({ ...p, confirm: !p.confirm }))}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex' }}
              >
                {showPass.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.confirmNewPassword && <p style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.confirmNewPassword}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))',
              border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
              fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.3s', boxShadow: '0 0 24px rgba(0,245,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.22),rgba(191,0,255,0.22))'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))'; e.currentTarget.style.transform = 'translateY(0)' }}
          ><CheckCircle size={16} /> Save Changes</button>
        </form>
      </div>
    </div>
  )
}

// ─── PricingConfigurationModal ────────────────────────────────────────────────
function PricingConfigurationModal({ prices, onSave, onClose, onShowToast }) {
  const [formPrices, setFormPrices] = useState({ ...prices })
  const [focused, setFocused] = useState('')

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (ev) => {
    ev.preventDefault()
    onSave(formPrices)
    onShowToast('Pricing configuration updated successfully!')
    onClose()
  }

  const handlePriceChange = (key, val) => {
    const num = val.replace(/\D/g, '')
    setFormPrices(p => ({ ...p, [key]: num === '' ? 0 : Number(num) }))
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(0,245,255,0.14)', borderRadius: 28, padding: '36px',
        width: '100%', maxWidth: 480,
        boxShadow: '0 0 60px rgba(0,245,255,0.08),0 32px 80px rgba(0,0,0,0.8)',
        animation: 'slideUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900, color: '#fff' }}>
              Pricing{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Configuration</span>
            </h2>
            <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>Configure plan LKR prices</p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
          }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            {DATA_LIMITS.map(limit => {
              const k = limit.value
              const isFocused = focused === k
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{limit.label}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{limit.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>LKR</span>
                    <input
                      type="text"
                      value={formPrices[k] ?? 0}
                      onChange={e => handlePriceChange(k, e.target.value)}
                      onFocus={() => setFocused(k)}
                      onBlur={() => setFocused('')}
                      style={{
                        width: 100, padding: '8px 12px',
                        background: 'rgba(2,4,8,0.8)', color: C.text,
                        border: `1px solid ${isFocused ? C.cyan : 'rgba(0,245,255,0.15)'}`,
                        borderRadius: 8, fontSize: 13, fontWeight: 700, outline: 'none',
                        textAlign: 'right', transition: 'all 0.25s',
                        boxShadow: isFocused ? '0 0 12px rgba(0,245,255,0.15)' : 'none',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))',
              border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
              fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.3s', boxShadow: '0 0 24px rgba(0,245,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.22),rgba(191,0,255,0.22))'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))'; e.currentTarget.style.transform = 'translateY(0)' }}
          ><BarChart2 size={16} /> Update Pricing</button>
        </form>
      </div>
    </div>
  )
}

// ─── FirebaseConfigurationModal ──────────────────────────────────────────────
function FirebaseConfigurationModal({ onClose, onShowToast }) {
  const [form, setForm] = useState({
    projectId: localStorage.getItem('apexnet_firebase_project_id') || '',
    apiKey: localStorage.getItem('apexnet_firebase_api_key') || '',
    authDomain: localStorage.getItem('apexnet_firebase_auth_domain') || '',
  })
  const [focused, setFocused] = useState('')

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const setF = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    localStorage.setItem('apexnet_firebase_project_id', form.projectId.trim())
    localStorage.setItem('apexnet_firebase_api_key', form.apiKey.trim())
    localStorage.setItem('apexnet_firebase_auth_domain', form.authDomain.trim())
    onShowToast('Firebase Configured Successfully')
    onClose()
  }

  const inp = (field) => ({
    width: '100%', padding: '12px 12px 12px 40px',
    background: 'rgba(2,4,8,0.8)', color: C.text,
    border: `1px solid ${focused === field ? C.cyan : 'rgba(0,245,255,0.15)'}`,
    borderRadius: 10, fontSize: 13, outline: 'none',
    boxShadow: focused === field ? '0 0 16px rgba(0,245,255,0.15)' : 'none',
    transition: 'all 0.25s', boxSizing: 'border-box',
  })

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(0,245,255,0.14)', borderRadius: 28, padding: '36px',
        width: '100%', maxWidth: 450,
        boxShadow: '0 0 60px rgba(0,245,255,0.08),0 32px 80px rgba(0,0,0,0.8)',
        animation: 'slideUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900, color: '#fff' }}>
              Firebase{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Configuration</span>
            </h2>
            <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>Configure live database connection</p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
          }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Project ID */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Project ID</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text" placeholder="e.g. apexnet-lk-db"
                value={form.projectId}
                onChange={e => setF('projectId', e.target.value)}
                onFocus={() => setFocused('projectId')}
                onBlur={() => setFocused('')}
                style={inp('projectId')}
              />
              <Globe size={14} color={focused === 'projectId' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text" placeholder="AIzaSyA1..."
                value={form.apiKey}
                onChange={e => setF('apiKey', e.target.value)}
                onFocus={() => setFocused('apiKey')}
                onBlur={() => setFocused('')}
                style={inp('apiKey')}
              />
              <Lock size={14} color={focused === 'apiKey' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
          </div>

          {/* Auth Domain */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Auth Domain</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text" placeholder="apexnet-lk-db.firebaseapp.com"
                value={form.authDomain}
                onChange={e => setF('authDomain', e.target.value)}
                onFocus={() => setFocused('authDomain')}
                onBlur={() => setFocused('')}
                style={inp('authDomain')}
              />
              <Globe size={14} color={focused === 'authDomain' ? C.cyan : C.dim}
                style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.25s' }} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))',
              border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
              fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.3s', boxShadow: '0 0 24px rgba(0,245,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.22),rgba(191,0,255,0.22))'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.15),rgba(191,0,255,0.15))'; e.currentTarget.style.transform = 'translateY(0)' }}
          ><Globe size={16} /> Connect to Firebase</button>
        </form>
      </div>
    </div>
  )
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard({ onLogout }) {

  // ── State ───────────────────────────────────────────────────────────────────
  const [orders,            setOrders]            = useState([])
  const [servers,           setServers]           = useState(INITIAL_SERVERS)
  const [activeTab,         setActiveTab]         = useState('overview')
  const [showLogoutModal,   setShowLogoutModal]   = useState(false)
  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showVpnModal,      setShowVpnModal]      = useState(false)
  const [showCredsModal,    setShowCredsModal]    = useState(false)
  const [showPricingModal,  setShowPricingModal]  = useState(false)
  const [showFirebaseModal, setShowFirebaseModal] = useState(false)
  const [toast,             setToast]             = useState(null)

  // ── 3x-ui Live Stats (auto-refreshes every 60 s) ────────────────────────────
  const {
    stats:   panelStats,
    loading: panelLoading,
    error:   panelError,
    refresh: refreshPanel,
  } = useVpnStats({ pollInterval: 60_000, fetchOnMount: true })

  const [prices, setPrices] = useState(() => {
    const stored = localStorage.getItem('apexnet_prices')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse apexnet_prices', e)
      }
    }
    return {
      '5GB': 0,
      '150GB': 850,
      '300GB': 1500,
      '600GB': 2500,
      'Unlimited': 3500,
    }
  })

  const savePrices = useCallback((newPrices) => {
    setPrices(newPrices)
    localStorage.setItem('apexnet_prices', JSON.stringify(newPrices))
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleBackupExport = useCallback(() => {
    const userList = orders.map(o => ({
      id: o.id,
      name: o.name,
      whatsapp: o.whatsapp,
      status: o.status,
      package: o.ispPackage,
    }))
    const backupData = {
      orders: orders,
      users: userList,
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apexnet_backup_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Data exported successfully!')
  }, [orders, showToast])

  // ── Firestore real-time listeners ───────────────────────────────────────────
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'vpn_users'), snap => {
      const list = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name || '',
          whatsapp: data.whatsapp || '',
          ispPackage: data.package || data.ispPackage || '',
          dataLimit: data.dataLimit || '',
          currentUsage: typeof data.currentUsage === 'number' ? data.currentUsage : 0,
          totalLimit: typeof data.totalLimit === 'number' || data.totalLimit === null ? data.totalLimit : null,
          status: data.status || 'Active',
          startDate: data.startDate || todayStr(),
          expiryDate: data.expiryDate || addDays(null, data.duration || 30),
        }
      })
      list.sort((a, b) => b.id.localeCompare(a.id))
      setOrders(list)
    }, err => {
      console.error('Error fetching live users: ', err)
      showToast('Failed to connect to live database.', 'error')
    })
    return () => unsubOrders()
  }, [showToast])

  const addOrder = useCallback(async (data) => {
    try {
      const limitObj = DATA_LIMITS.find(d => d.value === data.dataLimit)
      const duration = Number(data.duration) || 30
      const expiryDate = addDays(null, duration)
      
      await addDoc(collection(db, 'vpn_users'), {
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || '',
        package: data.ispPackage,
        ispPackage: data.ispPackage,
        dataLimit: data.dataLimit,
        duration: duration,
        currentUsage: 0,
        totalLimit: limitObj?.totalGB ?? null,
        status: data.dataLimit === '5GB' ? 'Trial' : 'Active',
        startDate: todayStr(),
        expiryDate,
        timestamp: serverTimestamp()
      })
      showToast('Customer added successfully!', 'success')
    } catch (err) {
      console.error('Error adding customer: ', err)
      showToast('Failed to add customer. Please check connection.', 'error')
    }
  }, [showToast])

  const extendOrder = useCallback(async (id, extraDays = 30) => {
    try {
      const o = orders.find(x => x.id === id)
      if (!o) return
      const base = getDaysLeft(o.expiryDate) < 0 ? todayStr() : o.expiryDate
      const nextExpiry = addDays(base, extraDays)
      
      await updateDoc(doc(db, 'vpn_users', id), {
        expiryDate: nextExpiry,
        status: o.dataLimit === '5GB' ? 'Trial' : 'Active'
      })
      showToast(`Subscription extended by ${extraDays} days!`, 'success')
    } catch (err) {
      console.error('Error extending subscription: ', err)
      showToast('Failed to extend subscription.', 'error')
    }
  }, [orders, showToast])

  const deleteOrder = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'vpn_users', id))
      showToast('Customer deleted successfully!', 'success')
    } catch (err) {
      console.error('Error deleting customer: ', err)
      showToast('Failed to delete customer.', 'error')
    }
  }, [showToast])

  // ── Computed stats (Firestore + live 3x-ui panel data) ─────────────────────
  const stats = useMemo(() => {
    const active  = orders.filter(o => ['Active', 'Trial'].includes(o.status))
    const revenue = active.reduce((sum, o) => sum + (prices[o.dataLimit] ?? 0), 0)
    const onlineSrv = servers.filter(s => s.status === 'Online').length
    const uptimePct = ((onlineSrv / servers.length) * 100).toFixed(2)

    // Prefer live panel counts when available; fall back to Firestore counts.
    const totalCust   = panelStats ? panelStats.totalCustomers    : orders.length
    const activeSess  = panelStats ? panelStats.activeSessions    : active.length
    const serverUsage = panelStats ? `${panelStats.totalServerUsageGB} GB` : `${uptimePct}%`

    return [
      { label: 'Total Customers',   value: totalCust,             delta: '+12%',  up: true,  Icon: Users,       color: C.cyan,    glow: 'rgba(0,245,255,0.15)' },
      { label: 'Active Sessions',   value: activeSess,            delta: '+8%',   up: true,  Icon: Wifi,        color: C.purple,  glow: 'rgba(191,0,255,0.15)' },
      { label: 'Monthly Revenue',   value: fmtRevenue(revenue),   delta: '+23%',  up: true,  Icon: TrendingUp,  color: '#4ade80', glow: 'rgba(74,222,128,0.15)' },
      {
        label: panelStats ? 'Total Server Usage' : 'Server Uptime',
        value: serverUsage,
        delta: panelStats ? `↑${panelStats.uploadGB}GB  ↓${panelStats.downloadGB}GB` : '-0.01%',
        up: true,
        Icon: Server,
        color: C.orange,
        glow: 'rgba(249,115,22,0.15)',
      },
    ]
  }, [orders, servers, prices, panelStats])

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('apexnet_isAuthenticated')
    onLogout(false)
  }

  const NAV = [
    { id: 'overview', Icon: Activity, label: 'Overview' },
    { id: 'orders',   Icon: Package,  label: 'Orders'   },
    { id: 'servers',  Icon: Server,   label: 'Servers'  },
    { id: 'settings', Icon: Settings, label: 'Settings' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(2,4,8,0.85)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,245,255,0.08)', padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/logo.png" alt="ApexNet LK" style={{ height: 38, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(0,245,255,0.5))' }} />
            <div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14, color: '#fff', letterSpacing: 1 }}>
                ApexNet{' '}
                <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LK</span>
              </div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase' }}>Admin Portal</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {NAV.map(({ id, Icon, label }) => {
              const active = activeTab === id
              return (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10,
                  background: active ? 'rgba(0,245,255,0.08)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(0,245,255,0.2)' : 'transparent'}`,
                  color: active ? C.cyan : C.muted,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = C.text }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.muted }}
                ><Icon size={15} />{label}</button>
              )
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Online</span>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.2)'; e.currentTarget.style.color = C.cyan }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = C.muted }}
            ><Bell size={15} /></button>
            <button id="admin-logout-btn" onClick={() => setShowLogoutModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)' }}
            ><LogOut size={14} /> Logout</button>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '32px 24px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>

        {/* Page heading row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 4 }}>
              Admin{' '}
              <span style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dashboard</span>
            </h1>
            <p style={{ color: C.dim, fontSize: 13 }}>
              Welcome back, Administrator · {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Create VPN Account — main CTA */}
            <button
              id="create-vpn-btn"
              onClick={() => setShowVpnModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg,rgba(0,245,255,0.12),rgba(191,0,255,0.12))',
                border: '1px solid rgba(0,245,255,0.35)',
                color: C.cyan, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 0 16px rgba(0,245,255,0.08)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.2),rgba(191,0,255,0.2))'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,245,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,245,255,0.12),rgba(191,0,255,0.12))'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,245,255,0.08)' }}
            >
              <Plus size={13} /> Create VPN
            </button>

            {/* Refresh — also refreshes panel stats */}
            <button
              onClick={() => { showToast('Refreshing live data…', 'success'); refreshPanel() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
                background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.18)',
                color: C.cyan, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,245,255,0.06)'}
            >
              <RefreshCw size={13} style={{ animation: panelLoading ? 'spin 1s linear infinite' : 'none' }} />
              {panelLoading ? 'Syncing…' : 'Refresh'}
            </button>

            <button
              onClick={handleBackupExport}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
                background: 'rgba(191,0,255,0.08)', border: '1px solid rgba(191,0,255,0.2)',
                color: C.purple, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(191,0,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(191,0,255,0.08)'}
            ><Download size={13} /> Export</button>
          </div>
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'overview' && (
          <OverviewTab
            orders={orders} servers={servers} stats={stats}
            onViewOrders={() => setActiveTab('orders')}
            onAddCustomer={() => setShowAddModal(true)}
            onExtend={extendOrder}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            onExtend={extendOrder}
            onDelete={deleteOrder}
            onAdd={() => setShowAddModal(true)}
          />
        )}
        {activeTab === 'servers'  && <ServersTab  servers={servers} />}
        {activeTab === 'settings' && (
          <SettingsTab
            onOpenCreds={() => setShowCredsModal(true)}
            onOpenPricing={() => setShowPricingModal(true)}
            onOpenFirebase={() => setShowFirebaseModal(true)}
            onBackupExport={handleBackupExport}
          />
        )}
      </main>

      {/* ── Add Customer Modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <AddCustomerModal onClose={() => setShowAddModal(false)} onAdd={addOrder} />
      )}

      {/* ── Create VPN Account Modal (3x-ui backend) ───────────────────────── */}
      {showVpnModal && (
        <CreateVpnModal
          onClose={() => setShowVpnModal(false)}
          onSuccess={(result) => {
            showToast(`VPN account created → ${result.remark}`, 'success')
          }}
        />
      )}

      {/* ── Settings Modals ─────────────────────────────────────────────────── */}
      {showCredsModal && (
        <AdminCredentialsModal onClose={() => setShowCredsModal(false)} onShowToast={showToast} />
      )}

      {showPricingModal && (
        <PricingConfigurationModal prices={prices} onSave={savePrices} onClose={() => setShowPricingModal(false)} onShowToast={showToast} />
      )}

      {showFirebaseModal && (
        <FirebaseConfigurationModal onClose={() => setShowFirebaseModal(false)} onShowToast={showToast} />
      )}

      {/* ── Logout Confirmation Modal ──────────────────────────────────────── */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'rgba(7,17,28,0.95)', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 24, padding: '36px 40px',
            maxWidth: 380, width: '90%', textAlign: 'center',
            boxShadow: '0 0 60px rgba(248,113,113,0.1),0 32px 80px rgba(0,0,0,0.8)',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <LogOut size={24} color={C.red} />
            </div>
            <h2 style={{ color: '#fff', fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Sign Out?</h2>
            <p style={{ color: C.dim, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>Your session will be terminated and you will be redirected to the login screen.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowLogoutModal(false)} style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >Cancel</button>
              <button id="confirm-logout-btn" onClick={handleLogout} style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
                color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
              >Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          background: 'rgba(7,17,28,0.95)', backdropFilter: 'blur(12px)',
          border: `1px solid ${toast.type === 'error' ? C.red : C.cyan}`,
          borderRadius: 12, padding: '14px 20px',
          boxShadow: `0 0 30px ${toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(0,245,255,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={16} color={C.red} />
          ) : (
            <CheckCircle size={16} color={C.cyan} />
          )}
          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
