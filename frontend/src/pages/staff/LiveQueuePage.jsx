import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep, callTicket, sendToProcessing } from '../../services/queueService'
import { updateReleaseDate } from '../../services/adminService'
import { Check, Circle, Clock, X, Users, CheckSquare, AlertTriangle, Download, Inbox, Play, Ticket, DoorOpen, Cog } from 'lucide-react'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  in_progress: { label: 'Serving Now',  bg: 'bg-success-light',  color: 'text-success',  border: 'border-success-border'  },
  waiting:     { label: 'Waiting',      bg: 'bg-gold-light',   color: 'text-gold',   border: 'border-gold-border'   },
  pending:     { label: 'Pending',      bg: 'bg-gold-light',   color: 'text-gold',   border: 'border-gold-border'   },
  completed:   { label: 'Completed',    bg: 'bg-blue-light',   color: 'text-blue',   border: 'border-blue-border'   },
  no_show:     { label: 'No Show',      bg: 'bg-gray-50',     color: 'text-gray-500',border: 'border-gray-200'      },
  cancelled:   { label: 'Cancelled',    bg: 'bg-danger-light',    color: 'text-danger',    border: 'border-danger-border'    },
}

const fmt12h = (t) => {
  if (!t) return ''
  const parts = t.split(':')
  if (parts.length < 2) return t
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

// ── Small Stat Card ────────────────────────────────────────────────────────────
const MiniStat = ({ icon, value, label, sub, subColorClass = 'text-success', loading, delay }) => (
  <div className="animate-fade-up bg-white rounded-[14px] px-5 py-4.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-3 flex-1" style={{ animationDelay: delay || '0s' }}>
    <div className="flex items-start justify-between">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.06em] mt-1.5">{label}</div>
      <div className="w-9 h-9 rounded-[10px] bg-maroon-light flex items-center justify-center text-maroon shrink-0">
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-[28px] font-extrabold text-maroon leading-none m-0 min-h-7">
        {loading ? <div className="animate-pulse w-15 h-7 rounded-md bg-border" /> : value}
      </div>
      {sub && <div className={`text-[11px] font-semibold mt-1.5 ${subColorClass}`}>{sub}</div>}
    </div>
  </div>
)

// ── Progress Steps Bar ─────────────────────────────────────────────────────────
const StepsBar = ({ steps, current, total }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: total }).map((_, i) => {
      const stepNum = i + 1
      const done    = stepNum < current
      const active  = stepNum === current
      return (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-5.5 h-5.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${done ? 'bg-success text-white' : active ? 'bg-maroon text-white border-2 border-maroon-dark' : 'bg-border text-text-muted'}`}>
            {done ? <Check size={10} /> : stepNum}
          </div>
          {i < total - 1 && <div className={`w-3 h-0.5 rounded-[1px] ${done ? 'bg-success' : 'bg-border'}`} />}
        </div>
      )
    })}
  </div>
)

// ── Presence badge — shows whether a ticket's CURRENT step needs the
//    student physically at a counter, or is being worked on back-office ──
const PresenceBadge = ({ requiresPresence }) => (
  <span
    title={requiresPresence ? 'Student must be at the counter' : 'Back-office — no student presence needed'}
    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.03em]
      ${requiresPresence ? 'bg-maroon-light text-maroon' : 'bg-gray-100 text-gray-500'}`}
  >
    {requiresPresence ? <DoorOpen size={9} /> : <Cog size={9} />}
    {requiresPresence ? 'Counter' : 'Back office'}
  </span>
)

// ── Filter Sidebar ─────────────────────────────────────────────────────────────
const FilterBar = ({ filters, onChange, onReset }) => {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm px-6 py-5 flex flex-wrap items-center gap-5 animate-fade-up" style={{ animationDelay: '0.4s' }}>
      <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em] mr-2">Filters</div>
      
      {/* Status Dropdown */}
      <div className="flex-1 min-w-[160px]">
        <select
          value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-off-white text-[13px] text-text-main font-semibold outline-none cursor-pointer font-sans focus:border-maroon focus:ring-1 focus:ring-maroon transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center]"
        >
          <option value="active">Active (Serving & Waiting)</option>
          <option value="in_progress">Serving Now</option>
          <option value="pending">Pending</option>
          <option value="waiting">Waiting</option>
          <option value="completed">Completed</option>
          <option value="no_show">No Show</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All Statuses</option>
        </select>
      </div>

      {/* Priority Dropdown */}
      <div className="flex-1 min-w-[160px]">
        <select
          value={filters.priority}
          onChange={e => onChange({ ...filters, priority: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-off-white text-[13px] text-text-main font-semibold outline-none cursor-pointer font-sans focus:border-maroon focus:ring-1 focus:ring-maroon transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center]"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="regular">Regular Priority</option>
        </select>
      </div>

      {/* Transaction Type Dropdown */}
      <div className="flex-1 min-w-[160px]">
        <select
          value={filters.transactionType}
          onChange={e => onChange({ ...filters, transactionType: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-off-white text-[13px] text-text-main font-semibold outline-none cursor-pointer font-sans focus:border-maroon focus:ring-1 focus:ring-maroon transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center]"
        >
          <option value="all">All Transactions</option>
          <option value="TOR">Transcript of Records</option>
          <option value="COE">Certificate of Enrollment</option>
          <option value="Diploma">Diploma Release</option>
          <option value="GWA">General Weighted Average</option>
          <option value="Completion Form">Completion Form</option>
        </select>
      </div>

      <button onClick={onReset} className="px-5 py-2.5 rounded-xl border border-border bg-white text-text-main text-[13px] font-bold cursor-pointer font-sans hover:bg-surface hover:border-maroon-border hover:text-maroon transition-colors shadow-sm whitespace-nowrap">
        Reset
      </button>
    </div>
  )
}

// ── Queue Details Modal ────────────────────────────────────────────────────────
const QueueDetailsModal = ({ ticketData, onClose, onConfirm, onSendToProcessing, confirming, onSetReleaseDate }) => {
  const { ticket, steps } = ticketData
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  
  const [releaseDate, setReleaseDate] = useState(appt?.release_date || '')
  const [savingDate, setSavingDate] = useState(false)

  return createPortal((
    <div className="fixed inset-0 z-1000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-170 bg-white rounded-3xl p-7 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-[0.08em] mb-1.5">Queue Details</div>
            <h2 className="font-serif text-[28px] font-extrabold text-maroon m-0 leading-none">{ticket.queue_number}</h2>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-muted flex items-center justify-center hover:text-text-main transition-colors"><X size={24} /></button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3.5 mb-7">
          <div className="p-4 bg-surface rounded-[14px] border border-border">
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-[0.04em] mb-1.5">Student</div>
            <div className="text-[15px] font-bold text-text-main mb-0.5">{name}</div>
            <div className="text-[13px] text-text-sub font-mono">{student?.student_id || '—'}</div>
          </div>
          <div className="p-4 bg-surface rounded-[14px] border border-border">
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-[0.04em] mb-1.5">Transaction</div>
            <div className="text-[14px] font-semibold text-text-main leading-snug">{appt?.transaction_types?.name}</div>
          </div>
        </div>

        {/* Release Date */}
        <div className="mb-7 bg-off-white p-4 rounded-[14px] border border-border flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-50">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.04em] mb-1.5">Document Release Date</label>
            <input 
              type="date" 
              value={releaseDate} 
              onChange={e => setReleaseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm outline-none text-text-main font-sans focus:border-maroon transition-colors"
            />
          </div>
          <button 
            onClick={async () => {
              setSavingDate(true)
              await onSetReleaseDate(appt?.id, releaseDate)
              setSavingDate(false)
            }}
            disabled={savingDate || releaseDate === (appt?.release_date || '')}
            className={`px-4.5 py-2.5 rounded-lg border-none text-[13px] font-bold h-10.5 font-sans whitespace-nowrap transition-colors
              ${(savingDate || releaseDate === (appt?.release_date || '')) 
                ? 'bg-border text-text-muted cursor-not-allowed' 
                : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}
            `}
          >
            {savingDate ? 'Saving...' : 'Set Date'}
          </button>
        </div>

        {/* Steps */}
        <div>
          <h3 className="text-sm font-bold text-text-main uppercase tracking-[0.06em] mb-5">Processing Steps</h3>
          <div className="flex flex-col gap-0">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1
              const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
              const confirmKey = `${ticket.id}-${step.step_number}`
              const isConfirming = confirming === confirmKey
              
              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold
                      ${step.status === 'completed' ? 'bg-success text-white' : 
                        step.status === 'in_progress' ? 'bg-gold text-white border-2 border-gold-border' : 
                        'bg-border text-text-muted'}`}
                    >
                      {step.status === 'completed' ? <Check size={14} /> : step.step_number}
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 min-h-9 my-1 ${step.status === 'completed' ? 'bg-success' : 'bg-border'}`} />}
                  </div>
                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                    <div className={`flex justify-between items-center rounded-xl ${isCurrent ? 'bg-gold-light p-3 border border-gold-border -mt-1.5' : 'bg-transparent py-1.5 border-none mt-0'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className={`text-[15px] font-semibold ${step.status === 'completed' ? 'text-success' : 'text-text-main'}`}>{step.step_name}</div>
                          <PresenceBadge requiresPresence={step.requires_presence !== false} />
                        </div>
                        {step.status === 'completed' && step.confirmed_at && (
                          <div className="text-xs text-text-muted mt-0.5">Confirmed at {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                        )}
                        {isCurrent && (
                          <div className="text-xs text-gold mt-0.5 font-semibold">
                            {step.requires_presence !== false ? 'Active Step — student at counter' : 'Active Step — processing, no line'}
                          </div>
                        )}
                      </div>
                      {isCurrent && (
                        <div className="flex items-center gap-2">
                          {step.location !== 'Back Office' && (
                            <button
                              onClick={() => onSendToProcessing(ticket.id)}
                              disabled={isConfirming}
                              className={`px-4 py-2.5 rounded-[10px] border-none text-[13px] font-bold font-sans transition-colors
                                ${isConfirming ? 'bg-gray-200 text-text-muted cursor-not-allowed' : 'bg-surface text-text-main cursor-pointer hover:bg-border'}
                              `}
                            >
                              Send to Processing
                            </button>
                          )}
                          <button
                            onClick={() => onConfirm(ticket.id, step.step_number)}
                            disabled={isConfirming}
                            className={`px-4.5 py-2.5 rounded-[10px] border-none text-[13px] font-bold font-sans transition-colors
                              ${isConfirming ? 'bg-maroon/50 text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}
                            `}
                          >
                            {isConfirming ? 'Confirming...' : 'Confirm Step'}
                          </button>
                        </div>
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
  ), document.body)
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
  const [filters, setFilters]   = useState({ status: 'active', priority: 'all', transactionType: 'all' })
  const [viewingTicketId, setViewingTicketId] = useState(null)

  const availableTxTypes = useMemo(() => {
    const types = new Set()
    queue.forEach(q => {
      const name = q.ticket.appointments?.transaction_types?.name
      if (name) types.add(name)
    })
    return Array.from(types).sort()
  }, [queue])

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      setQueue(await getTodaysQueue(token))
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 5000)
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

  const handleCallTicket = async (ticketId) => {
    setConfirming(ticketId); setError('')
    try { 
      await callTicket(token, ticketId)
      await fetchQueue()
      setViewingTicketId(ticketId) // automatically open details modal
    }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  const handleSendToProcessing = async (ticketId) => {
    setConfirming(ticketId); setError('')
    try { 
      await sendToProcessing(token, ticketId)
      await fetchQueue()
      setViewingTicketId(null) // close modal on success
    }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  // ── Derived stats ──
  const active    = queue.filter(q => q.ticket.status !== 'completed')
  const done      = queue.filter(q => q.ticket.status === 'completed')
  const serving   = queue.filter(q => q.ticket.status === 'in_progress')
  const waiting   = queue.filter(q => q.ticket.status === 'pending' || q.ticket.status === 'waiting')
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
    let statusOk = false
    if (filters.status === 'active') {
      statusOk = ['in_progress', 'pending', 'waiting'].includes(ticket.status)
    } else if (filters.status === 'all') {
      statusOk = true
    } else {
      statusOk = ticket.status === filters.status
    }

    const prioOk = filters.priority === 'all'
      || (filters.priority === 'high' && (ticket.appointments?.priority_class === 'graduating' || ticket.appointments?.priority_class === 'pwd'))
      || (filters.priority === 'regular' && ticket.appointments?.priority_class === 'regular')
    const txOk = filters.transactionType === 'all'
      || (ticket.appointments?.transaction_types?.name || '').includes(filters.transactionType)
    const name = `${ticket.users?.first_name} ${ticket.users?.last_name}`.toLowerCase()
    const srchOk = !search || name.includes(search.toLowerCase()) || ticket.queue_number.toLowerCase().includes(search.toLowerCase())
    return statusOk && prioOk && txOk && srchOk
  })

  // ── Split into "At the Counter" (physical line) vs "Processing" (back office) ──
  // A ticket belongs in "At the Counter" if its CURRENT active step requires
  // the student to be physically present. Otherwise it's sitting quietly in
  // back-office processing — no one is standing in line for it.
  // Completed tickets are excluded here since they already have their own section.
  const getRequiresPresence = (steps) => {
    const current = steps?.find(s => s.status === 'in_progress')
    if (current?.location === 'Back Office') return false
    return current?.requires_presence !== false // default true if missing/undefined
  }
  const nonCompleted    = displayed.filter(({ ticket }) => ticket.status !== 'completed')
  const atCounter       = nonCompleted.filter(({ steps }) => getRequiresPresence(steps))
  const processingQueue = nonCompleted.filter(({ steps }) => !getRequiresPresence(steps))

  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // ── Reusable row renderer — used by both "At the Counter" and "Processing" tables ──
  const renderQueueRow = ({ ticket, steps }, idx, arrLength, actionLabel = 'Confirm') => {
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
    
    let waitMins = 0
    if (ticket.created_at) {
      waitMins = Math.max(0, Math.floor((now.getTime() - new Date(ticket.created_at).getTime()) / 60000))
    } else {
      waitMins = Math.max(3, (idx + 1) * 5)
    }

    return (
      <div key={ticket.id} className={`grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 p-4 items-center transition-colors duration-150
        ${idx < arrLength - 1 ? 'border-b border-border' : ''}
        ${ticket.status === 'in_progress' ? 'bg-success-light/30' : 'bg-white hover:bg-off-white/50'}
      `}>

        {/* Queue No. */}
        <div>
          <div className="font-serif text-[20px] font-extrabold text-maroon leading-none">{ticket.queue_number}</div>
          {isHighPrio && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border mt-1 inline-block uppercase tracking-[0.04em]">
              Priority
            </span>
          )}
        </div>

        {/* Student Details */}
        <div>
          <div className="text-[13px] font-semibold text-text-main mb-0.5">{name}</div>
          <div className="text-[11px] text-text-muted font-mono">{sid}</div>
          <div className="mt-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-gold-light text-gold border border-gold-border">
              {pClass}
            </span>
          </div>
        </div>

        {/* Transaction */}
        <div>
          <div className="text-xs font-semibold text-text-main leading-snug">{txName}</div>
          <div className="text-[11px] text-text-muted mt-0.5">{fmt12h(appt?.time_slot) || '—'}</div>
        </div>

        {/* Status + Progress */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              {statusCfg.label}
            </span>
            {inProgressStep && <span className="text-[11px] text-text-muted">Step {inProgressStep.step_number}</span>}
            {inProgressStep?.location && inProgressStep.location.startsWith('Window') && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-maroon-light text-maroon border border-maroon-border uppercase tracking-wide">
                {inProgressStep.location}
              </span>
            )}
            {inProgressStep && <PresenceBadge requiresPresence={inProgressStep.requires_presence !== false && inProgressStep.location !== 'Back Office'} />}
          </div>
          {steps && steps.length > 0 && (
            <StepsBar steps={steps} current={ticket.current_step} total={ticket.total_steps} />
          )}
        </div>

        {/* Wait */}
        <div>
          <div className={`text-sm font-bold ${ticket.status === 'in_progress' ? 'text-success' : 'text-text-sub'}`}>{waitMins}m</div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(ticket.status === 'in_progress' || ticket.status === 'waiting' || ticket.status === 'pending') && inProgressStep && (
            <>
              {ticket.status === 'waiting' || ticket.status === 'pending' ? (
                <button
                  onClick={() => handleCallTicket(ticket.id)}
                  disabled={confirming === ticket.id}
                  className={`px-3.5 py-2 rounded-lg border text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap transition-all shadow-sm hover:-translate-y-0.5
                    ${confirming === ticket.id
                      ? 'border-border bg-off-white text-text-muted cursor-not-allowed'
                      : 'border-blue-border bg-blue-light text-blue hover:bg-blue hover:text-white'}
                  `}
                >
                  {confirming === ticket.id ? '...' : 'Call'}
                </button>
              ) : (
                <button
                  onClick={() => handleConfirm(ticket.id, ticket.current_step)}
                  disabled={isConfirming}
                  className={`px-3.5 py-2 rounded-lg border text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap transition-all shadow-sm hover:-translate-y-0.5
                    ${isConfirming
                      ? 'border-border bg-off-white text-text-muted cursor-not-allowed'
                      : 'border-maroon-border bg-maroon-light text-maroon hover:bg-maroon hover:text-white'}
                  `}
                >
                  {isConfirming ? '...' : actionLabel}
                </button>
              )}
              <button
                onClick={() => setViewingTicketId(ticket.id)}
                className="px-3.5 py-2 rounded-lg border-none bg-surface border-border text-text-main text-xs font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-off-white transition-colors"
              >
                Details
              </button>
            </>
          )}
          {ticket.status === 'completed' && (
            <span className="text-xs font-semibold text-blue flex items-center gap-1"><Check size={12} /> Done</span>
          )}
          {ticket.status === 'no_show' && (
            <span className="text-xs font-semibold text-gray-500">No Show</span>
          )}
        </div>
      </div>
    )
  }

  const columnHeaders = ['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'WAIT', 'ACTION']

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Real-Time</p>
          <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
            <Ticket size={24} className="text-maroon" /> Live Queue Management
          </h1>
          <p className="text-[12px] text-text-sub mt-2 mb-0">
            Monitor and manage the active flow of student transactions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Current time */}
          <div className="bg-white border border-border shadow-sm text-text-main px-4 py-2.25 rounded-xl text-[15px] font-bold font-sans flex items-center gap-2 mt-8">
            <Clock size={18} strokeWidth={2.5} className="text-maroon" />
            {currentTime}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="flex gap-3.5">
        <MiniStat 
          icon={<Clock size={20} />} 
          value={`${avgWait}m`} 
          label="Average Wait Time" 
          sub={avgWait > 15 ? "↑ Higher than avg" : "Fast processing"} 
          subColorClass={avgWait > 15 ? 'text-orange' : 'text-text-muted'} 
          loading={loading} delay="0.1s"
        />
        <MiniStat icon={<Users size={20} />} value={waiting.length} label="Waiting in Queue" sub={`${serving.length} serving now`} subColorClass="text-text-muted" loading={loading} delay="0.2s" />
        <MiniStat icon={<CheckSquare size={20} />} value={done.length} label="Total Serviced" sub={done.length >= 80 ? 'High volume — Important' : 'Normal volume'} subColorClass={done.length >= 80 ? 'text-danger' : 'text-text-muted'} loading={loading} delay="0.3s" />
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ status: 'active', priority: 'all', transactionType: 'all' })}
      />

      {error && (
        <div className="px-4 py-3 rounded-[10px] bg-danger-light border border-danger-border text-danger text-[13px] flex items-center">
          <AlertTriangle size={13} className="mr-1" /> {error}
        </div>
      )}

      {/* ── Main content: Table + Filter ── */}
      <div className="flex gap-5 items-start">

        {/* Queue Tables */}
        <div className="animate-fade-up flex-1 min-w-0" style={{ animationDelay: '0.4s' }}>

          {/* ═══ AT THE COUNTER — real physical line, call these in order ═══ */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <span className="text-[16px] font-serif font-bold text-text-main flex items-center gap-2">
                <DoorOpen size={17} className="text-maroon" /> At the Counter
              </span>
              <span className="text-xs text-text-muted ml-6.25 block mt-0.5">
                Students physically waiting — call these in order
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 px-4 py-2.5 rounded-t-[10px] bg-surface border border-b-0 border-border">
            {columnHeaders.map(col => (
              <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
            ))}
          </div>

          <div className="border border-border rounded-b-[14px] overflow-hidden bg-white">
            {loading ? (
              <div className="flex flex-col">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 p-4 ${i < 3 ? 'border-b border-border' : ''}`}>
                    <div className="animate-pulse w-10 h-5 rounded bg-border" />
                    <div>
                      <div className="animate-pulse w-30 h-3.5 rounded bg-border mb-1.5" />
                      <div className="animate-pulse w-20 h-3 rounded bg-border" />
                    </div>
                    <div>
                      <div className="animate-pulse w-25 h-3.5 rounded bg-border mb-1.5" />
                      <div className="animate-pulse w-15 h-3 rounded bg-border" />
                    </div>
                    <div className="animate-pulse w-25 h-5 rounded-full bg-border" />
                    <div className="animate-pulse w-7.5 h-4 rounded bg-border" />
                    <div className="animate-pulse w-20 h-7 rounded-lg bg-border" />
                  </div>
                ))}
              </div>
            ) : atCounter.length === 0 ? (
              <div className="p-10 text-center">
                <div className="flex justify-center text-text-muted mb-2.5"><DoorOpen size={32} /></div>
                <p className="text-sm font-semibold text-text-main m-0 mb-1">No one at the counter right now</p>
                <p className="text-[13px] text-text-muted m-0">Students will appear here when they need to be physically served.</p>
              </div>
            ) : (
              atCounter.map((item, idx) => renderQueueRow(item, idx, atCounter.length, 'Call Next'))
            )}
          </div>

          {!loading && atCounter.length > 0 && (
            <div className="mt-4 text-right px-2">
              <span className="text-[12px] font-bold text-text-muted tracking-wide">
                {atCounter.length} at the counter · Updated {lastUpdated || '—'}
              </span>
            </div>
          )}

          {/* ═══ PROCESSING — back office, no line, work at own pace ═══ */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <span className="text-base font-serif font-bold text-text-main flex items-center gap-2">
                  <Cog size={17} className="text-text-muted" /> Processing
                </span>
                <span className="text-xs text-text-muted ml-6 block mt-0.5">
                  No one is waiting for these — work through them whenever you're free
                </span>
              </div>
            </div>

            {!loading && processingQueue.length > 0 && (
              <div className="grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 px-4 py-2.5 rounded-t-[10px] bg-surface border border-b-0 border-border opacity-80">
                {columnHeaders.map(col => (
                  <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                ))}
              </div>
            )}

            <div className="border border-border rounded-b-[14px] overflow-hidden bg-white opacity-90">
              {loading ? (
                <div className="p-6 text-center text-xs text-text-muted">Loading…</div>
              ) : processingQueue.length === 0 ? (
                <div className="p-8 text-center border border-border rounded-[14px]">
                  <div className="flex justify-center text-text-muted mb-2"><Cog size={28} /></div>
                  <p className="text-sm font-semibold text-text-main m-0 mb-1">Nothing in back-office processing</p>
                  <p className="text-[13px] text-text-muted m-0">Tickets land here after being submitted, before release.</p>
                </div>
              ) : (
                processingQueue.map((item, idx) => renderQueueRow(item, idx, processingQueue.length, 'Mark Complete'))
              )}
            </div>
          </div>

          {/* Completed section */}
          {done.length > 0 && !loading && (
            <div className="mt-6">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-2.5">Completed Today — {done.length} tickets</p>
              <div className="flex flex-col gap-1.5">
                {done.map(({ ticket }) => (
                  <div key={ticket.id} className="flex items-center justify-between px-4 py-3 rounded-[10px] bg-white border border-border hover:border-maroon-border transition-colors">
                    <div className="flex items-center gap-3.5">
                      <span className="font-serif font-bold text-text-muted text-[16px]">{ticket.queue_number}</span>
                      <span className="text-[13px] text-text-sub">{ticket.users?.last_name}, {ticket.users?.first_name}</span>
                      <span className="text-[11px] text-text-muted">{ticket.appointments?.transaction_types?.name}</span>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-light text-blue border border-blue-border">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {viewingTicketId && queue.find(q => q.ticket.id === viewingTicketId) && (
        <QueueDetailsModal 
          ticketData={queue.find(q => q.ticket.id === viewingTicketId)} 
          onClose={() => setViewingTicketId(null)} 
          onConfirm={handleConfirm}
          onSendToProcessing={handleSendToProcessing}
          confirming={confirming}
          onSetReleaseDate={handleSetReleaseDate}
        />
      )}

    </div>
  )
}