import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep } from '../../services/queueService'
import { updateReleaseDate } from '../../services/adminService'

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
  orange:       '#C2410C',
  orangeLight:  '#FFF7ED',
  orangeBorder: '#FED7AA',
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  in_progress: { label: 'Serving Now',  bg: M.greenLight,  color: M.green,  border: M.greenBorder  },
  pending:     { label: 'Waiting',      bg: M.goldLight,   color: M.gold,   border: M.goldBorder   },
  completed:   { label: 'Completed',    bg: M.blueLight,   color: M.blue,   border: M.blueBorder   },
  no_show:     { label: 'No Show',      bg: '#F9FAFB',     color: '#6B7280',border: '#E5E7EB'      },
  cancelled:   { label: 'Cancelled',    bg: M.redLight,    color: M.red,    border: M.redBorder    },
}

// ── Small Stat Card ────────────────────────────────────────────────────────────
const MiniStat = ({ icon, value, label, sub, subColor = M.green, loading, delay }) => (
  <div className="animate-fade-up" style={{
    animationDelay: delay || '0s',
    background: M.white, borderRadius: '14px', padding: '18px 20px',
    border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    display: 'flex', alignItems: 'center', gap: '14px', flex: 1,
  }}>
    <div style={{ fontSize: '28px', flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 700, color: M.maroon, lineHeight: 1, minHeight: '26px' }}>
        {loading ? <div className="animate-shimmer" style={{ width: '40px', height: '26px', background: M.border, borderRadius: '4px' }} /> : value}
      </div>
      <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '3px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: subColor, fontWeight: 600, marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
)

// ── Progress Steps Bar ─────────────────────────────────────────────────────────
const StepsBar = ({ steps, current, total }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    {Array.from({ length: total }).map((_, i) => {
      const stepNum = i + 1
      const done    = stepNum < current
      const active  = stepNum === current
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 700,
            background: done ? M.green : active ? M.maroon : M.border,
            color: done || active ? M.white : M.textMuted,
            border: active ? `2px solid ${M.maroonDark}` : 'none',
          }}>{done ? '✓' : stepNum}</div>
          {i < total - 1 && <div style={{ width: '12px', height: '2px', background: done ? M.green : M.border, borderRadius: '1px' }} />}
        </div>
      )
    })}
  </div>
)

// ── Filter Sidebar ─────────────────────────────────────────────────────────────
const FilterSidebar = ({ filters, onChange, highPriorityCount, onReset }) => {
  const statuses = ['in_progress', 'pending', 'completed', 'no_show']

  return (
    <aside style={{
      width: '220px', flexShrink: 0, background: M.white,
      border: `1px solid ${M.border}`, borderRadius: '16px',
      padding: '20px 16px', height: 'fit-content',
      position: 'sticky', top: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 700, color: M.text, marginBottom: '20px' }}>Filters</div>

      {/* Status */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {statuses.map(s => {
            const cfg = STATUS_CFG[s]
            const checked = filters.statuses.includes(s)
            return (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: M.textSub }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? filters.statuses.filter(x => x !== s)
                      : [...filters.statuses, s]
                    onChange({ ...filters, statuses: next })
                  }}
                  style={{ accentColor: M.maroon, width: '14px', height: '14px' }}
                />
                <span style={{ flex: 1 }}>{cfg.label}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '100px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {s === 'in_progress' ? '●' : s === 'pending' ? '◔' : s === 'completed' ? '✓' : '✕'}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Priority */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Priority Level</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[['high', 'High Priority', M.redLight, M.red], ['regular', 'Regular', M.offWhite, M.textSub]].map(([val, lbl, bg, color]) => {
            const checked = filters.priority === val || filters.priority === 'all'
            return (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: M.textSub }}>
                <input type="radio" name="priority" checked={filters.priority === val} onChange={() => onChange({ ...filters, priority: val })}
                  style={{ accentColor: M.maroon, width: '14px', height: '14px' }} />
                <span style={{ flex: 1 }}>{lbl}</span>
                {val === 'high' && highPriorityCount > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '100px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}` }}>
                    {highPriorityCount}
                  </span>
                )}
              </label>
            )
          })}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: M.textSub }}>
            <input type="radio" name="priority" checked={filters.priority === 'all'} onChange={() => onChange({ ...filters, priority: 'all' })}
              style={{ accentColor: M.maroon, width: '14px', height: '14px' }} />
            <span>All</span>
          </label>
        </div>
      </div>

      {/* Transaction Type */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Transaction Type</div>
        <select
          value={filters.transactionType}
          onChange={e => onChange({ ...filters, transactionType: e.target.value })}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: '8px',
            border: `1px solid ${M.border}`, background: M.offWhite,
            fontSize: '12px', color: M.text, outline: 'none', cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          <option value="all">All Transactions</option>
          <option value="TOR">Transcript of Records</option>
          <option value="COE">Certificate of Enrollment</option>
          <option value="Diploma">Diploma Release</option>
          <option value="Grades">Grades</option>
        </select>
      </div>

      <button onClick={onReset} style={{
        width: '100%', padding: '9px', borderRadius: '9px', border: `1px solid ${M.border}`,
        background: M.offWhite, color: M.textSub, fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
      }}>Reset Filters</button>
    </aside>
  )
}

// ── Queue Details Modal ────────────────────────────────────────────────────────
const QueueDetailsModal = ({ ticketData, onClose, onConfirm, confirming, onSetReleaseDate }) => {
  const { ticket, steps } = ticketData
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  
  const [releaseDate, setReleaseDate] = useState(appt?.release_date || '')
  const [savingDate, setSavingDate] = useState(false)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="animate-fade-up" style={{ position: 'relative', width: '100%', maxWidth: '680px', background: M.white, borderRadius: '24px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Queue Details</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 800, color: M.maroon, margin: 0, lineHeight: 1 }}>{ticket.queue_number}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: M.textMuted, lineHeight: 1 }}>×</button>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
          <div style={{ padding: '16px', background: M.surface, borderRadius: '14px', border: `1px solid ${M.border}` }}>
            <div style={{ fontSize: '11px', color: M.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>Student</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: M.text, marginBottom: '2px' }}>{name}</div>
            <div style={{ fontSize: '13px', color: M.textSub, fontFamily: 'monospace' }}>{student?.student_id || '—'}</div>
          </div>
          <div style={{ padding: '16px', background: M.surface, borderRadius: '14px', border: `1px solid ${M.border}` }}>
            <div style={{ fontSize: '11px', color: M.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>Transaction</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, lineHeight: 1.3 }}>{appt?.transaction_types?.name}</div>
          </div>
        </div>

        {/* Release Date */}
        <div style={{ marginBottom: '28px', background: M.offWhite, padding: '16px', borderRadius: '14px', border: `1px solid ${M.border}`, display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Document Release Date</label>
            <input 
              type="date" 
              value={releaseDate} 
              onChange={e => setReleaseDate(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.white, fontSize: '14px', outline: 'none', color: M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}
            />
          </div>
          <button 
            onClick={async () => {
              setSavingDate(true)
              await onSetReleaseDate(appt?.id, releaseDate)
              setSavingDate(false)
            }}
            disabled={savingDate || releaseDate === (appt?.release_date || '')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: (savingDate || releaseDate === (appt?.release_date || '')) ? M.border : M.maroon, color: (savingDate || releaseDate === (appt?.release_date || '')) ? M.textMuted : M.white, fontSize: '13px', fontWeight: 700, cursor: (savingDate || releaseDate === (appt?.release_date || '')) ? 'not-allowed' : 'pointer', height: '42px', fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            {savingDate ? 'Saving...' : 'Set Date'}
          </button>
        </div>

        {/* Steps */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: M.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>Processing Steps</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1
              const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
              const confirmKey = `${ticket.id}-${step.step_number}`
              const isConfirming = confirming === confirmKey
              
              return (
                <div key={step.id} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: step.status === 'completed' ? M.green : step.status === 'in_progress' ? M.gold : M.border, color: step.status === 'completed' || step.status === 'in_progress' ? M.white : M.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: step.status === 'in_progress' ? `2px solid ${M.goldBorder}` : 'none' }}>
                      {step.status === 'completed' ? '✓' : step.step_number}
                    </div>
                    {!isLast && <div style={{ width: '2px', flex: 1, minHeight: '36px', margin: '4px 0', background: step.status === 'completed' ? M.green : M.border }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isCurrent ? M.goldLight : 'transparent', padding: isCurrent ? '12px' : '6px 0', borderRadius: '12px', border: isCurrent ? `1px solid ${M.goldBorder}` : 'none', marginTop: isCurrent ? '-6px' : '0' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: step.status === 'completed' ? M.green : M.text }}>{step.step_name}</div>
                        {step.status === 'completed' && step.confirmed_at && (
                          <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '2px' }}>Confirmed at {new Date(step.confirmed_at).toLocaleTimeString()}</div>
                        )}
                        {isCurrent && (
                          <div style={{ fontSize: '12px', color: M.gold, marginTop: '2px', fontWeight: 600 }}>Active Step</div>
                        )}
                      </div>
                      {isCurrent && (
                        <button
                          onClick={() => onConfirm(ticket.id, step.step_number)}
                          disabled={isConfirming}
                          style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 700, cursor: isConfirming ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                        >
                          {isConfirming ? 'Confirming...' : 'Confirm Step'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main LiveQueuePage ─────────────────────────────────────────────────────────
export default function LiveQueuePage() {
  const { token } = useAuth()
  const [queue, setQueue]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [error, setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow]           = useState(new Date())
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState({ statuses: ['in_progress', 'pending'], priority: 'all', transactionType: 'all' })
  const [viewingTicketId, setViewingTicketId] = useState(null)

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      setQueue(await getTodaysQueue(token))
      setLastUpdated(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 30000)
    return () => clearInterval(t)
  }, [fetchQueue])

  const handleConfirm = async (ticketId, stepNum) => {
    const key = `${ticketId}-${stepNum}`
    setConfirming(key); setError('')
    try { await confirmStep(token, ticketId, stepNum); await fetchQueue() }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  const handleSetReleaseDate = async (appointmentId, dateVal) => {
    try {
      await updateReleaseDate(token, appointmentId, dateVal)
      await fetchQueue()
    } catch (e) {
      setError(e.message)
    }
  }

  // ── Derived stats ──
  const active    = queue.filter(q => q.ticket.status !== 'completed')
  const done      = queue.filter(q => q.ticket.status === 'completed')
  const serving   = queue.filter(q => q.ticket.status === 'in_progress')
  const waiting   = queue.filter(q => q.ticket.status === 'pending')
  const highPrio  = queue.filter(q => {
    const pc = q.ticket.appointments?.priority_class
    return pc === 'graduating' || pc === 'pwd'
  })

  // Calculate Average Wait Time from completed tickets today
  let avgWait = 0
  if (done.length > 0) {
    let totalMinutes = 0
    let validCount = 0
    done.forEach(({ ticket, steps }) => {
      if (!ticket.created_at) return
      const created = new Date(ticket.created_at)
      const lastStep = steps.slice().reverse().find(s => s.status === 'completed' && s.confirmed_at)
      if (lastStep) {
        const completed = new Date(lastStep.confirmed_at)
        totalMinutes += Math.max(0, (completed - created) / 60000)
        validCount++
      }
    })
    avgWait = validCount > 0 ? Math.round(totalMinutes / validCount) : 12 // fallback 12m if no valid steps
  } else {
    avgWait = 12 // Fallback historical average if none done today
  }

  // ── Filtered & searched queue ──
  const displayed = queue.filter(({ ticket, steps }) => {
    const statusOk = filters.statuses.includes(ticket.status)
    const prioOk = filters.priority === 'all'
      || (filters.priority === 'high' && (ticket.appointments?.priority_class === 'graduating' || ticket.appointments?.priority_class === 'pwd'))
      || (filters.priority === 'regular' && ticket.appointments?.priority_class === 'regular')
    const txOk = filters.transactionType === 'all'
      || (ticket.appointments?.transaction_types?.name || '').includes(filters.transactionType)
    const name = `${ticket.users?.first_name} ${ticket.users?.last_name}`.toLowerCase()
    const srchOk = !search || name.includes(search.toLowerCase()) || ticket.queue_number.toLowerCase().includes(search.toLowerCase())
    return statusOk && prioOk && txOk && srchOk
  })

  const currentTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Real-Time</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 700, color: M.text, margin: 0 }}>Live Queue Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or ticket…"
              style={{
                padding: '9px 14px 9px 34px', borderRadius: '9px',
                border: `1px solid ${M.border}`, background: M.white,
                fontSize: '13px', color: M.text, outline: 'none', width: '220px',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: M.textMuted }}>🔍</span>
          </div>
          {/* Refresh */}
          <button onClick={fetchQueue} title="Refresh Queue" style={{
            padding: '0', borderRadius: '50%',
            border: `1px solid ${M.border}`, background: M.white,
            color: M.textSub, fontSize: '15px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px',
          }}>
            🔄
          </button>
          {/* Current time */}
          <div style={{ background: M.maroon, color: M.white, padding: '9px 16px', borderRadius: '9px', fontSize: '14px', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
            {currentTime}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ display: 'flex', gap: '14px' }}>
        <MiniStat 
          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="13" r="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M12 9V13L14.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 3H14M12 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} 
          value={`${avgWait}m`} 
          label="Average Wait Time" 
          sub={avgWait > 15 ? "↑ Higher than avg" : "↓ Fast processing"} 
          subColor={avgWait > 15 ? M.orange : M.green} 
          loading={loading} delay="0.1s"
        />
        <MiniStat icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} value={waiting.length} label="Waiting in Queue" sub={`${serving.length} serving now`} subColor={M.green} loading={loading} delay="0.2s" />
        <MiniStat icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M9 12.5L11.5 15L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>} value={done.length} label="Total Serviced" sub={done.length >= 80 ? 'High volume — Important' : 'Normal volume'} subColor={done.length >= 80 ? M.red : M.green} loading={loading} delay="0.3s" />
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, border: `1px solid ${M.redBorder}`, color: M.red, fontSize: '13px' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Main content: Table + Filter ── */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Queue Table */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s', flex: 1, minWidth: 0 }}>
          {/* Table header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '16px', fontFamily: "'Fraunces', serif", fontWeight: 700, color: M.text }}>Active Queue</span>
              <span style={{ fontSize: '12px', color: M.textMuted, marginLeft: '10px' }}>
                {loading ? 'Loading…' : `${displayed.length} records · Updated ${lastUpdated || '—'}`}
              </span>
            </div>
            <button style={{
              padding: '7px 14px', borderRadius: '8px',
              border: `1px solid ${M.border}`, background: M.white,
              color: M.textSub, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              📤 Export
            </button>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 160px 180px 70px 160px',
            gap: '0', padding: '10px 16px', borderRadius: '10px 10px 0 0',
            background: M.surface, border: `1px solid ${M.border}`, borderBottom: 'none',
          }}>
            {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'WAIT', 'ACTION'].map(col => (
              <div key={col} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{col}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ border: `1px solid ${M.border}`, borderRadius: '0 0 14px 14px', overflow: 'hidden', background: M.white }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 160px 180px 70px 160px',
                    gap: '0', padding: '16px', borderBottom: i < 5 ? `1px solid ${M.border}` : 'none'
                  }}>
                    <div className="animate-shimmer" style={{ width: '40px', height: '20px', borderRadius: '4px' }} />
                    <div>
                      <div className="animate-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px', marginBottom: '6px' }} />
                      <div className="animate-shimmer" style={{ width: '80px', height: '12px', borderRadius: '4px' }} />
                    </div>
                    <div>
                      <div className="animate-shimmer" style={{ width: '100px', height: '14px', borderRadius: '4px', marginBottom: '6px' }} />
                      <div className="animate-shimmer" style={{ width: '60px', height: '12px', borderRadius: '4px' }} />
                    </div>
                    <div className="animate-shimmer" style={{ width: '100px', height: '20px', borderRadius: '100px' }} />
                    <div className="animate-shimmer" style={{ width: '30px', height: '16px', borderRadius: '4px' }} />
                    <div className="animate-shimmer" style={{ width: '80px', height: '30px', borderRadius: '8px' }} />
                  </div>
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>No tickets match the current filters</p>
                <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>Try adjusting the status or priority filters on the right.</p>
              </div>
            ) : (
              displayed.map(({ ticket, steps }, idx) => {
                const student = ticket.users
                const name    = student ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
                const sid     = student?.student_id || '—'
                const appt    = ticket.appointments
                const txName  = appt?.transaction_types?.name || 'Transaction'
                const pClass  = appt?.priority_class || 'regular'
                const statusCfg = STATUS_CFG[ticket.status] || STATUS_CFG.pending
                const isHighPrio = pClass === 'graduating' || pClass === 'pwd'
                const inProgressStep = steps?.find(s => s.status === 'in_progress')
                const confirmKey = inProgressStep ? `${ticket.id}-${inProgressStep.step_number}` : null
                const isConfirming = confirming === confirmKey
                const waitMins  = Math.floor(Math.random() * 20) + 5 // placeholder until API provides it

                return (
                  <div key={ticket.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 160px 180px 70px 160px',
                    gap: '0', padding: '16px',
                    borderBottom: idx < displayed.length - 1 ? `1px solid ${M.border}` : 'none',
                    background: ticket.status === 'in_progress' ? 'rgba(21,128,61,0.02)' : M.white,
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}>

                    {/* Queue No. */}
                    <div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 800, color: M.maroon, lineHeight: 1 }}>{ticket.queue_number}</div>
                      {isHighPrio && (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '100px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginTop: '4px', display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Priority
                        </span>
                      )}
                    </div>

                    {/* Student Details */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: M.text, marginBottom: '2px' }}>{name}</div>
                      <div style={{ fontSize: '11px', color: M.textMuted, fontFamily: 'monospace' }}>{sid}</div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '100px', textTransform: 'capitalize', background: M.goldLight, color: M.gold, border: `1px solid ${M.goldBorder}` }}>
                          {pClass}
                        </span>
                      </div>
                    </div>

                    {/* Transaction */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: M.text, lineHeight: 1.3 }}>{txName}</div>
                      <div style={{ fontSize: '11px', color: M.textMuted, marginTop: '2px' }}>{appt?.time_slot || '—'}</div>
                    </div>

                    {/* Status + Progress */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, whiteSpace: 'nowrap' }}>
                          {statusCfg.label}
                        </span>
                        {inProgressStep && <span style={{ fontSize: '11px', color: M.textMuted }}>Step {inProgressStep.step_number}</span>}
                      </div>
                      {steps && steps.length > 0 && (
                        <StepsBar steps={steps} current={ticket.current_step} total={ticket.total_steps} />
                      )}
                    </div>

                    {/* Wait */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: ticket.status === 'in_progress' ? M.green : M.textSub }}>{waitMins}m</div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {ticket.status === 'in_progress' && inProgressStep && (
                        <button
                          onClick={() => setViewingTicketId(ticket.id)}
                          style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none',
                            background: M.maroon,
                            color: M.white, fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            whiteSpace: 'nowrap',
                          }}
                        >
                          View Details
                        </button>
                      )}
                      {ticket.status === 'pending' && (
                        <button
                          onClick={() => handleConfirm(ticket.id, ticket.current_step)}
                          disabled={isConfirming}
                          style={{
                            padding: '8px 14px', borderRadius: '8px',
                            border: `1px solid ${M.gold}`,
                            background: M.goldLight, color: M.gold,
                            fontSize: '12px', fontWeight: 700,
                            cursor: isConfirming ? 'not-allowed' : 'pointer',
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Call Next
                        </button>
                      )}
                      {ticket.status === 'completed' && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: M.blue }}>✓ Done</span>
                      )}
                      {ticket.status === 'no_show' && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>No Show</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Completed section */}
          {done.length > 0 && !loading && (
            <div style={{ marginTop: '24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Completed Today — {done.length} tickets</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {done.map(({ ticket }) => (
                  <div key={ticket.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: '10px', background: M.white,
                    border: `1px solid ${M.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: M.textMuted, fontSize: '16px' }}>{ticket.queue_number}</span>
                      <span style={{ fontSize: '13px', color: M.textSub }}>{ticket.users?.last_name}, {ticket.users?.first_name}</span>
                      <span style={{ fontSize: '11px', color: M.textMuted }}>{ticket.appointments?.transaction_types?.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: M.blueLight, color: M.blue, border: `1px solid ${M.blueBorder}` }}>Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            highPriorityCount={highPrio.length}
            onReset={() => setFilters({ statuses: ['in_progress', 'pending'], priority: 'all', transactionType: 'all' })}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {viewingTicketId && (() => {
        const activeModalData = queue.find(q => q.ticket.id === viewingTicketId)
        if (!activeModalData) return null
        return (
          <QueueDetailsModal
            ticketData={activeModalData}
            onClose={() => setViewingTicketId(null)}
            onConfirm={(ticketId, stepNum) => handleConfirm(ticketId, stepNum)}
            confirming={confirming}
            onSetReleaseDate={handleSetReleaseDate}
          />
        )
      })()}

      {/* Shimmer CSS */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
