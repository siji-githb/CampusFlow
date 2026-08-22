import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      token: null,
      login: () => {},
      logout: () => {},
      requestLogout: () => {},
      updateUser: () => {},
      isLoggingOut: false,
    }
  }
  return context
}