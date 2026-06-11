import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getDashboardStats, getAllAppointments, updateAppointmentStatus } from '../../services/adminService'
import { AlertTriangle, Inbox, Check, X as XIcon, ChevronLeft, ChevronRight, ChevronDown, Filter } from 'lucide-react'

// ── Design Tokens ──────────────────────────────────────────────────────────────
const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonMid:    'rgba(123,26,42,0.08)',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.3)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  surface:      '#F2EDE8',
  border:       '#EAE7E2',
  text:         '#1C1917',
  textSub:      '#57534E',
  textMuted:    '#A8A29E',
  green:        '#15803D',
  greenLight:   '#F0FDF4',
  greenBorder:  '#BBF7D0',
  blue:         '#1D4ED8',
  blueLight:    '#EFF6FF',
  blueBorder:   '#BFDBFE',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
}

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed:  { label: 'Confirmed',  bg: M.blueLight,  color: M.blue,   border: M.blueBorder  },
  completed:  { label: 'Completed',  bg: M.greenLight, color: M.green,  border: M.greenBorder },
  cancelled:  { label: 'Cancelled',  bg: M.redLight,   color: M.red,    border: M.redBorder   },
  pending:    { label: 'Scheduled',  bg: M.goldLight,  color: M.gold,   border: M.goldBorder  },
  no_show:    { label: 'No Show',    bg: M.surface,    color: M.textMuted, border: M.border   },
  in_progress:{ label: 'Initiated',  bg: M.maroonLight,color: M.maroon, border: M.maroonBorder},
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
    <div style={{ background: M.white, borderRadius: '14px', border: `1px solid ${M.border}`, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Month Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', color: M.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = M.surface}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        ><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, color: M.text }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', color: M.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = M.surface}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        ><ChevronRight size={16} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: M.textMuted, paddingBottom: '6px' }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = dateStr === todayStr
          const isSel   = dateStr === selStr
          const isSun   = (i % 7 === 6)
          return (
            <button key={i} onClick={() => onSelect(dateStr)} style={{
              width: '100%', aspectRatio: '1', borderRadius: '8px', border: 'none',
              background: isSel ? M.maroon : isToday ? M.maroonLight : 'transparent',
              color: isSel ? M.white : isToday ? M.maroon : isSun ? M.red : M.text,
              fontSize: '12px', fontWeight: isSel || isToday ? 700 : 400,
              cursor: 'pointer', transition: 'all 0.12s',
            }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = M.surface }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? M.maroonLight : 'transparent' }}
            >{day}</button>
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
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

// ── Avatar Initials ────────────────────────────────────────────────────────────
const Av = ({ name, size = 32, bg = M.maroonMid, color = M.maroon }) => {
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') : '?'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color, fontSize: size * 0.38, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${M.maroonBorder}` }}>
      {initials}
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
  const PER_PAGE = 6

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Appointments Management</h1>
          <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Manage and track student administrative requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Filter pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: M.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> STATUS
            </span>
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                style={{ appearance: 'none', padding: '9px 32px 9px 14px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', color: M.text, outline: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                <option value="all">All Statuses</option>
                <option value="pending">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">Initiated</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', color: M.textMuted }}><ChevronDown size={14} /></span>
            </div>
          </div>


        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} /> {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>

        {/* Today's Total */}
        <div className="animate-fade-up" style={{ animationDelay: '0.1s', background: M.white, borderRadius: '16px', padding: '20px 22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today's Total</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '6px', minHeight: '36px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: M.border, borderRadius: '8px' }} /> : stats?.today?.total ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: M.textMuted }}>
            Scheduled
          </div>
        </div>

        {/* Upcoming */}
        <div className="animate-fade-up" style={{ animationDelay: '0.2s', background: M.white, borderRadius: '16px', padding: '20px 22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Queue</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '6px', minHeight: '36px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: M.border, borderRadius: '8px' }} /> : stats?.active_queue ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: M.textMuted }}>In progress</div>
        </div>

        {/* Completed */}
        <div className="animate-fade-up" style={{ animationDelay: '0.3s', background: M.white, borderRadius: '16px', padding: '20px 22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.green, lineHeight: 1, marginBottom: '6px', minHeight: '36px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: M.border, borderRadius: '8px' }} /> : stats?.today?.completed ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: M.textMuted }}>
            Today
          </div>
        </div>

        {/* Fulfillment Rate */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s', background: M.white, borderRadius: '16px', padding: '20px 22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completion Rate</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '10px', minHeight: '36px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '80px', height: '36px', background: M.border, borderRadius: '8px' }} /> : (() => {
              const total = stats?.today?.total || 0
              const comp  = stats?.today?.completed || 0
              return total > 0 ? `${Math.round((comp / total) * 100)}%` : '0%'
            })()}
          </div>
          <div style={{ fontSize: '12px', color: M.textMuted }}>Of total scheduled</div>
        </div>
      </div>

      {/* ── Main Body: Calendar + Schedule ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>

        {/* Left: Calendar + Quick Actions */}
        <div className="animate-fade-up" style={{ animationDelay: '0.5s', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

          {/* Quick Actions */}
          <div style={{ background: M.white, borderRadius: '14px', border: `1px solid ${M.border}`, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Block Time Slot', action: () => {} },
                { label: 'Add Internal Note', action: () => {} },
                { label: 'Export Schedule', action: () => {} },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{
                  padding: '9px 12px', borderRadius: '9px', border: `1px solid ${M.border}`,
                  background: M.offWhite, color: M.text, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'center', fontFamily: "'IBM Plex Sans', sans-serif",
                  transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = M.maroonLight; e.currentTarget.style.borderColor = M.maroonBorder; e.currentTarget.style.color = M.maroon }}
                  onMouseLeave={e => { e.currentTarget.style.background = M.offWhite; e.currentTarget.style.borderColor = M.border; e.currentTarget.style.color = M.text }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Date Summary */}
          {!loading && stats && (
            <div style={{ background: M.maroonLight, borderRadius: '14px', border: `1px solid ${M.maroonBorder}`, padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: M.maroon, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Day Summary</p>
              {[
                { l: 'Confirmed',   v: stats?.today?.confirmed || 0, c: M.blue  },
                { l: 'Completed',   v: stats?.today?.completed || 0, c: M.green },
                { l: 'Cancelled',   v: stats?.today?.cancelled || 0, c: M.red   },
                { l: 'No Show',     v: stats?.today?.no_show || 0,   c: M.textMuted },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: M.maroon, opacity: 0.8 }}>{s.l}</span>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 700, color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Today's Schedule table */}
        <div className="animate-fade-up" style={{ animationDelay: '0.6s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: M.text, margin: '0 0 3px' }}>
                {isToday ? "Today's Schedule" : formatDateLabel(selectedDate)}
              </h2>
              <p style={{ fontSize: '12px', color: M.textMuted, margin: 0 }}>
                {filtered.length} appointment{filtered.length !== 1 ? 's' : ''} {statusFilter !== 'all' ? `· ${STATUS_CFG[statusFilter]?.label || statusFilter}` : ''}
              </p>
            </div>

          </div>

          {/* Table */}
          <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1.5fr 1.5fr 110px 150px', padding: '12px 20px', background: M.surface, borderBottom: `1px solid ${M.border}` }}>
              {['Time', 'Student', 'Transaction', 'Status', 'Action'].map(h => (
                <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {apptLoading ? (
              [1, 2, 3, 4, 5].map((n, idx) => (
                <div key={n} style={{
                  display: 'grid', gridTemplateColumns: '90px 1.5fr 1.5fr 110px 150px',
                  padding: '16px 20px', alignItems: 'center',
                  borderBottom: idx === 4 ? 'none' : `1px solid ${M.border}`,
                  background: idx % 2 === 0 ? M.white : '#FDFCFB',
                }}>
                  <div className="animate-shimmer" style={{ height: '24px', width: '50px', borderRadius: '4px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="animate-shimmer" style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
                    <div className="animate-shimmer" style={{ height: '18px', width: '60%', borderRadius: '4px' }} />
                  </div>
                  <div className="animate-shimmer" style={{ height: '16px', width: '70%', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '22px', width: '70px', borderRadius: '100px' }} />
                  <div className="animate-shimmer" style={{ height: '26px', width: '60px', borderRadius: '6px' }} />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: M.textMuted }}><Inbox size={48} /></div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>
                  No appointments {isToday ? 'today' : `on ${selectedDate}`}
                </p>
                <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>
                  {statusFilter !== 'all' ? 'Try changing the status filter.' : 'This date has no scheduled appointments yet.'}
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
                  <div key={appt.id} style={{
                    display: 'grid', gridTemplateColumns: '90px 1.5fr 1.5fr 110px 150px',
                    padding: '16px 20px', alignItems: 'center',
                    borderBottom: isLast ? 'none' : `1px solid ${M.border}`,
                    background: idx % 2 === 0 ? M.white : '#FDFCFB',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? M.white : '#FDFCFB'}
                  >
                    {/* Time */}
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', fontWeight: 700, color: M.text }}>{time}</div>
                      <div style={{ fontSize: '10px', color: M.textMuted, marginTop: '2px' }}>
                        {appt.slot_duration_minutes ? `${appt.slot_duration_minutes}min` : ''}
                      </div>
                    </div>

                    {/* Student */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <Av name={name} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        {student?.student_id && (
                          <div style={{ fontSize: '11px', color: M.textMuted, fontFamily: 'monospace' }}>{student.student_id}</div>
                        )}
                      </div>
                    </div>

                    {/* Transaction */}
                    <div style={{ fontSize: '13px', color: M.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txName}</div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusBadge status={appt.status} />
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {appt.status === 'pending' && (
                        <button onClick={() => handleStatusChange(appt.id, 'confirmed')} style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: M.maroonLight, color: M.maroon, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Confirm
                        </button>
                      )}
                      {(appt.status === 'confirmed' || appt.status === 'in_progress') && (
                        <button onClick={() => handleStatusChange(appt.id, 'completed')} style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: M.greenLight, color: M.green, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Complete
                        </button>
                      )}
                      {(appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button onClick={() => handleStatusChange(appt.id, 'cancelled')} style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: M.redLight, color: M.red, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          Cancel
                        </button>
                      )}
                      {appt.status === 'completed' && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: M.greenLight, color: M.green, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${M.greenBorder}` }}><Check size={16} /></div>
                      )}
                      {appt.status === 'cancelled' && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: M.redLight, color: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${M.redBorder}` }}><XIcon size={16} /></div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Footer pagination */}
            {filtered.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: M.surface }}>
                <span style={{ fontSize: '12px', color: M.textMuted }}>
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} appointments
                </span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${M.border}`, background: M.white, fontSize: '12px', fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} style={{
                      width: '30px', height: '30px', borderRadius: '7px',
                      border: `1px solid ${page === i + 1 ? M.maroon : M.border}`,
                      background: page === i + 1 ? M.maroon : M.white,
                      color: page === i + 1 ? M.white : M.text,
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${M.border}`, background: M.white, fontSize: '12px', fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
