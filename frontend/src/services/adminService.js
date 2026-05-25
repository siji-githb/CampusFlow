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