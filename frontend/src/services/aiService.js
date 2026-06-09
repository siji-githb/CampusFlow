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