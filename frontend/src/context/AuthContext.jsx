import { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { refreshSession } from '../services/authService'
import LogoutScreen from '../components/common/LogoutScreen'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

const SILENT_REFRESH_INTERVAL_MS = 45 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cf_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => {
    return localStorage.getItem('cf_token') || null
  })
  const refreshTokenRef = useRef(localStorage.getItem('cf_refresh') || null)

  const login = (tokenValue, userData, refreshTokenValue) => {
    setToken(tokenValue)
    setUser(userData)
    refreshTokenRef.current = refreshTokenValue || null
    localStorage.setItem('cf_token', tokenValue)
    localStorage.setItem('cf_user', JSON.stringify(userData))
    if (refreshTokenValue) {
      localStorage.setItem('cf_refresh', refreshTokenValue)
    }
    lastRefreshedAtRef.current = Date.now()
  }

  const updateUser = (newUserData) => {
    const updated = { ...user, ...newUserData }
    setUser(updated)
    localStorage.setItem('cf_user', JSON.stringify(updated))
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const requestLogout = () => {
    setShowLogoutConfirm(true)
  }

  const logout = async () => {
    setShowLogoutConfirm(false)
    setIsLoggingOut(true)
    
    // Smooth delay for animation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setToken(null)
    setUser(null)
    refreshTokenRef.current = null
    localStorage.removeItem('cf_token')
    localStorage.removeItem('cf_user')
    localStorage.removeItem('cf_refresh')
    
    setIsLoggingOut(false)
  }

  const lastRefreshedAtRef = useRef(Date.now())

  // Only auto-refresh again if it's been at least this long since the
  // last successful refresh — prevents redundant calls if the user
  // quickly alt-tabs back and forth.
  const MIN_REFRESH_GAP_MS = 5 * 60 * 1000 // 5 minutes

  const silentRefresh = useCallback(async () => {
    if (!refreshTokenRef.current) return
    try {
      const result = await refreshSession(refreshTokenRef.current)
      setToken(result.access_token)
      refreshTokenRef.current = result.refresh_token
      localStorage.setItem('cf_token', result.access_token)
      localStorage.setItem('cf_refresh', result.refresh_token)
      lastRefreshedAtRef.current = Date.now()
    } catch (e) {
      console.error('Silent session refresh failed, logging out:', e.message)
      logout()
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(silentRefresh, SILENT_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [token, silentRefresh])

  // Browsers throttle/pause setInterval on backgrounded tabs, so the
  // scheduled refresh above can silently miss its window during long
  // periods of inactivity. This checks and refreshes proactively the
  // moment the user actually returns to the tab, which is exactly
  // when a stale token would otherwise cause a 401/403.
  useEffect(() => {
    if (!token) return

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const timeSinceLastRefresh = Date.now() - lastRefreshedAtRef.current
      if (timeSinceLastRefresh > MIN_REFRESH_GAP_MS) {
        silentRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [token, silentRefresh])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, requestLogout, updateUser, isLoggingOut }}>
      {children}
      
      {/* Unified Premium Logout Modal & Loading Screen */}
      {(showLogoutConfirm || isLoggingOut) && (
        <LogoutScreen 
          isConfirming={showLogoutConfirm} 
          onConfirm={logout} 
          onCancel={() => setShowLogoutConfirm(false)} 
        />
      )}
    </AuthContext.Provider>
  )
}