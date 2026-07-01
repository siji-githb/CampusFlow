import { createContext, useState } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('cf_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('cf_token') || null
  })

  const login = (tokenValue, userData) => {
    setToken(tokenValue)
    setUser(userData)
    sessionStorage.setItem('cf_token', tokenValue)
    sessionStorage.setItem('cf_user', JSON.stringify(userData))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('cf_token')
    sessionStorage.removeItem('cf_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
