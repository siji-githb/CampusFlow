import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import ToastContainer from '../components/ToastContainer'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    // Clear any existing timer for this toast
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id))
      timersRef.current.delete(id)
    }

    // Set isExiting to trigger exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    )

    // Remove after exit animation completes (200ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newToast = {
      id,
      message,
      type, // 'success' | 'error' | 'info' | 'warning'
      duration,
      isExiting: false,
    }

    setToasts((prev) => {
      // Keep maximum 4 concurrent toasts
      const trimmed = prev.length >= 4 ? prev.slice(prev.length - 3) : prev
      return [...trimmed, newToast]
    })

    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        dismissToast(id)
      }, duration)
      timersRef.current.set(id, timer)
    }

    return id
  }, [dismissToast])

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 4500),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur ?? 4000),
    dismiss: dismissToast,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback safe dummy if used outside provider
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      dismiss: () => {},
    }
  }
  return context
}
