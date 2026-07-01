import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import crmcLogo from '../../assets/crmc-logo.webp'
import AdminLiveQueuePage from './AdminLiveQueuePage'
import AdminAppointmentsPage from './AdminAppointmentsPage'
import AdminReportsPage from './AdminReportsPage'
import AdminRegistrarRecordsPage from './AdminRegistrarRecordsPage'
import AdminUserManagementPage from './AdminUserManagementPage'
import AdminOfficeConfigPage from './AdminOfficeConfigPage'
import AdminAuditLogPage from './AdminAuditLogPage'
import { Calendar, Ticket, Clock, Bot, Search, Shield, BarChart2, LineChart as LineChartIcon, FolderOpen, Users, Settings, MessageSquare, Bell, LogOut } from 'lucide-react'
import {
  getDashboardStats, getReports, getOfficeConfig, updateOfficeConfig,
  getAllUsers, updateUserRole, getAuditLog, getAiInsights
} from '../../services/adminService'

// ── Sidebar Nav Item ───────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full py-2.5 px-4 rounded-[10px] border-none cursor-pointer text-left font-sans text-[13.5px] transition-all duration-150 ${active ? 'bg-maroon text-white font-semibold' : 'bg-transparent text-text-sub font-normal hover:bg-surface hover:text-text-main'}`}>
    <span className={`flex items-center justify-center w-5 shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`}>{icon}</span>
    <span className="flex-1">{label}</span>
    {active && <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
  </button>
)

// ── Circular Progress Ring ─────────────────────────────────────────────────────
const Ring = ({ pct, color, size = 48 }) => {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7E2" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        className="transition-[stroke-dasharray] duration-600 ease"
      />
    </svg>
  )
}

const LineChart = ({ actualData, labels }) => {
  const W = 560, H = 180, PAD = { top: 20, right: 20, bottom: 36, left: 45 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const maxV = Math.max(...actualData, 4) * 1.15
  const minV = 0

  const toX = i => PAD.left + (i / (actualData.length - 1)) * cW
  const toY = v => PAD.top + cH - ((v - minV) / (maxV - minV)) * cH

  const makePath = data =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  const makeArea = data => {
    const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L')
    const last = data.length - 1
    return `M${toX(0).toFixed(1)},${toY(data[0]).toFixed(1)} L${pts} L${toX(last).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
  }

  const yTicks = [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), Math.round(maxV)]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block overflow-visible">
      <defs>
        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7B1A2A" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7B1A2A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(t)} x2={PAD.left + cW} y2={toY(t)} stroke="#EAE7E2" strokeWidth={1} strokeDasharray="3,3" />
          <text x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fontSize="10" fill="#A8A29E">{t}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={makeArea(actualData)} fill="url(#gradActual)" />

      {/* Line */}
      <path d={makePath(actualData)} fill="none" stroke="#7B1A2A" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {actualData.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={4} fill="#FFFFFF" stroke="#7B1A2A" strokeWidth={2} />
      ))}

      {/* X-axis labels */}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#A8A29E">{l}</text>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardStats(token)
      .then(s => setStats(s))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    setChartLoading(true)
    getReports(token, days)
      .then(r => setReport(r))
      .catch(e => setError(e.message))
      .finally(() => setChartLoading(false))
  }, [token, days])

  if (error) return (
    <div className="py-3.5 px-4.5 rounded-xl bg-danger-light text-danger border border-danger-border">{error}</div>
  )

  // Stat cards matching reference image layout
  const CARDS = [
    {
      label: 'Total Appointments Today',
      value: loading || !stats ? null : stats?.today?.total || 0,
      sub: loading || !stats ? '—' : `${stats?.today?.completed || 0} Completed`,
      subColor: 'text-success',
      icon: <Calendar size={20} />,
      bg: 'bg-maroon',
      textColor: 'text-white',
      dark: true,
    },
    {
      label: 'Active Queue',
      value: loading || !stats ? null : stats?.active_queue || 0,
      sub: loading || !stats ? '—' : 'Currently in progress',
      subColor: 'text-white/75',
      icon: <Ticket size={20} />,
      bg: 'bg-gold',
      textColor: 'text-white',
      dark: true,
    },
    {
      label: 'Completion Rate',
      value: loading || !stats ? null : `${stats?.today?.total > 0 ? Math.round(((stats?.today?.completed || 0) / stats?.today?.total) * 100) : 0}%`,
      sub: loading || !stats ? '—' : 'Of total scheduled',
      subColor: 'text-text-sub',
      icon: null,
      bg: 'bg-white',
      textColor: 'text-text-main',
      dark: false,
    },
    {
      label: 'Avg. Wait Time',
      value: loading || !stats ? null : `${Math.round(stats?.avg_wait_minutes || 0)} min`,
      sub: loading || !stats ? '—' : 'System-wide average',
      subColor: 'text-text-muted',
      icon: <Clock size={20} />,
      bg: 'bg-white',
      textColor: 'text-text-main',
      dark: false,
    },
  ]

  // Build chart data from report.by_date
  const chartLabels = report?.by_date?.map(d => {
    const dt = new Date(d.date)
    return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const actualData = report?.by_date?.map(d => d.count) || [0, 0, 0, 0, 0, 0, 0]

  // Transaction distribution from report
  const txTypes = report?.by_type || []
  const txTotal = txTypes.reduce((s, t) => s + t.count, 0) || 1
  const TX_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9']

  return (
    <div>
      {/* Page heading */}
      <div className="mb-7">
        <h1 className="font-serif text-[34px] font-bold text-maroon m-0 mb-1.5">Overview</h1>
        <p className="text-[14px] text-text-muted m-0">Welcome back. Here is the current status of the registrar operations.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {CARDS.map((c, i) => (
          <div key={i} className={`animate-fade-up rounded-2xl p-[22px_20px] relative overflow-hidden ${c.bg} ${c.dark ? 'border-none shadow-[0_4px_16px_rgba(0,0,0,0.12)]' : 'border border-border shadow-sm'}`} style={{ animationDelay: `${i * 0.1}s` }}>
            {c.dark && (
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
            )}
            <div className={`text-[11px] font-semibold uppercase tracking-[0.06em] mb-2.5 ${c.dark ? 'text-white/65' : 'text-text-muted'}`}>{c.label}</div>
            <div className={`font-serif text-[36px] font-bold leading-none mb-2 min-h-[36px] ${c.dark ? 'text-white' : 'text-maroon'}`}>
              {c.value === null ? <div className={`animate-pulse w-[60px] h-[36px] rounded-lg ${c.dark ? 'bg-white/20' : 'bg-border'}`} /> : c.value}
            </div>
            <div className={`text-[12px] font-semibold ${c.subColor}`}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom row: Chart + Distribution */}
      <div className="grid grid-cols-[1fr_300px] gap-5">

        {/* Volume Chart */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-1">Actual Volume</p>
              <h2 className="font-serif text-[18px] font-bold text-text-main m-0">Document Volume (Last {days} {days === 1 ? 'Day' : 'Days'})</h2>
            </div>
            <div className="flex items-center gap-4">
              <select value={days} onChange={e => setDays(Number(e.target.value))} className="py-1.5 px-3 rounded-md border border-border text-[12px] font-semibold text-text-sub outline-none bg-surface cursor-pointer">
                <option value={1}>Today</option>
                <option value={7}>1 Week</option>
                <option value={14}>2 Weeks</option>
                <option value={21}>3 Weeks</option>
                <option value={30}>1 Month</option>
              </select>
              <div className="flex items-center gap-1.5 text-[12px] text-text-sub">
                <div className="w-5 h-[2.5px] bg-maroon rounded-sm" /> Daily Volume
              </div>
            </div>
          </div>
          <div className="relative h-[240px] py-2.5">
            {chartLoading && (
              <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
                <div className="typing-indicator font-bold text-[24px] text-maroon">Loading</div>
              </div>
            )}
            <LineChart actualData={actualData} labels={chartLabels} />
          </div>
        </div>

        {/* Transaction Distribution */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.5s' }}>
          <div className="mb-5">
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-1">Breakdown</p>
            <h2 className="font-serif text-[18px] font-bold text-text-main m-0">Transaction Distribution</h2>
          </div>

          {chartLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="animate-pulse w-11 h-11 rounded-full bg-border shrink-0" />
                  <div className="flex-1">
                    <div className="animate-pulse w-[60%] h-[14px] rounded bg-border mb-1.5" />
                    <div className="animate-pulse w-[40%] h-[12px] rounded bg-border" />
                  </div>
                </div>
              ))}
            </div>
          ) : txTypes.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-[13px]">No transaction data</div>
          ) : (
            <div className="flex flex-col gap-4">
              {txTypes.slice(0, 5).map((tx, i) => {
                const pct = Math.round((tx.count / txTotal) * 100)
                const color = TX_COLORS[i % TX_COLORS.length]
                return (
                  <div key={i} className="flex items-center gap-3.5">
                    <Ring pct={pct} color={color} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-main mb-1 truncate">{tx.name}</div>
                      <div className="text-[11px] text-text-muted">
                        <span className="font-bold" style={{ color }}>{pct}%</span> &nbsp;·&nbsp; {tx.count} records
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Today's quick summary */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Confirmed', v: loading || !stats ? null : stats?.today?.confirmed || 0, c: 'text-success' },
                { l: 'Cancelled', v: loading || !stats ? null : stats?.today?.cancelled || 0, c: 'text-danger' },
                { l: 'Completed', v: loading || !stats ? null : stats?.today?.completed || 0, c: 'text-info' },
                { l: 'No Show', v: loading || !stats ? null : stats?.today?.no_show || 0, c: 'text-text-muted' },
              ].map((s, i) => (
                <div key={i} className="bg-off-white rounded-[10px] p-[10px_12px] border border-border">
                  <div className={`font-serif text-[20px] font-bold leading-none min-h-[20px] ${s.c}`}>
                    {s.v === null ? <div className="animate-pulse w-10 h-5 bg-border rounded" /> : s.v}
                  </div>
                  <div className="text-[11px] text-text-muted mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('overview')
  const [profileOpen, setProfileOpen] = useState(false)

  const navItems = [
    { id: 'overview', icon: <BarChart2 size={18} />, label: 'Dashboard' },
    { id: 'reports', icon: <LineChartIcon size={18} />, label: 'Reports' },
    { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue' },
    { id: 'appts', icon: <Calendar size={18} />, label: 'Appointments' },
    { id: 'records', icon: <FolderOpen size={18} />, label: 'Registrar Records' },
    { id: 'users', icon: <Users size={18} />, label: 'User Management' },
    { id: 'config', icon: <Settings size={18} />, label: 'Office Config' },
    { id: 'audit', icon: <Shield size={18} />, label: 'Audit Log' },
  ]

  return (
    <div className="min-h-screen flex bg-off-white font-sans">

      {/* ── Left Sidebar ── */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 p-[24px_14px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <img src={crmcLogo} alt="CRMC" className="w-[38px] h-[38px] rounded-full" />
          <div>
            <div className="font-serif text-[14px] font-bold text-maroon leading-[1.2]">CampusFlow</div>
            <div className="text-[10px] text-text-muted tracking-[0.04em]">Registrar Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map(item => (
            <SideItem key={item.id} icon={item.icon} label={item.label}
              active={activeNav === item.id}
              onClick={() => setActiveNav(item.id)} />
          ))}
        </nav>

        {/* Support */}
        <div className="border-t border-border pt-3.5">
          <button className="flex items-center gap-3 w-full py-2.5 px-4 rounded-[10px] border-none cursor-pointer bg-transparent text-text-muted text-[13.5px] font-sans transition-all duration-150 hover:bg-surface hover:text-text-main">
            <span className="flex justify-center w-5"><MessageSquare size={16} /></span> Support
          </button>
        </div>
      </aside>

      {/* ── Right Side ── */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="bg-white border-b border-border px-8 h-[60px] flex items-center justify-end sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            {/* Bell */}
            <button className="w-9 h-9 rounded-full border border-border bg-white cursor-pointer flex items-center justify-center text-text-sub"><Bell size={18} /></button>

            {/* Avatar + dropdown */}
            <div className="relative">
              {profileOpen && <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-105" />}
              <button onClick={() => setProfileOpen(!profileOpen)} className="w-9 h-9 rounded-full bg-maroon border-none cursor-pointer flex items-center justify-center text-[13px] font-bold text-white">
                {user?.first_name?.[0]?.toUpperCase() || 'A'}
              </button>
              {profileOpen && (
                <div className="absolute top-11 right-0 w-[210px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.13)] p-3.5 z-110">
                  <div className="text-[14px] font-bold text-text-main mb-0.5">{user?.first_name} {user?.last_name}</div>
                  <div className="text-[11px] text-text-muted mb-3 break-all">{user?.email}</div>
                  <div className="h-px bg-border mb-2.5" />
                  <button onClick={() => { logout(); navigate('/login') }} className="w-full py-2 px-3 rounded-[9px] border-none bg-danger-light text-danger text-[13px] font-semibold cursor-pointer flex items-center gap-2 font-sans hover:bg-danger-border transition-colors">
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-[36px_40px] flex-1">
          {activeNav === 'overview' && <OverviewTab />}
          {activeNav === 'reports' && <AdminReportsPage />}
          {activeNav === 'config' && <AdminOfficeConfigPage />}
          {activeNav === 'users' && <AdminUserManagementPage />}
          {activeNav === 'audit' && <AdminAuditLogPage />}
          {activeNav === 'queue' && <AdminLiveQueuePage />}
          {activeNav === 'appts' && <AdminAppointmentsPage />}
          {activeNav === 'records' && <AdminRegistrarRecordsPage />}
        </main>
      </div>
    </div>
  )
}
