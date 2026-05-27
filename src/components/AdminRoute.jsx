// =============================================================================
// AdminRoute.jsx  —  Firebase-powered admin access guard
// ApexNet LK · Admin Portal
//
// Allowed admin emails (allowlist enforced client-side for UX;
// actual data security relies on Firebase Security Rules + backend auth).
// =============================================================================

import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import AdminLogin from '../pages/AdminLogin'
import AdminDashboard from '../pages/AdminDashboard'
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Allowed admin emails ──────────────────────────────────────────────────────
const ADMIN_EMAILS = [
  'admin@apexnetvpn.xyz',
  'prageethgihan55@gmail.com',
]

const isAdminEmail = (email) =>
  email && ADMIN_EMAILS.includes(email.toLowerCase().trim())

// ─── Full-screen loading spinner ──────────────────────────────────────────────
function AuthLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#020408',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      {/* Grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Spinner */}
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        border: '3px solid rgba(0,245,255,0.1)',
        borderTop: '3px solid #00f5ff',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: 12, fontWeight: 700, letterSpacing: 3,
        color: 'rgba(0,245,255,0.5)', textTransform: 'uppercase',
      }}>
        Authenticating…
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Unauthorized screen ───────────────────────────────────────────────────────
function UnauthorizedScreen({ email }) {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh', background: '#020408',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
    }}>
      {/* Grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(248,113,113,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(248,113,113,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      <div style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(7,17,28,0.85)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 28, padding: '48px 40px', maxWidth: 440, width: '100%',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(248,113,113,0.08), 0 32px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 30px rgba(248,113,113,0.1)',
        }}>
          <AlertCircle size={32} color="#f87171" />
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900,
          color: '#fff', marginBottom: 12,
        }}>
          Access{' '}
          <span style={{
            background: 'linear-gradient(90deg,#f87171,#fb923c)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Denied</span>
        </h1>

        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          The account{' '}
          <span style={{
            color: '#94a3b8', fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', padding: '1px 8px', borderRadius: 6,
          }}>{email}</span>
          {' '}is not authorized to access the Admin Portal.
        </p>
        <p style={{ color: '#475569', fontSize: 12, marginBottom: 32 }}>
          Contact the system administrator if you believe this is an error.
        </p>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 24px', borderRadius: 12,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)' }}
        >
          <ArrowLeft size={14} /> Return to Home
        </button>
      </div>
    </div>
  )
}

// ─── AdminRoute ───────────────────────────────────────────────────────────────
/**
 * Self-contained Firebase auth guard for the admin panel.
 *
 * States:
 *   loading          → full-screen spinner (waiting for Firebase onAuthStateChanged)
 *   !user            → AdminLogin page
 *   user + isAdmin   → AdminDashboard
 *   user + !isAdmin  → Unauthorized screen
 */
export default function AdminRoute() {
  const [user, setUser]       = useState(undefined)   // undefined = not yet resolved
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading || user === undefined) {
    return <AuthLoader />
  }

  if (!user) {
    return <AdminLogin />
  }

  if (!isAdminEmail(user.email)) {
    return <UnauthorizedScreen email={user.email} />
  }

  return <AdminDashboard />
}
