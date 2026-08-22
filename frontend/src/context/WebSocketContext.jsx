import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getNotifications } from '../services/notificationService'
import { sendBrowserNotification } from '../utils/browserNotifications'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const listenersRef = useRef(new Map())
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Fetch initial notifications on login
  const fetchInitialNotifications = useCallback(async () => {
    if (!token) return
    try {
      const data = await getNotifications(token)
      setNotifications(data || [])
    } catch (e) {
      console.error('Failed to fetch initial notifications', e)
    }
  }, [token])

  // Dispatch a staff event to all subscribers
  const dispatchStaffEvent = useCallback((eventData) => {
    const eventType = eventData?.event
    if (!eventType) return

    const callbacks = listenersRef.current.get(eventType)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(eventData.payload || {})
        } catch (err) {
          console.error(`Error in WebSocket listener for ${eventType}:`, err)
        }
      })
    }

    // Also dispatch to '*' wildcard listeners
    const wildcardCallbacks = listenersRef.current.get('*')
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach((cb) => {
        try {
          cb(eventData)
        } catch (err) {
          console.error('Error in wildcard WebSocket listener:', err)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
      setNotifications([])
      return
    }

    fetchInitialNotifications()

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/notifications/ws?token=${token}`

    let isMounted = true

    const connect = () => {
      if (!isMounted) return

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!isMounted) return
          setIsConnected(true)
          fetchInitialNotifications()
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)

            if (data?.type === 'STAFF_EVENT') {
              dispatchStaffEvent(data)
            } else if (data?.id) {
              // Notification payload
              setNotifications((prev) => {
                if (prev.some((n) => n.id === data.id)) return prev
                return [data, ...prev]
              })

              // Trigger native browser push notification
              sendBrowserNotification(data.title, data.message, { tag: `notif-${data.id}` })
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message', e)
          }
        }

        ws.onerror = () => {
          // Errors are gracefully handled in onclose
        }

        ws.onclose = () => {
          if (!isMounted) return
          setIsConnected(false)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      } catch (err) {
        console.error('WebSocket connection error:', err)
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }
  }, [token, fetchInitialNotifications, dispatchStaffEvent])

  // Subscribe to one or more staff event types
  const subscribeStaffEvent = useCallback((eventTypes, callback) => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes]

    types.forEach((type) => {
      if (!listenersRef.current.has(type)) {
        listenersRef.current.set(type, new Set())
      }
      listenersRef.current.get(type).add(callback)
    })

    return () => {
      types.forEach((type) => {
        const set = listenersRef.current.get(type)
        if (set) {
          set.delete(callback)
          if (set.size === 0) listenersRef.current.delete(type)
        }
      })
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        notifications,
        setNotifications,
        fetchInitialNotifications,
        subscribeStaffEvent
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Custom hook for components to subscribe to real-time staff events.
 * Example usage:
 *   useStaffEvent(['QUEUE_UPDATED', 'WINDOW_UPDATED'], () => {
 *     loadData()
 *   })
 */
export function useStaffEvent(eventTypes, callback) {
  const context = useContext(WebSocketContext)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!context?.subscribeStaffEvent) return
    const stableCallback = (payload) => {
      if (callbackRef.current) callbackRef.current(payload)
    }
    return context.subscribeStaffEvent(eventTypes, stableCallback)
  }, [context, JSON.stringify(eventTypes)])
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
