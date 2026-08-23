/**
 * Browser-based Push Notifications using the Web Notifications & Service Worker APIs
 * Full support for Desktop browsers (Chrome/Firefox/Edge/Safari) and Mobile Android (Chrome/PWA)
 */

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator)
}

export const getNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export const getPushStatus = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'default'
  if (localStorage.getItem('campusflow_push_enabled') === 'false') return 'disabled'
  return 'active'
}

export const isPushEnabled = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  return Notification.permission === 'granted' && localStorage.getItem('campusflow_push_enabled') !== 'false'
}

export const setPushEnabled = (enabled) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('campusflow_push_enabled', enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('campusflow-push-toggle', { detail: { enabled } }))
  }
}

/**
 * Register Service Worker for Mobile / Desktop Push Notifications
 */
export const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      return reg
    } catch (err) {
      console.warn('Service Worker registration failed:', err)
      return null
    }
  }
  return null
}

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    // Ensure service worker is registered first
    await registerServiceWorker()

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setPushEnabled(true)
    }
    return permission
  } catch (err) {
    console.error('Error requesting notification permission:', err)
    return 'denied'
  }
}

/**
 * Play a subtle sound cue if available / permitted
 */
export const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const audioContext = new AudioCtx()
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, audioContext.currentTime) // D5
    osc.frequency.setValueAtTime(880, audioContext.currentTime + 0.1) // A5
    gain.gain.setValueAtTime(0.15, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start()
    osc.stop(audioContext.currentTime + 0.4)
  } catch {
    // AudioContext blocked or not supported — ignore silently
  }
}

/**
 * Displays a native desktop & mobile push notification
 */
export const sendBrowserNotification = async (title, message, options = {}) => {
  if (!isPushEnabled()) {
    return null
  }

  playNotificationSound()

  const targetUrl = options.url || (
    (title?.toLowerCase().includes('release') || title?.toLowerCase().includes('ticket') || title?.toLowerCase().includes('queue') || title?.toLowerCase().includes('serving') || title?.toLowerCase().includes('document'))
      ? '/student/queue'
      : (title?.toLowerCase().includes('appointment') ? '/student/appointments' : '/student/dashboard')
  )

  const notifOptions = {
    body: message || '',
    icon: '/applogo.png',
    badge: '/applogo.png',
    tag: options.tag || `campusflow-${Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: targetUrl
    },
    ...options
  }

  // 1. Mobile Android & PWA: Use ServiceWorkerRegistration.showNotification()
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      if (registration && registration.showNotification) {
        await registration.showNotification(title || 'CampusFlow Update', notifOptions)
        return true
      }
    } catch (swErr) {
      console.warn('Service worker showNotification fallback:', swErr)
    }
  }

  // 2. Desktop Fallback: Standard window Notification constructor
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notif = new Notification(title || 'CampusFlow Update', notifOptions)
      notif.onclick = () => {
        try {
          window.focus()
        } catch {}
        notif.close()
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.href = targetUrl
        }
      }
      return notif
    }
  } catch (err) {
    console.warn('Failed to trigger window Notification:', err)
  }

  return null
}
