import { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { refreshSession } from '../services/authService'

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
  }

  const updateUser = (newUserData) => {
    const updated = { ...user, ...newUserData }
    setUser(updated)
    localStorage.setItem('cf_user', JSON.stringify(updated))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    refreshTokenRef.current = null
    localStorage.removeItem('cf_token')
    localStorage.removeItem('cf_user')
    localStorage.removeItem('cf_refresh')
  }

  const silentRefresh = useCallback(async () => {
    if (!refreshTokenRef.current) return
    try {
      const result = await refreshSession(refreshTokenRef.current)
      setToken(result.access_token)
      refreshTokenRef.current = result.refresh_token
      localStorage.setItem('cf_token', result.access_token)
      localStorage.setItem('cf_refresh', result.refresh_token)
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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}