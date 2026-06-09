const API_URL = import.meta.env.VITE_API_URL

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

export const getDashboardStats = async (token) => {
  const res = await fetch(`${API_URL}/admin/stats`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch stats')
  return data
}

export const getReports = async (token, days = 7) => {
  const res = await fetch(`${API_URL}/admin/reports?days=${days}`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch reports')
  return data
}

export const getRegistrarRecords = async (token, days = 30) => {
  const res = await fetch(`${API_URL}/admin/records?days=${days}`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch registrar records')
  return data
}

export const getAuditLog = async (token, limit = 50) => {
  const res = await fetch(`${API_URL}/admin/audit-log?limit=${limit}`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch audit log')
  return data
}

export const getOfficeConfig = async (token) => {
  const res = await fetch(`${API_URL}/admin/office-config`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch config')
  return data
}

export const updateOfficeConfig = async (token, key, value) => {
  const res = await fetch(`${API_URL}/admin/office-config`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ key, value })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update config')
  return data
}

export const getAllUsers = async (token) => {
  const res = await fetch(`${API_URL}/admin/users`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch users')
  return data
}

export const updateUserRole = async (token, userId, role) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/role?role=${role}`, {
    method: 'PATCH',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update role')
  return data
}

export const toggleUserStatus = async (token, userId, isActive) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/status?is_active=${isActive}`, {
    method: 'PATCH',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to toggle user status')
  return data
}

// ── M12: AI-Generated Admin Insights ─────────────────────────────────────────

export const getAiInsights = async (token) => {
  const res = await fetch(`${API_URL}/admin/insights`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch AI insights')
  return data
}

// ── Admin Appointments ─────────────────────────────────────────────────────────
export const getAllAppointments = async (token, date) => {
  const query = date ? `?date=${date}` : ''
  const res = await fetch(`${API_URL}/admin/appointments${query}`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch appointments')
  return data
}

export const updateAppointmentStatus = async (token, appointmentId, status) => {
  const res = await fetch(`${API_URL}/admin/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ status }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update appointment')
  return data
}