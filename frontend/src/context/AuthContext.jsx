import { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { refreshSession } from '../services/authService'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

// Supabase access tokens expire ~60 minutes after login. Refreshing every 45
// minutes leaves headroom so long-lived, continuously-polling dashboard tabs
// never actually hit a dead access token and see a 401.
const SILENT_REFRESH_INTERVAL_MS = 45 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('cf_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('cf_token') || null
  })
  const refreshTokenRef = useRef(sessionStorage.getItem('cf_refresh') || null)

  const login = (tokenValue, userData, refreshTokenValue) => {
    setToken(tokenValue)
    setUser(userData)
    refreshTokenRef.current = refreshTokenValue || null
    sessionStorage.setItem('cf_token', tokenValue)
    sessionStorage.setItem('cf_user', JSON.stringify(userData))
    if (refreshTokenValue) {
      sessionStorage.setItem('cf_refresh', refreshTokenValue)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    refreshTokenRef.current = null
    sessionStorage.removeItem('cf_token')
    sessionStorage.removeItem('cf_user')
    sessionStorage.removeItem('cf_refresh')
  }

  const silentRefresh = useCallback(async () => {
    if (!refreshTokenRef.current) return
    try {
      const result = await refreshSession(refreshTokenRef.current)
      setToken(result.access_token)
      refreshTokenRef.current = result.refresh_token
      sessionStorage.setItem('cf_token', result.access_token)
      sessionStorage.setItem('cf_refresh', result.refresh_token)
    } catch (e) {
      // Refresh token itself is no longer valid (e.g. expired after long
      // inactivity) — fall back to requiring a normal re-login rather than
      // leaving a silently-dead session in place.
      console.error('Silent session refresh failed, logging out:', e.message)
      logout()
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(silentRefresh, SILENT_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [token, silentRefresh])

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
