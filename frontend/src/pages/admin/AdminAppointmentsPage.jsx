import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import { useStaffEvent } from '../../context/WebSocketContext'
import { getDashboardStats, getAllAppointments, updateAppointmentStatus, getOfficeConfig, setDateOverride } from '../../services/adminService'
import { rescheduleAppointment, getAvailableSlots } from '../../services/appointmentService'
import { 
  AlertTriangle, Inbox, Check, X as XIcon, ChevronLeft, ChevronRight, ChevronDown, Filter, Calendar, 
  FolderOpen, CheckCircle, Clock, PieChart, Activity, Archive, Info, Eye, CheckCircle2,
  CalendarCheck, ShieldCheck, Users, Mail, FileText, Ticket, ExternalLink, ClipboardList,
  Search, RotateCcw, Ban, StickyNote
} from 'lucide-react'
import CustomDatePicker from '../../components/common/CustomDatePicker'
import { getPhilippineHoliday } from '../../utils/philippineHolidays'

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed:   { label: 'Confirmed',        bg: 'bg-blue-light',    color: 'text-blue',     border: 'border-blue-border',    dot: 'bg-blue' },
  in_progress: { label: 'Ready for Pickup', bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border', dot: 'bg-success' },
  completed:   { label: 'Completed',        bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border', dot: 'bg-success' },
  cancelled:   { label: 'Cancelled',        bg: 'bg-danger-light',  color: 'text-danger',   border: 'border-danger-border',  dot: 'bg-danger' },
  no_show:     { label: 'No Show',          bg: 'bg-surface',       color: 'text-text-muted',border: 'border-border',         dot: 'bg-text-muted' },
}

// ── Status Options for Filter Dropdown ─────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'all',         label: 'All Statuses',      dot: null },
  { value: 'confirmed',   label: 'Confirmed',         dot: 'bg-blue' },
  { value: 'in_progress', label: 'Ready for Pickup',  dot: 'bg-success' },
  { value: 'completed',   label: 'Completed',         dot: 'bg-success' },
  { value: 'cancelled',   label: 'Cancelled',         dot: 'bg-danger' },
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

// ── Mini Calendar ──────────────────────────────────────────────────────────────
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
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button"
          onClick={prevMonth} 
          className="bg-transparent border-none cursor-pointer p-1.5 rounded-lg text-text-sub flex items-center justify-center hover:bg-surface hover:text-text-main transition-colors"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-serif text-fluid-15 font-bold text-text-main tracking-tight">
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
          <div key={d} className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-1.5 justify-items-center">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="w-8 h-8" />
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = dateStr === todayStr
          const isSel   = dateStr === selStr
          const isSun   = (i % 7 === 6)
          const override = dateOverrides[dateStr]
          const phHoliday = getPhilippineHoliday(dateStr)
          const isBlocked = override ? override.is_blocked : Boolean(phHoliday)
          
          let btnClass = "w-8 h-8 rounded-full border-none text-fluid-12 relative flex items-center justify-center "
          
          if (isSun) {
            btnClass += "bg-transparent font-medium text-danger/45 cursor-not-allowed"
          } else if (isSel) {
            btnClass += "bg-maroon text-white font-bold shadow-xs cursor-pointer"
          } else if (isToday) {
            btnClass += "bg-maroon-light text-maroon font-bold hover:bg-maroon/20 cursor-pointer"
          } else if (isBlocked) {
            btnClass += "bg-danger-light/30 text-danger font-bold hover:bg-danger-light/60 cursor-pointer"
          } else {
            btnClass += "bg-transparent font-semibold hover:bg-surface text-text-main cursor-pointer"
          }

          const cellTitle = isSun 
            ? "Sundays are closed" 
            : phHoliday 
              ? `${phHoliday.name} (${phHoliday.type})` 
              : override?.note || (isBlocked ? "Date Blocked" : undefined)

          return (
            <button 
              key={i} 
              disabled={isSun}
              onClick={() => !isSun && onSelect(dateStr)} 
              className={btnClass} 
              type="button"
              title={cellTitle}
            >
              <span>{day}</span>
              {(override || phHoliday) && !isSun && (
                <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isBlocked ? (isSel ? 'bg-white' : 'bg-danger') : (isSel ? 'bg-white' : 'bg-info')}`} />
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
            className="w-full py-1.5 px-3 rounded-xl border border-border bg-white text-text-sub hover:text-maroon hover:bg-off-white text-fluid-11-5 font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Calendar size={13} className="text-maroon" /> Jump to Today
          </button>
        </div>
      )}
    </div>
  )
}

// ── Modern Status Dropdown ─────────────────────────────────────────────────────
const StatusDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const current = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0]

  return (
    <div className="relative z-30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 py-2 px-3.5 rounded-xl border border-border bg-white text-fluid-12-5 text-text-main font-bold shadow-2xs hover:border-maroon/40 hover:shadow-xs transition-all cursor-pointer font-sans min-w-40"
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
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between text-fluid-12 font-medium transition-colors ${isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main hover:bg-off-white'}`}
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

// ── Status Badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.confirmed
  return (
    <span className={`text-fluid-11 font-bold py-1 px-3 rounded-full border tracking-[0.02em] whitespace-nowrap inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot || 'bg-blue'}`} />
      {cfg.label}
    </span>
  )
}

// ── Avatar Initials ────────────────────────────────────────────────────────────
const Av = ({ name, size = 34, bg = 'bg-maroon-mid', color = 'text-maroon' }) => {
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

  const student = appt?.users
  const studentName = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student' : 'Student'
  const txName = appt?.transaction_types?.name || appt?.transaction_type?.name || 'Transaction'

  const format12Hour = (timeStr) => {
    if (!timeStr) return ''
    const [hStr, mStr] = timeStr.split(':')
    if (!hStr || !mStr) return timeStr
    const h = parseInt(hStr, 10)
    return `${h % 12 || 12}:${mStr} ${h < 12 ? 'AM' : 'PM'}`
  }

  const txTypeId = appt?.transaction_type_id || appt?.transaction_types?.id

  useEffect(() => {
    if (!date || !txTypeId) return
    setLoadingSlots(true)
    getAvailableSlots(txTypeId, date)
      .then(res => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [date, txTypeId])

  const handleSave = async () => {
    if (!date || !time) return
    setSaving(true)
    const result = await onConfirm(appt.id, date, time)
    if (result === true) {
      setSaving(false)
      setShowConfirm(false)
    } else {
      setSaving(false)
      alert(result || "Failed to reschedule.")
    }
  }

  const d = new Date()
  const today = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  const currentFormattedDate = appt?.appointment_date
    ? new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const newFormattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  const morningSlots = slots.filter(s => {
    const h = parseInt((s.time_slot || '').split(':')[0], 10)
    return h < 12
  })
  const afternoonSlots = slots.filter(s => {
    const h = parseInt((s.time_slot || '').split(':')[0], 10)
    return h >= 12
  })

  return createPortal((
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 transition-opacity animate-fade-in" />
      
      {/* Main Modal */}
      {!showConfirm ? (
        <div className="animate-fade-up relative my-auto w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.18)] border border-border z-10 custom-scrollbar max-h-[90vh] overflow-y-auto font-sans" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-start justify-between mb-5 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold uppercase tracking-wider border border-maroon-border">
                  <Calendar size={13} /> Reschedule
                </span>
                <span className="text-fluid-12 font-bold text-text-muted">
                  #{appt?.id ? `APPT-${appt.id.split('-')[0].toUpperCase()}` : ''}
                </span>
              </div>
              <h3 className="font-serif text-fluid-24 font-bold text-text-main m-0 leading-tight">
                Reschedule Appointment
              </h3>
            </div>
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-full bg-surface text-text-muted hover:text-text-main hover:bg-border/80 transition-all flex items-center justify-center border border-border cursor-pointer shadow-xs"
              title="Close"
            >
              <XIcon size={17} />
            </button>
          </div>

          {/* Current Appointment Summary Card */}
          <div className="p-4 rounded-2xl bg-off-white border border-border mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Av name={studentName} size={36} />
              <div>
                <div className="text-fluid-14 font-bold text-text-main leading-tight">{studentName}</div>
                <div className="text-fluid-12 text-text-sub font-medium mt-0.5">{txName}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-fluid-10-5 font-extrabold uppercase tracking-wider text-text-muted block">Current Schedule</span>
              <span className="text-fluid-12-5 font-bold text-maroon block mt-0.5">
                {currentFormattedDate} • {format12Hour(appt?.time_slot)}
              </span>
            </div>
          </div>
          
          {/* Date Picker Section */}
          <div className="mb-6">
            <label className="block text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] mb-2.5">
              1. Select New Date
            </label>
            <CustomDatePicker
              minDate={today}
              value={date}
              onChange={val => { setDate(val); setTime('') }}
              placeholder="Choose a new date for appointment…"
              className="w-full"
            />
          </div>

          {/* Time Slot Selection */}
          {date && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em]">
                  2. Select Time Slot
                </label>
                {slots.length > 0 && (
                  <span className="text-fluid-11-5 font-semibold text-text-sub">
                    {slots.filter(s => s.available).length} available
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="p-8 text-center bg-surface/50 rounded-2xl border border-border flex items-center justify-center gap-2.5 text-fluid-13 font-medium text-text-sub">
                  <div className="w-4 h-4 border-2 border-maroon border-t-transparent rounded-full animate-spin" />
                  Loading available slots...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-6 text-center bg-surface/40 rounded-2xl border border-border text-fluid-13 text-text-muted font-medium">
                  No slots available for this date. Please pick another date.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Morning Slots */}
                  {morningSlots.length > 0 && (
                    <div>
                      <span className="text-fluid-11 font-bold text-text-muted uppercase tracking-wider block mb-2">
                        Morning
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {morningSlots.map(s => {
                          const available = s.available
                          const selected = time === s.time_slot
                          return (
                            <button
                              key={s.time_slot}
                              disabled={!available}
                              onClick={() => setTime(s.time_slot)}
                              className={`py-2.5 px-3 rounded-xl border text-fluid-13 font-bold font-sans transition-all duration-150 flex items-center justify-center ${
                                selected
                                  ? 'border-maroon bg-maroon text-white shadow-sm scale-102'
                                  : available
                                  ? 'border-border bg-white text-text-main hover:border-maroon-border hover:bg-maroon-light hover:text-maroon cursor-pointer shadow-2xs'
                                  : 'border-border/60 bg-surface/60 text-text-muted/50 cursor-not-allowed line-through'
                              }`}
                            >
                              {format12Hour(s.time_slot)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {afternoonSlots.length > 0 && (
                    <div>
                      <span className="text-fluid-11 font-bold text-text-muted uppercase tracking-wider block mb-2">
                        Afternoon
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {afternoonSlots.map(s => {
                          const available = s.available
                          const selected = time === s.time_slot
                          return (
                            <button
                              key={s.time_slot}
                              disabled={!available}
                              onClick={() => setTime(s.time_slot)}
                              className={`py-2.5 px-3 rounded-xl border text-fluid-13 font-bold font-sans transition-all duration-150 flex items-center justify-center ${
                                selected
                                  ? 'border-maroon bg-maroon text-white shadow-sm scale-102'
                                  : available
                                  ? 'border-border bg-white text-text-main hover:border-maroon-border hover:bg-maroon-light hover:text-maroon cursor-pointer shadow-2xs'
                                  : 'border-border/60 bg-surface/60 text-text-muted/50 cursor-not-allowed line-through'
                              }`}
                            >
                              {format12Hour(s.time_slot)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-border flex gap-3 justify-end items-center">
            <button 
              onClick={onClose} 
              className="py-2.5 px-5 rounded-xl border border-border bg-white text-text-main text-fluid-13 font-bold cursor-pointer font-sans hover:bg-surface transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button 
              onClick={() => setShowConfirm(true)} 
              disabled={!date || !time} 
              className={`py-2.5 px-6 rounded-xl border-none font-sans text-fluid-13 font-bold transition-all ${
                (!date || !time) 
                  ? 'bg-maroon/40 text-white cursor-not-allowed' 
                  : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark shadow-sm active:scale-98'
              }`}
            >
              Continue to Confirm
            </button>
          </div>
        </div>
      ) : (
        /* Confirmation Modal */
        <div className="animate-fade-up relative w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.18)] border border-border z-10 font-sans text-center">
          <div className="w-14 h-14 rounded-2xl bg-maroon-light text-maroon flex items-center justify-center mx-auto mb-4 border border-maroon-border shadow-xs">
            <CalendarCheck size={26} />
          </div>
          
          <h3 className="font-serif text-fluid-22 font-bold text-text-main m-0 mb-1.5">
            Confirm Reschedule
          </h3>
          <p className="text-fluid-13 text-text-sub m-0 mb-5 leading-relaxed">
            Please review the updated appointment schedule for <strong>{studentName}</strong>.
          </p>

          {/* Comparison Card */}
          <div className="p-4 rounded-2xl bg-off-white border border-border text-left mb-6 space-y-3">
            <div className="flex justify-between items-center text-fluid-12">
              <span className="text-text-muted font-bold uppercase tracking-wider">Previous:</span>
              <span className="text-text-sub font-semibold line-through">
                {currentFormattedDate} • {format12Hour(appt?.time_slot)}
              </span>
            </div>
            <div className="h-px bg-border w-full" />
            <div className="flex justify-between items-center text-fluid-13">
              <span className="text-maroon font-bold uppercase tracking-wider">New Schedule:</span>
              <span className="text-maroon font-extrabold">
        {newFormattedDate} • {format12Hour(time)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => setShowConfirm(false)} 
              disabled={saving} 
              className={`py-2.5 px-5 rounded-xl border border-border bg-white text-text-main font-sans font-bold text-fluid-13 flex-1 ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-surface'}`}
            >
              Back
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className={`py-2.5 px-6 rounded-xl border-none bg-maroon text-white font-sans font-bold text-fluid-13 flex-1 shadow-sm transition-colors ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-maroon-dark'}`}
            >
              {saving ? 'Saving...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  ), document.body)
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

  return createPortal((
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 transition-opacity" />
      <div className="animate-fade-up relative my-auto w-full max-w-120 bg-white rounded-3xl p-8 shadow-[0_25px_70px_rgba(0,0,0,0.18)] border border-border z-10" onClick={e => e.stopPropagation()}>
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isBlock ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info'}`}>
              {isBlock ? <AlertTriangle size={28} strokeWidth={2.5} /> : <Info size={28} strokeWidth={2.5} />}
            </div>
            <div>
              <h3 className="font-serif text-fluid-26 font-bold text-text-main m-0 leading-tight">{title}</h3>
              <p className="text-fluid-14 font-medium text-text-muted mt-1 flex items-center gap-2">
                <Calendar size={14} /> {formattedDate}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors p-1 cursor-pointer bg-transparent border-none">
            <XIcon size={20} />
          </button>
        </div>

        <p className="text-fluid-14 text-text-sub m-0 mb-8 leading-relaxed bg-surface/50 p-4 rounded-xl border border-border/50">
          {desc}
        </p>
        
        {/* Input Section */}
        <div className="mb-8">
          <label className="block text-fluid-13 font-extrabold text-text-muted uppercase tracking-wider mb-3">
            {isBlock ? 'Reason (Required)' : 'Notice Note (Required)'}
          </label>
          <textarea 
            value={note} 
            onChange={e => setNote(e.target.value)} 
            placeholder={isBlock ? "e.g., School Events, System Maintenance" : "e.g., Registrar office available for half-day only"}
            className="w-full p-4 rounded-2xl border-[1.5px] border-border font-sans text-fluid-15 outline-none text-text-main min-h-30 resize-y focus:border-maroon/50 focus:ring-4 focus:ring-maroon/5 transition-all shadow-inner bg-off-white/50"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-4 justify-end">
          <button 
            onClick={onClose} 
            disabled={saving} 
            className="py-3 px-6 rounded-xl border-[1.5px] border-border bg-white text-text-main cursor-pointer font-sans font-bold text-fluid-14 hover:bg-surface hover:text-text-main transition-all duration-200"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(note)} 
            disabled={saving || !note.trim()} 
            className={`py-3 px-8 rounded-xl border-none text-white font-sans font-bold text-fluid-14 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200 ${isBlock ? 'bg-danger hover:bg-danger-hover hover:shadow-[0_6px_16px_rgba(220,38,38,0.2)]' : 'bg-maroon hover:bg-maroon-hover hover:shadow-[0_6px_16px_rgba(123,26,42,0.2)]'} ${(!note.trim() || saving) ? 'cursor-not-allowed opacity-60 grayscale-[0.3] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]' : 'cursor-pointer hover:-translate-y-0.5'}`}
          >
            {saving ? 'Processing...' : 'Confirm Action'}
          </button>
        </div>
      </div>
    </div>
  ), document.body)
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
  const [searchQuery, setSearchQuery]   = useState('')
  const [page, setPage]               = useState(1)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [viewDetailsModal, setViewDetailsModal] = useState(null)
  
  const [dateOverrides, setDateOverrides] = useState({})
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, type: null })
  const [overrideSaving, setOverrideSaving] = useState(false)
  const toast = useToast()

  const showToast = (msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
  }

  const PER_PAGE = 6

  const canReschedule = (apptDateStr, apptTimeStr) => {
    if (!apptDateStr) return false
    const [year, month, day] = apptDateStr.split('-').map(Number)
    let hour = 0, min = 0
    if (apptTimeStr) {
      const match = apptTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        const ampm = match[3]?.toUpperCase()
        if (ampm === 'PM' && h < 12) h += 12
        if (ampm === 'AM' && h === 12) h = 0
        hour = h
        min = m
      }
    }
    const apptDate = new Date(year, month - 1, day, hour, min)
    const now = new Date()
    const diffHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours >= 24
  }

  const handleRescheduleSubmit = async (appointmentId, newDate, newTime) => {
    try {
      await rescheduleAppointment(token, appointmentId, newDate, newTime)
      setRescheduleTarget(null)
      loadAppointments(selectedDate)
      getDashboardStats(token).then(setStats).catch(console.error)
      showToast('Appointment rescheduled successfully!')
      return true
    } catch (err) {
      showToast(err.message || 'Failed to reschedule appointment', 'error')
      return err.message
    }
  }

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(token, appointmentId, newStatus)
      loadAppointments(selectedDate)
      getDashboardStats(token).then(setStats).catch(console.error)
      showToast(`Appointment status updated to ${STATUS_CFG[newStatus]?.label || newStatus}!`)
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
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
      setAppointments([])
    } finally { setApptLoading(false) }
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(['APPOINTMENTS_UPDATED', 'QUEUE_UPDATED'], () => {
    loadAppointments(selectedDate)
    getDashboardStats(token).then(setStats).catch(console.error)
  })

  useEffect(() => {
    loadAppointments(selectedDate)
    setPage(1)
  }, [selectedDate, loadAppointments])

  // Derived filtered items with search and status support
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  const selectedDaySummary = useMemo(() => {
    const summary = { confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 }
    appointments.forEach(a => {
      const st = getEffectiveStatus(a)
      if (summary[st] !== undefined) summary[st]++
    })
    return summary
  }, [appointments])

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
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const isToday = selectedDate === today

  return (
    <div className="animate-fade-up font-sans w-full pb-12">
      {/* ── Page Header ── */}
      <div className="mb-5 sm:mb-6">
        <p className="text-fluid-11 font-extrabold text-gold tracking-[0.08em] uppercase m-0 mb-1.5 flex items-center gap-1.5">
          <CalendarCheck size={14} /> Appointment Scheduling
        </p>
        <h1 className="font-serif text-fluid-24 sm:text-fluid-28 font-bold text-text-main m-0 mb-2 flex items-center gap-3">
          <Calendar size={28} className="text-maroon shrink-0" /> Appointment Management
        </h1>
        <p className="text-fluid-13 text-text-sub mt-1 mb-0 leading-relaxed max-w-2xl">
          Manage daily student appointment slots, reschedule bookings, and monitor real-time queue attendance.
        </p>
      </div>

      {error && (
        <div className="p-3.5 px-4.5 rounded-xl bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-2.5 font-medium text-fluid-13">
          <AlertTriangle size={17} className="shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: "Today's Appts.", value: stats?.today?.total ?? 0, icon: <Calendar size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: 'Total scheduled today' },
          { label: 'Confirmed', value: stats?.today?.confirmed ?? 0, icon: <CalendarCheck size={18} />, bg: 'bg-blue-light', fg: 'text-blue', sub: 'Awaiting student arrival' },
          { label: 'Ready for Pickup', value: selectedDaySummary.in_progress, icon: <Clock size={18} />, bg: 'bg-success-light', fg: 'text-success', sub: 'Ready at counter window' },
          { label: 'Completed Today', value: stats?.today?.completed ?? 0, icon: <CheckCircle2 size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'Successfully processed' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-5 bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-[0.08em]">{c.label}</span>
              <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center ${c.bg} ${c.fg} shadow-2xs`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-fluid-28 font-extrabold text-text-main leading-none">
              {loading ? <div className="animate-pulse w-14 h-8 bg-border rounded-lg" /> : c.value}
            </div>
            <div className="text-fluid-11-5 font-medium text-text-muted mt-2">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Layout: Sidebar (Calendar & Summary) + Schedule Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-6 items-start">

        {/* ── Left Sidebar ── */}
        <div className="flex flex-col gap-5">
          {/* Mini Calendar */}
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} dateOverrides={dateOverrides} />

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-3.5 pb-2.5 border-b border-border">
              Quick Actions
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Block Date', icon: <Ban size={15} className="text-danger" />, action: () => setOverrideModal({ isOpen: true, type: 'block' }) },
                { label: 'Add Notice Note', icon: <StickyNote size={15} className="text-info" />, action: () => setOverrideModal({ isOpen: true, type: 'note' }) },
              ].map((item, i) => (
                <button 
                  key={i} 
                  type="button"
                  onClick={item.action} 
                  className="w-full py-2.5 px-3.5 rounded-xl border border-border bg-white text-text-main text-fluid-12-5 font-bold cursor-pointer text-left font-sans transition-all hover:border-maroon-border hover:bg-surface hover:text-maroon shadow-2xs flex items-center gap-2.5"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Date Summary */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-4">
            <div>
              <p className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-3.5 pb-2.5 border-b border-border flex items-center justify-between">
                <span>Day Summary</span>
                <span className="text-text-sub font-mono font-bold">{appointments.length} Total</span>
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { l: 'Confirmed',        v: selectedDaySummary.confirmed,   c: 'text-blue',    dot: 'bg-blue' },
                  { l: 'Ready for Pickup', v: selectedDaySummary.in_progress, c: 'text-success', dot: 'bg-success' },
                  { l: 'Completed',        v: selectedDaySummary.completed,   c: 'text-success', dot: 'bg-success' },
                  { l: 'Cancelled',        v: selectedDaySummary.cancelled,   c: 'text-danger',  dot: 'bg-danger' },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center group py-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                      <span className="text-fluid-12-5 font-semibold text-text-sub group-hover:text-text-main transition-colors">{s.l}</span>
                    </div>
                    <span className={`font-sans text-fluid-15 font-extrabold ${s.c}`}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Content: Appointments Schedule Table Card ── */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Date Blocked Table Header Banner */}
          {(() => {
            const phHoliday = getPhilippineHoliday(selectedDate)
            const currentOverride = dateOverrides[selectedDate]
            const isBlocked = currentOverride ? currentOverride.is_blocked : Boolean(phHoliday)
            const title = currentOverride?.note || (phHoliday ? phHoliday.name : "Date Blocked")
            if (!isBlocked) return null

            return (
              <div className="p-4 sm:p-5 m-5 sm:m-6 mb-0 rounded-2xl bg-danger-light/50 border border-danger-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-danger-light border border-danger-border flex items-center justify-center text-danger shrink-0 mt-0.5 shadow-2xs">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-fluid-11-5 font-extrabold text-danger uppercase tracking-wider">
                        DATE BLOCKED
                      </span>
                      {phHoliday && (
                        <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-fluid-10-5 font-bold border border-danger/20">
                          {phHoliday.type}
                        </span>
                      )}
                    </div>
                    <p className="text-fluid-15 font-bold text-text-main m-0 mt-0.5">
                      {title}
                    </p>
                    <p className="text-fluid-12 text-text-sub m-0 mt-0.5">
                      {phHoliday 
                        ? "Official Philippine holiday — Student bookings and office queues are closed on this date."
                        : "This date has been marked as unavailable for appointments."}
                    </p>
                  </div>
                </div>
                {currentOverride && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await setDateOverride(token, selectedDate, false, "")
                        setDateOverrides(prev => { const n = {...prev}; delete n[selectedDate]; return n; })
                        loadAppointments(selectedDate)
                      } catch (err) { setError(err.message) }
                    }}
                    className="py-2 px-3.5 rounded-xl border border-border bg-white text-text-main text-fluid-12 font-bold hover:bg-surface hover:border-maroon-border transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    Unblock Date
                  </button>
                )}
              </div>
            )
          })()}

          {/* Card Header & Controls */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4 bg-white">
            {/* Title & Badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <h2 className="font-serif text-fluid-17 sm:text-fluid-19 lg:text-fluid-20 font-bold text-text-main m-0 leading-tight">
                  {isToday ? "Today's Schedule" : formatDateLabel(selectedDate)}
                </h2>
                <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon text-fluid-11 sm:text-fluid-11-5 font-extrabold border border-maroon-border whitespace-nowrap">
                  {filtered.length} {filtered.length === 1 ? 'Booking' : 'Bookings'}
                </span>
              </div>
              <p className="text-fluid-11-5 sm:text-fluid-12 text-text-muted m-0 mt-0.5">
                {isToday ? 'Live appointments for today' : `Appointments scheduled on ${selectedDate}`}
              </p>
            </div>

            {/* Controls: Search + Status Filter */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
              {/* Search input */}
              <div className="relative flex-1 sm:flex-initial sm:w-56 md:w-60 min-w-44">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                  placeholder="Search student or doc..."
                  className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-border bg-white text-fluid-12 sm:text-fluid-12-5 font-medium text-text-main placeholder:text-text-muted outline-none focus:border-maroon/40 focus:ring-2 focus:ring-maroon/5 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 cursor-pointer bg-transparent border-none"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>

              {/* Status Dropdown */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-fluid-10 sm:text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-[0.08em] hidden xl:inline-block">Status</span>
                <StatusDropdown
                  value={statusFilter}
                  onChange={v => { setStatusFilter(v); setPage(1) }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-220">
              <thead>
                <tr className="bg-white border-b border-border">
                  <th className="py-3 px-3.5 sm:px-4 text-fluid-10-5 sm:text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] w-[12%]">Time</th>
                  <th className="py-3 px-3.5 sm:px-4 text-fluid-10-5 sm:text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] w-[24%]">Student</th>
                  <th className="py-3 px-3.5 sm:px-4 text-fluid-10-5 sm:text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] w-[24%]">Transaction</th>
                  <th className="py-3 px-3.5 sm:px-4 text-fluid-10-5 sm:text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] w-[11%]">Priority</th>
                  <th className="py-3 px-3.5 sm:px-4 text-fluid-10-5 sm:text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] w-[15%]">Status</th>
                  <th className="py-3 px-3.5 sm:px-4 text-fluid-10-5 sm:text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] w-[14%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apptLoading ? (
                  [1, 2, 3, 4].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td className="py-3.5 px-3.5 sm:px-4"><div className="h-5 w-14 rounded bg-border" /></td>
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8.5 h-8.5 rounded-full bg-border shrink-0" />
                          <div className="space-y-1.5 w-32">
                            <div className="h-4 w-full rounded bg-border" />
                            <div className="h-3 w-16 rounded bg-border" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4"><div className="h-4 w-36 rounded bg-border" /></td>
                      <td className="py-3.5 px-3.5 sm:px-4"><div className="h-5 w-16 rounded-full bg-border" /></td>
                      <td className="py-3.5 px-3.5 sm:px-4"><div className="h-6 w-24 rounded-full bg-border" /></td>
                      <td className="py-3.5 px-3.5 sm:px-4 text-right"><div className="h-7 w-20 rounded-lg bg-border inline-block" /></td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 px-6 text-center">
                      {(() => {
                        const phHoliday = getPhilippineHoliday(selectedDate)
                        const currentOverride = dateOverrides[selectedDate]
                        const isBlocked = currentOverride ? currentOverride.is_blocked : Boolean(phHoliday)
                        const title = currentOverride?.note || (phHoliday ? phHoliday.name : "Date Blocked")

                        if (isBlocked) {
                          return (
                            <div className="max-w-md mx-auto">
                              <div className="w-14 h-14 rounded-2xl bg-danger-light text-danger flex items-center justify-center mx-auto mb-3 border border-danger-border shadow-2xs">
                                <AlertTriangle size={28} />
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-danger-light text-danger text-fluid-11 font-extrabold uppercase tracking-wider mb-2 inline-block border border-danger-border">
                                Date Blocked
                              </span>
                              <p className="font-serif text-fluid-18 font-bold text-text-main m-0 mb-1">
                                {title}
                              </p>
                              <p className="text-fluid-12-5 text-text-muted m-0 leading-relaxed">
                                {phHoliday 
                                  ? `This date is an official Philippine ${phHoliday.type}. Campus appointments and office queues are closed.` 
                                  : "There are no bookings recorded and new appointments cannot be scheduled on this blocked date."}
                              </p>
                            </div>
                          )
                        }

                        return (
                          <>
                            <div className="w-14 h-14 rounded-2xl bg-surface text-text-muted/60 flex items-center justify-center mx-auto mb-3 border border-border">
                              <Calendar size={28} strokeWidth={1.5} />
                            </div>
                            <p className="font-serif text-fluid-17 font-bold text-text-main m-0 mb-1">
                              No appointments found {isToday ? 'for today' : `for ${selectedDate}`}
                            </p>
                            <p className="text-fluid-12-5 text-text-muted m-0 max-w-sm mx-auto leading-relaxed">
                              {searchQuery 
                                ? `No bookings match "${searchQuery}". Try clearing your search query.`
                                : statusFilter !== 'all' 
                                ? 'Try switching to "All Statuses" to view other bookings.' 
                                : 'There are no student bookings recorded on this date.'}
                            </p>
                          </>
                        )
                      })()}
                    </td>
                  </tr>
                ) : (
                  paginated.map(appt => {
                    const student = appt.users
                    const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student' : 'Unknown Student'
                    const txName = appt.transaction_types?.name || appt.transaction_type?.name || 'Transaction'
                    const time = formatTime(appt.time_slot)
                    const effStatus = getEffectiveStatus(appt)
                    const isPriority = appt.priority_class && appt.priority_class !== 'regular'

                    return (
                      <tr key={appt.id} className="hover:bg-surface/50 transition-colors group">
                        {/* Time */}
                        <td className="py-3.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <div className="font-sans text-fluid-13 font-bold text-text-main flex items-center gap-1.5">
                            <Clock size={13} className="text-text-muted shrink-0" />
                            <span>{time}</span>
                          </div>
                          {appt.slot_duration_minutes && (
                            <span className="text-fluid-10 sm:text-fluid-10-5 font-medium text-text-muted mt-0.5 block">
                              {appt.slot_duration_minutes} min duration
                            </span>
                          )}
                        </td>

                        {/* Student */}
                        <td className="py-3.5 px-3.5 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <Av name={name} size={32} />
                            <div className="min-w-0">
                              <div className="text-fluid-13 font-bold text-text-main truncate group-hover:text-maroon transition-colors">
                                {name}
                              </div>
                              {student?.student_id && (
                                <div className="text-fluid-10-5 font-mono font-medium text-text-muted mt-0.5">
                                  ID: {student.student_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Transaction */}
                        <td className="py-3.5 px-3.5 sm:px-4">
                          {appt.selected_documents && appt.selected_documents.length > 1 ? (
                            <div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {appt.selected_documents.map((d, idx) => (
                                  <span key={d.id || idx} className="text-[11px] font-bold text-maroon bg-maroon-light py-0.5 px-2 rounded-md border border-maroon-border/40">
                                    {d.name}
                                  </span>
                                ))}
                              </div>
                              <span className="text-fluid-10-5 text-text-muted font-medium block">
                                {appt.selected_documents.length} requested documents
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="text-fluid-13 font-bold text-text-main leading-snug line-clamp-2">
                                {txName}
                              </div>
                              {appt.transaction_types?.required_documents?.length > 0 && (
                                <span className="text-fluid-10-5 text-text-muted font-medium mt-0.5 block">
                                  {appt.transaction_types.required_documents.length} required document{appt.transaction_types.required_documents.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-3.5 sm:px-4 whitespace-nowrap">
                          {isPriority ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon text-fluid-10 font-extrabold uppercase border border-maroon-border/60">
                              <ShieldCheck size={11} className="shrink-0" />
                              <span>{appt.priority_class}</span>
                            </span>
                          ) : (
                            <span className="text-fluid-11-5 font-medium text-text-muted">
                              Regular
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <StatusBadge status={effStatus} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3.5 sm:px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              type="button"
                              onClick={() => setViewDetailsModal(appt)} 
                              className="py-1.5 px-2.5 sm:px-3 rounded-xl border border-border bg-white text-text-main text-fluid-11-5 font-bold cursor-pointer font-sans hover:border-maroon-border hover:text-maroon hover:bg-surface transition-all shadow-2xs"
                              title="View full booking details"
                            >
                              View Details
                            </button>

                            {appt.status === 'pending' && (
                              <button 
                                type="button"
                                onClick={() => handleStatusChange(appt.id, 'confirmed')} 
                                className="py-1.5 px-3 rounded-xl border-none bg-maroon-light text-maroon text-fluid-12 font-bold cursor-pointer font-sans hover:bg-maroon hover:text-white transition-colors"
                              >
                                Confirm
                              </button>
                            )}

                            {(effStatus === 'confirmed' || appt.status === 'pending') && canReschedule(appt.appointment_date, appt.time_slot) && (
                              <button 
                                type="button"
                                onClick={() => setRescheduleTarget(appt)} 
                                className="py-1.5 px-3 rounded-xl border border-border bg-white text-text-main text-fluid-12 font-bold cursor-pointer font-sans hover:bg-surface hover:border-text-muted transition-colors shadow-2xs"
                              >
                                Reschedule
                              </button>
                            )}
                          </div>
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
              <span className="text-fluid-12 text-text-muted font-medium">
                Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} bookings
              </span>
              
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className={`py-1.5 px-3 rounded-lg border border-border bg-white text-fluid-12 font-bold font-sans transition-all ${
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
                    className={`w-8 h-8 rounded-lg text-fluid-12 font-bold cursor-pointer font-sans border transition-all ${
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
                  className={`py-1.5 px-3 rounded-lg border border-border bg-white text-fluid-12 font-bold font-sans transition-all ${
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
        const isCancelled = viewDetailsModal.status === 'cancelled'
        const isPending = viewDetailsModal.status === 'pending'
        const isConfirmed = viewDetailsModal.status === 'confirmed'

        const isPriority = viewDetailsModal.priority_class && viewDetailsModal.priority_class !== 'regular'
        const pClassLabel = viewDetailsModal.priority_class?.toUpperCase() || 'REGULAR'

        const rawTickets = viewDetailsModal.queue_tickets
        const queueTicket = Array.isArray(rawTickets) ? (rawTickets[0] || null) : (rawTickets || null)
        const hasValidQueueTicket = Boolean(queueTicket && (queueTicket.id || queueTicket.queue_number))
        const txType = viewDetailsModal.transaction_types || viewDetailsModal.transaction_type || {}
        
        const docList = viewDetailsModal.selected_documents && viewDetailsModal.selected_documents.length > 0
          ? viewDetailsModal.selected_documents
          : (txType && txType.name ? [txType] : []);

        const mergedRequiredDocs = (() => {
          const reqs = [];
          docList.forEach(d => {
            (d.required_documents || []).forEach(r => {
              if (r && !reqs.includes(r)) reqs.push(r);
            });
          });
          return reqs;
        })();

        const processingSteps = txType?.processing_steps || []
        const requiredDocs = mergedRequiredDocs.length > 0 ? mergedRequiredDocs : (txType?.required_documents || [])

        const formattedDate = new Date(viewDetailsModal.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        const timeFormatted = formatTime(viewDetailsModal.time_slot)
        const refId = `APPT-${viewDetailsModal.id ? viewDetailsModal.id.split('-')[0].toUpperCase() : '000'}`

        return (
          <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="fixed inset-0 bg-black/60 transition-opacity animate-fade-in" onClick={() => setViewDetailsModal(null)} />
            
            <div className="animate-fade-up relative w-full max-w-4xl bg-white text-text-main rounded-3xl p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 custom-scrollbar font-sans">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-5 border-b border-border gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-light text-gold text-fluid-11 font-extrabold uppercase tracking-wider border border-gold-border">
                      <CalendarCheck size={13} /> Appointment Details
                    </span>
                    {isPriority && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold uppercase tracking-wider border border-maroon-border">
                        <ShieldCheck size={13} /> {pClassLabel} Priority
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h2 className="font-serif text-fluid-28 sm:text-fluid-34 font-extrabold text-maroon m-0 leading-none tracking-tight">
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
                  <XIcon size={18} />
                </button>
              </div>

              {/* Info Cards Grid (Student Info + Requested Document Details) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Student Details Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border font-bold text-fluid-18">
                    <Users size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-fluid-10-5 text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Student Information
                    </span>
                    <div className="text-fluid-16 font-bold text-text-main leading-snug truncate mb-2">
                      {name}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-fluid-12 text-text-main font-mono font-bold bg-surface px-2.5 py-1 rounded-lg border border-border">
                        ID: {studentId}
                      </span>
                      {isPriority && (
                        <span className="text-fluid-11-5 font-bold uppercase px-2.5 py-1 rounded-lg border bg-maroon-light text-maroon border-maroon-border">
                          {pClassLabel}
                        </span>
                      )}
                      {email && (
                        <span className="text-fluid-12 text-text-sub truncate max-w-64 font-medium flex items-center gap-1">
                          <Mail size={12} className="text-text-muted shrink-0" />
                          <span className="text-text-main truncate">{email}</span>
                        </span>
                      )}
                      {academicInfo && (
                        <span className="text-fluid-12 text-text-muted font-medium">
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
                    <span className="text-fluid-10-5 text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      {docList.length > 1 ? `Requested Documents (${docList.length})` : 'Requested Document'}
                    </span>
                    {docList.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                        {docList.map((d, idx) => (
                          <span key={d.id || idx} className="text-xs font-bold text-maroon bg-maroon-light py-0.5 px-2 rounded-md border border-maroon-border/40">
                            {d.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-fluid-16 font-bold text-text-main leading-snug mb-1.5">
                        {txType?.name || 'Document Transaction'}
                      </div>
                    )}
                    <div className="text-fluid-12 text-text-sub flex items-center gap-1.5 font-medium mb-1">
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
                    <span className="text-fluid-10-5 text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Live Queue Status
                    </span>
                    {hasValidQueueTicket ? (
                      <>
                        <div className="text-fluid-18 font-extrabold text-maroon leading-tight">
                          {queueTicket.queue_number}
                        </div>
                        <span className="text-fluid-12 text-text-sub font-medium mt-1 inline-block capitalize">
                          Status: <strong className="text-text-main">{queueTicket.status === 'in_progress' ? 'Serving Now' : (queueTicket.status || 'Active').replace(/_/g, ' ')}</strong>
                          {queueTicket.current_step ? ` (Step ${queueTicket.current_step}/${queueTicket.total_steps || 3})` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-fluid-15 font-bold text-text-muted leading-tight">
                          Not Yet Activated
                        </div>
                        <span className="text-fluid-12 text-text-muted font-medium mt-1 inline-block">
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
                    <span className="text-fluid-10-5 text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Release Schedule
                    </span>
                    {viewDetailsModal.release_date ? (
                      <>
                        <div className="text-fluid-16 font-bold text-blue leading-snug">
                          {new Date(viewDetailsModal.release_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span className="text-fluid-12 text-text-muted font-medium mt-1 inline-block">
                          Scheduled for student pickup
                        </span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <div className="text-fluid-15 font-bold text-success leading-snug">
                          Document Released
                        </div>
                        <span className="text-fluid-12 text-text-muted font-medium mt-1 inline-block">
                          Transaction fully completed
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-fluid-15 font-bold text-text-main leading-snug">
                          To Be Scheduled
                        </div>
                        <span className="text-fluid-12 text-text-muted font-medium mt-1 inline-block">
                          Set by staff upon document preparation
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Document Requirements & Student Remarks Banner */}
              {(requiredDocs.length > 0 || purposeText || mediaUrl) && (
                <div className="mb-5 p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-4">
                  {requiredDocs.length > 0 && (
                    <div>
                      <span className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList size={14} className="text-gold" /> Required Document Attachments
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {requiredDocs.map((doc, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/60 border border-border text-fluid-12 font-semibold text-text-main shadow-2xs"
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
                      <span className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Info size={14} className="text-maroon" /> Student Remarks / Purpose
                      </span>
                      <p className="text-fluid-13 text-text-main font-medium m-0 whitespace-pre-wrap leading-relaxed">
                        {purposeText}
                      </p>
                    </div>
                  )}

                  {mediaUrl && (
                    <div className={(requiredDocs.length > 0 || purposeText) ? "pt-3.5 border-t border-border" : ""}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-maroon" /> Attached Document Media
                        </span>
                        <a 
                          href={mediaUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-fluid-11 font-bold text-maroon hover:underline flex items-center gap-1"
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

              {/* Workflow Processing Steps Roadmap */}
              {processingSteps && processingSteps.length > 0 && (
                <div className="mb-5 p-5 bg-white rounded-2xl border border-border shadow-sm">
                  <h3 className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em] flex items-center gap-1.5 m-0 mb-3">
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
                            <div className="w-6 h-6 rounded-full bg-maroon text-white flex items-center justify-center text-fluid-11 font-extrabold shrink-0 shadow-2xs">
                              {stepNumber}
                            </div>
                            <span className="text-fluid-13 font-bold text-text-main truncate">
                              {stepName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {estMins && (
                              <span className="text-fluid-11 font-medium text-text-muted px-2 py-0.5 rounded-md bg-white border border-border">
                                {estMins}
                              </span>
                            )}
                            {location && (
                              <span className="text-fluid-11 font-bold px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border/40">
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

              {/* Modal Footer with Actions */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {isPending && (
                    <button 
                      onClick={async () => {
                        await handleStatusChange(viewDetailsModal.id, 'confirmed')
                        setViewDetailsModal(prev => prev ? { ...prev, status: 'confirmed' } : null)
                      }}
                      className="px-4 py-2.5 rounded-xl bg-maroon text-white text-fluid-13 font-bold cursor-pointer hover:bg-maroon-dark transition-colors shadow-sm"
                    >
                      Confirm Appointment
                    </button>
                  )}
                  {(isPending || isConfirmed) && canReschedule(viewDetailsModal.appointment_date, viewDetailsModal.time_slot) && (
                    <button 
                      onClick={() => {
                        const target = viewDetailsModal
                        setViewDetailsModal(null)
                        setRescheduleTarget(target)
                      }}
                      className="px-4 py-2.5 rounded-xl border border-border bg-white text-text-main text-fluid-13 font-bold cursor-pointer hover:bg-surface transition-colors shadow-sm"
                    >
                      Reschedule
                    </button>
                  )}
                  {(isPending || isConfirmed) && (
                    <button 
                      onClick={async () => {
                        await handleStatusChange(viewDetailsModal.id, 'cancelled')
                        setViewDetailsModal(prev => prev ? { ...prev, status: 'cancelled' } : null)
                      }}
                      className="px-4 py-2.5 rounded-xl bg-danger-light text-danger text-fluid-13 font-bold cursor-pointer hover:bg-danger hover:text-white transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => setViewDetailsModal(null)} 
                  className="px-6 py-2.5 rounded-xl bg-surface border border-border text-text-main text-fluid-13 font-bold cursor-pointer hover:bg-border/60 transition-colors ml-auto"
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
