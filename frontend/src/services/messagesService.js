const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const getMessages = async (token) => {
  const res = await fetch(`${API_URL}/messages/`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch messages')
  return data
}

export const markMessageRead = async (token, messageId) => {
  const res = await fetch(`${API_URL}/messages/${messageId}/read`, {
    method: 'PATCH',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to mark as read')
  return data
}