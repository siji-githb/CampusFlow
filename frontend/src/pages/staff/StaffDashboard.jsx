import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import QueueManager from './QueueManager'

export default function StaffDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('queue')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-semibold text-gray-800">CampusFlow — Staff</span>
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Queue Manager
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'messages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Messages
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === 'queue' && <QueueManager />}
        {activeTab === 'messages' && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">💬</p>
            <p>Messages coming in Module 4 (AI Assistant).</p>
          </div>
        )}
      </main>
    </div>
  )
}