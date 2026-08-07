const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const submitPriorityRequest = async (token, priorityType, documentUrl) => {
  const res = await fetch(`${API_URL}/priority/submit`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ priority_type: priorityType, document_url: documentUrl })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to submit priority request')
  return data
}

export const getMyPriorityStatus = async (token) => {
  const res = await fetch(`${API_URL}/priority/my-status`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch priority status')
  return data
}

export const getPendingPriorityRequests = async (token) => {
  const res = await fetch(`${API_URL}/priority/pending`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch pending priority requests')
  return data
}

export const approvePriorityRequest = async (token, requestId) => {
  const res = await fetch(`${API_URL}/priority/${requestId}/approve`, {
    method: 'POST',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to approve priority request')
  return data
}

export const rejectPriorityRequest = async (token, requestId, reason) => {
  const res = await fetch(`${API_URL}/priority/${requestId}/reject`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ reason })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to reject priority request')
  return data
}
