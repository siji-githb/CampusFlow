import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { getAllAppointments, getAppointmentStats, getBookingConfig } from '../../services/appointmentService'
import { 
  Calendar, RefreshCw, BarChart2, Circle, User, Users, Tag, X, FileText, Activity, 
  Clock, CheckCircle, CheckCircle2, AlertCircle, Mail, GraduationCap, MapPin, Ticket, 
  ExternalLink, Paperclip, ChevronRight, ChevronLeft, ChevronDown, CalendarCheck, ShieldCheck, 
  Sparkles, DollarSign, Layers, ArrowRight, FolderOpen, ClipboardList, Info, Search, RotateCcw,
  Check, AlertTriangle
} from 'lucide-react'

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed:   { label: 'Confirmed',        bg: 'bg-blue-light',    color: 'text-blue',     border: 'border-blue-border',    dot: 'bg-blue' },
  in_progress: { label: 'Ready for Pickup', bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border', dot: 'bg-success' },
  completed:   { label: 'Completed',        bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border', dot: 'bg-success' },
  cancelled:   { label: 'Cancelled',        bg: 'bg-danger-light',  color: 'text-danger',   border: 'border-danger-border',  dot: 'bg-danger' },
  no_show:     { label: 'No Show',          bg: 'bg-surface',       color: 'text-text-muted',border: 'border-border',         dot: 'bg-text-muted' },
}

// ── Status Options ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'all',         label: 'All Statuses',      dot: null },
  { value: 'confirmed',   label: 'Confirmed',         dot: 'bg-blue' },
  { value: 'in_progress', label: 'Ready for Pickup',  dot: 'bg-success' },
  { value: 'completed',   label: 'Completed',         dot: 'bg-success' },
  { value: 'cancelled',   label: 'Cancelled',         dot: 'bg-danger' },
  { value: 'no_show',     label: 'No Show',           dot: 'bg-text-muted' },
]

// ── Effective Status Resolver ───────────────────────────────────────────────────
const getEffectiveStatus = (appt) => {
  if (!appt) return 'confirmed'
  if (appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show') {
    return appt.status
  }
  const ticket = Array.isArray(appt.queue_tickets) ? appt.queue_tickets[0] : appt.queue_tickets
  if (ticket) {
    if (ticket.status === 'completed') return 'completed'
    if (ticket.status === 'in_progress' || ticket.status === 'waiting') return 'in_progress'
  }
  if (appt.status === 'pending') return 'confirmed'
  return appt.status || 'confirmed'
}

// ── Mini Calendar Component ────────────────────────────────────────────────────
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MiniCalendar({ selectedDate, onSelect, dateOverrides = {} }) {
  const d = new Date()
  const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const selStr = selectedDate || todayStr

  const [view, setView] = useState(() => {
    const [y, m] = selStr.split('-')
    return { year: parseInt(y), month: parseInt(m) - 1 }
  })

  const { year, month } = view
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Monday-based offset (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells  = startOffset + lastDay.getDate()
  const rows        = Math.ceil(totalCells / 7)
  const cells       = Array.from({ length: rows * 7 }, (_, i) => {
    const dayNum = i - startOffset + 1
    return dayNum > 0 && dayNum <= lastDay.getDate() ? dayNum : null
  })

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0  } : { year: v.year, month: v.month + 1 })

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button"
          onClick={prevMonth} 
          className="bg-transparent border-none cursor-pointer p-1.5 rounded-lg text-text-sub flex items-center justify-center hover:bg-surface hover:text-text-main transition-colors"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-serif text-[15px] font-bold text-text-main tracking-tight">
          {MONTHS[month]} {year}
        </span>
        <button 
          type="button"
          onClick={nextMonth} 
          className="bg-transparent border-none cursor-pointer p-1.5 rounded-lg text-text-sub flex items-center justify-center hover:bg-surface hover:text-text-main transition-colors"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {DAYS.map(d => (
          <div key={d} className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Date Cells */}
      <div className="grid grid-cols-7 gap-y-1.5 justify-items-center">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="w-8 h-8" />
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = dateStr === todayStr
          const isSel   = dateStr === selStr
          const isSun   = (i % 7 === 6)
          const override = dateOverrides[dateStr]
          
          let btnClass = "w-8 h-8 rounded-full border-none text-[12px] relative flex items-center justify-center "
          
          if (isSun) {
            btnClass += "bg-transparent font-medium text-danger/45 cursor-not-allowed"
          } else if (isSel) {
            btnClass += "bg-maroon text-white font-bold shadow-xs cursor-pointer"
          } else if (isToday) {
            btnClass += "bg-maroon-light text-maroon font-bold hover:bg-maroon/20 cursor-pointer"
          } else {
            btnClass += "bg-transparent font-semibold hover:bg-surface text-text-main cursor-pointer"
          }

          return (
            <button 
              key={i} 
              disabled={isSun}
              onClick={() => !isSun && onSelect(dateStr)} 
              className={btnClass} 
              type="button"
              title={isSun ? "Sundays are closed" : undefined}
            >
              <span>{day}</span>
              {override && !isSun && (
                <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${override.is_blocked ? (isSel ? 'bg-white' : 'bg-danger') : (isSel ? 'bg-white' : 'bg-info')}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Jump to Today button */}
      {selectedDate !== todayStr && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => {
              onSelect(todayStr)
              const [y, m] = todayStr.split('-')
              setView({ year: parseInt(y), month: parseInt(m) - 1 })
            }}
            className="w-full py-1.5 px-3 rounded-xl border border-border bg-white text-text-sub hover:text-maroon hover:bg-off-white text-[11.5px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Calendar size={13} className="text-maroon" /> Jump to Today
          </button>
        </div>
      )}
    </div>
  )
}

// ── Custom Status Dropdown Component ──────────────────────────────────────────
const StatusDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const current = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0]

  return (
    <div className="relative z-30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 py-2 px-3.5 rounded-xl border border-border bg-white text-[12.5px] text-text-main font-bold shadow-2xs hover:border-maroon/40 hover:shadow-xs transition-all cursor-pointer font-sans min-w-40"
      >
        <div className="flex items-center gap-2">
          {current.dot && <span className={`w-2 h-2 rounded-full ${current.dot} shrink-0`} />}
          <span className="truncate">{current.label}</span>
        </div>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-maroon' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-border shadow-xl p-1.5 z-50 animate-fade-up" style={{ animationDuration: '0.15s' }}>
            {STATUS_OPTIONS.map(o => {
              const isActive = value === o.value
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false) }}
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between text-[12px] font-medium transition-colors ${isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main hover:bg-off-white'}`}
                >
                  <div className="flex items-center gap-2">
                    {o.dot ? (
                      <span className={`w-2 h-2 rounded-full ${o.dot} shrink-0`} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-border shrink-0" />
                    )}
                    <span>{o.label}</span>
                  </div>
                  {isActive && <Check size={13} className="text-maroon shrink-0" />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Status Badge Component ─────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.confirmed
  return (
    <span className={`text-[11px] font-bold py-1 px-3 rounded-full border tracking-[0.02em] whitespace-nowrap inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot || 'bg-blue'}`} />
      {cfg.label}
    </span>
  )
}

// ── Avatar Component ───────────────────────────────────────────────────────────
const Av = ({ name, size = 34, bg = 'bg-maroon-mid', color = 'text-maroon' }) => {
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') : '?'
  return (
    <div className={`rounded-full flex items-center justify-center shrink-0 border border-maroon-border font-bold ${bg} ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

// ── Main Staff Appointments Page ───────────────────────────────────────────────
export default function AppointmentsPage() {
  const { token } = useAuth()
  
  const d = new Date()
  const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [statsData, setStatsData]       = useState(null)
  const [dateOverrides, setDateOverrides] = useState({})
  
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)
  const [apptLoading, setApptLoading]   = useState(false)
  const [error, setError]               = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery]   = useState('')
  const [page, setPage]                 = useState(1)
  const [viewDetailsModal, setViewDetailsModal] = useState(null)

  const ITEMS_PER_PAGE = 8

  const fmt12h = (t) => {
    if (!t) return '—'
    const [hStr, mStr] = t.split(':')
    if (!hStr || !mStr) return t
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }

  const formatDateLabel = (ds) => {
    if (!ds) return ''
    const dateObj = new Date(ds + 'T00:00:00')
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Load KPI stats
  const loadStats = useCallback(async () => {
    try {
      const data = await getAppointmentStats(token)
      setStatsData(data)
    } catch (e) {
      console.error('Failed to load stats', e)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Load configuration & stats on mount
  useEffect(() => {
    loadStats()
    getBookingConfig().then(cfg => {
      if (cfg?.date_overrides) setDateOverrides(cfg.date_overrides)
    }).catch(console.error)
  }, [loadStats])

  // Load appointments for selected date
  const loadAppointments = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setApptLoading(true)
    setError('')
    try {
      const data = await getAllAppointments(token, selectedDate)
      setAppointments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load appointments.')
      setAppointments([])
    } finally {
      if (showSkeleton) setApptLoading(false)
    }
  }, [selectedDate, token])

  // Real-time WebSocket event listener
  useStaffEvent(['APPOINTMENTS_UPDATED', 'QUEUE_UPDATED'], () => {
    loadAppointments(false)
    loadStats()
  })

  useEffect(() => {
    loadAppointments(true)
    setPage(1)
  }, [selectedDate, loadAppointments])

  // Derived filtered items
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      const effStatus = getEffectiveStatus(a)
      const matchesStatus = statusFilter === 'all' || effStatus === statusFilter || a.status === statusFilter
      if (!matchesStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const student = a.users || {}
        const name = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase()
        const studentId = (student.student_id || '').toLowerCase()
        const txName = (a.transaction_types?.name || a.transaction_type?.name || '').toLowerCase()
        return name.includes(q) || studentId.includes(q) || txName.includes(q)
      }
      return true
    }).sort((a, b) => {
      const aComp = getEffectiveStatus(a) === 'completed'
      const bComp = getEffectiveStatus(b) === 'completed'
      if (aComp && !bComp) return 1
      if (!aComp && bComp) return -1
      return (a.time_slot || '').localeCompare(b.time_slot || '')
    })
  }, [appointments, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  const selectedDaySummary = useMemo(() => {
    const summary = { confirmed: 0, in_progress: 0, completed: 0, cancelled: 0, no_show: 0 }
    appointments.forEach(a => {
      const st = getEffectiveStatus(a)
      if (summary[st] !== undefined) summary[st]++
    })
    return summary
  }, [appointments])

  const isToday = selectedDate === todayStr

  return (
    <div className="animate-fade-up font-sans w-full pb-12">
      
      {/* ── Page Header ── */}
      <div className="mb-5 sm:mb-6">
        <p className="text-[11px] font-extrabold text-gold tracking-[0.08em] uppercase m-0 mb-1.5 flex items-center gap-1.5">
          <CalendarCheck size={14} /> Staff Operations
        </p>
        <h1 className="font-serif text-[24px] sm:text-[28px] font-bold text-text-main m-0 mb-2 flex items-center gap-3">
          <Calendar size={28} className="text-maroon shrink-0" /> Appointment Schedule
        </h1>
        <p className="text-[13px] text-text-sub mt-1 mb-0 leading-relaxed max-w-2xl">
          Monitor daily student bookings, verify transaction requirements, and view real-time queue statuses.
        </p>
      </div>

      {error && (
        <div className="p-3.5 px-4.5 rounded-xl bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-2.5 font-medium text-[13px]">
          <AlertTriangle size={17} className="shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: "Today's Bookings", value: statsData?.today_appointments ?? 0, icon: <Calendar size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: 'Total bookings scheduled today' },
          { label: 'Confirmed Today', value: statsData?.confirmed_today ?? (statsData?.today_appointments || 0), icon: <CalendarCheck size={18} />, bg: 'bg-blue-light', fg: 'text-blue', sub: 'Awaiting arrival at desk' },
          { label: 'Ready for Pickup', value: selectedDaySummary.in_progress, icon: <Clock size={18} />, bg: 'bg-success-light', fg: 'text-success', sub: 'Ready at release counter' },
          { label: 'Completed Today', value: statsData?.completed_today ?? 0, icon: <CheckCircle2 size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'Successfully processed today' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-5 bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{c.label}</span>
              <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center ${c.bg} ${c.fg} shadow-2xs`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-[28px] font-extrabold text-text-main leading-none">
              {loading ? <div className="animate-pulse w-14 h-8 bg-border rounded-lg" /> : c.value}
            </div>
            <div className="text-[11.5px] font-medium text-text-muted mt-2">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Layout: Sidebar + Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-6 items-start">
        
        {/* ── Left Sidebar ── */}
        <div className="flex flex-col gap-5">
          {/* Mini Calendar */}
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} dateOverrides={dateOverrides} />

          {/* Selected Date Summary */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-4">
            <div>
              <p className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-3.5 pb-2.5 border-b border-border flex items-center justify-between">
                <span>Day Summary</span>
                <span className="text-text-sub font-mono font-bold">{appointments.length} Total</span>
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { l: 'Confirmed',        v: selectedDaySummary.confirmed,   c: 'text-blue',    dot: 'bg-blue' },
                  { l: 'Ready for Pickup', v: selectedDaySummary.in_progress, c: 'text-success', dot: 'bg-success' },
                  { l: 'Completed',        v: selectedDaySummary.completed,   c: 'text-success', dot: 'bg-success' },
                  { l: 'Cancelled',        v: selectedDaySummary.cancelled,   c: 'text-danger',  dot: 'bg-danger' },
                  { l: 'No Show',          v: selectedDaySummary.no_show,     c: 'text-text-muted', dot: 'bg-text-muted' },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center group py-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                      <span className="text-[12.5px] font-semibold text-text-sub group-hover:text-text-main transition-colors">{s.l}</span>
                    </div>
                    <span className={`font-sans text-[15px] font-extrabold ${s.c}`}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Overrides / Notice Banner */}
          {dateOverrides[selectedDate] && (
            <div className={`p-4.5 rounded-2xl border ${dateOverrides[selectedDate].is_blocked ? 'bg-danger-light border-danger-border' : 'bg-info-light border-info-border'}`}>
              <div className="flex items-center gap-2 mb-2">
                {dateOverrides[selectedDate].is_blocked ? <AlertTriangle size={16} className="text-danger" /> : <Info size={16} className="text-info" />}
                <span className={`text-[11.5px] font-extrabold uppercase tracking-wider ${dateOverrides[selectedDate].is_blocked ? 'text-danger' : 'text-info'}`}>
                  {dateOverrides[selectedDate].is_blocked ? 'Date Blocked' : 'Notice Note'}
                </span>
              </div>
              <p className="text-[12.5px] text-text-main m-0 leading-relaxed font-medium">
                {dateOverrides[selectedDate].note}
              </p>
            </div>
          )}
        </div>

        {/* ── Right Content: Appointments Schedule Table Card ── */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Card Header & Controls */}
          <div className="p-5 sm:p-6 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="font-serif text-[20px] font-bold text-text-main m-0">
                  {isToday ? "Today's Schedule" : formatDateLabel(selectedDate)}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon text-[11.5px] font-extrabold border border-maroon-border">
                  {filtered.length} {filtered.length === 1 ? 'Booking' : 'Bookings'}
                </span>
              </div>
              <p className="text-[12px] text-text-muted m-0">
                {isToday ? 'Live appointments for today' : `Appointments scheduled on ${selectedDate}`}
              </p>
            </div>

            {/* Controls: Search + Status Filter */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search input */}
              <div className="relative min-w-56 sm:min-w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                  placeholder="Search student or doc..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-white text-[12.5px] font-medium text-text-main placeholder:text-text-muted outline-none focus:border-maroon/40 focus:ring-2 focus:ring-maroon/5 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 cursor-pointer bg-transparent border-none"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em] hidden sm:inline-block">Status</span>
                <StatusDropdown
                  value={statusFilter}
                  onChange={v => { setStatusFilter(v); setPage(1) }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-border">
                  <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] w-28">Time</th>
                  <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] min-w-45">Student</th>
                  <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] min-w-50">Transaction</th>
                  <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] w-32">Priority</th>
                  <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] w-36">Status</th>
                  <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apptLoading ? (
                  [1, 2, 3, 4].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td className="py-4 px-5"><div className="h-5 w-14 rounded bg-border" /></td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8.5 h-8.5 rounded-full bg-border shrink-0" />
                          <div className="space-y-1.5 w-32">
                            <div className="h-4 w-full rounded bg-border" />
                            <div className="h-3 w-16 rounded bg-border" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5"><div className="h-4 w-36 rounded bg-border" /></td>
                      <td className="py-4 px-5"><div className="h-5 w-16 rounded-full bg-border" /></td>
                      <td className="py-4 px-5"><div className="h-6 w-24 rounded-full bg-border" /></td>
                      <td className="py-4 px-5 text-right"><div className="h-7 w-20 rounded-lg bg-border inline-block" /></td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 px-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-surface text-text-muted/60 flex items-center justify-center mx-auto mb-3 border border-border">
                        <Calendar size={28} strokeWidth={1.5} />
                      </div>
                      <p className="font-serif text-[17px] font-bold text-text-main m-0 mb-1">
                        No appointments found {isToday ? 'for today' : `for ${selectedDate}`}
                      </p>
                      <p className="text-[12.5px] text-text-muted m-0 max-w-sm mx-auto leading-relaxed">
                        {searchQuery 
                          ? `No bookings match "${searchQuery}". Try clearing your search query.`
                          : statusFilter !== 'all' 
                          ? 'Try switching to "All Statuses" to view other bookings.' 
                          : 'There are no student bookings recorded on this date.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginated.map(apt => {
                    const student = apt.users
                    const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student' : 'Unknown Student'
                    const txName = apt.transaction_types?.name || apt.transaction_type?.name || 'Transaction'
                    const time = fmt12h(apt.time_slot)
                    const effStatus = getEffectiveStatus(apt)
                    const isPriority = apt.priority_class && apt.priority_class !== 'regular'

                    return (
                      <tr key={apt.id} className="hover:bg-surface/50 transition-colors group">
                        {/* Time */}
                        <td className="py-4.5 px-5 whitespace-nowrap">
                          <div className="font-sans text-[13.5px] font-bold text-text-main flex items-center gap-1.5">
                            <Clock size={13} className="text-text-muted shrink-0" />
                            <span>{time}</span>
                          </div>
                          {apt.slot_duration_minutes && (
                            <span className="text-[10.5px] font-medium text-text-muted mt-0.5 block">
                              {apt.slot_duration_minutes} min duration
                            </span>
                          )}
                        </td>

                        {/* Student */}
                        <td className="py-4.5 px-5">
                          <div className="flex items-center gap-3">
                            <Av name={name} size={34} />
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-bold text-text-main truncate group-hover:text-maroon transition-colors">
                                {name}
                              </div>
                              {student?.student_id && (
                                <div className="text-[11px] font-mono font-medium text-text-muted mt-0.5">
                                  ID: {student.student_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Transaction */}
                        <td className="py-4.5 px-5">
                          <div className="text-[13.5px] font-bold text-text-main leading-snug">
                            {txName}
                          </div>
                          {apt.transaction_types?.required_documents?.length > 0 && (
                            <span className="text-[11px] text-text-muted font-medium mt-0.5 block">
                              {apt.transaction_types.required_documents.length} required document{apt.transaction_types.required_documents.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-4.5 px-5 whitespace-nowrap">
                          {isPriority ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-maroon-light text-maroon text-[10.5px] font-extrabold uppercase border border-maroon-border/60">
                              <ShieldCheck size={11} className="shrink-0" />
                              <span>{apt.priority_class}</span>
                            </span>
                          ) : (
                            <span className="text-[12px] font-medium text-text-muted">
                              Regular
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4.5 px-5 whitespace-nowrap">
                          <StatusBadge status={effStatus} />
                        </td>

                        {/* Actions */}
                        <td className="py-4.5 px-5 text-right whitespace-nowrap">
                          <button 
                            type="button"
                            onClick={() => setViewDetailsModal(apt)} 
                            className="py-1.5 px-3.5 rounded-xl border border-border bg-white text-text-main text-[12px] font-bold cursor-pointer font-sans hover:border-maroon-border hover:text-maroon hover:bg-surface transition-all shadow-2xs"
                            title="View full booking details"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          {filtered.length > 0 && (
            <div className="p-4 px-6 border-t border-border flex items-center justify-between bg-white flex-wrap gap-3">
              <span className="text-[12px] text-text-muted font-medium">
                Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} bookings
              </span>
              
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className={`py-1.5 px-3 rounded-lg border border-border bg-white text-[12px] font-bold font-sans transition-all ${
                    page === 1 ? 'opacity-40 cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-surface'
                  }`}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => setPage(i + 1)} 
                    className={`w-8 h-8 rounded-lg text-[12px] font-bold cursor-pointer font-sans border transition-all ${
                      page === i + 1 
                        ? 'border-maroon bg-maroon text-white shadow-2xs' 
                        : 'border-border bg-white text-text-main hover:bg-surface'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className={`py-1.5 px-3 rounded-lg border border-border bg-white text-[12px] font-bold font-sans transition-all ${
                    page === totalPages ? 'opacity-40 cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── View Details Modal ── */}
      {viewDetailsModal && createPortal((() => {
        const student = viewDetailsModal.users || {}
        const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student' : 'Unknown Student'
        const studentId = student?.student_id || 'N/A'
        const email = student?.email || ''
        const academicInfo = student?.course || ''
        const purposeText = viewDetailsModal.purpose || viewDetailsModal.notes || ''
        const mediaUrl = viewDetailsModal.media_url || viewDetailsModal.attachment_url || viewDetailsModal.file_url || null

        const isCompleted = viewDetailsModal.status === 'completed'
        const isPriority = viewDetailsModal.priority_class && viewDetailsModal.priority_class !== 'regular'
        const pClassLabel = viewDetailsModal.priority_class?.toUpperCase() || 'REGULAR'

        const queueTicket = viewDetailsModal.queue_tickets?.[0] || viewDetailsModal.queue_tickets || null
        const txType = viewDetailsModal.transaction_types || viewDetailsModal.transaction_type || {}
        const processingSteps = txType?.processing_steps || []
        const requiredDocs = txType?.required_documents || []

        const formattedDate = new Date(viewDetailsModal.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        const timeFormatted = fmt12h(viewDetailsModal.time_slot)
        const refId = `APPT-${viewDetailsModal.id ? viewDetailsModal.id.split('-')[0].toUpperCase() : '000'}`

        return (
          <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto" onClick={() => setViewDetailsModal(null)}>
            <div className="fixed inset-0 bg-black/60 transition-opacity animate-fade-in" />
            
            <div className="animate-fade-up relative my-auto w-full max-w-4xl bg-white text-text-main rounded-3xl p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 custom-scrollbar font-sans" onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-5 border-b border-border gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-light text-gold text-[11px] font-extrabold uppercase tracking-wider border border-gold-border">
                      <CalendarCheck size={13} /> Appointment Details
                    </span>
                    {isPriority && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-maroon-light text-maroon text-[11px] font-extrabold uppercase tracking-wider border border-maroon-border">
                        <ShieldCheck size={13} /> {pClassLabel} Priority
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h2 className="font-serif text-[28px] sm:text-[34px] font-extrabold text-maroon m-0 leading-none tracking-tight">
                      {refId}
                    </h2>
                    <StatusBadge status={getEffectiveStatus(viewDetailsModal)} />
                  </div>
                </div>

                <button 
                  onClick={() => setViewDetailsModal(null)} 
                  className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Student Details Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border font-bold text-[18px]">
                    <Users size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Student Information
                    </span>
                    <div className="text-[16px] font-bold text-text-main leading-snug truncate mb-2">
                      {name}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] text-text-main font-mono font-bold bg-surface px-2.5 py-1 rounded-lg border border-border">
                        ID: {studentId}
                      </span>
                      {isPriority && (
                        <span className="text-[11.5px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-maroon-light text-maroon border-maroon-border">
                          {pClassLabel}
                        </span>
                      )}
                      {email && (
                        <span className="text-[12px] text-text-sub truncate max-w-64 font-medium flex items-center gap-1">
                          <Mail size={12} className="text-text-muted shrink-0" />
                          <span className="text-text-main truncate">{email}</span>
                        </span>
                      )}
                      {academicInfo && (
                        <span className="text-[12px] text-text-muted font-medium">
                          • {academicInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Requested Document Details Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-light text-gold flex items-center justify-center shrink-0 border border-gold-border">
                    <FileText size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Requested Document
                    </span>
                    <div className="text-[16px] font-bold text-text-main leading-snug mb-1.5">
                      {txType?.name || 'Document Transaction'}
                    </div>
                    <div className="text-[12px] text-text-sub flex items-center gap-1.5 font-medium mb-1">
                      <Calendar size={13} className="text-gold shrink-0" />
                      <span>
                        {formattedDate} • {timeFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue & Release Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Live Queue Ticket Status Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border">
                    <Ticket size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Live Queue Status
                    </span>
                    {queueTicket ? (
                      <>
                        <div className="text-[18px] font-extrabold text-maroon leading-tight">
                          {queueTicket.queue_number}
                        </div>
                        <span className="text-[12px] text-text-sub font-medium mt-1 inline-block capitalize">
                          Status: <strong className="text-text-main">{queueTicket.status === 'in_progress' ? 'Serving Now' : (queueTicket.status || 'Active').replace(/_/g, ' ')}</strong>
                          {queueTicket.current_step ? ` (Step ${queueTicket.current_step}/${queueTicket.total_steps || 3})` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-[15px] font-bold text-text-muted leading-tight">
                          Not Yet Activated
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Queue ticket activates upon student arrival
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Release Schedule Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-light text-blue flex items-center justify-center shrink-0 border border-blue-border">
                    <FolderOpen size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Release Schedule
                    </span>
                    {viewDetailsModal.release_date ? (
                      <>
                        <div className="text-[16px] font-bold text-blue leading-snug">
                          {new Date(viewDetailsModal.release_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Scheduled for student pickup
                        </span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <div className="text-[15px] font-bold text-success leading-snug">
                          Document Released
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Transaction fully completed
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-[15px] font-bold text-text-main leading-snug">
                          To Be Scheduled
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Set by staff upon document preparation
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Requirements & Purpose */}
              {(requiredDocs.length > 0 || purposeText || mediaUrl) && (
                <div className="mb-5 p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-4">
                  {requiredDocs.length > 0 && (
                    <div>
                      <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList size={14} className="text-gold" /> Required Document Attachments
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {requiredDocs.map((doc, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/60 border border-border text-[12px] font-semibold text-text-main shadow-2xs"
                          >
                            <CheckCircle2 size={13} className="text-success shrink-0" />
                            <span>{typeof doc === 'string' ? doc : doc.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {purposeText && (
                    <div className={requiredDocs.length > 0 ? "pt-3.5 border-t border-border" : ""}>
                      <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Info size={14} className="text-maroon" /> Student Remarks / Purpose
                      </span>
                      <p className="text-[13px] text-text-main font-medium m-0 whitespace-pre-wrap leading-relaxed">
                        {purposeText}
                      </p>
                    </div>
                  )}

                  {mediaUrl && (
                    <div className={(requiredDocs.length > 0 || purposeText) ? "pt-3.5 border-t border-border" : ""}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-maroon" /> Attached Document Media
                        </span>
                        <a 
                          href={mediaUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] font-bold text-maroon hover:underline flex items-center gap-1"
                        >
                          Open Full Size <ExternalLink size={11} />
                        </a>
                      </div>
                      <a href={mediaUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-border max-h-56 bg-white shadow-2xs hover:opacity-95 transition-opacity">
                        <img src={mediaUrl} alt="Supporting Attachment" className="w-full h-full object-contain block max-h-56 bg-white" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Workflow Roadmap */}
              {processingSteps && processingSteps.length > 0 && (
                <div className="mb-5 p-5 bg-white rounded-2xl border border-border shadow-sm">
                  <h3 className="text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] flex items-center gap-1.5 m-0 mb-3">
                    <Clock size={14} className="text-maroon" /> Workflow Processing Steps
                  </h3>
                  <div className="space-y-2.5">
                    {processingSteps.map((step, idx) => {
                      const stepNumber = idx + 1
                      const stepName = typeof step === 'string' ? step : step.name || step.step_name || `Step ${stepNumber}`
                      const location = typeof step === 'object' ? step.location : null
                      const estMins = typeof step === 'object' && step.estimated_minutes ? `~${step.estimated_minutes} min` : null

                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-border hover:border-maroon-border transition-colors shadow-2xs gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-maroon text-white flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-2xs">
                              {stepNumber}
                            </div>
                            <span className="text-[13px] font-bold text-text-main truncate">
                              {stepName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {estMins && (
                              <span className="text-[11px] font-medium text-text-muted px-2 py-0.5 rounded-md bg-white border border-border">
                                {estMins}
                              </span>
                            )}
                            {location && (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border/40">
                                {location}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end">
                <button 
                  onClick={() => setViewDetailsModal(null)} 
                  className="px-6 py-2.5 rounded-xl bg-maroon text-white text-[13px] font-bold cursor-pointer hover:bg-maroon-dark transition-colors shadow-sm active:scale-98"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )
      })(), document.body)}

    </div>
  )
}
