const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const submitPriorityRequest = async (arg1, arg2, arg3) => {
  let token, priorityType, documentUrl
  if (typeof arg1 === 'object' && arg1 !== null) {
    priorityType = arg1.priority_type || arg1.priorityType
    documentUrl = arg1.document_url || arg1.documentUrl
    token = arg2
  } else {
    token = arg1
    if (typeof arg2 === 'object' && arg2 !== null) {
      priorityType = arg2.priority_type || arg2.priorityType
      documentUrl = arg2.document_url || arg2.documentUrl
    } else {
      priorityType = arg2
      documentUrl = arg3
    }
  }

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
