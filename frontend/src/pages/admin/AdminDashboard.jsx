import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import campusFlowLogo from '../../assets/logo.webp'
import AdminQueueMonitoringPage from './AdminQueueMonitoringPage'
import AdminAppointmentsPage from './AdminAppointmentsPage'
import AdminAnalyticsPage from './AdminAnalyticsPage'
import AdminRegistrarRecordsPage from './AdminRegistrarRecordsPage'
import AdminUserManagementPage from './AdminUserManagementPage'
import AdminOfficeConfigPage from './AdminOfficeConfigPage'
import AdminAuditLogPage from './AdminAuditLogPage'
import AdminDocumentsPage from './AdminDocumentsPage'
import AdminProfilePage from './AdminProfilePage'
import MasterListPage from '../staff/MasterListPage'
import PriorityRequestsPage from '../staff/PriorityRequestsPage'
import IdRequestsPage from '../staff/IdRequestsPage'
import { Calendar, Ticket, Clock, Bot, Search, Shield, BarChart2, LineChart as LineChartIcon, FolderOpen, Users, User, Settings, MessageSquare, Bell, LogOut, LayoutDashboard, CheckSquare, CheckCircle, ChevronLeft, ChevronRight, ClipboardList, FileText, Menu, X, PanelLeftClose, ShieldCheck, HelpCircle } from 'lucide-react'
import {
  getDashboardStats, getReports, getIdRequests
} from '../../services/adminService'
import { getPendingPriorityRequests } from '../../services/priorityService'
import NotificationDropdown from '../../components/NotificationDropdown'
import AdminGlobalSearch from '../../components/AdminGlobalSearch'
import DonutChart from '../../components/DonutChart'
import { getDocumentColor } from '../../utils/colors'

// ── Sidebar Nav Item ───────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick, badge, collapsed }) => (
  <button 
    onClick={onClick} 
    title={collapsed ? label : undefined}
    className={`relative flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} w-full rounded-xl border-none cursor-pointer text-left font-sans text-fluid-13 transition-all duration-250 ease-out overflow-hidden group
      ${active ? 'bg-maroon-light/60 text-maroon font-bold' : 'bg-transparent text-text-sub font-medium hover:bg-surface hover:text-text-main'}`}
  >
    {active && (
      <div className="absolute left-0 top-[15%] bottom-[15%] w-0.75 bg-maroon rounded-r-full shadow-[1px_0_6px_rgba(123,26,42,0.3)]" />
    )}
    <span className={`flex items-center justify-center w-5 shrink-0 transition-all duration-250 ease-out ${active ? 'opacity-100 scale-105 text-maroon' : 'opacity-70 group-hover:opacity-100'}`}>
      {icon}
    </span>
    <span className={`tracking-wide whitespace-nowrap transition-all duration-250 ease-out overflow-hidden truncate ${
      collapsed 
        ? 'opacity-0 max-w-0 -translate-x-2 pointer-events-none' 
        : 'opacity-100 max-w-52 translate-x-0 flex-1'
    }`}>
      {label}
    </span>
    {badge > 0 && (
      <span className={`transition-all duration-250 ease-out font-extrabold text-center ${
        collapsed 
          ? 'absolute top-1.5 right-2 bg-maroon text-white text-[10px] px-1.5 py-px rounded-full min-w-4 shadow-sm leading-tight' 
          : 'bg-maroon text-white text-fluid-10 px-2 py-0.5 rounded-full shrink-0 shadow-xs ml-auto'
      }`}>
        {badge}
      </span>
    )}
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
          className="absolute pointer-events-none bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-border p-3 flex flex-col gap-1.5 z-10 min-w-25"
          style={{ 
            left: `${((toX(hoverIndex) / W) * 100)}%`, 
            top: `${((toY(actualData[hoverIndex]) / H) * 100)}%`,
            transform: 'translate(-50%, -110%)'
          }}
        >
          <div className="text-fluid-11 font-semibold text-text-muted mb-1 border-b border-border pb-1.5">{labels[hoverIndex]}</div>
          <div className="flex items-center gap-2 text-fluid-12 font-semibold text-text-main">
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const fetchStats = useCallback(() => {
    getDashboardStats(token)
      .then(s => {
        setStats(s)
        setError('')
      })
      .catch(e => {
        setError(e.message)
        console.error("Dashboard stats poll error:", e)
      })
      .finally(() => setLoading(false))
  }, [token])

  const fetchReports = useCallback(() => {
    getReports(token, 7)
      .then(r => {
        setReport(r)
        setError('')
      })
      .catch(e => {
        setError(e.message)
        console.error("Dashboard reports poll error:", e)
      })
      .finally(() => setChartLoading(false))
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(['QUEUE_UPDATED', 'WINDOW_UPDATED', 'APPOINTMENTS_UPDATED', 'PRIORITY_REQUESTS_UPDATED', 'ID_REQUESTS_UPDATED', 'RELEASES_UPDATED'], () => {
    fetchStats()
    fetchReports()
  })

  useEffect(() => {
    fetchStats()
    const t = setInterval(fetchStats, 60000)
    return () => clearInterval(t)
  }, [fetchStats])

  useEffect(() => {
    fetchReports()
    const t = setInterval(fetchReports, 60000)
    return () => clearInterval(t)
  }, [fetchReports])

  if (error) return (
    <div className="py-3.5 px-4.5 rounded-xl bg-danger-light text-danger border border-danger-border">{error}</div>
  )

  // Stat cards matching Staff portal design tokens
  const CARDS = [
    {
      label: 'Appointments Today',
      value: loading || !stats ? null : stats?.today?.total || 0,
      sub: loading || !stats ? '—' : 'Total for today',
      subColorClass: 'text-blue',
      icon: <Calendar size={18} strokeWidth={2.2} />,
      colorClass: 'text-blue',
      bgClass: 'bg-blue-light',
      borderClass: 'border-blue-border/60',
    },
    {
      label: 'Total Finished Today',
      value: loading || !stats ? null : stats?.today?.completed || 0,
      sub: loading || !stats ? '—' : 'Successfully completed',
      subColorClass: 'text-success',
      icon: <CheckCircle size={18} strokeWidth={2.2} />,
      colorClass: 'text-success',
      bgClass: 'bg-success-light',
      borderClass: 'border-success-border/60',
    },
    {
      label: 'Completion Rate',
      value: loading || !stats ? null : `${stats?.today?.total > 0 ? Math.round(((stats?.today?.completed || 0) / stats?.today?.total) * 100) : 0}%`,
      sub: loading || !stats ? '—' : 'Of today\'s schedule',
      subColorClass: 'text-maroon',
      icon: <CheckSquare size={18} strokeWidth={2.2} />,
      colorClass: 'text-maroon',
      bgClass: 'bg-maroon-light',
      borderClass: 'border-maroon-border/60',
    },
    {
      label: 'Avg. Wait Time',
      value: loading || !stats ? null : `${Math.round(stats?.avg_wait_minutes || 0)} min`,
      sub: loading || !stats ? '—' : 'Of today\'s Queues ',
      subColorClass: 'text-gold',
      icon: <Clock size={18} strokeWidth={2.2} />,
      colorClass: 'text-gold',
      bgClass: 'bg-gold-light',
      borderClass: 'border-gold-border/60',
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

  // Calculate actual date range from the raw backend report to sync calendar
  const reportDates = report?.by_date?.map(d => d.date) || []
  let rangeStart = new Date()
  rangeStart.setHours(0, 0, 0, 0)
  let rangeEnd = new Date()
  rangeEnd.setHours(0, 0, 0, 0)
  
  if (reportDates.length > 0) {
    const [sy, sm, sd] = reportDates[0].split('-')
    rangeStart = new Date(+sy, +sm - 1, +sd)
    const [ey, em, ed] = reportDates[reportDates.length - 1].split('-')
    rangeEnd = new Date(+ey, +em - 1, +ed)
  } else {
    rangeStart = new Date(rangeEnd.getTime() - 6 * 24 * 60 * 60 * 1000)
  }

  // Transaction distribution from report
  const txTypes = report?.by_type || []
  const txTotal = txTypes.reduce((s, t) => s + t.count, 0) || 1

  const donutColors = txTypes.map(t => getDocumentColor(t.name))

  return (
    <div>
      {/* Page heading */}
      <div className="mb-7">
        <div className="text-fluid-11 font-bold text-gold uppercase tracking-[0.06em] mb-2">SYSTEM DASHBOARD</div>
        <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-maroon m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
          <LayoutDashboard size={26} className="text-maroon shrink-0" /> Admin Overview
        </h1>
        <p className="text-fluid-12 text-text-sub m-0 leading-relaxed max-w-162.5">
          Monitor active queues, review completion rates, and track system health.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
        {CARDS.map((c, i) => (
          <div 
            key={i} 
            className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" 
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">
                {c.label}
              </span>
              <div className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl border ${c.borderClass} ${c.bgClass} ${c.colorClass} flex items-center justify-center shrink-0`}>
                {c.icon}
              </div>
            </div>
            <div>
              <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
                {c.value === null ? <div className="animate-pulse w-14 h-6 sm:h-7 rounded-md bg-border" /> : c.value}
              </div>
              {c.sub && (
                <div className={`text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 flex items-center gap-1.5 truncate ${c.subColorClass || 'text-text-muted'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
                  <span>{c.sub}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row: Chart + Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">

        {/* Appointments Chart */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="shrink-0">
              <p className="text-fluid-11 font-bold text-gold uppercase tracking-widest m-0 mb-1">Daily Volume</p>
              <h2 className="font-serif text-fluid-18 font-bold text-text-main m-0">Daily Appointments</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <div 
                  className="py-2 px-3.5 rounded-[10px] border border-border text-fluid-13 font-semibold text-text-main bg-white flex items-center gap-2.5 shadow-sm whitespace-nowrap cursor-pointer hover:bg-surface transition-colors"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                  <Calendar size={16} className="text-text-sub shrink-0" /> {chartLabels.length > 0 ? `${chartLabels[0]} to ${chartLabels[chartLabels.length - 1]}` : 'Loading...'}
                </div>

                {isCalendarOpen && (
                  <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-border z-20 w-75">
                    <div className="flex items-center justify-between mb-5">
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-text-sub hover:text-text-main"><ChevronLeft size={16} /></button>
                      <div className="font-bold text-text-main text-fluid-15 tracking-wide">
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </div>
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-text-sub hover:text-text-main"><ChevronRight size={16} /></button>
                    </div>
                    
                    <div className="grid grid-cols-7 mb-3">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className={`text-center text-fluid-12 font-bold ${d === 'Sun' ? 'text-text-muted/40' : d === 'Sat' ? 'text-maroon' : 'text-text-sub'}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-y-1 text-fluid-13 font-bold">
                      {/* Previous month (empty padding) */}
                      {Array.from({ length: currentMonth.getDay() }, (_, i) => <div key={`prev-${i}`} />)}
                      
                      {/* Current month */}
                      {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
                        const isSunday = dateObj.getDay() === 0
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        
                        const isFuture = dateObj > today
                        const inRange = dateObj >= rangeStart && dateObj <= rangeEnd
                        const isSelected = inRange && !isSunday
                        const isStart = dateObj.getTime() === rangeStart.getTime()
                        const isEnd = dateObj.getTime() === rangeEnd.getTime()
                        
                        if (isSunday || isFuture) {
                          if (inRange && isSunday) {
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
              <div className="flex items-center gap-1.5 text-fluid-12 text-text-sub whitespace-nowrap">
                <div className="w-5 h-[2.5px] bg-maroon rounded-sm shrink-0" /> Daily Appointments
              </div>
            </div>
          </div>
          <div className="relative pt-2">
            {chartLoading && (
              <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center min-h-37.5">
                <div className="typing-indicator font-bold text-fluid-24 text-maroon">Loading</div>
              </div>
            )}
            <LineChart actualData={actualData} labels={chartLabels} />
          </div>
        </div>

        {/* Transaction Distribution */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.5s' }}>
          <div className="mb-5">
            <p className="text-fluid-11 font-bold text-gold uppercase tracking-widest m-0 mb-1">Breakdown</p>
            <h2 className="font-serif text-fluid-18 font-bold text-text-main m-0">Transaction Distribution</h2>
          </div>

          {chartLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="animate-pulse w-11 h-11 rounded-full bg-border shrink-0" />
                  <div className="flex-1">
                    <div className="animate-pulse w-[60%] h-3.5 rounded bg-border mb-1.5" />
                    <div className="animate-pulse w-[40%] h-3 rounded bg-border" />
                  </div>
                </div>
              ))}
            </div>
          ) : txTypes.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-fluid-13">No transaction data</div>
          ) : (
            <DonutChart data={txTypes} total={txTotal} colors={donutColors} />
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
  const { user, token, requestLogout } = useAuth()
  const [activeNav, setActiveNav] = useState('overview')
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['overview']))
  const [profileOpen, setProfileOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [badgeStats, setBadgeStats] = useState({ idRequests: 0, priorityRequests: 0 })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('cf_admin_sidebar_collapsed')
      if (saved !== null) return saved === 'true'
    } catch {
      /* ignore local storage errors */
    }
    // Default to compact icon rail (80px) on tablet portrait (768px - 1023px)
    return typeof window !== 'undefined' ? (window.innerWidth >= 768 && window.innerWidth < 1024) : false
  })

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true)

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // On mobile (<768px), the drawer is always fully expanded when opened.
  // Collapsed state only applies on desktop screens (>=768px).
  const isCollapsed = isDesktop && sidebarCollapsed

  useEffect(() => {
    try {
      localStorage.setItem('cf_admin_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false')
    } catch {
      /* ignore local storage errors */
    }
  }, [sidebarCollapsed])

  // Sync sidebar width CSS variable for layout-aligned overlays (like ToastContainer)
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth >= 768) {
        document.documentElement.style.setProperty('--cf-sidebar-width', isCollapsed ? '80px' : '256px')
      } else {
        document.documentElement.style.setProperty('--cf-sidebar-width', '0px')
      }
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => {
      window.removeEventListener('resize', checkWidth)
      document.documentElement.style.removeProperty('--cf-sidebar-width')
    }
  }, [isCollapsed])

  const fetchBadgeStats = useCallback(() => {
    Promise.all([
      getIdRequests(token).catch(() => []),
      getPendingPriorityRequests(token).catch(() => [])
    ])
      .then(([idReqs, prioReqs]) => {
        setBadgeStats({
          idRequests: (idReqs || []).filter(r => r.status === 'pending').length,
          priorityRequests: (prioReqs || []).length
        })
      })
      .catch(e => {
        console.error("Error loading admin badge stats", e)
      })
  }, [token])

  useStaffEvent(['PRIORITY_REQUESTS_UPDATED', 'ID_REQUESTS_UPDATED'], () => {
    fetchBadgeStats()
  })

  useEffect(() => {
    fetchBadgeStats()
    const t = setInterval(fetchBadgeStats, 60000)
    return () => clearInterval(t)
  }, [fetchBadgeStats])

  const handleNavChange = (tabId) => {
    setActiveNav(tabId)
    setVisitedTabs(prev => new Set(prev).add(tabId))
    setIsMobileOpen(false)
  }

  const navGroups = [
    {
      title: 'Main Menu',
      items: [
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { id: 'reports', icon: <BarChart2 size={18} />, label: 'Analytics' },
        { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue Monitoring'},
        { id: 'appts', icon: <Calendar size={18} />, label: 'Appointments' },
        { id: 'priority-requests', icon: <ShieldCheck size={18} />, label: 'Priority Requests', badge: badgeStats.priorityRequests },
        { id: 'id-requests', icon: <HelpCircle size={18} />, label: 'Id Requests', badge: badgeStats.idRequests },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'records', icon: <FolderOpen size={18} />, label: 'Registrar Records' },
        { id: 'student_records', icon: <ClipboardList size={18} />, label: 'Master List' },
        { id: 'users', icon: <Users size={18} />, label: 'User Management' },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'documents', icon: <FileText size={18} />, label: 'Documents' },
        { id: 'config', icon: <Settings size={18} />, label: 'Office Config' },
        { id: 'audit', icon: <Shield size={18} />, label: 'Audit Log' },
      ]
    }
  ]

  const renderNavContent = () => (
    <nav className="flex-1 flex flex-col gap-6 px-0 overflow-y-auto pb-6 scrollbar-hide">
      {navGroups.map((group, idx) => (
        <div key={idx} className="flex flex-col gap-1.5">
          {idx === 0 ? (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-3'} mb-1`}>
              <div className={`transition-all duration-250 ease-out overflow-hidden whitespace-nowrap ${
                isCollapsed 
                  ? 'opacity-0 max-w-0 pointer-events-none' 
                  : 'opacity-100 max-w-40'
              }`}>
                <span className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.15em]">
                  {group.title}
                </span>
              </div>
              {/* Desktop collapse toggle button */}
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={`hidden md:flex items-center justify-center rounded-lg text-text-muted hover:text-maroon hover:bg-surface transition-all duration-200 cursor-pointer border border-transparent hover:border-border/80 shrink-0 ${
                  sidebarCollapsed ? 'w-8 h-8 bg-surface border-border/80 text-text-sub hover:text-maroon' : 'w-6 h-6 p-0.5'
                }`}
              >
                <ChevronLeft size={15} strokeWidth={2.5} className={`transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarCollapsed ? 'rotate-180 text-maroon' : ''}`} />
              </button>
            </div>
          ) : (
            <>
              <div className={`transition-all duration-250 ease-out overflow-hidden whitespace-nowrap ${
                isCollapsed 
                  ? 'opacity-0 max-w-0 pointer-events-none h-0' 
                  : 'opacity-100 max-w-40 px-3 mb-1'
              }`}>
                <span className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.15em]">
                  {group.title}
                </span>
              </div>
              {isCollapsed && (
                <div className="h-px bg-border/60 mx-2 my-1 shrink-0 transition-opacity duration-250" />
              )}
            </>
          )}
          <div className={`flex flex-col gap-1 ${isCollapsed ? 'px-1' : 'px-1.5'}`}>
            {group.items.map(item => (
              <SideItem key={item.id} icon={item.icon} label={item.label}
                active={activeNav === item.id}
                badge={item.badge}
                collapsed={isCollapsed}
                onClick={() => handleNavChange(item.id)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen flex bg-off-white font-sans">

      {/* Mobile Backdrop - solid semi-transparent scrim, zero blur */}
      {isMobileOpen && (
        <div onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-black/50 z-45 md:hidden" />
      )}

      {/* ── Fixed Left Sidebar (Desktop & Mobile Slide-in Drawer) ── */}
      <aside className={`${isCollapsed ? 'md:w-20 md:px-2.5' : 'md:w-64 md:px-3.5'} w-72 max-w-[85vw] px-3.5 shrink-0 bg-white border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 py-5 transition-[width,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Brand */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between pl-1'} mb-7`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={campusFlowLogo} alt="CampusFlow" className="w-8.5 h-8.5 rounded-full bg-white object-contain border border-slate-200 shrink-0 shadow-2xs" />
            <div className={`whitespace-nowrap overflow-hidden transition-all duration-250 ease-out ${
              isCollapsed 
                ? 'opacity-0 max-w-0 -translate-x-2 pointer-events-none' 
                : 'opacity-100 max-w-40 translate-x-0'
            }`}>
              <div className="font-serif text-fluid-15 font-bold text-maroon leading-[1.2]">CampusFlow</div>
              <div className="text-fluid-10 text-text-muted tracking-[0.04em]"><strong>Admin Portal</strong></div>
            </div>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-maroon hover:bg-maroon-light/60 border border-transparent hover:border-maroon-border/40 transition-all cursor-pointer" aria-label="Close menu">
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {renderNavContent()}
      </aside>

      {/* ── Right Side ── */}
      <div className={`${isCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 flex-1 flex flex-col min-h-screen min-w-0 w-full transition-[margin-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}>

        {/* Top Bar */}
        <header className="bg-white border-b border-border px-4 sm:px-8 h-15 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center text-text-main hover:text-maroon hover:bg-surface rounded-xl border border-border/80 transition-all cursor-pointer shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu size={19} strokeWidth={2.2} />
            </button>
            <AdminGlobalSearch setActiveNav={handleNavChange} />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Bell */}
            <NotificationDropdown />

            {/* Avatar + dropdown */}
            <div className="relative">
              {profileOpen && <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-105" />}
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 p-1 pr-2 rounded-full border-none bg-transparent cursor-pointer outline-none hover:bg-slate-50 transition-colors">
                <div className="w-9.5 h-9.5 rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-fluid-15 font-bold text-maroon overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.first_name?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-1.5 mr-1">
                  <span className="text-fluid-14 font-bold text-text-main font-sans max-w-45 sm:max-w-55 truncate" title={[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'Admin'}>
                    {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'Admin'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-text-sub transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>
              {profileOpen && (
                <div className="absolute top-13 right-0 w-70 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 z-110 border border-border animate-fade-up">
                  <div className="flex gap-3 mb-4 items-start">
                    <div className="w-10.5 h-10.5 rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-fluid-16 font-bold text-maroon overflow-hidden shrink-0">
                      {user?.profile_image ? (
                        <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.first_name?.[0]?.toUpperCase() || 'A'
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-fluid-14 font-bold text-text-main leading-tight truncate">
                        {user?.first_name ? `${user?.first_name} ${user?.last_name || ''}` : 'Admin CampusFlow'}
                      </div>
                      <div className="text-fluid-11 text-text-muted mt-1 truncate">
                        {user?.email || 'admin@campusflow.com'}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-fluid-9 font-bold text-maroon bg-maroon-light border border-maroon-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          ID: {user?.id?.substring(0,8) || 'ADMIN'}
                        </span>
                        <span className="text-fluid-9 font-bold text-gold bg-gold-light border border-gold-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          Role: Administrator
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border my-2.5" />

                  <div className="flex flex-col gap-1 py-1">
                    <button onClick={() => { setProfileOpen(false); handleNavChange('profile'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border-none bg-transparent hover:bg-slate-50 cursor-pointer text-left transition-colors font-sans">
                      <User size={16} className="text-text-main" />
                      <span className="text-fluid-13 font-semibold text-text-main">Manage Profile</span>
                    </button>
                    <button onClick={() => { setProfileOpen(false); handleNavChange('settings'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border-none bg-transparent hover:bg-slate-50 cursor-pointer text-left transition-colors font-sans">
                      <Settings size={16} className="text-text-main" />
                      <span className="text-fluid-13 font-semibold text-text-main">Account Settings</span>
                    </button>
                  </div>

                  <div className="h-px bg-border my-2.5" />

                  <button onClick={() => { requestLogout(); }} className="w-full py-2.5 px-3 rounded-xl border-none bg-danger-light text-danger text-fluid-13 font-bold cursor-pointer flex items-center justify-center gap-2 font-sans hover:bg-danger-border transition-colors">
                    <LogOut size={16} strokeWidth={2.5} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Content Area with Tab Retention ── */}
        <main className="p-3.5 sm:p-7 flex-1 relative min-h-[calc(100vh-60px)] w-full">
          {visitedTabs.has('overview') && (
            <div className={activeNav === 'overview' ? 'block' : 'hidden'}>
              <OverviewTab />
            </div>
          )}
          {visitedTabs.has('reports') && (
            <div className={activeNav === 'reports' ? 'block' : 'hidden'}>
              <AdminAnalyticsPage />
            </div>
          )}
          {visitedTabs.has('documents') && (
            <div className={activeNav === 'documents' ? 'block' : 'hidden'}>
              <AdminDocumentsPage />
            </div>
          )}
          {visitedTabs.has('config') && (
            <div className={activeNav === 'config' ? 'block' : 'hidden'}>
              <AdminOfficeConfigPage />
            </div>
          )}
          {visitedTabs.has('users') && (
            <div className={activeNav === 'users' ? 'block' : 'hidden'}>
              <AdminUserManagementPage />
            </div>
          )}
          {visitedTabs.has('audit') && (
            <div className={activeNav === 'audit' ? 'block' : 'hidden'}>
              <AdminAuditLogPage />
            </div>
          )}
          {(visitedTabs.has('queue') || visitedTabs.has('releases')) && (
            <div className={(activeNav === 'queue' || activeNav === 'releases') ? 'block' : 'hidden'}>
              <AdminQueueMonitoringPage />
            </div>
          )}
          {visitedTabs.has('appts') && (
            <div className={activeNav === 'appts' ? 'block' : 'hidden'}>
              <AdminAppointmentsPage />
            </div>
          )}
          {visitedTabs.has('priority-requests') && (
            <div className={activeNav === 'priority-requests' ? 'block' : 'hidden'}>
              <PriorityRequestsPage />
            </div>
          )}
          {visitedTabs.has('id-requests') && (
            <div className={activeNav === 'id-requests' ? 'block' : 'hidden'}>
              <IdRequestsPage />
            </div>
          )}
          {visitedTabs.has('records') && (
            <div className={activeNav === 'records' ? 'block' : 'hidden'}>
              <AdminRegistrarRecordsPage />
            </div>
          )}
          {visitedTabs.has('student_records') && (
            <div className={activeNav === 'student_records' ? 'block' : 'hidden'}>
              <MasterListPage />
            </div>
          )}
          {(visitedTabs.has('profile') || visitedTabs.has('settings')) && (
            <div className={(activeNav === 'profile' || activeNav === 'settings') ? 'block' : 'hidden'}>
              <AdminProfilePage setActiveNav={handleNavChange} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
