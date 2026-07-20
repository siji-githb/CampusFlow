import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import campusFlowLogo from '../../assets/logo.png'
import AdminLiveQueuePage from './AdminLiveQueuePage'
import AdminAppointmentsPage from './AdminAppointmentsPage'
import AdminAnalyticsPage from './AdminAnalyticsPage'
import AdminRegistrarRecordsPage from './AdminRegistrarRecordsPage'
import AdminUserManagementPage from './AdminUserManagementPage'
import AdminOfficeConfigPage from './AdminOfficeConfigPage'
import AdminAuditLogPage from './AdminAuditLogPage'
import StudentRecordsPage from '../staff/StudentRecordsPage'
import { Calendar, Ticket, Clock, Bot, Search, Shield, BarChart2, LineChart as LineChartIcon, FolderOpen, Users, Settings, MessageSquare, Bell, LogOut, LayoutDashboard, CheckSquare, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import {
  getDashboardStats, getReports
} from '../../services/adminService'
import NotificationDropdown from '../../components/NotificationDropdown'
import AdminGlobalSearch from '../../components/AdminGlobalSearch'

// ── Sidebar Nav Item ───────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`relative flex items-center gap-3 w-full py-2.5 px-4 rounded-[10px] border-none cursor-pointer text-left font-sans text-[13.5px] transition-all duration-300 overflow-hidden
      ${active ? 'bg-maroon-light/60 text-maroon font-bold' : 'bg-transparent text-text-sub font-medium hover:bg-surface hover:text-text-main'}`}
  >
    {active && (
      <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] bg-maroon rounded-r-full shadow-[1px_0_6px_rgba(123,26,42,0.3)]" />
    )}
    <span className={`flex items-center justify-center w-5 shrink-0 transition-all duration-300 ${active ? 'opacity-100 scale-110 text-maroon' : 'opacity-70'}`}>
      {icon}
    </span>
    <span className="flex-1 tracking-wide">{label}</span>
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

// ── Donut Chart ────────────────────────────────────────────────────────────────
const DonutChart = ({ data, total, colors }) => {
  const [hovered, setHovered] = useState(null)
  
  const size = 220
  const strokeWidth = 45
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  
  let currentOffset = 0
  
  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7E2" strokeWidth={strokeWidth} />
          {data.map((tx, i) => {
            const pct = total > 0 ? tx.count / total : 0
            const dash = pct * circ
            const offset = currentOffset
            currentOffset += dash
            
            // tiny gap if piece is big enough
            const visibleDash = dash > 2 ? dash - 2 : dash
            const isHovered = hovered === i
            
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${visibleDash} ${circ}`}
                strokeDashoffset={-offset}
                className={`transition-all duration-300 ease-out cursor-pointer ${hovered !== null && !isHovered ? 'opacity-30' : 'opacity-100'}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300">
          <div className="text-[14px] font-semibold text-text-main transition-colors">
            {hovered !== null ? data[hovered].name : 'Total'}
          </div>
          <div className="text-[32px] font-bold text-text-main leading-tight transition-all">
            {hovered !== null ? data[hovered].count : total}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-8">
        {data.map((tx, i) => (
          <div 
            key={i} 
            className={`flex items-center gap-2.5 cursor-pointer transition-opacity duration-200 ${hovered !== null && hovered !== i ? 'opacity-40' : 'opacity-100'}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }} />
            <div className="text-[13.5px] font-semibold text-text-main">{tx.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const LineChart = ({ actualData, labels }) => {
  const [hoverIndex, setHoverIndex] = useState(null)

  const W = 560, H = 180, PAD = { top: 20, right: 16, bottom: 28, left: 40 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const maxV = Math.max(...actualData, 4) * 1.15
  const minV = 0

  const toX = i => {
    if (actualData.length <= 1) return PAD.left + cW / 2;
    return PAD.left + (i / (actualData.length - 1)) * cW;
  };
  const toY = v => PAD.top + cH - ((v - minV) / (maxV - minV)) * cH

  const makePath = data =>
    data.length === 0 ? '' : data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  const makeArea = data => {
    if (data.length === 0) return '';
    const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L')
    const last = data.length - 1
    if (last === 0) {
      return `M${toX(0).toFixed(1)},${toY(data[0]).toFixed(1)} L${toX(0).toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
    }
    return `M${toX(0).toFixed(1)},${toY(data[0]).toFixed(1)} L${pts} L${toX(last).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
  }

  // Y-axis: always show 0–5 (or higher if data exceeds 5), with 5 even intervals
  const dataMax = Math.max(...actualData, 5)
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((dataMax / 5) * i))

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const svgX = x * (W / rect.width)
    
    if (actualData.length <= 1) {
      setHoverIndex(0)
      return
    }
    
    const segmentWidth = cW / (actualData.length - 1)
    const relativeX = svgX - PAD.left
    let index = Math.round(relativeX / segmentWidth)
    index = Math.max(0, Math.min(actualData.length - 1, index))
    setHoverIndex(index)
  }

  return (
    <div className="relative w-full h-full">
      <svg 
        viewBox={`0 0 ${W} ${H}`} 
        className="w-full h-auto block overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
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

        {/* X-axis labels */}
        {labels.map((l, i) => (
          <text 
            key={i} 
            x={i === 0 ? PAD.left : i === labels.length - 1 ? PAD.left + cW : toX(i)} 
            y={H - 4} 
            textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} 
            fontSize="10" 
            fill="#A8A29E"
          >
            {l}
          </text>
        ))}

        {/* Hover vertical line and dots */}
        {hoverIndex !== null && (
          <g>
            <line 
              x1={toX(hoverIndex)} 
              y1={PAD.top} 
              x2={toX(hoverIndex)} 
              y2={PAD.top + cH} 
              stroke="#A8A29E" 
              strokeWidth={1} 
              strokeDasharray="4,4" 
            />
            <circle cx={toX(hoverIndex)} cy={toY(actualData[hoverIndex])} r={4} fill="#FFFFFF" stroke="#7B1A2A" strokeWidth={2} />
          </g>
        )}
      </svg>
      
      {/* HTML Tooltip */}
      {hoverIndex !== null && (
        <div 
          className="absolute pointer-events-none bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-border p-3 flex flex-col gap-1.5 z-10 min-w-[100px]"
          style={{ 
            left: `${((toX(hoverIndex) / W) * 100)}%`, 
            top: `${((toY(actualData[hoverIndex]) / H) * 100)}%`,
            transform: 'translate(-50%, -110%)'
          }}
        >
          <div className="text-[11px] font-semibold text-text-muted mb-1 border-b border-border pb-1.5">{labels[hoverIndex]}</div>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text-main">
            <span className="w-2.5 h-2.5 rounded-full bg-maroon"></span>
            <span>Appointments: {actualData[hoverIndex]}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6, 1))

  useEffect(() => {
    getDashboardStats(token)
      .then(s => setStats(s))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    setChartLoading(true)
    getReports(token, 7)
      .then(r => setReport(r))
      .catch(e => setError(e.message))
      .finally(() => setChartLoading(false))
  }, [token])

  if (error) return (
    <div className="py-3.5 px-4.5 rounded-xl bg-danger-light text-danger border border-danger-border">{error}</div>
  )

  // Stat cards matching reference image layout
  const CARDS = [
    {
      label: 'Appointments Today',
      value: loading || !stats ? null : stats?.today?.total || 0,
      sub: loading || !stats ? '—' : `${stats?.today?.completed || 0} Completed`,
      subColorClass: 'text-text-muted',
      icon: <Calendar size={20} />,
      colorClass: 'text-maroon',
      bgClass: 'bg-maroon-light',
    },
    {
      label: 'Active Queue',
      value: loading || !stats ? null : stats?.active_queue || 0,
      sub: loading || !stats ? '—' : 'Currently in progress',
      subColorClass: 'text-text-muted',
      icon: <Ticket size={20} />,
      colorClass: 'text-gold',
      bgClass: 'bg-gold-light',
    },
    {
      label: 'Completion Rate',
      value: loading || !stats ? null : `${stats?.today?.total > 0 ? Math.round(((stats?.today?.completed || 0) / stats?.today?.total) * 100) : 0}%`,
      sub: loading || !stats ? '—' : 'Of total scheduled',
      subColorClass: 'text-text-muted',
      icon: <CheckSquare size={20} />,
      colorClass: 'text-maroon',
      bgClass: 'bg-maroon-light',
    },
    {
      label: 'Avg. Wait Time',
      value: loading || !stats ? null : `${Math.round(stats?.avg_wait_minutes || 0)} min`,
      sub: loading || !stats ? '—' : 'System-wide average',
      subColorClass: 'text-text-muted',
      icon: <Clock size={20} />,
      colorClass: 'text-gold',
      bgClass: 'bg-gold-light',
    },
  ]

  // Filter out Sundays
  const filteredReport = report?.by_date?.filter(d => {
    const [year, month, day] = d.date.split('-')
    const dt = new Date(+year, +month - 1, +day)
    return dt.getDay() !== 0
  }) || []

  const chartLabels = filteredReport.length ? filteredReport.map(d => {
    const [year, month, day] = d.date.split('-')
    const dt = new Date(+year, +month - 1, +day)
    return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const actualData = filteredReport.length ? filteredReport.map(d => d.count) : [0, 0, 0, 0, 0, 0]

  // Transaction distribution from report
  const txTypes = report?.by_type || []
  const txTotal = txTypes.reduce((s, t) => s + t.count, 0) || 1
  const TX_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9']
  const DOC_COLOR_MAP = {
    'Transcript of Records (TOR)': '#7B1A2A',
    'Certificate of Enrollment (COE)': '#B8900A',
    'Diploma Release': '#1D4ED8',
    'General Weighted Average (GWA)': '#15803D',
    'Completion Form - Request': '#6D28D9',
    'Completion Form - Submission': '#EA580C'
  }
  const donutColors = txTypes.slice(0, 5).map((t, i) => DOC_COLOR_MAP[t.name] || TX_COLORS[i % TX_COLORS.length])

  return (
    <div>
      {/* Page heading */}
      <div className="mb-7">
        <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">SYSTEM DASHBOARD</div>
        <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
          <LayoutDashboard className="text-maroon" size={24} /> Overview
        </h1>
        <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-[650px]">
          Monitor active queues, review completion rates, and track system health.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {CARDS.map((c, i) => (
          <div key={i} className="animate-fade-up bg-white rounded-[14px] px-5 py-[18px] border border-border flex flex-col gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.06em] mt-1.5">{c.label}</div>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${c.bgClass} ${c.colorClass}`}>
                {c.icon}
              </div>
            </div>
            <div>
              <div className="font-serif text-[28px] font-extrabold leading-none m-0 min-h-[28px] text-text-main">
                {c.value === null ? <div className="animate-pulse w-[60px] h-7 rounded-md bg-border" /> : c.value}
              </div>
              <div className={`text-[11px] font-semibold mt-1.5 ${c.subColorClass || 'text-text-muted'}`}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row: Chart + Distribution */}
      <div className="grid grid-cols-[1fr_300px] gap-5">

        {/* Appointments Chart */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="shrink-0">
              <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-1">Daily Volume</p>
              <h2 className="font-serif text-[18px] font-bold text-text-main m-0">Daily Appointments</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <div 
                  className="py-2 px-3.5 rounded-[10px] border border-border text-[13px] font-semibold text-text-main bg-white flex items-center gap-2.5 shadow-sm whitespace-nowrap cursor-pointer hover:bg-surface transition-colors"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                  <Calendar size={16} className="text-text-sub shrink-0" /> {chartLabels.length > 0 ? `${chartLabels[0]} to ${chartLabels[chartLabels.length - 1]}` : 'Loading...'}
                </div>

                {isCalendarOpen && (
                  <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-border z-20 w-[300px]">
                    <div className="flex items-center justify-between mb-5">
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-text-sub hover:text-text-main"><ChevronLeft size={16} /></button>
                      <div className="font-bold text-text-main text-[15px] tracking-wide">
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </div>
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-text-sub hover:text-text-main"><ChevronRight size={16} /></button>
                    </div>
                    
                    <div className="grid grid-cols-7 mb-3">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className={`text-center text-[12px] font-bold ${d === 'Sun' ? 'text-text-muted/40' : d === 'Sat' ? 'text-maroon' : 'text-text-sub'}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-y-1 text-[13px] font-bold">
                      {/* Previous month (empty padding) */}
                      {Array.from({ length: currentMonth.getDay() }, (_, i) => <div key={`prev-${i}`} />)}
                      
                      {/* Current month */}
                      {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
                        const isSunday = dateObj.getDay() === 0
                        const isTargetMonth = currentMonth.getFullYear() === 2026 && currentMonth.getMonth() === 6
                        const isFutureMonth = currentMonth.getFullYear() > 2026 || (currentMonth.getFullYear() === 2026 && currentMonth.getMonth() > 6)
                        const isFuture = isFutureMonth || (isTargetMonth && d > 13)
                        const isSelected = isTargetMonth && d >= 6 && d <= 13
                        const isStart = isTargetMonth && d === 6
                        const isEnd = isTargetMonth && d === 13
                        
                        if (isSunday || isFuture) {
                          if (isSelected && isSunday) {
                            return <div key={d} className="text-center py-2 text-text-muted/40 cursor-not-allowed select-none bg-maroon-light">{d}</div>
                          }
                          return <div key={d} className="text-center py-2 text-text-muted/40 cursor-not-allowed select-none">{d}</div>
                        }

                        let bgClass = ''
                        let textClass = 'text-text-main'
                        
                        if (isSelected) {
                          textClass = isStart || isEnd ? 'text-white relative z-10' : 'text-maroon'
                          if (isStart) {
                            bgClass = "bg-maroon rounded-l-full relative after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-4 after:bg-maroon-light after:-z-10"
                          } else if (isEnd) {
                            bgClass = "bg-maroon rounded-r-full relative before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0 before:w-4 before:bg-maroon-light before:-z-10"
                          } else {
                            bgClass = 'bg-maroon-light'
                          }
                        }

                        return (
                          <div key={d} className={`text-center py-2 ${textClass} ${bgClass}`}>
                            {d}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-text-sub whitespace-nowrap">
                <div className="w-5 h-[2.5px] bg-maroon rounded-sm shrink-0" /> Daily Appointments
              </div>
            </div>
          </div>
          <div className="relative h-[260px] pt-2 pb-6">
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
            <DonutChart data={txTypes.slice(0, 5)} total={txTotal} colors={donutColors} />
          )}


        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, requestLogout } = useAuth()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('overview')
  const [profileOpen, setProfileOpen] = useState(false)

  const navGroups = [
    {
      title: 'Main Menu',
      items: [
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview' },
        { id: 'reports', icon: <BarChart2 size={18} />, label: 'Analytics' },
        { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue' },
        { id: 'appts', icon: <Calendar size={18} />, label: 'Appointments' },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'records', icon: <FolderOpen size={18} />, label: 'Registrar Records' },
        { id: 'student_records', icon: <ClipboardList size={18} />, label: 'Student Records' },
        { id: 'users', icon: <Users size={18} />, label: 'User Management' },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'config', icon: <Settings size={18} />, label: 'Office Config' },
        { id: 'audit', icon: <Shield size={18} />, label: 'Audit Log' },
      ]
    }
  ]

  return (
    <div className="min-h-screen flex bg-off-white font-sans">

      {/* ── Left Sidebar ── */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 p-[24px_14px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <img src={campusFlowLogo} alt="CampusFlow" className="w-[38px] h-[38px] rounded-full bg-white object-contain border border-slate-200" />
          <div>
            <div className="font-serif text-[14px] font-bold text-maroon leading-[1.2]">CampusFlow</div>
            <div className="text-[10px] text-text-muted tracking-[0.04em]">Registrar Admin Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-6 px-1 overflow-y-auto pb-6 scrollbar-hide">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] px-4 mb-1">
                {group.title}
              </div>
              <div className="flex flex-col gap-1 pl-3 pr-2">
                {group.items.map(item => (
                  <SideItem key={item.id} icon={item.icon} label={item.label}
                    active={activeNav === item.id}
                    onClick={() => setActiveNav(item.id)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* ── Right Side ── */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="bg-white border-b border-border px-8 h-[60px] flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <AdminGlobalSearch setActiveNav={setActiveNav} />

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            {/* Bell */}
            <NotificationDropdown />

            {/* Avatar + dropdown */}
            <div className="relative">
              {profileOpen && <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-105" />}
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 p-1 pr-2 rounded-full border-none bg-transparent cursor-pointer outline-none hover:bg-slate-50 transition-colors">
                <div className="w-[38px] h-[38px] rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-[15px] font-bold text-maroon overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.first_name?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="text-[14px] font-bold text-text-main font-sans">
                    {user?.first_name || 'Admin'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-text-sub transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>
              {profileOpen && (
                <div className="absolute top-[52px] right-0 w-[280px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 z-110 border border-border">
                  <div className="flex gap-3 mb-4 items-start">
                    <div className="w-[42px] h-[42px] rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-[16px] font-bold text-maroon overflow-hidden shrink-0">
                      {user?.profile_image ? (
                        <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.first_name?.[0]?.toUpperCase() || 'A'
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-[14px] font-bold text-text-main leading-tight truncate">
                        {user?.first_name ? `${user?.first_name} ${user?.last_name || ''}` : 'Admin CampusFlow'}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 truncate">
                        {user?.email || 'admin@campusflow.com'}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-[9px] font-bold text-maroon bg-maroon-light border border-maroon-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          ID: {user?.id?.substring(0,8) || 'ADMIN'}
                        </span>
                        <span className="text-[9px] font-bold text-gold bg-gold-light border border-gold-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          Role: Administrator
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border mb-3" />
                  <button onClick={() => { requestLogout(); }} className="w-full py-2.5 px-3 rounded-xl border-none bg-danger-light text-danger text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 font-sans hover:bg-danger-border transition-colors">
                    <LogOut size={16} strokeWidth={2.5} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-7 flex-1">
          {activeNav === 'overview' && <OverviewTab />}
          {activeNav === 'reports' && <AdminAnalyticsPage />}
          {activeNav === 'config' && <AdminOfficeConfigPage />}
          {activeNav === 'users' && <AdminUserManagementPage />}
          {activeNav === 'audit' && <AdminAuditLogPage />}
          {activeNav === 'queue' && <AdminLiveQueuePage />}
          {activeNav === 'appts' && <AdminAppointmentsPage />}
          {activeNav === 'records' && <AdminRegistrarRecordsPage />}
          {activeNav === 'student_records' && <StudentRecordsPage />}
        </main>
      </div>
    </div>
  )
}
