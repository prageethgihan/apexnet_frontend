import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import {
  User, Copy, Check, ExternalLink, MessageCircle,
  Laptop, Shield, HelpCircle, Star, AlertCircle, Clock
} from 'lucide-react'

// ─── Color tokens ──────────────────────────────────────────────────────────
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

export default function MyProfile({ user, onLogout }) {
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [copied, setCopied] = useState(false)

  // Fetch subscription from Firestore (vpn_users or pending_orders)
  useEffect(() => {
    if (!user?.email) {
      setLoadingSub(false)
      return
    }

    // Query active/trial subscriptions in vpn_users
    const qVpn = query(
      collection(db, 'vpn_users'),
      where('email', '==', user.email)
    )

    const unsubVpn = onSnapshot(qVpn, (vpnSnap) => {
      if (!vpnSnap.empty) {
        // Sort/find active subscription
        const activeSub = vpnSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0]
        setSubscription({
          type: 'active',
          planName: activeSub.dataLimit === '5GB' ? 'Free Trial' : (activeSub.package || 'Premium Plan'),
          dataLimit: activeSub.dataLimit,
          expiryDate: activeSub.expiryDate,
          currentUsage: activeSub.currentUsage || 0,
          totalLimit: activeSub.totalLimit || 0,
          status: activeSub.status || 'Active',
          ispPackage: activeSub.ispPackage || '',
        })
        setLoadingSub(false)
      } else {
        // Fallback to checking pending orders
        const qPending = query(
          collection(db, 'pending_orders'),
          where('email', '==', user.email),
          where('status', '==', 'Pending')
        )

        const unsubPending = onSnapshot(qPending, (pendingSnap) => {
          if (!pendingSnap.empty) {
            const pendingOrder = pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0]
            setSubscription({
              type: 'pending',
              planName: pendingOrder.package || 'Premium Plan',
              dataLimit: pendingOrder.dataLimit,
              expiryDate: 'Pending Activation',
              status: 'Pending',
            })
          } else {
            setSubscription(null)
          }
          setLoadingSub(false)
        }, (err) => {
          console.error("Pending orders listener error:", err)
          setLoadingSub(false)
        })

        return () => unsubPending()
      }
    }, (err) => {
      console.error("VPN users listener error:", err)
      setLoadingSub(false)
    })

    return () => unsubVpn()
  }, [user])

  const handleCopyReferral = () => {
    const refLink = `https://apexnet.lk/ref/${user.uid}`
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    
    // Trigger global toast
    const event = new CustomEvent('apexnet-toast', {
      detail: { message: 'Referral link copied to clipboard!', type: 'success' }
    })
    window.dispatchEvent(event)

    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenDevices = () => {
    window.dispatchEvent(new CustomEvent('apexnet-open-devices'))
  }

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!subscription || !subscription.totalLimit) return 0
    return Math.min(Math.round((subscription.currentUsage / subscription.totalLimit) * 100), 100)
  }, [subscription])

  // Calculate days remaining
  const daysLeft = useMemo(() => {
    if (!subscription || !subscription.expiryDate || subscription.expiryDate === 'Pending Activation') return null
    const diffTime = new Date(subscription.expiryDate) - new Date()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [subscription])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, position: 'relative', overflow: 'hidden', paddingBottom: 60 }}>
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
          position: 'absolute', top: '20%', left: '10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(191,0,255,0.04) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,255,0.04) 0%, transparent 65%)',
        }} />
      </div>

      <main style={{ maxWidth: 1024, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 10 }}>
        
        {/* Welcome Section */}
        <div style={{
          background: 'rgba(7,17,28,0.7)', backdropFilter: 'blur(30px)',
          border: '1px solid rgba(0,245,255,0.1)', borderRadius: 24,
          padding: '30px 24px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ position: 'relative' }}>
            <img
              src={user.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
              alt={user.displayName || 'Google User'}
              style={{
                width: 76, height: 76, borderRadius: '50%',
                border: `2px solid ${C.cyan}`,
                boxShadow: '0 0 16px rgba(0,245,255,0.4)',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: C.cyan, border: `2px solid ${C.card}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={12} color={C.bg} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{
                color: '#fff', fontFamily: "'Orbitron', monospace",
                fontSize: 22, fontWeight: 900, margin: 0
              }}>
                {user.displayName || 'Client Portal'}
              </h2>
              <span style={{
                background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.3)',
                color: C.cyan, fontSize: 10, fontWeight: 700,
                padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                Verified Portal User
              </span>
            </div>
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24
        }}>
          
          {/* COLUMN 1: Active Subscription & Connected Devices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Active Subscription Card */}
            <div style={{
              background: 'rgba(7,17,28,0.8)', backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24,
              padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
                  VPN Subscription
                </h3>
                {subscription && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: subscription.status === 'Active' || subscription.status === 'Trial' ? 'rgba(37,211,102,0.1)' : 'rgba(249,115,22,0.1)',
                    border: `1px solid ${subscription.status === 'Active' || subscription.status === 'Trial' ? 'rgba(37,211,102,0.3)' : 'rgba(249,115,22,0.3)'}`,
                    color: subscription.status === 'Active' || subscription.status === 'Trial' ? '#4ade80' : '#fb923c',
                    textTransform: 'uppercase'
                  }}>
                    {subscription.status}
                  </span>
                )}
              </div>

              {loadingSub ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textMuted, fontSize: 13, padding: '20px 0' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(0,245,255,0.2)',
                    borderTop: `2px solid ${C.cyan}`,
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Syncing subscription data…
                </div>
              ) : subscription ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'Orbitron', monospace", color: C.cyan, fontSize: 22, fontWeight: 800 }}>
                      {subscription.planName}
                    </div>
                    {subscription.ispPackage && (
                      <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                        Payload config: <span style={{ color: '#fff', fontWeight: 600 }}>{subscription.ispPackage}</span>
                      </div>
                    )}
                  </div>

                  {subscription.type === 'active' && (
                    <>
                      {/* Usage bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
                          <span>Data Usage</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{subscription.currentUsage} GB / {subscription.dataLimit}</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{
                            width: `${usagePercentage}%`, height: '100%',
                            background: `linear-gradient(90deg, ${C.purple}, ${C.cyan})`,
                            borderRadius: 999,
                            boxShadow: `0 0 10px ${C.cyan}`,
                          }} />
                        </div>
                      </div>

                      {/* Expiry date / countdown */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <Clock size={14} color={C.cyan} />
                        <span style={{ fontSize: 12, color: C.textPrimary }}>
                          Expires: <strong style={{ color: '#fff' }}>{subscription.expiryDate}</strong> 
                          {daysLeft !== null && (
                            <span style={{ color: C.cyan, marginLeft: 8 }}>
                              ({daysLeft <= 0 ? 'Expired' : `${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining`})
                            </span>
                          )}
                        </span>
                      </div>
                    </>
                  )}

                  {subscription.type === 'pending' && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)',
                    }}>
                      <AlertCircle size={16} color="#fb923c" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 12, color: C.textPrimary, lineHeight: 1.5 }}>
                        This order is pending verification. Please contact support via WhatsApp to complete configuration delivery.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <AlertCircle size={32} color={C.textDim} style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 16px' }}>
                    You have no active subscription plans associated with this email.
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(191,0,255,0.1))',
                      border: '1px solid rgba(0,245,255,0.3)', color: C.cyan,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(191,0,255,0.2))'}
                    onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(191,0,255,0.1))'}
                  >
                    View Pricing Packages
                  </button>
                </div>
              )}
            </div>

            {/* Connected Devices Status Card */}
            <div style={{
              background: 'rgba(7,17,28,0.8)', backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24,
              padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
                Concurrent Device Limits
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,245,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,245,255,0.15)' }}>
                  <Laptop size={20} color={C.cyan} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron', monospace" }}>
                    1 / 3 Devices Active
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                    Premium configs support up to 3 active clients.
                  </div>
                </div>
              </div>

              <button
                onClick={handleOpenDevices}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: C.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                Manage Active Devices
              </button>
            </div>

          </div>

          {/* COLUMN 2: Referral Rewards & Support Hub */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Referral Rewards Card */}
            <div style={{
              background: 'rgba(7,17,28,0.8)', backdropFilter: 'blur(30px)',
              border: '1px solid rgba(191,0,255,0.15)', borderRadius: 24,
              padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 0 30px rgba(191,0,255,0.03), 0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(191,0,255,0.08)', border: '1px solid rgba(191,0,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Star size={16} color={C.purple} style={{ filter: 'drop-shadow(0 0 4px rgba(191,0,255,0.5))' }} />
                </div>
                <h3 style={{ color: '#fff', fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Referral Program
                </h3>
              </div>

              <p style={{ color: C.textPrimary, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Refer a friend to ApexNet LK! You and your friend both receive <strong style={{ color: C.cyan }}>10GB Bonus Data</strong> immediately when they activate a premium package.
              </p>

              <div>
                <div style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                  Your Unique Referral Link
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(2,4,8,0.8)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '8px 12px',
                }}>
                  <span style={{
                    color: C.textPrimary, fontSize: 11, fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
                  }}>
                    {`apexnet.lk/ref/${user.uid}`}
                  </span>
                  <button
                    onClick={handleCopyReferral}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 6, borderRadius: 8,
                      color: copied ? C.cyan : C.textMuted,
                      background: copied ? 'rgba(0,245,255,0.06)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Support Center Card */}
            <div style={{
              background: 'rgba(7,17,28,0.8)', backdropFilter: 'blur(30px)',
              border: '1px solid rgba(0,245,255,0.08)', borderRadius: 24,
              padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <HelpCircle size={16} color={C.cyan} />
                </div>
                <h3 style={{ color: '#fff', fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Support Center
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: C.textPrimary }}>
                  WhatsApp Hotline: <span style={{ color: C.cyan, fontWeight: 700 }}>+94 77 123 4567</span>
                </div>
                <div style={{ fontSize: 12, color: C.textPrimary }}>
                  Admin Email: <span style={{ color: C.cyan, fontWeight: 700 }}>admin@apexnet.lk</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const msg = `Hello Admin! I would like to get support for my user email: ${user.email}.`
                  window.open(`https://wa.me/94771234567?text=${encodeURIComponent(msg)}`, '_blank')
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

        </div>

      </main>
    </div>
  )
}
