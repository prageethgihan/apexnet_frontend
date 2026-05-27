import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import MyProfile from './pages/MyProfile'
import { db, auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import {
  Shield, Wifi, Zap, Globe, ChevronDown, Phone, User,
  CheckCircle, AlertCircle, MessageCircle, Lock, Server,
  ArrowRight, Cpu, Radio, Star, Package, LogOut, Rocket, Gamepad,
  Laptop, Smartphone, Monitor, HelpCircle, Share2, Copy, Check, ExternalLink, X, Menu
} from 'lucide-react'

// ─── Colour tokens ──────────────────────────────────────────────────────────
const C = {
  bg:         '#020408',
  card:       '#07111c',
  surface:    '#0d1b2a',
  border:     '#1a2d40',
  cyan:       '#00f5d4',
  purple:     '#bf00ff',
  green:      '#25d366',
  textPrimary:'#e2e8f0',
  textMuted:  '#94a3b8',
  textDim:    '#475569',
}

// ─── Data ───────────────────────────────────────────────────────────────────
const ISP_PACKAGES = [
  { value: '',                          label: 'Select your ISP package…' },
  { value: 'Dialog Router Zoom 724',    label: 'Dialog Router — Zoom 724' },
  { value: 'Dialog Mobile TikTok 997',  label: 'Dialog Mobile — TikTok 997' },
  { value: 'SLT Netflix',               label: 'SLT — Netflix' },
  { value: 'Mobitel Zoom',              label: 'Mobitel — Zoom' },
  { value: 'Airtel Unlimited',          label: 'Airtel — Unlimited' },
]

// ─── ORDER FORM: Accent colour map (keyed by plan.accent_color from DB) ─────────────
const ACCENT_MAP = {
  cyan:   { Icon: Wifi,   accent: '#00f5ff', accentBg: 'rgba(0,245,255,0.07)',  accentBorder: 'rgba(0,245,255,0.38)',  glow: 'rgba(0,245,255,0.18)'  },
  orange: { Icon: Zap,    accent: '#f97316', accentBg: 'rgba(249,115,22,0.07)', accentBorder: 'rgba(249,115,22,0.38)', glow: 'rgba(249,115,22,0.18)' },
  purple: { Icon: Globe,  accent: '#bf00ff', accentBg: 'rgba(191,0,255,0.07)',  accentBorder: 'rgba(191,0,255,0.38)',  glow: 'rgba(191,0,255,0.18)'  },
  green:  { Icon: Shield, accent: '#4ade80', accentBg: 'rgba(74,222,128,0.07)', accentBorder: 'rgba(74,222,128,0.38)', glow: 'rgba(74,222,128,0.18)' },
}
const getOrderTheme = (ac) => ACCENT_MAP[ac] || ACCENT_MAP.cyan

const ORDER_FALLBACK_PLANS = [
  { id: 1, name: 'Standard', price_lkr: 399, data_gb: 500, devices: 2, validity_days: 30, badge: null,   accent_color: 'cyan'   },
  { id: 2, name: 'MVP Lite', price_lkr: 499, data_gb: 0,   devices: 1, validity_days: 30, badge: null,   accent_color: 'green'  },
  { id: 3, name: 'VIP',      price_lkr: 649, data_gb: 800, devices: 5, validity_days: 30, badge: 'HOT',  accent_color: 'orange' },
  { id: 4, name: 'MVP Pro',  price_lkr: 899, data_gb: 0,   devices: 8, validity_days: 30, badge: 'BEST', accent_color: 'purple' },
]

const ORDER_API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const fmtOrderData = (gb) => (gb === 0 || gb === null || gb === undefined) ? 'Unlimited' : `${gb} GB`

const FEATURES = [
  { Icon: Shield, title: 'Military-Grade Encryption', desc: 'AES-256 secured tunnels' },
  { Icon: Zap,    title: 'Ultra-Fast Speeds',          desc: 'No throttling, no limits' },
  { Icon: Globe,  title: 'Global Server Network',      desc: 'Optimized Sri Lanka routes' },
  { Icon: Lock,   title: 'Zero Logs Policy',           desc: 'Your data stays private' },
]

// ─── Particles ──────────────────────────────────────────────────────────────
function Particles() {
  const pts = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left:  `${Math.random() * 100}%`,
      top:   `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
      dur:   `${4 + Math.random() * 4}s`,
      size:  Math.random() > 0.6 ? 3 : 2,
      op:    0.1 + Math.random() * 0.2,
    })), [])

  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left, top: p.top,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: C.cyan,
          opacity: p.op,
          animation: `floatPt ${p.dur} ease-in-out ${p.delay} infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar({ onLogin }) {
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    const r = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('scroll', h)
    window.addEventListener('resize', r)
    return () => {
      window.removeEventListener('scroll', h)
      window.removeEventListener('resize', r)
    }
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: isMobile ? '8px 8px' : (scrolled ? '10px 16px' : '20px 16px'),
      transition: 'padding 0.4s ease, background 0.4s ease',
    }}>
      <div style={{
        maxWidth: 1024, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 20px',
        borderRadius: 16,
        background: scrolled || isMobile ? 'rgba(7,17,28,0.85)' : 'transparent',
        backdropFilter: scrolled || isMobile ? 'blur(20px)' : 'none',
        border: scrolled || isMobile ? '1px solid rgba(0,245,212,0.12)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center' }}>
          <img
            src="/logo.png"
            alt="ApexNet LK"
            style={{
              height: isMobile ? 32 : 52,
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 8px rgba(0,245,212,0.45))',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'drop-shadow(0 0 14px rgba(0,245,212,0.75))'}
            onMouseLeave={e => e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(0,245,212,0.45))'}
          />
        </div>

        {/* Status & CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          <div style={{
            display:'flex', alignItems:'center', gap: isMobile ? 4 : 8, padding: isMobile ? '4px 8px' : '6px 14px',
            borderRadius: 999,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
          }}>
            <div style={{ width: isMobile ? 5 : 7, height: isMobile ? 5 : 7, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite' }} />
            <span style={{ color:'#4ade80', fontSize: isMobile ? 10 : 12, fontWeight: 600 }}>Online</span>
          </div>

          <button onClick={onLogin} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '6px 12px' : '8px 18px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,245,212,0.1), rgba(191,0,255,0.1))',
            border: '1px solid rgba(0,245,212,0.3)',
            color: C.cyan, fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Orbitron', monospace", letterSpacing: 0.5,
            transition: 'all 0.3s ease',
            boxShadow: '0 0 10px rgba(0,245,212,0.1)',
            whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,212,0.2), rgba(191,0,255,0.2))'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0,245,212,0.4)'
              e.currentTarget.style.borderColor = 'rgba(0,245,212,0.6)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,212,0.1), rgba(191,0,255,0.1))'
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,245,212,0.1)'
              e.currentTarget.style.borderColor = 'rgba(0,245,212,0.3)'
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Authenticated Navbar & Modals ───────────────────────────────────────────
function AuthenticatedNavbar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [showDevicesModal, setShowDevicesModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Listen to active scroll state
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Listen to window size resize for mobile rendering
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Listen to open devices event from profile or other parts
  useEffect(() => {
    const handleOpenDevices = () => setShowDevicesModal(true)
    window.addEventListener('apexnet-open-devices', handleOpenDevices)
    return () => window.removeEventListener('apexnet-open-devices', handleOpenDevices)
  }, [])

  const handleResetDevices = () => {
    // Show toast message
    window.dispatchEvent(new CustomEvent('apexnet-toast', {
      detail: { message: 'All device configurations have been reset!', type: 'success' }
    }))
    setShowDevicesModal(false)
  }

  const handleDisconnectDevice = (deviceName) => {
    window.dispatchEvent(new CustomEvent('apexnet-toast', {
      detail: { message: `${deviceName} has been disconnected!`, type: 'success' }
    }))
  }

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? '8px 12px' : (scrolled ? '10px 16px' : '16px 16px'),
        background: 'rgba(7,17,28,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,245,212,0.1)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{
          maxWidth: 1024, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img
              src="/logo.png"
              alt="ApexNet LK"
              style={{
                height: isMobile ? 32 : 40,
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 6px rgba(0,245,212,0.4))',
              }}
            />
          </div>

          {/* Center Links (Desktop only) */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.cyan}
                onMouseLeave={e => e.currentTarget.style.color = '#fff'}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.cyan}
                onMouseLeave={e => e.currentTarget.style.color = '#fff'}
              >
                My Profile
              </button>
              <button
                onClick={() => setShowDevicesModal(true)}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.cyan}
                onMouseLeave={e => e.currentTarget.style.color = '#fff'}
              >
                Devices
              </button>
              <button
                onClick={() => setShowSupportModal(true)}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.cyan}
                onMouseLeave={e => e.currentTarget.style.color = '#fff'}
              >
                Support
              </button>
            </div>
          )}

          {/* Right Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
            {location.pathname === '/' && (
              <button
                onClick={() => navigate('/profile')}
                style={{
                  padding: isMobile ? '5px 10px' : '6px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(0,245,212,0.1), rgba(191,0,255,0.1))',
                  border: '1px solid rgba(0,245,212,0.3)',
                  color: C.cyan, fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Orbitron', monospace", letterSpacing: 0.5,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px rgba(0,245,212,0.05)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,212,0.2), rgba(191,0,255,0.2))'
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0,245,212,0.25)'
                  e.currentTarget.style.borderColor = 'rgba(0,245,212,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,212,0.1), rgba(191,0,255,0.1))'
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0,245,212,0.05)'
                  e.currentTarget.style.borderColor = 'rgba(0,245,212,0.3)'
                }}
              >
                My Profile
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/profile')}>
              <img
                src={user.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                alt={user.displayName || 'Google User'}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: `1.5px solid ${C.cyan}`,
                  boxShadow: '0 0 8px rgba(0,245,212,0.3)',
                }}
              />
              {!isMobile && (
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                  {user.displayName?.split(' ')[0] || 'User'}
                </span>
              )}
            </div>

            {!isMobile && (
              <button
                onClick={onLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
                  color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)' }}
              >
                <LogOut size={12} />
                Logout
              </button>
            )}

            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 6, borderRadius: 8, transition: 'all 0.2s',
                }}
              >
                {mobileMenuOpen ? <X size={20} color={C.cyan} /> : <Menu size={20} color="#fff" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobile && mobileMenuOpen && (
          <div style={{
            maxWidth: 1024, margin: '0 auto',
            marginTop: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
            paddingTop: 12, borderTop: '1px solid rgba(0,245,255,0.08)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false) }}
              style={{
                background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: location.pathname === '/' ? 'rgba(0,245,255,0.05)' : 'transparent',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => { navigate('/profile'); setMobileMenuOpen(false) }}
              style={{
                background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: location.pathname === '/profile' ? 'rgba(0,245,255,0.05)' : 'transparent',
              }}
            >
              My Profile
            </button>
            <button
              onClick={() => { setShowDevicesModal(true); setMobileMenuOpen(false) }}
              style={{
                background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              Devices
            </button>
            <button
              onClick={() => { setShowSupportModal(true); setMobileMenuOpen(false) }}
              style={{
                background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              Support
            </button>
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false) }}
              style={{
                background: 'none', border: 'none', color: '#f87171', fontSize: 13, fontWeight: 600,
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </nav>

      {/* ── Devices Modal ─────────────────────────────────────────────────── */}
      {showDevicesModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDevicesModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(2,4,8,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{
            background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
            border: '1px solid rgba(0,245,255,0.15)', borderRadius: 24, padding: 24,
            width: '100%', maxWidth: 480,
            boxShadow: '0 0 40px rgba(0,245,255,0.1), 0 16px 48px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.3s ease', position: 'relative', color: '#fff',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowDevicesModal(false)}
              style={{
                position: 'absolute', top: 20, right: 20,
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textMuted, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = C.textMuted }}
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>
                Active Devices
              </h3>
              <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                Manage concurrent connections for your subscription
              </p>
            </div>

            {/* Status indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.15)',
              marginBottom: 20,
            }}>
              <Laptop size={16} color={C.cyan} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                1 / 3 Devices Active
              </span>
            </div>

            {/* Device slots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {/* Windows PC */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Laptop size={20} color={C.cyan} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Windows PC</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                      <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>Active Now</span>
                      <span style={{ color: C.textDim, fontSize: 10 }}>•</span>
                      <span style={{ fontSize: 10, color: C.textMuted }}>103.242.22.41</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnectDevice('Windows PC')}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                    color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
                >
                  Disconnect
                </button>
              </div>

              {/* iPhone 13 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Smartphone size={20} color={C.textMuted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>iPhone 13</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: C.textMuted }}>Last active: 2 hours ago</span>
                      <span style={{ color: C.textDim, fontSize: 10 }}>•</span>
                      <span style={{ fontSize: 10, color: C.textMuted }}>112.134.87.19</span>
                    </div>
                  </div>
                </div>
                <button
                  disabled
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    color: C.textDim, fontSize: 11, fontWeight: 600, cursor: 'default',
                  }}
                >
                  Inactive
                </button>
              </div>

              {/* Android TV */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Monitor size={20} color={C.textMuted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Android TV</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: C.textMuted }}>Last active: Yesterday</span>
                      <span style={{ color: C.textDim, fontSize: 10 }}>•</span>
                      <span style={{ fontSize: 10, color: C.textMuted }}>124.43.20.198</span>
                    </div>
                  </div>
                </div>
                <button
                  disabled
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    color: C.textDim, fontSize: 11, fontWeight: 600, cursor: 'default',
                  }}
                >
                  Inactive
                </button>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleResetDevices}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,245,255,0.15))',
                border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
                fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(191,0,255,0.22), rgba(0,245,255,0.22))' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,245,255,0.15))' }}
            >
              Reset All Configs
            </button>
          </div>
        </div>
      )}

      {/* ── Support Modal ─────────────────────────────────────────────────── */}
      {showSupportModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowSupportModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(2,4,8,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{
            background: 'rgba(7,17,28,0.97)', backdropFilter: 'blur(40px)',
            border: '1px solid rgba(0,245,255,0.15)', borderRadius: 24, padding: 24,
            width: '100%', maxWidth: 400,
            boxShadow: '0 0 40px rgba(0,245,255,0.1), 0 16px 48px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.3s ease', position: 'relative', color: '#fff',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowSupportModal(false)}
              style={{
                position: 'absolute', top: 20, right: 20,
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textMuted, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = C.textMuted }}
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>
                Technical Support
              </h3>
              <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                Get help with configuration files or payloads
              </p>
            </div>

            {/* Contact details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <HelpCircle size={18} color={C.cyan} />
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Support Availability</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>24/7 Premium Hotline</div>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <MessageCircle size={18} color="#25d366" />
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>WhatsApp Hotline</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginTop: 2 }}>+94 77 123 4567</div>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Shield size={18} color={C.purple} />
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Billing Support</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>admin@apexnet.lk</div>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={() => {
                const msg = `Hello Admin! I would like to get support for my user email: ${user.email}.`
                window.open(`https://wa.me/94771234567?text=${encodeURIComponent(msg)}`, '_blank')
                setShowSupportModal(false)
              }}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: '#25d366', border: 'none', color: '#fff',
                fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer', transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 0 12px rgba(37,211,102,0.15)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(37,211,102,0.3)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(37,211,102,0.15)'}
            >
              <MessageCircle size={14} /> Contact via WhatsApp
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function HeroSection({ onLoginAndClaim }) {
  return (
    <section style={{
      position:'relative', minHeight:'100vh',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding: '120px 24px 80px',
      overflow:'hidden',
      backgroundImage: `
        linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
    }}>
      {/* Glow blobs */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <div style={{
          position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)',
          width: 700, height: 700, borderRadius:'50%',
          background: 'radial-gradient(circle, rgba(0,245,255,0.07) 0%, transparent 65%)',
        }} />
        <div style={{
          position:'absolute', bottom:'20%', left:'15%',
          width: 400, height: 400, borderRadius:'50%',
          background: 'radial-gradient(circle, rgba(191,0,255,0.06) 0%, transparent 65%)',
        }} />
      </div>

      <Particles />

      {/* Badge */}
      <div style={{
        position:'relative', marginBottom: 32,
        display:'inline-flex', alignItems:'center', gap:10,
        padding:'6px 16px 6px 6px', borderRadius:999,
        background:'rgba(0,245,255,0.06)',
        border:'1px solid rgba(0,245,255,0.25)',
      }}>
        <img
          src="/logo.png"
          alt="ApexNet LK"
          style={{ height:28, width:'auto', objectFit:'contain', filter:'drop-shadow(0 0 4px rgba(0,245,255,0.5))' }}
        />
        <span style={{ color:C.cyan, fontSize:11, fontWeight:700, letterSpacing:3, textTransform:'uppercase' }}>
          Premium VPN — Sri Lanka
        </span>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', marginLeft:2, animation:'pulse 2s infinite' }} />
      </div>

      {/* Headline */}
      <h1 style={{
        position:'relative', textAlign:'center', fontFamily:"'Orbitron',monospace",
        fontWeight:900, lineHeight:1.1, marginBottom:28, maxWidth:860,
      }}>
        <span style={{
          display:'block', fontSize:'clamp(2rem,6vw,4.5rem)',
          marginBottom:8,
          background:'linear-gradient(90deg, #00f5d4, #bf00ff, #00f5d4)',
          backgroundSize:'200% auto',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text',
          animation:'shimmer 3s linear infinite',
        }}>
          Experience Ultimate
        </span>
        <span style={{ display:'block', fontSize:'clamp(2rem,6vw,4.5rem)', color:'#fff' }}>
          Online{' '}
          <span style={{ color:C.cyan, textShadow:`0 0 24px rgba(0,245,255,0.7), 0 0 48px rgba(0,245,255,0.3)` }}>
            Freedom
          </span>
        </span>
      </h1>

      {/* Subtitle */}
      <p style={{
        position:'relative', textAlign:'center',
        color:C.textMuted, fontSize:'clamp(1rem,2.5vw,1.2rem)',
        maxWidth:680, marginBottom:40, lineHeight:1.7,
      }}>
        Bypass ISP throttling with Sri Lanka's leading high-speed secure VPN network.{' '}
        <span style={{ display: 'block', marginTop: 10, color: C.cyan, fontWeight: 600 }}>
          High Speed · Secure · Low Ping for Gaming · Zero Logs Policy
        </span>
      </p>

      {/* CTA Buttons */}
      <div style={{
        position: 'relative', display: 'flex', gap: 16, marginBottom: 40,
        zIndex: 10, flexWrap: 'wrap', justifyContent: 'center'
      }}>
        <button onClick={onLoginAndClaim} style={{
          padding: '14px 28px', borderRadius: 12,
          fontWeight: 700, fontSize: 15,
          background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(191,0,255,0.15))',
          border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
          cursor: 'pointer', transition: 'all 0.3s',
          boxShadow: '0 0 20px rgba(0,245,255,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.22), rgba(191,0,255,0.22))'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(191,0,255,0.15))'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <Zap size={18} color={C.cyan} />
          Get 5GB Free Trial
        </button>
        
        <a href="#packages" style={{
          padding: '14px 28px', borderRadius: 12,
          fontWeight: 700, fontSize: 15,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)', color: C.textPrimary,
          textDecoration: 'none', transition: 'all 0.3s',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          View Packages <ArrowRight size={16} />
        </a>
      </div>

      {/* Scroll arrow */}
      <a href="#packages" style={{
        position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        color:C.textDim, textDecoration:'none', transition:'color 0.3s',
      }}>
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:3, textTransform:'uppercase' }}>Explore Features</span>
        <ChevronDown size={20} style={{ animation:'bounceY 1.5s ease-in-out infinite' }} />
      </a>
    </section>
  )
}

// ─── Feature Cards ───────────────────────────────────────────────────────────
const NEW_FEATURES = [
  { Icon: Rocket,        title: 'Lightning Fast Speed', desc: 'Unlimited bandwidth with ultra-fast gigabit nodes.' },
  { Icon: Shield,        title: 'AES-256 Encryption',   desc: 'Military-grade secure tunneling for your online privacy.' },
  { Icon: Gamepad,       title: 'Gaming Optimized',     desc: 'Low latency and stable ping optimized for online play.' },
  { Icon: MessageCircle, title: '24/7 WhatsApp Support',desc: 'Always online customer support to assist with setups.' },
]

function FeatureCard({ Icon, title, desc, index }) {
  const [hovered, setHovered] = useState(false)
  const glowColor = index % 2 === 0 ? C.cyan : C.purple
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(7,17,28,0.85)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${hovered ? glowColor : 'rgba(0,245,255,0.08)'}`,
        borderRadius: 20, 
        padding: 28,
        transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered 
          ? `0 0 30px ${glowColor}15, 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)` 
          : 'none',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 100, height: 100, borderRadius: '50%',
        background: hovered ? `radial-gradient(circle, ${glowColor}12 0%, transparent 70%)` : 'transparent',
        transition: 'background 0.3s ease',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: hovered ? `${glowColor}18` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? `${glowColor}40` : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginBottom: 20,
        transition: 'all 0.3s ease',
      }}>
        <Icon size={22} color={hovered ? glowColor : C.textMuted} />
      </div>
      
      <h3 style={{ 
        color: '#fff', 
        fontWeight: 700, 
        fontSize: 16, 
        marginBottom: 10,
        fontFamily: "'Orbitron', sans-serif",
        letterSpacing: 0.5,
      }}>{title}</h3>
      <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

function FeatureCards() {
  return (
    <section id="features" style={{ padding: '80px 24px 60px', position: 'relative' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{
            fontFamily: "'Orbitron', monospace",
            fontWeight: 900,
            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
            color: '#fff',
            marginBottom: 12,
          }}>
            Why Choose{' '}
            <span style={{
              background: 'linear-gradient(90deg, #00f5d4, #bf00ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>ApexNet LK</span>
          </h2>
          <p style={{ color: C.textDim, fontSize: 14, maxWidth: 500, margin: '0 auto' }}>
            Engineered for high performance, reliability, and security across Sri Lanka.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 20,
        }}>
          {NEW_FEATURES.map((feat, i) => (
            <FeatureCard key={i} index={i} Icon={feat.Icon} title={feat.title} desc={feat.desc} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Order Form ──────────────────────────────────────────────────────────────
function OrderForm({ selectedLimit, setSelectedLimit }) {
  const [form, setForm]    = useState({ isp: '', selectedPlan: null, name: '', whatsapp: '' })
  const [errors, setErrs]  = useState({})
  const [sent, setSent]    = useState(false)
  const [toast, setToast]  = useState(null)

  // ── Plans (fetched from API) ──────────────────────────────────────────────
  const [plans,      setPlans]      = useState([])
  const [plansState, setPlansState] = useState('loading') // 'loading' | 'ok'

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res  = await fetch(`${ORDER_API_BASE}/api/vpn/plans`, { signal: AbortSignal.timeout(10_000) })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

        let list = []
        if (Array.isArray(json.plans)) {
          // New SQLite backend — snake_case
          list = json.plans.map(p => ({
            id:            p.id,
            name:          p.name,
            price_lkr:     p.price_lkr     ?? p.priceLKR   ?? 0,
            data_gb:       p.data_gb       ?? p.dataGB     ?? p.dataLimitGB ?? 0,
            devices:       p.devices       ?? p.deviceLimit ?? 1,
            validity_days: p.validity_days ?? p.expiryDays ?? p.days ?? 30,
            badge:         p.badge         ?? null,
            accent_color:  p.accent_color  ?? 'cyan',
          }))
        } else if (typeof json === 'object' && json !== null) {
          // Legacy keyed-object
          const SKIP = new Set(['success', 'message', 'error', 'plans'])
          let idx = 1
          list = Object.entries(json)
            .filter(([k]) => !SKIP.has(k))
            .map(([key, p]) => ({
              id:            p.id            ?? idx++,
              name:          p.name          ?? key,
              price_lkr:     p.price_lkr     ?? p.priceLKR   ?? 0,
              data_gb:       p.data_gb       ?? p.dataGB     ?? p.dataLimitGB ?? 0,
              devices:       p.devices       ?? p.deviceLimit ?? 1,
              validity_days: p.validity_days ?? p.expiryDays ?? p.days ?? 30,
              badge:         p.badge         ?? null,
              accent_color:  p.accent_color  ?? 'cyan',
            }))
        }
        const finalList = list.length ? list : ORDER_FALLBACK_PLANS
        setPlans(finalList)
        setPlansState('ok')
        // Auto-select HOT/badged plan on load
        const hot = finalList.find(p => p.badge)
        const mid = finalList[Math.floor(finalList.length / 2)]
        setForm(prev => ({ ...prev, selectedPlan: (hot ?? mid ?? finalList[0]).id }))
      } catch {
        setPlans(ORDER_FALLBACK_PLANS)
        setPlansState('ok')
        const hotFb = ORDER_FALLBACK_PLANS.find(p => p.badge)
        setForm(prev => ({ ...prev, selectedPlan: (hotFb ?? ORDER_FALLBACK_PLANS[0]).id }))
      }
    }
    fetchPlans()
  }, [])

  useEffect(() => {
    if (selectedLimit && plans.length) {
      const match = plans.find(p => String(p.id) === String(selectedLimit) || p.name?.toLowerCase() === String(selectedLimit).toLowerCase())
      if (match) setForm(prev => ({ ...prev, selectedPlan: match.id }))
    }
  }, [selectedLimit, plans])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const validate = () => {
    const e = {}
    if (!form.isp)             e.isp          = 'Please select an ISP package.'
    if (!form.selectedPlan)    e.selectedPlan  = 'Please select a plan.'
    if (!form.name.trim())     e.name          = 'Full name is required.'
    if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp number is required.'
    else if (!/^[\d\s+\-()]{7,20}$/.test(form.whatsapp.trim())) e.whatsapp = 'Enter a valid phone number.'
    return e
  }

  const handleSubmit = async ev => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }
    setErrs({})
    setSent(true)

    const activePlan = plans.find(p => p.id === form.selectedPlan)
    const planLabel  = activePlan
      ? `${activePlan.name} (LKR ${activePlan.price_lkr})`
      : String(form.selectedPlan)

    try {
      await addDoc(collection(db, 'pending_orders'), {
        name:         form.name.trim(),
        whatsapp:     form.whatsapp.trim(),
        package:      form.isp,
        planId:       form.selectedPlan,
        planLabel,
        price_lkr:    activePlan?.price_lkr ?? null,
        status:       'Pending',
        timestamp:    serverTimestamp()
      })
      showToast('Order saved successfully! Redirecting...', 'success')
      const msg = [
        `Hello ApexNet LK! 🚀 I would like to order a new VPN connection.`,
        `*Name:* ${form.name}`,
        `*WhatsApp:* ${form.whatsapp}`,
        `*ISP Package:* ${form.isp}`,
        `*Plan:* ${planLabel}`,
      ].join('\n')
      window.open(`https://wa.me/947XXXXXXXX?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (err) {
      console.error('Error saving order to Firestore:', err)
      showToast('Failed to save order. Please check your connection.', 'error')
    } finally {
      setTimeout(() => setSent(false), 3000)
    }
  }

  const setF = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrs(p => ({ ...p, [k]: undefined }))
  }

  const inputStyle = (hasErr) => ({
    width:'100%', padding:'14px 14px 14px 40px',
    background:'rgba(4,10,18,0.9)', color:C.textPrimary,
    border:`1px solid ${hasErr ? '#f87171' : 'rgba(0,245,255,0.2)'}`,
    borderRadius:12, fontSize:14, outline:'none',
    boxShadow: hasErr ? '0 0 12px rgba(248,113,113,0.15)' : 'none',
    transition:'border-color 0.3s, box-shadow 0.3s',
    boxSizing:'border-box',
  })

  const labelStyle = {
    display:'flex', alignItems:'center', gap:8,
    color:C.textPrimary, fontSize:13, fontWeight:600, marginBottom:10,
  }

  const errStyle = {
    display:'flex', alignItems:'center', gap:4,
    color:'#f87171', fontSize:11, marginTop:6,
  }




  return (
    <section id="order" style={{ padding:'80px 24px 60px', position:'relative' }}>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{
          width:800, height:500, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(0,245,255,0.04) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ position:'relative', maxWidth:620, margin:'0 auto' }}>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'7px 16px', borderRadius:999, marginBottom:20,
            background:'rgba(191,0,255,0.07)',
            border:'1px solid rgba(191,0,255,0.25)',
          }}>
            <Package size={13} color="#c084fc" />
            <span style={{ color:'#c084fc', fontSize:11, fontWeight:700, letterSpacing:3, textTransform:'uppercase' }}>
              Place Your Order
            </span>
          </div>
          <h2 style={{
            fontFamily:"'Orbitron',monospace", fontWeight:900,
            fontSize:'clamp(1.6rem,4vw,2.4rem)', color:'#fff',
            marginBottom:12, lineHeight:1.2,
          }}>
            Get Connected{' '}
            <span style={{
              background:'linear-gradient(90deg,#00f5d4,#bf00ff,#00f5d4)',
              backgroundSize:'200% auto',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              animation:'shimmer 3s linear infinite',
            }}>Today</span>
          </h2>
          <p style={{ color:C.textDim, fontSize:14 }}>
            Fill in the details below and we'll set you up instantly via WhatsApp.
          </p>
        </div>

        <div style={{
          background:'rgba(7,17,28,0.85)',
          backdropFilter:'blur(32px)',
          border:'1px solid rgba(0,245,255,0.14)',
          borderRadius:28, padding:'36px 32px',
          boxShadow:`0 0 40px rgba(0,245,255,0.06), 0 24px 60px rgba(0,0,0,0.5)`,
        }}>
          <form onSubmit={handleSubmit} noValidate>

            <div style={{ marginBottom:28 }}>
              <label style={labelStyle}>
                <Wifi size={14} color={C.cyan} /> ISP Package
              </label>
              <div style={{ position:'relative' }}>
                <select
                  value={form.isp}
                  onChange={e => setF('isp', e.target.value)}
                  style={{
                    ...inputStyle(!!errors.isp),
                    padding:'14px 40px 14px 14px',
                    appearance:'none', WebkitAppearance:'none',
                    cursor:'pointer',
                  }}
                  onFocus={e => { e.target.style.borderColor = C.cyan; e.target.style.boxShadow = `0 0 18px rgba(0,245,255,0.18)`; }}
                  onBlur={e  => { e.target.style.borderColor = errors.isp ? '#f87171' : 'rgba(0,245,255,0.2)'; e.target.style.boxShadow = 'none'; }}
                >
                  {ISP_PACKAGES.map(p => (
                    <option key={p.value} value={p.value} disabled={p.value===''} style={{ background:'#07111c' }}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} color={C.cyan} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
              {errors.isp && <p style={errStyle}><AlertCircle size={11} />{errors.isp}</p>}
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ ...labelStyle, marginBottom:12 }}>
                <Zap size={14} color={C.cyan} /> Select Plan
              </label>

              {plansState === 'loading' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      borderRadius:16, padding:'20px 12px',
                      border:'1px solid rgba(255,255,255,0.05)',
                      background:'rgba(255,255,255,0.02)',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                      animation:'pulse 1.8s ease-in-out infinite',
                    }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.06)' }} />
                      <div style={{ height:10, width:'60%', borderRadius:6, background:'rgba(255,255,255,0.06)' }} />
                      <div style={{ height:14, width:'75%', borderRadius:6, background:'rgba(255,255,255,0.07)' }} />
                      <div style={{ height:9,  width:'50%', borderRadius:6, background:'rgba(255,255,255,0.05)' }} />
                    </div>
                  ))}
                </div>
              )}

              {plansState === 'ok' && (
                <div style={{
                  display:'grid',
                  gridTemplateColumns:`repeat(${Math.min(plans.length, 4)},1fr)`,
                  gap:12,
                }}>
                  {plans.map(plan => {
                    const theme = getOrderTheme(plan.accent_color)
                    const PlanIcon = theme.Icon
                    const sel = form.selectedPlan === plan.id
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setForm(p => ({ ...p, selectedPlan: plan.id }))
                          setErrs(p => ({ ...p, selectedPlan: undefined }))
                          if (setSelectedLimit) setSelectedLimit(plan.id)
                        }}
                        style={{
                          position:'relative',
                          display:'flex', flexDirection:'column', alignItems:'center',
                          gap:6, padding:'18px 8px 14px', borderRadius:16,
                          cursor:'pointer', textAlign:'center',
                          border: `1.5px solid ${sel ? theme.accentBorder : 'rgba(255,255,255,0.07)'}`,
                          background: sel ? theme.accentBg : 'rgba(255,255,255,0.02)',
                          boxShadow: sel ? `0 0 24px ${theme.glow}` : 'none',
                          transition:'all 0.22s ease',
                          transform: sel ? 'translateY(-2px)' : 'translateY(0)',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = theme.accentBorder; e.currentTarget.style.transform = 'translateY(-1px)' }}}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}}
                      >
                        {plan.badge && (
                          <div style={{
                            position:'absolute', top:-9, left:'50%', transform:'translateX(-50%)',
                            background: theme.accent, color:'#fff',
                            fontSize:8, fontWeight:900, padding:'2px 8px', borderRadius:999,
                            letterSpacing:0.8, whiteSpace:'nowrap',
                            boxShadow: `0 0 10px ${theme.accent}88`,
                          }}>
                            {plan.badge}
                          </div>
                        )}

                        <div style={{
                          width:36, height:36, borderRadius:10,
                          background: sel ? theme.accentBg : 'rgba(255,255,255,0.04)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'background 0.2s',
                        }}>
                          <PlanIcon size={16} color={sel ? theme.accent : '#475569'} />
                        </div>

                        <div style={{ fontSize:13, fontWeight:800, color: sel ? theme.accent : C.textPrimary }}>
                          {plan.name}
                        </div>

                        <div style={{
                          fontFamily:"'Orbitron',monospace",
                          fontSize:12, fontWeight:900,
                          color: sel ? theme.accent : '#fff',
                        }}>
                          LKR {plan.price_lkr}
                        </div>

                        <div style={{ fontSize:11, color: sel ? theme.accent : '#64748b', fontWeight:600 }}>
                          {fmtOrderData(plan.data_gb)}
                        </div>

                        <div style={{ fontSize:10, color:'#475569', lineHeight:1.5 }}>
                          {plan.devices} devices · {plan.validity_days}d
                        </div>

                        {sel && (
                          <div style={{
                            position:'absolute', bottom:8, right:8,
                            width:16, height:16, borderRadius:'50%',
                            background: theme.accent,
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            <CheckCircle size={10} color="#000" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {errors.selectedPlan && <p style={errStyle}><AlertCircle size={11} />{errors.selectedPlan}</p>}
            </div>

            <div style={{ marginBottom:22 }}>
              <label style={labelStyle}><User size={14} color={C.cyan} /> Full Name</label>
              <div style={{ position:'relative' }}>
                <input
                  type="text" placeholder="e.g. Kamal Perera"
                  value={form.name} onChange={e => setF('name', e.target.value)}
                  style={inputStyle(!!errors.name)}
                  onFocus={e => { e.target.style.borderColor = C.cyan; e.target.style.boxShadow = `0 0 18px rgba(0,245,255,0.18)`; }}
                  onBlur={e  => { e.target.style.borderColor = errors.name ? '#f87171' : 'rgba(0,245,255,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <User size={14} color="#334155" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
              {errors.name && <p style={errStyle}><AlertCircle size={11} />{errors.name}</p>}
            </div>

            <div style={{ marginBottom:32 }}>
              <label style={labelStyle}><Phone size={14} color={C.cyan} /> WhatsApp Number</label>
              <div style={{ position:'relative' }}>
                <input
                  type="tel" placeholder="e.g. +94 77 123 4567"
                  value={form.whatsapp} onChange={e => setF('whatsapp', e.target.value)}
                  style={inputStyle(!!errors.whatsapp)}
                  onFocus={e => { e.target.style.borderColor = C.cyan; e.target.style.boxShadow = `0 0 18px rgba(0,245,255,0.18)`; }}
                  onBlur={e  => { e.target.style.borderColor = errors.whatsapp ? '#f87171' : 'rgba(0,245,255,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <Phone size={14} color="#334155" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
              {errors.whatsapp && <p style={errStyle}><AlertCircle size={11} />{errors.whatsapp}</p>}
            </div>

            <button
              type="submit"
              style={{
                width:'100%', padding:'17px 24px', borderRadius:16,
                fontWeight:700, fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center', gap:12,
                border:'none', cursor:'pointer',
                background: sent
                  ? 'linear-gradient(135deg,#10b981,#059669)'
                  : 'linear-gradient(135deg,#25d366,#128c7e)',
                color:'#fff',
                boxShadow: sent
                  ? '0 0 30px rgba(16,185,129,0.45), 0 8px 24px rgba(0,0,0,0.4)'
                  : '0 0 30px rgba(37,211,102,0.45), 0 8px 24px rgba(0,0,0,0.4)',
                transition:'all 0.3s ease',
                position:'relative', overflow:'hidden',
              }}
            >
              {sent ? (
                <><CheckCircle size={20} /> Redirecting to WhatsApp…</>
              ) : (
                <>
                  <MessageCircle size={20} />
                  Order via WhatsApp
                  <ArrowRight size={18} style={{ marginLeft:'auto' }} />
                </>
              )}
            </button>

            <p style={{ textAlign:'center', color:'#334155', fontSize:11, marginTop:14 }}>
              🔒 Your information is sent securely via WhatsApp
            </p>
          </form>
        </div>

        <div style={{
          display:'flex', flexWrap:'wrap', justifyContent:'center', gap:28,
          marginTop:32, color:'#334155', fontSize:12,
        }}>
          {[
            { Icon: Shield,         label:'Secure & Private' },
            { Icon: Zap,            label:'Instant Setup' },
            { Icon: MessageCircle,  label:'WhatsApp Support' },
          ].map(({ Icon, label }, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Icon size={13} color='rgba(0,245,255,0.45)' />
              <span>{label}</span>
            </div>
          ))}
        </div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          background: C.card, backdropFilter: 'blur(12px)',
          border: `1px solid ${toast.type === 'error' ? '#f87171' : C.cyan}`,
          borderRadius: 12, padding: '14px 20px',
          boxShadow: `0 0 30px ${toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(0,245,255,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
          color: C.textPrimary,
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={16} color="#f87171" />
          ) : (
            <CheckCircle size={16} color={C.cyan} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      padding:'32px 24px',
      borderTop:'1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth:1024, margin:'0 auto',
        display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:16,
      }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <img
            src="/logo.png"
            alt="ApexNet LK"
            style={{
              height: 38,
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.75,
              filter: 'drop-shadow(0 0 4px rgba(0,245,255,0.3))',
            }}
          />
        </div>
        <p style={{ color:'#334155', fontSize:12, textAlign:'center' }}>
          © {new Date().getFullYear()} ApexNet LK — Premium VPN service for Sri Lanka
        </p>
        <div style={{ display:'flex', alignItems:'center', gap:6, color:'#334155', fontSize:12 }}>
          <Lock size={11} />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Plan visual config (landing page) ───────────────────────────────────────
const LANDING_PLAN_THEME = {
  standard: { badge: null,   badgeClr: null,      accent: 'rgba(0,245,255,0.25)',  glow: 'rgba(0,245,255,0.06)',   isPopular: false },
  vip:      { badge: 'HOT',  badgeClr: '#f97316', accent: 'rgba(249,115,22,0.35)', glow: 'rgba(249,115,22,0.12)',  isPopular: true  },
  mvp:      { badge: 'BEST', badgeClr: '#bf00ff', accent: 'rgba(191,0,255,0.32)', glow: 'rgba(191,0,255,0.10)',  isPopular: false },
}

// ─── Pricing Section (Landing Page) ──────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function PricingSection({ onSelectPlan }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [plans,      setPlans]      = useState([])
  const [plansState, setPlansState] = useState('loading') // 'loading' | 'ok' | 'error'

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/vpn/plans`, { signal: AbortSignal.timeout(10_000) })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

        let list = []
        if (Array.isArray(json.plans)) {
          // New SQLite backend — snake_case fields
          list = json.plans.map(p => ({
            id:            p.id,
            name:          p.name,
            price_lkr:     p.price_lkr     ?? p.priceLKR   ?? 0,
            data_gb:       p.data_gb       ?? p.dataGB     ?? p.dataLimitGB ?? 0,
            devices:       p.devices       ?? p.deviceLimit ?? 1,
            validity_days: p.validity_days ?? p.expiryDays ?? p.days ?? 30,
            badge:         p.badge         ?? null,
            accent_color:  p.accent_color  ?? 'cyan',
          }))
        } else if (typeof json === 'object' && json !== null) {
          // Legacy keyed-object
          const SKIP = new Set(['success', 'message', 'error', 'plans'])
          let idx = 1
          list = Object.entries(json)
            .filter(([k]) => !SKIP.has(k))
            .map(([key, p]) => ({
              id:            p.id            ?? idx++,
              name:          p.name          ?? key,
              price_lkr:     p.price_lkr     ?? p.priceLKR   ?? 0,
              data_gb:       p.data_gb       ?? p.dataGB     ?? p.dataLimitGB ?? 0,
              devices:       p.devices       ?? p.deviceLimit ?? 1,
              validity_days: p.validity_days ?? p.expiryDays ?? p.days ?? 30,
              badge:         p.badge         ?? null,
              accent_color:  p.accent_color  ?? 'cyan',
            }))
        }
        if (!list.length) throw new Error('No plans returned.')
        setPlans(list)
        setPlansState('ok')
      } catch (err) {
        console.error('[PricingSection] fetch plans:', err.message)
        setPlans([
          { id: 1, name: 'Standard', price_lkr: 399, data_gb: 500, devices: 2, validity_days: 30, badge: null,   accent_color: 'cyan'   },
          { id: 2, name: 'MVP Lite', price_lkr: 499, data_gb: 0,   devices: 1, validity_days: 30, badge: null,   accent_color: 'green'  },
          { id: 3, name: 'VIP',      price_lkr: 649, data_gb: 800, devices: 5, validity_days: 30, badge: 'HOT',  accent_color: 'orange' },
          { id: 4, name: 'MVP Pro',  price_lkr: 899, data_gb: 0,   devices: 8, validity_days: 30, badge: 'BEST', accent_color: 'purple' },
        ])
        setPlansState('ok')
      }
    }
    fetchPlans()
  }, [])

  const premiumPlans = plans  // alias for minimal diff below

  return (
    <section id="packages" style={{ padding: '80px 24px 60px', position: 'relative' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Section title */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{
            fontFamily: "'Orbitron', monospace",
            fontWeight: 900,
            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
            color: '#fff',
            marginBottom: 12,
          }}>
            Choose Your{' '}
            <span style={{
              background: 'linear-gradient(90deg, #00f5d4, #bf00ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Premium Plan</span>
          </h2>
          <p style={{ color: C.textDim, fontSize: 14, maxWidth: 500, margin: '0 auto' }}>
            Ultra-fast speeds with flexible data limits. Pick a plan and complete your order below.
          </p>
        </div>

        {/* Loading skeletons */}
        {plansState === 'loading' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                background: 'rgba(7,17,28,0.7)', borderRadius: 20, padding: 28,
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', gap: 16,
                animation: 'pulse 1.8s ease-in-out infinite',
              }}>
                <div style={{ height: 12, width: '55%', borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ height: 28, width: '70%', borderRadius: 8, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ height: 18, width: '45%', borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginTop: 8 }} />
              </div>
            ))}
          </div>
        )}

        {/* Plan cards */}
        {plansState === 'ok' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 20,
          }}>
            {premiumPlans.map((plan, i) => {
              const theme      = getOrderTheme(plan.accent_color)
              const isPopular  = !!plan.badge
              const badge      = plan.badge
              const badgeClr   = theme.accent
              const isHovered  = hoveredIndex === i
              const dataLabel  = fmtOrderData(plan.data_gb)
              return (
                <div
                  key={plan.id || i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    background: 'rgba(7,17,28,0.85)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isHovered ? theme.accentBorder : (isPopular ? theme.accentBorder : 'rgba(0,245,255,0.08)')}`,
                    borderRadius: 20,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                    boxShadow: isHovered ? `0 0 36px ${theme.glow}` : (isPopular ? `0 0 24px ${theme.glow}` : 'none'),
                  }}
                >
                  {badge && (
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: `${badgeClr}22`, color: badgeClr,
                      border: `1px solid ${badgeClr}55`,
                      letterSpacing: 1,
                    }}>{badge}</span>
                  )}

                  <div>
                    <h4 style={{ color: C.textMuted, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.name}</h4>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: "'Orbitron', monospace", marginTop: 8 }}>{dataLabel}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ color: theme.accent, fontSize: 22, fontWeight: 800, fontFamily: "'Orbitron', monospace" }}>LKR {plan.price_lkr}</span>
                    <span style={{ color: C.textDim, fontSize: 12 }}>/ {plan.validity_days} days</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={theme.accent} /> {dataLabel} Data
                    </li>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={theme.accent} /> {plan.devices} Simultaneous Devices
                    </li>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={theme.accent} /> AES-256 Encryption
                    </li>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={theme.accent} /> WhatsApp Support
                    </li>
                  </ul>

                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 12,
                      background: isPopular
                        ? `linear-gradient(135deg, ${theme.accentBg}, rgba(191,0,255,0.1))`
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isPopular ? theme.accentBorder : 'rgba(255,255,255,0.08)'}`,
                      color: isPopular ? theme.accent : C.textPrimary,
                      fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700,
                      letterSpacing: 1, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isPopular
                        ? 'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(191,0,255,0.22))'
                        : 'rgba(255,255,255,0.08)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isPopular
                        ? 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(191,0,255,0.15))'
                        : 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <MessageCircle size={14} />
                    Order Now
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Landing page wrapper ────────────────────────────────────────────────────
function LandingPage({ onLogin, onLoginAndClaim }) {
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const handleSelectPlan = (planId) => {
    setSelectedPlanId(planId)
    const orderFormEl = document.getElementById('order')
    if (orderFormEl) {
      orderFormEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div style={{ minHeight:'100vh', background: C.bg }}>
      <Navbar onLogin={onLogin} />
      <HeroSection onLoginAndClaim={onLoginAndClaim} />
      <FeatureCards />
      <PricingSection onSelectPlan={handleSelectPlan} />
      <OrderForm selectedLimit={selectedPlanId} setSelectedLimit={setSelectedPlanId} />
      <Footer />
    </div>
  )
}


// ─── Customer Dashboard Component ───────────────────────────────────────────
function CustomerDashboard({ user, onLogout, trialClaimed, onClaimTrial, trialLoading, showToast }) {
  const [orderingPack, setOrderingPack] = useState(null)

  const handleOrderPremium = async (plan) => {
    setOrderingPack(plan.name)
    try {
      await addDoc(collection(db, 'pending_orders'), {
        name: user.displayName || 'Google User',
        email: user.email,
        package: 'Premium Plan',
        dataLimit: plan.limit,
        status: 'Pending',
        timestamp: serverTimestamp()
      })
      
      showToast(`Premium Order for ${plan.limit} saved successfully! Redirecting...`, 'success')
      
      const msg = `Hello ApexNet LK! 🚀 I would like to order a Premium VPN plan via Client Portal.\n*Name:* ${user.displayName}\n*Email:* ${user.email}\n*Plan:* ${plan.limit} (${plan.price} LKR)`
      window.open(`https://wa.me/94771234567?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (err) {
      console.error('Error creating premium order:', err)
      showToast('Failed to save order to database. Please check connection.', 'error')
    } finally {
      setOrderingPack(null)
    }
  }

  // Plans are fetched by PricingSection — CustomerDashboard shows plans for logged-in order flow
  const premiumPlans = [
    { id: 'standard', name: 'Standard',  limit: '150 GB',    price: '399', badge: null,   color: C.textMuted, badgeClr: null      },
    { id: 'vip',      name: 'VIP',       limit: '300 GB',    price: '699', badge: 'HOT',  color: C.purple,    badgeClr: '#f97316' },
    { id: 'mvp',      name: 'MVP',       limit: 'Unlimited', price: '949', badge: 'BEST', color: C.cyan,      badgeClr: '#bf00ff' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, position: 'relative', overflow: 'hidden' }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '20%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(191,0,255,0.05) 0%, transparent 65%)',
        }} />
      </div>

      <Particles />

      {/* Authenticated Top Navigation Bar */}
      <AuthenticatedNavbar user={user} onLogout={onLogout} />

      {/* Main Content */}
      <main style={{ maxWidth: 1024, margin: '0 auto', padding: '40px 24px 80px', position: 'relative', zIndex: 10 }}>
        
        {/* Welcome message */}
        <div style={{ marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)',
            marginBottom: 12,
          }}>
            <User size={10} color={C.cyan} />
            <span style={{ color: C.cyan, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
              Client Workspace
            </span>
          </div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: 6 }}>
            Welcome back,{' '}
            <span style={{ background: 'linear-gradient(90deg, #00f5d4, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {user.displayName || 'User'}
            </span>
          </h2>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            Monitor your trial status or upgrade your subscription plan below.
          </p>
        </div>

        {/* Free Trial Status Card */}
        <div style={{
          background: 'rgba(7,17,28,0.8)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 24,
          padding: '28px 24px',
          marginBottom: 44,
          boxShadow: '0 0 40px rgba(0,245,255,0.04), 0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'row',
          alignItems: 'center', justifyContent: 'space-between', gap: 24,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Star size={22} color={C.cyan} />
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>1-Day Free Trial (5GB)</h3>
              <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, maxWidth: 500 }}>
                {trialClaimed
                  ? "You have already claimed your Free Trial. Please upgrade to a Premium plan."
                  : "Experience the fastest secure VPN tunnels in Sri Lanka. Claim your 24-hour trial today."
                }
              </p>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            {trialLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textMuted, fontSize: 13 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(0,245,255,0.2)',
                  borderTop: `2px solid ${C.cyan}`,
                  animation: 'spin 0.8s linear infinite',
                }} />
                Checking status…
              </div>
            ) : trialClaimed ? (
              <div style={{
                padding: '10px 18px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                color: C.textDim, fontSize: 12, fontWeight: 600,
                textAlign: 'center', maxWidth: 220,
              }}>
                🔒 Trial Claimed
              </div>
            ) : (
              <button
                onClick={onClaimTrial}
                style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(191,0,255,0.2))',
                  border: '1px solid rgba(0,245,255,0.4)', color: C.cyan,
                  fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer', transition: 'all 0.3s',
                  boxShadow: '0 0 20px rgba(0,245,255,0.15)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.3), rgba(191,0,255,0.3))'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(191,0,255,0.2))'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Claim Free Trial
              </button>
            )}
          </div>
        </div>

        {/* Premium Plans Grid */}
        <div>
          <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 24, textAlign: 'center' }}>
            Upgrade To <span style={{ background: 'linear-gradient(90deg, #00f5d4, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Premium Plan</span>
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
          }}>
            {premiumPlans.map((plan, i) => {
              const isPopular = plan.badge === 'HOT'
              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(7,17,28,0.85)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isPopular ? 'rgba(191,0,255,0.25)' : 'rgba(0,245,255,0.08)'}`,
                    borderRadius: 20, padding: 24,
                    display: 'flex', flexDirection: 'column', gap: 16,
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    boxShadow: isPopular ? '0 0 30px rgba(191,0,255,0.06)' : 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = isPopular ? 'rgba(191,0,255,0.45)' : 'rgba(0,245,255,0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = isPopular ? 'rgba(191,0,255,0.25)' : 'rgba(0,245,255,0.08)'
                  }}
                >
                  {plan.badge && (
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: `${plan.badgeClr}22`, color: plan.badgeClr,
                      border: `1px solid ${plan.badgeClr}55`,
                      letterSpacing: 1,
                    }}>{plan.badge}</span>
                  )}
                  
                  <div>
                    <h4 style={{ color: C.textMuted, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.name}</h4>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: "'Orbitron', monospace", marginTop: 8 }}>{plan.limit}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ color: C.cyan, fontSize: 20, fontWeight: 700 }}>LKR {plan.price}</span>
                    <span style={{ color: C.textDim, fontSize: 12 }}>/ month</span>
                  </div>

                  {/* Plan features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={C.cyan} /> High-Speed Nodes
                    </li>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={C.cyan} /> AES-256 Encryption
                    </li>
                    <li style={{ fontSize: 12, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={12} color={C.cyan} /> WhatsApp Support
                    </li>
                  </ul>

                  <button
                    onClick={() => handleOrderPremium(plan)}
                    disabled={orderingPack !== null}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 12,
                      background: isPopular
                        ? 'linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,245,255,0.15))'
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isPopular ? 'rgba(191,0,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: isPopular ? C.purple : C.textPrimary,
                      fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700,
                      letterSpacing: 1, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isPopular
                        ? 'linear-gradient(135deg, rgba(191,0,255,0.22), rgba(0,245,255,0.22))'
                        : 'rgba(255,255,255,0.08)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isPopular
                        ? 'linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,245,255,0.15))'
                        : 'rgba(255,255,255,0.03)'
                    }}
                  >
                    {orderingPack === plan.name ? (
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTop: `2px solid ${isPopular ? C.purple : C.cyan}`,
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : (
                      <MessageCircle size={14} />
                    )}
                    Order Now
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  )
}

// ─── App (with routing) ──────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('apexnet_isAuthenticated') === 'true'
  )

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [trialClaimed, setTrialClaimed] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    const handleToast = (e) => {
      if (e.detail?.message) showToast(e.detail.message, e.detail.type || 'success')
    }
    window.addEventListener('apexnet-toast', handleToast)
    return () => window.removeEventListener('apexnet-toast', handleToast)
  }, [])

  const performClaimTrial = async (currentUser) => {
    setTrialLoading(true)
    try {
      await setDoc(doc(db, 'trial_users', currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName,
        hasClaimedTrial: true,
        timestamp: serverTimestamp()
      })

      await addDoc(collection(db, 'pending_orders'), {
        email: currentUser.email,
        name: currentUser.displayName || 'Google User',
        package: 'Free Trial',
        dataLimit: '5GB',
        status: 'Pending',
        timestamp: serverTimestamp()
      })

      setTrialClaimed(true)
      showToast('Free Trial claimed successfully!', 'success')
    } catch (err) {
      console.error('Claim trial error:', err)
      showToast('Failed to claim Free Trial. Please try again.', 'error')
    } finally {
      setTrialLoading(false)
    }
  }

  useEffect(() => {
    const checkUserTrial = async (currentUser) => {
      setTrialLoading(true)
      try {
        const docRef = doc(db, 'trial_users', currentUser.uid)
        const docSnap = await getDoc(docRef)
        let alreadyClaimed = false
        if (docSnap.exists() && docSnap.data().hasClaimedTrial) {
          setTrialClaimed(true)
          alreadyClaimed = true
        } else {
          setTrialClaimed(false)
        }

        const shouldClaim = localStorage.getItem('apexnet_claimTrialOnLogin') === 'true'
        if (shouldClaim) {
          localStorage.removeItem('apexnet_claimTrialOnLogin')
          if (!alreadyClaimed) {
            await performClaimTrial(currentUser)
          } else {
            showToast('You have already claimed your Free Trial. Please upgrade to a Premium plan.', 'error')
          }
        }
      } catch (err) {
        console.error("Error checking trial user status:", err)
      } finally {
        setTrialLoading(false)
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
      if (currentUser) {
        checkUserTrial(currentUser)
      } else {
        setTrialClaimed(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      showToast('Logged in successfully!', 'success')
    } catch (err) {
      console.error('Google sign-in error:', err)
      showToast('Authentication failed. Please try again.', 'error')
    }
  }

  const handleLoginAndClaim = () => {
    localStorage.setItem('apexnet_claimTrialOnLogin', 'true')
    handleLogin()
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      showToast('Logged out successfully!', 'success')
    } catch (err) {
      console.error('Logout error:', err)
      showToast('Logout failed. Please try again.', 'error')
    }
  }

  const handleClaimTrial = async () => {
    if (!user) return
    await performClaimTrial(user)
  }


  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            authLoading ? (
              <div style={{
                minHeight: '100vh',
                background: C.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.cyan,
                fontSize: 18,
                fontFamily: "'Orbitron', monospace",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: '3px solid rgba(0,245,255,0.2)',
                  borderTop: `3px solid ${C.cyan}`,
                  animation: 'spin 0.8s linear infinite',
                  marginRight: 12,
                }} />
                Loading ApexNet…
              </div>
            ) : user ? (
              <CustomerDashboard
                user={user}
                onLogout={handleLogout}
                trialClaimed={trialClaimed}
                onClaimTrial={handleClaimTrial}
                trialLoading={trialLoading}
                showToast={showToast}
              />
            ) : (
              <LandingPage onLogin={handleLogin} onLoginAndClaim={handleLoginAndClaim} />
            )
          }
        />
        <Route
          path="/profile"
          element={
            authLoading ? (
              <div style={{
                minHeight: '100vh',
                background: C.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.cyan,
                fontSize: 18,
                fontFamily: "'Orbitron', monospace",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: '3px solid rgba(0,245,255,0.2)',
                  borderTop: `3px solid ${C.cyan}`,
                  animation: 'spin 0.8s linear infinite',
                  marginRight: 12,
                }} />
                Loading ApexNet…
              </div>
            ) : user ? (
              <>
                <AuthenticatedNavbar user={user} onLogout={handleLogout} />
                <MyProfile user={user} onLogout={handleLogout} />
              </>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin-secure-panel"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              onAuthChange={setIsAuthenticated}
            />
          }
        />
      </Routes>

      {/* Global Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          background: C.card, backdropFilter: 'blur(12px)',
          border: `1px solid ${toast.type === 'error' ? '#f87171' : C.cyan}`,
          borderRadius: 12, padding: '14px 20px',
          boxShadow: `0 0 30px ${toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(0,245,255,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
          color: C.textPrimary,
          animation: 'slideIn 0.3s ease',
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={16} color="#f87171" />
          ) : (
            <CheckCircle size={16} color={C.cyan} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </>
  )
}
