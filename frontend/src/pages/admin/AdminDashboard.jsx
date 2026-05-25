import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  getDashboardStats,
  getReports,
  getOfficeConfig,
  updateOfficeConfig,
  getAllUsers,
  updateUserRole,
  getAuditLog
} from '../../services/adminService'

const TABS = ['Overview', 'Reports', 'Office Config', 'Users', 'Audit Log']

export default function AdminDashboard() {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Overview')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-semibold text-gray-800">CampusFlow — Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.first_name} {user?.last_name}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-medium">
            Logout
          </button>
        </div>
      </nav>

      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${activeTab === tab
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'Overview' && <OverviewTab token={token} />}
        {activeTab === 'Reports' && <ReportsTab token={token} />}
        {activeTab === 'Office Config' && <OfficeConfigTab token={token} />}
        {activeTab === 'Users' && <UsersTab token={token} />}
        {activeTab === 'Audit Log' && <AuditLogTab token={token} />}
      </main>
    </div>
  )
}

function OverviewTab({ token }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardStats(token)
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="text-center py-12 text-gray-400">Loading stats...</div>
  if (error) return <div className="text-red-500 text-sm">{error}</div>
  if (!stats) return null

  const statCards = [
    { value: stats.today.total, sub: 'Total today', color: 'bg-blue-50 text-blue-600', icon: '📅' },
    { value: stats.today.completed, sub: 'Completed today', color: 'bg-green-50 text-green-600', icon: '✅' },
    { value: stats.active_queue, sub: 'Active in queue', color: 'bg-yellow-50 text-yellow-600', icon: '🎫' },
    { value: stats.today.cancelled, sub: 'Cancelled today', color: 'bg-red-50 text-red-600', icon: '❌' },
    { value: stats.week_total, sub: 'This week', color: 'bg-purple-50 text-purple-600', icon: '📊' },
    { value: stats.total_students, sub: 'Registered students', color: 'bg-gray-50 text-gray-600', icon: '👥' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Today's Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Confirmed', value: stats.today.confirmed, color: 'bg-green-500' },
            { label: 'Completed', value: stats.today.completed, color: 'bg-blue-500' },
            { label: 'Cancelled', value: stats.today.cancelled, color: 'bg-red-400' },
            { label: 'No Show', value: stats.today.no_show, color: 'bg-gray-400' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-sm text-gray-500">{item.label}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: stats.today.total > 0 ? `${(item.value / stats.today.total) * 100}%` : '0%' }}
                />
              </div>
              <div className="w-8 text-sm font-medium text-gray-700 text-right">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReportsTab({ token }) {
  const [report, setReport] = useState(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    
    getReports(token, days)
      .then(data => {
        setReport(data)
        setError('')
        setLoading(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message)
          setLoading(false)
        }
      })
    
    return () => controller.abort()
  }, [days, token])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Transaction Reports</h2>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading report...</div>
      ) : report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: report.total_appointments, color: 'text-gray-800' },
              { label: 'Completed', value: report.completed, color: 'text-green-600' },
              { label: 'Completion Rate', value: `${report.completion_rate}%`, color: 'text-blue-600' },
              { label: 'No-show Rate', value: `${report.no_show_rate}%`, color: 'text-red-500' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-sm text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">By Transaction Type</h3>
            <div className="space-y-3">
              {report.by_type.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-gray-600">{item.name}</div>
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: report.total_appointments > 0 ? `${(item.count / report.total_appointments) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-8 text-sm font-medium text-gray-700 text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Daily Volume</h3>
            {report.by_date.length === 0 ? (
              <p className="text-gray-400 text-sm">No data for this period.</p>
            ) : (
              <div className="space-y-2">
                {report.by_date.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-500">{item.date}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${(item.count / Math.max(...report.by_date.map(d => d.count))) * 100}%` }}
                      />
                    </div>
                    <div className="w-8 text-sm font-medium text-gray-700 text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OfficeConfigTab({ token }) {
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [edited, setEdited] = useState({})
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getOfficeConfig(token)
      .then(data => {
        setConfig(data)
        const initial = {}
        data.forEach(c => { initial[c.key] = c.value })
        setEdited(initial)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSave = async (key) => {
    setSaving(key)
    setError('')
    setSuccess('')
    try {
      await updateOfficeConfig(token, key, edited[key])
      setSuccess(`"${key}" updated successfully`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const CONFIG_LABELS = {
    daily_cap_tor: 'Daily Cap — TOR',
    daily_cap_coe: 'Daily Cap — COE',
    daily_cap_diploma: 'Daily Cap — Diploma',
    office_open_time: 'Office Open Time',
    office_close_time: 'Office Close Time',
    slot_duration_minutes: 'Slot Duration (minutes)',
    booking_cutoff_days: 'Booking Cutoff (days)',
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Office Configuration</h2>
      {error && <div className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-4 bg-green-50 px-4 py-3 rounded-lg">{success}</div>}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading config...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {config.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {CONFIG_LABELS[item.key] || item.key}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.key}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={edited[item.key] ?? item.value}
                  onChange={e => setEdited({ ...edited, [item.key]: e.target.value })}
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSave(item.key)}
                  disabled={saving === item.key}
                  className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium px-3 py-1.5 rounded-lg"
                >
                  {saving === item.key ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UsersTab({ token }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers(token)
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers() }, [])

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId)
    try {
      await updateUserRole(token, userId, newRole)
      await fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const ROLE_COLORS = {
    student: 'bg-green-100 text-green-700',
    staff: 'bg-blue-100 text-blue-700',
    admin: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">User Management</h2>
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading users...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Student ID</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Role</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {u.last_name}, {u.first_name}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3 text-gray-500">{u.student_id || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${ROLE_COLORS[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={updating === u.id}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AuditLogTab({ token }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuditLog(token)
      .then(setLogs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Audit Log</h2>
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading audit log...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400">No audit entries yet.</p>
          <p className="text-gray-400 text-sm mt-1">Actions will be recorded here as the system is used.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Time</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">User</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Action</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Table</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {log.users ? `${log.users.first_name} ${log.users.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-800">{log.action}</td>
                  <td className="px-5 py-3 text-gray-500">{log.table_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}