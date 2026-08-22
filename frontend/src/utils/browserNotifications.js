/**
 * Browser-based Push Notifications using the Web Notifications API
 */

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window
}

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export const getPushStatus = () => {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'default'
  if (localStorage.getItem('campusflow_push_enabled') === 'false') return 'disabled'
  return 'active'
}

export const isPushEnabled = () => {
  if (!isNotificationSupported()) return false
  return Notification.permission === 'granted' && localStorage.getItem('campusflow_push_enabled') !== 'false'
}

export const setPushEnabled = (enabled) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('campusflow_push_enabled', enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('campusflow-push-toggle', { detail: { enabled } }))
  }
}

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported'
  try {
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
 * Displays a native desktop / browser push notification
 */
export const sendBrowserNotification = (title, message, options = {}) => {
  if (!isPushEnabled()) {
    return null
  }

  try {
    playNotificationSound()

    const notifOptions = {
      body: message || '',
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      tag: options.tag || `campusflow-${Date.now()}`,
      renotify: true,
      silent: false,
      ...options
    }

    const notif = new Notification(title || 'CampusFlow Update', notifOptions)

    notif.onclick = () => {
      try {
        window.focus()
      } catch {}
      notif.close()

      const targetUrl = options.url || (
        (title?.toLowerCase().includes('release') || title?.toLowerCase().includes('ticket') || title?.toLowerCase().includes('queue') || title?.toLowerCase().includes('serving') || title?.toLowerCase().includes('document'))
          ? '/student/queue'
          : (title?.toLowerCase().includes('appointment') ? '/student/appointments' : '/student/dashboard')
      )

      if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
        window.location.href = targetUrl
      }
    }

    return notif
  } catch (err) {
    console.error('Failed to trigger browser notification:', err)
    return null
  }
}
