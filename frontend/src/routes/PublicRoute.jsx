import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

/**
 * Route wrapper for public pages (Landing, Login, Register, Forgot/Reset Password).
 * If a user is already authenticated, synchronously redirects them to their
 * respective role dashboard with zero flicker or flash of public landing/login markup.
 */
export default function PublicRoute({ children }) {
  const { user } = useAuth()

  if (user) {
    const target = user.role === 'student' ? '/student/dashboard'
                 : user.role === 'staff'   ? '/staff/dashboard'
                 : '/admin/dashboard'
    return <Navigate to={target} replace />
  }

  return children
}
