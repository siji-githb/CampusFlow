const API_URL = import.meta.env.VITE_API_URL

export const registerUser = async (data) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Registration failed')
  return result
}

export const loginUser = async (data) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Login failed')
  return result
}

export const verifyStudent = async (studentId) => {
  const response = await fetch(`${API_URL}/auth/verify-student/${studentId}`)
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Verification failed')
  return result
}

export const refreshSession = async (refreshToken) => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Session refresh failed')
  return result
}

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Request failed')
  return result
}

export const resetPassword = async (accessToken, newPassword) => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, new_password: newPassword }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Password reset failed')
  return result
}

export const requestStudentId = async (data) => {
  const response = await fetch(`${API_URL}/auth/request-student-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Request failed')
  return result
}

export const updateProfile = async (data, token) => {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Failed to update profile')
  return result
}

export const changePassword = async (data, token) => {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Failed to change password')
  return result
}

export const logoutAllDevices = async (token) => {
  const response = await fetch(`${API_URL}/auth/logout-all`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Failed to logout from all devices')
  return result
}

export const deleteAccount = async (token) => {
  const response = await fetch(`${API_URL}/auth/account`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Failed to delete account')
  return result
}

export const updateProfilePicture = async (file, token) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`${API_URL}/auth/profile-picture`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}` 
    },
    body: formData,
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Failed to upload profile picture')
  return result
}

export const removeProfilePicture = async (token) => {
  const response = await fetch(`${API_URL}/auth/profile-picture`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail || 'Failed to remove profile picture')
  return result
}


