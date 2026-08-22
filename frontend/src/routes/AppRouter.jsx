import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// eslint-disable-next-line no-unused-vars
import { useAuth } from '../context/useAuth'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'

import Landing from '../pages/Landing'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import StudentPortalShell from '../pages/student/StudentPortalShell'
import StaffDashboard from '../pages/staff/StaffDashboard'
import AdminDashboard from '../pages/admin/AdminDashboard'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (Auto-redirects logged-in users with ZERO flicker) */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* Student Portal Shell (Instant 0ms cached navigation with visitedTabs) */}
        <Route path="/student" element={
          <Navigate to="/student/dashboard" replace />
        } />
        <Route path="/student/*" element={
          <ProtectedRoute allowedRoles={['student']}><StudentPortalShell /></ProtectedRoute>
        } />

        {/* Staff */}
        <Route path="/staff/dashboard" element={
          <ProtectedRoute allowedRoles={['staff', 'admin']}><StaffDashboard /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="/unauthorized" element={
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins', sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#7B1A2A', marginBottom: '8px' }}>Access Denied</h1>
              <p style={{ color: '#57534E' }}>You don't have permission to view this page.</p>
            </div>
          </div>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
