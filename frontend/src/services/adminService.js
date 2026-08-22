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

// ── Transaction Types ─────────────────────────────────────────────────────────

export const getTransactionTypes = async (token) => {
  const res = await fetch(`${API_URL}/admin/transaction-types`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch transaction types')
  return data
}

export const createTransactionType = async (token, payload) => {
  const res = await fetch(`${API_URL}/admin/transaction-types`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to create transaction type')
  return data
}

export const updateTransactionType = async (token, ttId, payload) => {
  const res = await fetch(`${API_URL}/admin/transaction-types/${ttId}`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update transaction type')
  return data
}

export const deleteTransactionType = async (token, ttId) => {
  const res = await fetch(`${API_URL}/admin/transaction-types/${ttId}`, {
    method: 'DELETE',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to delete transaction type')
  return data
}

export const getReports = async (token, days = 7, docType = 'all') => {
  const url = docType && docType !== 'all'
    ? `${API_URL}/admin/reports?days=${days}&doc_type=${encodeURIComponent(docType)}`
    : `${API_URL}/admin/reports?days=${days}`
  const res = await fetch(url, { headers: authHeader(token) })
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
    body: JSON.stringify({ key, value: String(value) })
  })
  const data = await res.json()
  if (!res.ok) {
    const errorMsg = Array.isArray(data.detail)
      ? data.detail.map(d => d.msg || JSON.stringify(d)).join(', ')
      : (typeof data.detail === 'string' ? data.detail : 'Failed to update config')
    throw new Error(errorMsg)
  }
  return data
}

export const setDateOverride = async (token, date, is_blocked, note) => {
  const res = await fetch(`${API_URL}/admin/date-overrides`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ date, is_blocked, note })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to set date override')
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

export const updateReleaseDate = async (token, appointmentId, releaseDate) => {
  const res = await fetch(`${API_URL}/admin/appointments/${appointmentId}/release-date`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ release_date: releaseDate }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update release date')
  return data
}

// ── Student Records ─────────────────────────────────────────────────────────

export const getStudentRecords = async (token) => {
  const res = await fetch(`${API_URL}/admin/student-records/`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch student records')
  return data
}

export const addStudentRecord = async (token, record) => {
  const formData = new URLSearchParams()
  formData.append('student_id', record.student_id)
  formData.append('first_name', record.first_name)
  formData.append('last_name', record.last_name)
  formData.append('course', record.course)
  formData.append('priority_class', record.priority_class || 'regular')

  const res = await fetch(`${API_URL}/admin/student-records/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to add student record')
  return data
}

export const uploadStudentRecords = async (token, formData) => {
  const res = await fetch(`${API_URL}/admin/student-records/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Do not set Content-Type for FormData, the browser handles the boundary automatically
    },
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to upload student records')
  return data
}

export const deleteStudentRecord = async (token, studentId) => {
  const res = await fetch(`${API_URL}/admin/student-records/${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to delete student record')
  return data
}

export const bulkDeleteStudentRecords = async (token, studentIds) => {
  const res = await fetch(`${API_URL}/admin/student-records/bulk-delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ student_ids: studentIds })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to bulk delete student records')
  return data
}

export const editStudentRecord = async (token, studentId, record) => {
  const formData = new URLSearchParams()
  formData.append('first_name', record.first_name)
  formData.append('last_name', record.last_name)
  formData.append('course', record.course)
  formData.append('priority_class', record.priority_class || 'regular')

  const res = await fetch(`${API_URL}/admin/student-records/${encodeURIComponent(studentId)}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update student record')
  return data
}

// ── Window Assignment ─────────────────────────────────────────────────────────

export const getWindowAssignments = async (token, ts = 0) => {
  const res = await fetch(`${API_URL}/admin/window-assignments?ts=${ts}`, { 
    headers: authHeader(token),
    cache: 'no-store'
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch window assignments')
  return data // { num_windows: number, assignments: { userId: windowNum } }
}

export const claimWindow = async (token, windowNum) => {
  const res = await fetch(`${API_URL}/admin/claim-window`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ window: windowNum }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to claim window')
  return data
}

export const releaseWindow = async (token) => {
  const res = await fetch(`${API_URL}/admin/release-window`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to release window')
  return data
}

// ── ID Requests ──────────────────────────────────────────────────────────────

export const getIdRequests = async (token) => {
  const res = await fetch(`${API_URL}/admin/id-requests`, { headers: authHeader(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch ID requests')
  return data
}

export const updateIdRequestStatus = async (token, requestId, status) => {
  const res = await fetch(`${API_URL}/admin/id-requests/${requestId}`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update request status')
  return data
}

export const deleteIdRequest = async (token, requestId) => {
  const res = await fetch(`${API_URL}/admin/id-requests/${requestId}`, {
    method: 'DELETE',
    headers: authHeader(token)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to delete request')
  return data
}

export const sendIdRequestEmail = async (token, requestId, subject, body) => {
  const res = await fetch(`${API_URL}/admin/id-requests/${requestId}/send-email`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to send email')
  return data
}