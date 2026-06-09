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

export const getAllAppointments = async (token, dateStr = null) => {
  const url = dateStr 
    ? `${API_URL}/appointments/all?date=${dateStr}` 
    : `${API_URL}/appointments/all`
  const res = await fetch(url, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch all appointments')
  return data
}

export const getAppointmentStats = async (token) => {
  const res = await fetch(`${API_URL}/appointments/stats`, {
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch appointment stats')
  return data
}

export const rescheduleAppointment = async (token, appointmentId, newDate, newTime) => {
  const res = await fetch(`${API_URL}/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ new_date: newDate, new_time: newTime })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to reschedule appointment')
  return data
}