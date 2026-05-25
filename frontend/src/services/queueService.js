const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const activateQueue = async (token, appointmentId) => {
  const res = await fetch(`${API_URL}/queue/activate/${appointmentId}`, {
    method: 'POST',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to activate queue')
  return data
}

export const getMyQueue = async (token) => {
  const res = await fetch(`${API_URL}/queue/my`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch queue')
  return data
}

export const getTodaysQueue = async (token) => {
  const res = await fetch(`${API_URL}/queue/today`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch queue')
  return data
}

export const confirmStep = async (token, queueTicketId, stepNumber) => {
  const res = await fetch(`${API_URL}/queue/confirm-step`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({
      queue_ticket_id: queueTicketId,
      step_number: stepNumber
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to confirm step')
  return data
}