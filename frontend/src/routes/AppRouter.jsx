import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import ProtectedRoute from './ProtectedRoute'

import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import StudentDashboard from '../pages/student/StudentDashboard'
import BookAppointment from '../pages/student/BookAppointment'
import MyAppointments from '../pages/student/MyAppointments'
import MyQueue from '../pages/student/MyQueue'
import AiChat from '../pages/student/AiChat'
import StaffDashboard from '../pages/staff/StaffDashboard'
import AdminDashboard from '../pages/admin/AdminDashboard'

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'student') return <Navigate to="/student/dashboard" replace />
  if (user.role === 'staff') return <Navigate to="/staff/dashboard" replace />
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/book" element={
          <ProtectedRoute allowedRoles={['student']}>
            <BookAppointment />
          </ProtectedRoute>
        } />
        <Route path="/student/appointments" element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyAppointments />
          </ProtectedRoute>
        } />
        <Route path="/student/queue" element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyQueue />
          </ProtectedRoute>
        } />
        <Route path="/student/ai-chat" element={
          <ProtectedRoute allowedRoles={['student']}>
            <AiChat />
          </ProtectedRoute>
        } />

        {/* Staff routes */}
        <Route path="/staff/dashboard" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
              <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
            </div>
          </div>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}