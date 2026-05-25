import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-semibold text-gray-800">CampusFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.first_name} {user?.last_name}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Good day, {user?.first_name}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Student ID: {user?.student_id || 'Not set'} · {user?.priority_class} student
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-green-600 text-lg">📅</span>
            </div>
            <h3 className="font-semibold text-gray-800">Book Appointment</h3>
            <p className="text-gray-500 text-sm mt-1">Schedule a registrar transaction</p>
            <button
              onClick={() => navigate('/student/book')}
              className="mt-4 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Book Now →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-blue-600 text-lg">🎫</span>
            </div>
            <h3 className="font-semibold text-gray-800">My Queue</h3>
            <p className="text-gray-500 text-sm mt-1">Track your transaction progress</p>
            <button
              onClick={() => navigate('/student/queue')}
              className="mt-4 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              View Queue →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-purple-600 text-lg">📋</span>
            </div>
            <h3 className="font-semibold text-gray-800">My Appointments</h3>
            <p className="text-gray-500 text-sm mt-1">View and manage your bookings</p>
            <button
              onClick={() => navigate('/student/appointments')}
              className="mt-4 text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              View All →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}