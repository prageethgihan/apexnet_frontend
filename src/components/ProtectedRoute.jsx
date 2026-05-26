import AdminLogin from '../pages/AdminLogin'
import AdminDashboard from '../pages/AdminDashboard'

/**
 * ProtectedRoute
 * Checks localStorage for the isAuthenticated flag.
 * - Not authenticated → renders AdminLogin
 * - Authenticated     → renders AdminDashboard
 *
 * Both components receive the `onAuthChange` callback so they can
 * update the flag and trigger a re-render of this wrapper.
 */
export default function ProtectedRoute({ isAuthenticated, onAuthChange }) {
  if (!isAuthenticated) {
    return <AdminLogin onLogin={onAuthChange} />
  }
  return <AdminDashboard onLogout={onAuthChange} />
}
