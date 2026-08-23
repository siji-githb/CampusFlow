// CampusFlow Service Worker for Mobile & Desktop Web Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for push events from Web Push (if configured)
self.addEventListener('push', (event) => {
  let data = { title: 'CampusFlow Alert', message: 'You have a new update.' }
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (e) {
    if (event.data) {
      data.message = event.data.text()
    }
  }

  const options = {
    body: data.message || data.body || '',
    icon: '/applogo.png',
    badge: '/applogo.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/student/dashboard'
    },
    tag: data.tag || `campusflow-${Date.now()}`,
    renotify: true
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'CampusFlow Update', options)
  )
})

// Handle notification click: focus or open CampusFlow
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/student/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Listen for explicit message events from client window
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title || 'CampusFlow Update', {
      icon: '/applogo.png',
      badge: '/applogo.png',
      vibrate: [200, 100, 200],
      ...options
    })
  }
})
