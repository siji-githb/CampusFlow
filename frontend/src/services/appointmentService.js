const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const getTransactionTypes = async () => {
  const res = await fetch(`${API_URL}/appointments/transaction-types`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch transaction types')
  return data
}

export const getAvailableSlots = async (transactionTypeId, appointmentDate) => {
  const res = await fetch(
    `${API_URL}/appointments/slots?transaction_type_id=${transactionTypeId}&appointment_date=${appointmentDate}`
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch slots')
  return data
}

export const bookAppointment = async (token, payload) => {
  const res = await fetch(`${API_URL}/appointments/book`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to book appointment')
  return data
}

export const getMyAppointments = async (token) => {
  const res = await fetch(`${API_URL}/appointments/my`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch appointments')
  return data
}

export const cancelAppointment = async (token, appointmentId) => {
  const res = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to cancel appointment')
  return data
}