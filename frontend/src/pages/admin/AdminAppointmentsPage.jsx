import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getDashboardStats, getAllAppointments, updateAppointmentStatus, getOfficeConfig, setDateOverride } from '../../services/adminService'
import { rescheduleAppointment, getAvailableSlots } from '../../services/appointmentService'
import { AlertTriangle, Inbox, Check, X as XIcon, ChevronLeft, ChevronRight, ChevronDown, Filter, Calendar, FolderOpen, CheckCircle, Clock, PieChart, Activity, Archive, Info } from 'lucide-react'

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed:  { label: 'Confirmed',  bg: 'bg-info-light',  color: 'text-info',   border: 'border-info-border'  },
  completed:  { label: 'Completed',  bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-danger-light',   color: 'text-danger',    border: 'border-danger-border'   },
  pending:    { label: 'Scheduled',  bg: 'bg-gold-light',  color: 'text-gold',   border: 'border-gold-border'  },
  no_show:    { label: 'No Show',    bg: 'bg-surface',    color: 'text-text-muted', border: 'border-border'   },
  in_progress:{ label: 'Initiated',  bg: 'bg-maroon-light',color: 'text-maroon', border: 'border-maroon-border'},
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MiniCalendar({ selectedDate, onSelect }) {
  const [view, setView] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
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

  const d = new Date()
  const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const selStr   = selectedDate

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0  } : { year: v.year, month: v.month + 1 })

  return (
    <div className="bg-white rounded-[14px] border border-border p-4 shadow-sm">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-3.5">
        <button onClick={prevMonth} className="bg-transparent border-none cursor-pointer p-[4px_8px] rounded-md text-text-sub flex items-center justify-center hover:bg-surface transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-serif text-[15px] font-bold text-text-main">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="bg-transparent border-none cursor-pointer p-[4px_8px] rounded-md text-text-sub flex items-center justify-center hover:bg-surface transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1.5">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-text-muted pb-1.5">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = dateStr === todayStr
          const isSel   = dateStr === selStr
          const isSun   = (i % 7 === 6)
          
          let btnClass = "w-full aspect-square rounded-lg border-none text-[12px] cursor-pointer transition-colors "
          
          if (isSel) {
            btnClass += "bg-maroon text-white font-bold"
          } else if (isToday) {
            btnClass += "bg-maroon-light text-maroon font-bold hover:bg-surface"
          } else {
            btnClass += `bg-transparent font-normal hover:bg-surface ${isSun ? 'text-danger' : 'text-text-main'}`
          }

          return (
            <button key={i} onClick={() => onSelect(dateStr)} className={btnClass}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span className={`text-[10px] font-bold py-1 px-2.5 rounded-full border tracking-[0.04em] whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

// ── Avatar Initials ────────────────────────────────────────────────────────────
const Av = ({ name, size = 32, bg = 'bg-maroon-mid', color = 'text-maroon' }) => {
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') : '?'
  return (
    <div className={`rounded-full flex items-center justify-center shrink-0 border border-maroon-border font-bold ${bg} ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

// ── Reschedule Modal ───────────────────────────────────────────────────────────
const RescheduleModal = ({ appt, onClose, onConfirm }) => {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const format12Hour = (timeStr) => {
    if (!timeStr) return ''
    const [hStr, mStr] = timeStr.split(':')
    if (!hStr || !mStr) return timeStr
    const h = parseInt(hStr, 10)
    return `${h % 12 || 12}:${mStr} ${h < 12 ? 'AM' : 'PM'}`
  }

  useEffect(() => {
    if (!date) return
    setLoadingSlots(true)
    getAvailableSlots(appt.transaction_type_id, date)
      .then(res => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [date, appt.transaction_type_id])

  const handleSave = async () => {
    if (!date || !time) return
    setSaving(true)
    await onConfirm(appt.id, date, time)
    setSaving(false)
    setShowConfirm(false)
  }

  const d = new Date()
  const today = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Main Modal */}
      {!showConfirm && (
        <div className="animate-fade-up relative w-[600px] bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
          <h3 className="font-serif text-[24px] text-maroon m-0 mb-5">Reschedule Appointment</h3>
          
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-text-muted mb-2">Select New Date</label>
            <input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setTime('') }} 
              className="w-full p-3 rounded-lg border border-border font-sans text-[15px] outline-none text-text-main" />
          </div>

          {date && (
            <div className="mb-7">
              <label className="block text-[13px] font-semibold text-text-muted mb-2">Select Time Slot</label>
              {loadingSlots ? <div className="text-[14px] text-text-sub">Loading slots...</div> : (
                <div className="grid grid-cols-3 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
                  {slots.length === 0 ? <div className="text-[14px] text-text-sub">No slots available</div> : slots.map(s => {
                    const available = s.available
                    const selected = time === s.time_slot
                    return (
                      <button key={s.time_slot} disabled={!available} onClick={() => setTime(s.time_slot)}
                        className={`p-2.5 rounded-lg border font-sans text-[14px] font-semibold ${selected ? 'border-maroon bg-maroon text-white' : available ? 'border-border bg-white text-text-main cursor-pointer' : 'border-border bg-surface text-text-muted cursor-not-allowed'}`}>
                        {format12Hour(s.time_slot)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="py-2.5 px-5 rounded-lg border border-border bg-white text-text-main cursor-pointer font-sans font-semibold">Cancel</button>
            <button onClick={() => setShowConfirm(true)} disabled={!date || !time} className={`py-2.5 px-5 rounded-lg border-none bg-maroon text-white font-sans font-semibold ${(!date || !time) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="animate-fade-up relative w-[400px] bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.1)] text-center">
          <div className="w-12 h-12 rounded-full bg-maroon-light text-maroon flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-serif text-[20px] text-text-main m-0 mb-3">Confirm Reschedule</h3>
          <p className="text-[14px] text-text-sub m-0 mb-6 leading-relaxed">
            You are about to reschedule this appointment to <strong>{new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong> at <strong>{format12Hour(time)}</strong>. Do you want to proceed?
          </p>

          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowConfirm(false)} disabled={saving} className={`py-2.5 px-5 rounded-lg border border-border bg-white text-text-main font-sans font-semibold flex-1 ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              Back
            </button>
            <button onClick={handleSave} disabled={saving} className={`py-2.5 px-5 rounded-lg border-none bg-maroon text-white font-sans font-semibold flex-1 ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              {saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Override Modal ─────────────────────────────────────────────────────────────
const OverrideModal = ({ isOpen, type, selectedDate, currentNote, onClose, onSave, saving }) => {
  const [note, setNote] = useState(currentNote || '')
  if (!isOpen) return null

  const isBlock = type === 'block'
  const title = isBlock ? 'Block Date' : 'Add Notice Note'
  const desc = isBlock 
    ? 'This will prevent new appointments on this date and automatically reschedule any existing ones to the next available date. A reason is required.'
    : 'This adds a visible notice for this date without blocking slots. Good for half-days or special instructions.'

  // Format date nicely, handling timezones by appending T00:00:00
  const dateObj = new Date(`${selectedDate}T00:00:00`)
  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-[480px] bg-white rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/20">
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isBlock ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info'}`}>
              {isBlock ? <AlertTriangle size={28} strokeWidth={2.5} /> : <Info size={28} strokeWidth={2.5} />}
            </div>
            <div>
              <h3 className="font-serif text-[26px] font-bold text-text-main m-0 leading-tight">{title}</h3>
              <p className="text-[14px] font-medium text-text-muted mt-1 flex items-center gap-2">
                <Calendar size={14} /> {formattedDate}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors p-1 cursor-pointer bg-transparent border-none">
            <XIcon size={20} />
          </button>
        </div>

        <p className="text-[14px] text-text-sub m-0 mb-8 leading-relaxed bg-surface/50 p-4 rounded-xl border border-border/50">
          {desc}
        </p>
        
        {/* Input Section */}
        <div className="mb-8">
          <label className="block text-[13px] font-extrabold text-text-muted uppercase tracking-wider mb-3">
            {isBlock ? 'Reason (Required)' : 'Notice Note (Required)'}
          </label>
          <textarea 
            value={note} 
            onChange={e => setNote(e.target.value)} 
            placeholder={isBlock ? "e.g., University Holiday, System Maintenance" : "e.g., Registrar office available for half-day only"}
            className="w-full p-4 rounded-2xl border-[1.5px] border-border font-sans text-[15px] outline-none text-text-main min-h-[120px] resize-y focus:border-maroon/50 focus:ring-4 focus:ring-maroon/5 transition-all shadow-inner bg-off-white/50"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-4 justify-end">
          <button 
            onClick={onClose} 
            disabled={saving} 
            className="py-3 px-6 rounded-xl border-[1.5px] border-border bg-white text-text-main cursor-pointer font-sans font-bold text-[14px] hover:bg-surface hover:text-text-main transition-all duration-200"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(note)} 
            disabled={saving || !note.trim()} 
            className={`py-3 px-8 rounded-xl border-none text-white font-sans font-bold text-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200 ${isBlock ? 'bg-danger hover:bg-danger-hover hover:shadow-[0_6px_16px_rgba(220,38,38,0.2)]' : 'bg-maroon hover:bg-maroon-hover hover:shadow-[0_6px_16px_rgba(123,26,42,0.2)]'} ${(!note.trim() || saving) ? 'cursor-not-allowed opacity-60 grayscale-[0.3] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]' : 'cursor-pointer hover:-translate-y-0.5'}`}
          >
            {saving ? 'Processing...' : 'Confirm Action'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AdminAppointmentsPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAppointmentsPage() {
  const { token } = useAuth()
  const d = new Date()
  const today = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  const [stats, setStats]             = useState(null)
  const [appointments, setAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [loading, setLoading]         = useState(true)
  const [apptLoading, setApptLoading] = useState(false)
  const [error, setError]             = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage]               = useState(1)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  
  const [dateOverrides, setDateOverrides] = useState({})
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, type: null })
  const [overrideSaving, setOverrideSaving] = useState(false)

  const PER_PAGE = 6

  const handleRescheduleSubmit = async (appointmentId, newDate, newTime) => {
    try {
      await rescheduleAppointment(token, appointmentId, newDate, newTime)
      setRescheduleTarget(null)
      loadAppointments(selectedDate)
      getDashboardStats(token).then(setStats).catch(console.error)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(token, appointmentId, newStatus)
      // refresh appointments
      loadAppointments(selectedDate)
      // refresh stats
      getDashboardStats(token).then(setStats).catch(console.error)
    } catch (err) {
      setError(err.message)
    }
  }

  // Load stats once
  useEffect(() => {
    getDashboardStats(token)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    getOfficeConfig(token)
      .then(res => {
        const row = res.find(r => r.key === 'date_overrides')
        if (row && row.value) setDateOverrides(JSON.parse(row.value))
      })
      .catch(console.error)
  }, [token])

  // Load appointments whenever date changes
  const loadAppointments = useCallback(async (date) => {
    setApptLoading(true)
    try {
      const data = await getAllAppointments(token, date)
      setAppointments(Array.isArray(data) ? data : [])
    } catch {
      // Backend may not have this route yet — show empty gracefully
      setAppointments([])
    } finally { setApptLoading(false) }
  }, [token])

  useEffect(() => {
    loadAppointments(selectedDate)
    setPage(1)
  }, [selectedDate, loadAppointments])

  // Derived
  const filtered = appointments.filter(a =>
    statusFilter === 'all' || a.status === statusFilter
  ).sort((a, b) => {
    const aComp = a.status === 'completed'
    const bComp = b.status === 'completed'
    if (aComp && !bComp) return 1
    if (!aComp && bComp) return -1
    return (a.time_slot || '').localeCompare(b.time_slot || '')
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const completedCount  = appointments.filter(a => a.status === 'completed').length
  const fulfillmentRate = appointments.length > 0
    ? Math.round((completedCount / appointments.length) * 100)
    : 0

  const formatTime = (timeSlot) => {
    if (!timeSlot) return '—'
    const [hStr, mStr] = timeSlot.split(':')
    if (!hStr || !mStr) return timeSlot
    const h = parseInt(hStr, 10)
    return `${h % 12 || 12}:${mStr} ${h < 12 ? 'AM' : 'PM'}`
  }

  const formatDateLabel = (ds) => {
    if (!ds) return ''
    const d = new Date(ds + 'T00:00:00')
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const isToday = selectedDate === today

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">APPOINTMENT SCHEDULING</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <Calendar className="text-maroon" size={24} /> Appointments Management
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-[650px]">
            Manage student requests, review schedules, and confirm or reschedule appointments.
          </p>
        </div>
        <div className="flex gap-2.5 items-center">
          {/* Filter pill */}
          <div className="flex items-center gap-2.5 mr-1.5">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] pt-0.5 flex items-center gap-1.5">
              <Filter size={12} strokeWidth={3} /> STATUS
            </span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="py-[9px] pr-9 pl-4 rounded-xl border border-border bg-white text-[13px] text-text-main outline-none cursor-pointer font-sans appearance-none font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-text-muted/30 transition-all">
                <option value="all">All Statuses</option>
                <option value="pending">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">Initiated</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-text-muted"><ChevronDown size={14} strokeWidth={2.5} /></span>
            </div>
          </div>


        </div>
      </div>

      {error && (
        <div className="p-3 px-4 rounded-[10px] bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: "Today's Total", value: stats?.today?.total ?? 0, icon: <Calendar size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: 'Scheduled' },
          { label: 'Active Queue', value: stats?.active_queue ?? 0, icon: <Activity size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'In progress' },
          { label: 'Completed', value: stats?.today?.completed ?? 0, icon: <CheckCircle size={18} />, bg: 'bg-success-light', fg: 'text-success', sub: 'Today' },
          { label: 'Completion Rate', value: (() => {
              const total = stats?.today?.total || 0;
              const comp  = stats?.today?.completed || 0;
              return total > 0 ? `${Math.round((comp / total) * 100)}%` : '0%';
            })(), icon: <PieChart size={18} />, bg: 'bg-info-light', fg: 'text-info', sub: 'Of total scheduled' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-[18px_20px] bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{c.label}</div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-[28px] font-bold text-text-main leading-none">
              {loading ? <div className="animate-pulse w-[60px] h-[36px] bg-border rounded-lg" /> : c.value}
            </div>
            <div className="text-[11px] font-medium text-text-muted mt-1.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Body: Calendar + Schedule ── */}
      <div className="grid grid-cols-[240px_1fr] gap-5">

        {/* Left: Calendar + Quick Actions */}
        <div className="animate-fade-up flex flex-col gap-4" style={{ animationDelay: '0.5s' }}>
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-4 pb-3 border-b border-border">Quick Actions</p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Block Date', action: () => setOverrideModal({ isOpen: true, type: 'block' }) },
                { label: 'Add Notice Note', action: () => setOverrideModal({ isOpen: true, type: 'note' }) },
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="w-full py-[10px] px-4 rounded-xl border border-border bg-white text-text-main text-[13px] font-bold cursor-pointer text-left font-sans transition-all hover:border-text-muted/30 hover:bg-off-white hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Date Summary */}
          {!loading && stats && (
            <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-4 pb-3 border-b border-border">Day Summary</p>
                <div className="flex flex-col gap-3.5">
                  {[
                    { l: 'Confirmed',   v: stats?.today?.confirmed || 0, c: 'text-info'  },
                    { l: 'Completed',   v: stats?.today?.completed || 0, c: 'text-success' },
                    { l: 'Cancelled',   v: stats?.today?.cancelled || 0, c: 'text-danger'   },
                    { l: 'No Show',     v: stats?.today?.no_show || 0,   c: 'text-text-muted' },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-[13px] font-semibold text-text-sub group-hover:text-text-main transition-colors">{s.l}</span>
                      <span className={`font-sans text-[16px] font-extrabold ${s.c}`}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Overrides / Notice Note */}
              {dateOverrides[selectedDate] && (
                <div className={`p-4 rounded-xl border ${dateOverrides[selectedDate].is_blocked ? 'bg-danger-light border-danger-border' : 'bg-info-light border-info-border'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {dateOverrides[selectedDate].is_blocked ? <AlertTriangle size={16} className="text-danger" /> : <Info size={16} className="text-info" />}
                    <span className={`text-[12px] font-bold uppercase tracking-wider ${dateOverrides[selectedDate].is_blocked ? 'text-danger' : 'text-info'}`}>
                      {dateOverrides[selectedDate].is_blocked ? 'Date Blocked' : 'Notice Note'}
                    </span>
                  </div>
                  <p className="text-[13px] text-text-main m-0 leading-relaxed font-medium">
                    {dateOverrides[selectedDate].note}
                  </p>
                  <button 
                    onClick={async () => {
                      try {
                        await setDateOverride(token, selectedDate, false, "")
                        setDateOverrides(prev => { const n = {...prev}; delete n[selectedDate]; return n; })
                        loadAppointments(selectedDate)
                      } catch (err) { setError(err.message) }
                    }}
                    className="mt-3 py-1.5 px-3 rounded-lg border border-border bg-white text-text-main text-[11px] font-bold cursor-pointer font-sans hover:bg-surface transition-colors shadow-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Today's Schedule table */}
        <div className="animate-fade-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-serif text-[20px] font-bold text-text-main m-0 mb-1">
                {isToday ? "Today's Schedule" : formatDateLabel(selectedDate)}
              </h2>
              <p className="text-[12px] text-text-muted m-0">
                {filtered.length} appointment{filtered.length !== 1 ? 's' : ''} {statusFilter !== 'all' ? `· ${STATUS_CFG[statusFilter]?.label || statusFilter}` : ''}
              </p>
            </div>

          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-[100px_1.5fr_1.5fr_120px_180px] p-[14px_24px] bg-off-white border-b border-border">
              {['Time', 'Student', 'Transaction', 'Status', 'Action'].map(h => (
                <span key={h} className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em]">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {apptLoading ? (
              [1, 2, 3, 4, 5].map((n, idx) => (
                <div key={n} className={`grid grid-cols-[100px_1.5fr_1.5fr_120px_180px] p-[16px_24px] items-center ${idx === 4 ? 'border-none' : 'border-b border-border/60'} bg-white`}>
                  <div className="animate-pulse h-6 w-[50px] rounded bg-border" />
                  <div className="flex items-center gap-2.5">
                    <div className="animate-pulse w-[34px] h-[34px] rounded-full bg-border" />
                    <div className="animate-pulse h-[18px] w-[60%] rounded bg-border" />
                  </div>
                  <div className="animate-pulse h-4 w-[70%] rounded bg-border" />
                  <div className="animate-pulse h-[22px] w-[70px] rounded-full bg-border" />
                  <div className="animate-pulse h-[26px] w-[60px] rounded-md bg-border" />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div className="p-[60px_24px] text-center">
                <div className="flex justify-center mb-4 text-text-muted/50"><Inbox size={52} strokeWidth={1.5} /></div>
                <p className="font-serif text-[18px] font-bold text-text-main m-0 mb-1">
                  No appointments {isToday ? 'today' : `on ${selectedDate}`}
                </p>
                <p className="text-[13px] text-text-muted m-0 max-w-[250px] mx-auto">
                  {statusFilter !== 'all' ? 'Try changing the status filter to see other appointments.' : 'This date has no scheduled appointments yet.'}
                </p>
              </div>
            ) : (
              paginated.map((appt, idx) => {
                const student = appt.users
                const name    = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
                const txName  = appt.transaction_types?.name || appt.transaction_type?.name || 'Transaction'
                const isLast  = idx === paginated.length - 1
                const time    = formatTime(appt.time_slot)

                return (
                  <div key={appt.id} className={`group grid grid-cols-[100px_1.5fr_1.5fr_120px_180px] p-[16px_24px] items-center transition-all duration-200 hover:bg-surface border-l-2 border-l-transparent ${isLast ? 'border-none' : 'border-b border-border'} bg-white`}>
                    {/* Time */}
                    <div>
                      <div className="font-sans text-[13.5px] font-bold text-text-main">{time}</div>
                      <div className="text-[10.5px] font-medium text-text-muted mt-0.5">
                        {appt.slot_duration_minutes ? `${appt.slot_duration_minutes}min` : ''}
                      </div>
                    </div>

                    {/* Student */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Av name={name} size={34} />
                      <div className="min-w-0 pr-4">
                        <div className="text-[14px] font-bold text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-maroon transition-colors">{name}</div>
                        {student?.student_id && (
                          <div className="text-[10.5px] font-medium text-text-muted font-mono mt-0.5">{student.student_id}</div>
                        )}
                      </div>
                    </div>

                    {/* Transaction */}
                    <div className="text-[13.5px] font-medium text-text-sub overflow-hidden text-ellipsis whitespace-nowrap pr-4">{txName}</div>

                    {/* Status */}
                    <div className="flex items-center">
                      <StatusBadge status={appt.status} />
                    </div>

                    {/* Action */}
                    <div className="flex gap-1.5 flex-wrap">
                      {appt.status === 'pending' && (
                        <button onClick={() => handleStatusChange(appt.id, 'confirmed')} className="py-1.5 px-3 rounded-lg border-none bg-maroon-light text-maroon text-[11px] font-bold cursor-pointer font-sans hover:bg-maroon hover:text-white transition-colors">
                          Confirm
                        </button>
                      )}

                      {(appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button onClick={() => setRescheduleTarget(appt)} className="py-1.5 px-3 rounded-lg border border-border bg-white text-text-main text-[11px] font-bold cursor-pointer font-sans hover:bg-surface transition-colors shadow-sm">
                          Reschedule
                        </button>
                      )}
                      {(appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button onClick={() => handleStatusChange(appt.id, 'cancelled')} className="py-1.5 px-3 rounded-lg border-none bg-danger-light text-danger text-[11px] font-bold cursor-pointer font-sans hover:bg-danger hover:text-white transition-colors">
                          Cancel
                        </button>
                      )}
                      {appt.status === 'completed' && (
                        <div className="w-7 h-7 rounded-full bg-success-light text-success flex items-center justify-center border border-success-border"><Check size={16} strokeWidth={3} /></div>
                      )}
                      {appt.status === 'cancelled' && (
                        <div className="w-7 h-7 rounded-full bg-danger-light text-danger flex items-center justify-center border border-danger-border"><XIcon size={16} strokeWidth={3} /></div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Footer pagination */}
            {filtered.length > 0 && (
              <div className="p-[12px_20px] border-t border-border flex items-center justify-between bg-surface">
                <span className="text-[12px] text-text-muted">
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} appointments
                </span>
                <div className="flex gap-1 items-center">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className={`py-1.5 px-2.5 rounded-md border border-border bg-white text-[12px] font-semibold font-sans ${page === 1 ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main'}`}>
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`w-[30px] h-[30px] rounded-md text-[12px] font-semibold cursor-pointer font-sans border ${page === i + 1 ? 'border-maroon bg-maroon text-white' : 'border-border bg-white text-text-main'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className={`py-1.5 px-2.5 rounded-md border border-border bg-white text-[12px] font-semibold font-sans ${page === totalPages ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main'}`}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {rescheduleTarget && (
        <RescheduleModal 
          appt={rescheduleTarget} 
          onClose={() => setRescheduleTarget(null)} 
          onConfirm={handleRescheduleSubmit} 
        />
      )}

      <OverrideModal 
        isOpen={overrideModal.isOpen}
        type={overrideModal.type}
        selectedDate={selectedDate}
        currentNote={dateOverrides[selectedDate]?.note}
        saving={overrideSaving}
        onClose={() => setOverrideModal({ isOpen: false, type: null })}
        onSave={async (note) => {
          setOverrideSaving(true)
          try {
            const isBlocked = overrideModal.type === 'block'
            await setDateOverride(token, selectedDate, isBlocked, note)
            setDateOverrides(prev => ({ ...prev, [selectedDate]: { is_blocked: isBlocked, note } }))
            setOverrideModal({ isOpen: false, type: null })
            loadAppointments(selectedDate)
          } catch (err) {
            setError(err.message)
          } finally {
            setOverrideSaving(false)
          }
        }}
      />
    </div>
  )
}
