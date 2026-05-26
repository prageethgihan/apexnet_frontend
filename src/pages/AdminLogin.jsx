import { useState, useMemo, useEffect } from 'react'
import { Shield, User, Lock, Eye, EyeOff, AlertCircle, Cpu, Radio } from 'lucide-react'

// ─── Mock credentials (replace with real auth in production) ─────────────────
const MOCK_USER = 'admin'
const MOCK_PASS = 'password123'

// ─── Colour tokens (match existing site palette) ─────────────────────────────
const C = {
  bg:      '#020408',
  card:    '#07111c',
  cyan:    '#00f5ff',
  purple:  '#bf00ff',
  red:     '#f87171',
  border:  'rgba(0,245,255,0.15)',
  text:    '#e2e8f0',
  muted:   '#94a3b8',
  dim:     '#475569',
}

// ─── Animated background particles ───────────────────────────────────────────
function LoginParticles() {
  const pts = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left:  `${Math.random() * 100}%`,
      top:   `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      dur:   `${5 + Math.random() * 5}s`,
      size:  Math.random() > 0.5 ? 3 : 2,
      op:    0.08 + Math.random() * 0.15,
      color: Math.random() > 0.5 ? C.cyan : C.purple,
    })), [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left, top: p.top,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: p.color,
          opacity: p.op,
          animation: `floatPt ${p.dur} ease-in-out ${p.delay} infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Scanning line animation overlay ─────────────────────────────────────────
function ScanLine() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      borderRadius: 28, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${C.cyan}55, transparent)`,
        animation: 'scanLine 4s linear infinite',
        top: '-2px',
      }} />
    </div>
  )
}

// ─── Main AdminLogin Component ────────────────────────────────────────────────
export default function AdminLogin({ onLogin }) {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake]     = useState(false)
  const [focused, setFocused] = useState('')

  // Subtle entrance animation counter
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.')
      triggerShake()
      return
    }

    setLoading(true)
    setError('')

    // Simulate network latency for realism
    await new Promise(r => setTimeout(r, 900))

    const storedUser = localStorage.getItem('apexnet_admin_username') || 'admin'
    const storedPass = localStorage.getItem('apexnet_admin_password') || 'password123'

    if (form.username === storedUser && form.password === storedPass) {
      localStorage.setItem('apexnet_isAuthenticated', 'true')
      onLogin(true)
    } else {
      setLoading(false)
      setError('Invalid credentials. Access denied.')
      triggerShake()
      setForm(p => ({ ...p, password: '' }))
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const inputStyle = (field) => ({
    width: '100%',
    padding: '14px 14px 14px 44px',
    background: 'rgba(2,4,8,0.8)',
    color: C.text,
    border: `1px solid ${
      error && !form[field]
        ? C.red
        : focused === field
          ? C.cyan
          : 'rgba(0,245,255,0.15)'
    }`,
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    boxShadow: focused === field
      ? `0 0 20px rgba(0,245,255,0.2), inset 0 1px 0 rgba(0,245,255,0.05)`
      : 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    letterSpacing: field === 'password' && form.password ? 2 : 0,
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

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
          position: 'absolute', top: '20%', left: '25%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(191,0,255,0.07) 0%, transparent 65%)',
        }} />
      </div>

      <LoginParticles />

      {/* Login Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 440,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        animation: shake ? 'shake 0.5s ease' : 'none',
      }}>
        <div style={{
          background: 'rgba(7,17,28,0.7)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(0,245,255,0.12)',
          borderRadius: 28,
          padding: '44px 40px',
          boxShadow: `
            0 0 0 1px rgba(0,245,255,0.04),
            0 0 60px rgba(0,245,255,0.07),
            0 0 120px rgba(191,0,255,0.04),
            0 32px 80px rgba(0,0,0,0.7)
          `,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <ScanLine />

          {/* Top corner accent */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 120, height: 120,
            background: 'radial-gradient(circle at top right, rgba(191,0,255,0.12), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: 100, height: 100,
            background: 'radial-gradient(circle at bottom left, rgba(0,245,255,0.08), transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            {/* Logo / Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(0,245,255,0.06)',
              border: '1px solid rgba(0,245,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(0,245,255,0.12)',
              position: 'relative',
            }}>
              <img
                src="/logo.png"
                alt="ApexNet LK"
                style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0,245,255,0.6))' }}
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={30} color={C.cyan} />
              </div>
            </div>

            {/* System badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(0,245,255,0.06)',
              border: '1px solid rgba(0,245,255,0.2)',
              marginBottom: 16,
            }}>
              <Cpu size={10} color={C.cyan} />
              <span style={{ color: C.cyan, fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
                Secure Admin Portal
              </span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
            </div>

            <h1 style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 22, fontWeight: 900,
              color: '#fff',
              marginBottom: 8,
              letterSpacing: 1,
            }}>
              ApexNet{' '}
              <span style={{
                background: 'linear-gradient(90deg, #00f5ff, #bf00ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>LK</span>
            </h1>
            <p style={{ color: C.dim, fontSize: 13 }}>
              Authentication required to proceed
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Username */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: C.muted, fontSize: 12, fontWeight: 600,
                marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                <User size={11} color={C.cyan} /> Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-username"
                  type="text"
                  placeholder="admin"
                  autoComplete="username"
                  value={form.username}
                  onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setError('') }}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused('')}
                  style={inputStyle('username')}
                />
                <User size={15} color={focused === 'username' ? C.cyan : '#334155'}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.3s' }} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: C.muted, fontSize: 12, fontWeight: 600,
                marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                <Lock size={11} color={C.cyan} /> Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError('') }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  style={{ ...inputStyle('password'), paddingRight: 44 }}
                />
                <Lock size={15} color={focused === 'password' ? C.cyan : '#334155'}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.3s' }} />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: '#334155', transition: 'color 0.3s',
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.cyan}
                  onMouseLeave={e => e.currentTarget.style.color = '#334155'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.25)',
                animation: 'fadeIn 0.3s ease',
              }}>
                <AlertCircle size={14} color={C.red} style={{ flexShrink: 0 }} />
                <span style={{ color: C.red, fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '15px 24px', borderRadius: 14,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Orbitron', monospace",
                fontWeight: 700, fontSize: 13, letterSpacing: 1.5,
                textTransform: 'uppercase',
                background: loading
                  ? 'rgba(0,245,255,0.1)'
                  : 'linear-gradient(135deg, rgba(0,245,255,0.15) 0%, rgba(191,0,255,0.15) 100%)',
                color: loading ? C.dim : C.cyan,
                boxShadow: loading ? 'none' : `0 0 30px rgba(0,245,255,0.2), inset 0 1px 0 rgba(0,245,255,0.1)`,
                border: `1px solid ${loading ? 'rgba(0,245,255,0.1)' : 'rgba(0,245,255,0.3)'}`,
                transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.22) 0%, rgba(191,0,255,0.22) 100%)'
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0,245,255,0.3), inset 0 1px 0 rgba(0,245,255,0.15)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.15) 0%, rgba(191,0,255,0.15) 100%)'
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0,245,255,0.2), inset 0 1px 0 rgba(0,245,255,0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `2px solid rgba(0,245,255,0.2)`,
                    borderTop: `2px solid ${C.cyan}`,
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }} />
                  Authenticating…
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Login to Portal
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 24, color: C.dim, fontSize: 11,
          }}>
            <Radio size={10} color='rgba(0,245,255,0.3)' />
            <span>Encrypted session · Authorized access only</span>
          </div>
        </div>
      </div>
    </div>
  )
}
