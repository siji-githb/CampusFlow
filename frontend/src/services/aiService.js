const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const sendMessage = async (token, message) => {
  const res = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ message })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to send message')
  return data
}

export const sendMessageStream = async (token, message, { onDelta, onStatus, onError, onDone, signal } = {}) => {
  const res = await fetch(`${API_URL}/ai/chat/stream`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ message }),
    signal
  })

  if (!res.ok) {
    let errorDetail = 'Failed to connect to AI assistant'
    try {
      const errData = await res.json()
      errorDetail = errData.detail || errorDetail
    } catch (_) {}
    throw new Error(errorDetail)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // preserve incomplete trailing chunk

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const jsonStr = trimmed.replace(/^data:\s*/, '')
        try {
          const payload = JSON.parse(jsonStr)
          if (payload.type === 'delta' && onDelta) {
            onDelta(payload.content)
          } else if (payload.type === 'status' && onStatus) {
            onStatus(payload.content)
          } else if (payload.type === 'error') {
            if (onError) onError(payload.content)
            else throw new Error(payload.content)
          } else if (payload.type === 'done' && onDone) {
            onDone(payload.session_id)
          }
        } catch (e) {
          // ignore non-json SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export const clearChat = async (token) => {
  const res = await fetch(`${API_URL}/ai/chat/clear`, {
    method: 'DELETE',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to clear chat')
  return data
}

export const getChatHistory = async (token) => {
  const res = await fetch(`${API_URL}/ai/history`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch history')
  return data
}