import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep, callTicket, sendToProcessing, remindStudent } from '../../services/queueService'
import { updateReleaseDate } from '../../services/adminService'
import { Check, Circle, Clock, X, Users, CheckSquare, AlertTriangle, Download, Inbox, Play, Ticket, DoorOpen, Cog } from 'lucide-react'
import QueueDetailsModal from '../../components/QueueDetailsModal'

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

const MiniStat = ({ icon, value, label, sub, subColorClass = 'text-text-muted', loading, delay = '0s' }) => (
  <div className="flex-1 bg-white rounded-[14px] border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] px-5 py-4.5 flex flex-col gap-3 animate-fade-up" style={{ animationDelay: delay }}>
    <div className="flex items-start justify-between">
      <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] mt-1.5">{label}</div>
      <div className="w-9 h-9 rounded-[10px] bg-maroon-light flex items-center justify-center text-maroon shrink-0">
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-[28px] font-extrabold text-text-main leading-none m-0 min-h-7">
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


// ── Filter Sidebar ─────────────────────────────────────────────────────────────
const FilterBar = ({ filters, onChange, onReset }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] px-5 py-4 flex flex-wrap items-center gap-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
      <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em] mr-2 flex items-center gap-1.5"><Cog size={14} /> Filters</div>
      
      {/* Status Dropdown */}
      <div className="flex-1 min-w-37.5">
        <select
          value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value })}
          className="w-full px-4 py-2 rounded-full border border-border bg-white text-[12.5px] text-text-main font-semibold outline-none cursor-pointer font-sans hover:border-maroon-border focus:border-maroon focus:ring-2 focus:ring-maroon/20 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[calc(100%-12px)_center]"
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
      <div className="flex-1 min-w-37.5">
        <select
          value={filters.priority}
          onChange={e => onChange({ ...filters, priority: e.target.value })}
          className="w-full px-4 py-2 rounded-full border border-border bg-white text-[12.5px] text-text-main font-semibold outline-none cursor-pointer font-sans hover:border-maroon-border focus:border-maroon focus:ring-2 focus:ring-maroon/20 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[calc(100%-12px)_center]"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="regular">Regular Priority</option>
        </select>
      </div>

      {/* Transaction Type Dropdown */}
      <div className="flex-1 min-w-37.5">
        <select
          value={filters.transactionType}
          onChange={e => onChange({ ...filters, transactionType: e.target.value })}
          className="w-full px-4 py-2 rounded-full border border-border bg-white text-[12.5px] text-text-main font-semibold outline-none cursor-pointer font-sans hover:border-maroon-border focus:border-maroon focus:ring-2 focus:ring-maroon/20 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[calc(100%-12px)_center]"
        >
          <option value="all">All Transactions</option>
          <option value="TOR">Transcript of Records</option>
          <option value="COE">Certificate of Enrollment</option>
          <option value="Diploma">Diploma Release</option>
          <option value="GWA">General Weighted Average</option>
          <option value="Completion Form">Completion Form</option>
        </select>
      </div>

      <button onClick={onReset} className="px-5 py-2 rounded-full border border-border bg-off-white text-text-main text-[12.5px] font-bold cursor-pointer font-sans hover:bg-white hover:border-maroon-border hover:text-maroon hover:shadow-sm transition-all whitespace-nowrap">
        Reset
      </button>
    </div>
  )
}

// ── Main LiveQueuePage ─────────────────────────────────────────────────────────
export default function LiveQueuePage() {
  const { token } = useAuth()
  const [queue, setQueue]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [reminding, setReminding] = useState(null)
  const [error, setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow]           = useState(new Date())
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState({ status: 'active', priority: 'all', transactionType: 'all' })
  const [viewingTicketId, setViewingTicketId] = useState(null)
  const [completedPage, setCompletedPage] = useState(1)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

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

  const handleConfirm = async (ticketId, stepNum, txName, studentName, confirmLabel, releaseDateToSet) => {
    const key = `${ticketId}-${stepNum}`
    setConfirming(key); setError('')
    try { 
      await confirmStep(token, ticketId, stepNum)
      
      if (releaseDateToSet) {
        const ticketItem = queue.find(q => q.ticket.id === ticketId)
        if (ticketItem && ticketItem.ticket.appointments?.id) {
          await updateReleaseDate(token, ticketItem.ticket.appointments.id, releaseDateToSet)
        }
      }

      await fetchQueue()
      if (confirmLabel === 'Mark as Done') {
        showToast(`${txName} for ${studentName} is successfully done`)
      } else {
        showToast(`Step ${stepNum} for ${studentName} is confirmed`)
      }
    }
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

  const handleSendToProcessing = async (ticketId, txName, studentName, releaseDateToSet) => {
    setConfirming(ticketId); setError('')
    try { 
      await sendToProcessing(token, ticketId)
      
      if (releaseDateToSet) {
        const ticketItem = queue.find(q => q.ticket.id === ticketId)
        if (ticketItem && ticketItem.ticket.appointments?.id) {
          await updateReleaseDate(token, ticketItem.ticket.appointments.id, releaseDateToSet)
        }
      }

      await fetchQueue()
      showToast(`${txName} for ${studentName} is being moved for processing`)
    }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  const handleRemind = async (ticketId) => {
    setReminding(ticketId); setError('')
    try { 
      await remindStudent(token, ticketId)
      // fetchQueue() isn't strictly necessary for a notification, but keeps UI synced
    }
    catch (e) { setError(e.message) }
    finally { setReminding(null) }
  }

  // ── Derived stats ──
  const active    = queue.filter(q => q.ticket.status !== 'completed')
  const done      = queue.filter(q => q.ticket.status === 'completed')
  const serving   = queue.filter(q => q.ticket.status === 'in_progress')
  const waiting   = queue.filter(q => q.ticket.status === 'pending' || q.ticket.status === 'waiting')
  const highPrio  = queue.filter(q => {
    const pc = q.ticket.appointments?.priority_class
    return pc === 'graduating' || pc === 'pwd' || pc === 'pregnant'
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
      || (filters.priority === 'high' && (ticket.appointments?.priority_class === 'graduating' || ticket.appointments?.priority_class === 'pwd' || ticket.appointments?.priority_class === 'pregnant'))
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
  const renderQueueRow = ({ ticket, steps }, idx, arrLength, actionLabel = 'Confirm', showWait = true) => {
    const student = ticket.users
    const name    = student ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
    const sid     = student?.student_id || '—'
    const appt    = ticket.appointments
    const txName  = appt?.transaction_types?.name || 'Transaction'
    const pClass  = appt?.priority_class || 'regular'
    const statusCfg = STATUS_CFG[ticket.status] || STATUS_CFG.pending
    const isHighPrio = pClass === 'graduating' || pClass === 'pwd' || pClass === 'pregnant'
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
      <div key={ticket.id} className={`grid ${showWait ? 'grid-cols-[110px_1.2fr_1.2fr_220px_70px_160px]' : 'grid-cols-[110px_1.2fr_1.2fr_220px_160px]'} gap-0 px-5 py-4 items-center transition-all duration-300
        ${idx < arrLength - 1 ? 'border-b border-border/60' : ''}
        ${ticket.status === 'in_progress' ? 'bg-success-light/30' : 'bg-white hover:bg-off-white/80 hover:shadow-sm hover:-translate-y-px'}
      `}>

        {/* Queue No. */}
        <div>
          <div className="font-serif text-[20px] font-extrabold text-maroon leading-none">{ticket.queue_number}</div>
          {isHighPrio && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border mt-1 inline-block uppercase tracking-[0.04em]">
              Priority
            </span>
          )}
          {ticket.status === 'in_progress' && inProgressStep?.location && (
            <div className="text-[11px] font-bold text-text-sub mt-1.5 flex items-center gap-1 uppercase tracking-[0.04em]">
              {inProgressStep.location} serving
            </div>
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
          {!getRequiresPresence(steps) && (
            <div className="text-[12px] font-bold text-maroon mt-1.5">
              Release: {appt?.release_date ? new Date(appt.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
            </div>
          )}
        </div>

        {/* Status + Progress */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              {statusCfg.label}
            </span>
            {inProgressStep && <span className="text-[11px] text-text-muted">Step {inProgressStep.step_number}</span>}
          </div>
          {steps && steps.length > 0 && (
            <StepsBar steps={steps} current={ticket.current_step} total={ticket.total_steps} />
          )}
        </div>

        {/* Wait */}
        {showWait && (
          <div>
            <div className={`text-sm font-bold ${ticket.status === 'in_progress' ? 'text-success' : 'text-text-sub'}`}>{waitMins}m</div>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {(ticket.status === 'in_progress' || ticket.status === 'waiting' || ticket.status === 'pending') && inProgressStep && (
            <>
              {ticket.status === 'waiting' || ticket.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleCallTicket(ticket.id)}
                    disabled={confirming === ticket.id}
                    className={`px-4 py-2 rounded-full border text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap transition-all shadow-sm hover:-translate-y-0.5
                      ${confirming === ticket.id
                        ? 'border-border bg-off-white text-text-muted cursor-not-allowed'
                        : 'border-blue-border bg-blue-light text-blue hover:bg-blue hover:text-white'}
                    `}
                  >
                    {confirming === ticket.id ? '...' : 'Call'}
                  </button>
                  <button
                    onClick={() => setViewingTicketId(ticket.id)}
                    className="px-4 py-2 rounded-full border border-border bg-white text-text-main text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-surface transition-all shadow-sm hover:-translate-y-0.5"
                  >
                    Details
                  </button>
                </>
              ) : (
                <>
                  {!getRequiresPresence(steps) && (
                    <button
                      onClick={() => handleRemind(ticket.id)}
                      disabled={reminding === ticket.id}
                      className={`px-4 py-2 rounded-full border text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap transition-all shadow-sm hover:-translate-y-0.5 mr-1.5
                        ${reminding === ticket.id
                          ? 'border-border bg-off-white text-text-muted cursor-not-allowed'
                          : 'border-gold-border bg-gold-light text-gold hover:bg-gold hover:text-white'}
                      `}
                    >
                      {reminding === ticket.id ? '...' : 'Remind Student'}
                    </button>
                  )}
                  <button
                    onClick={() => setViewingTicketId(ticket.id)}
                    className="px-4 py-2 rounded-full border border-maroon-border bg-maroon-light text-maroon text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-maroon hover:text-white transition-all shadow-sm hover:-translate-y-0.5"
                  >
                    View Progress
                  </button>
                </>
              )}
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

          <div className="grid grid-cols-[110px_1.2fr_1.2fr_220px_70px_160px] gap-0 px-5 py-3 rounded-t-2xl bg-surface/50 backdrop-blur-sm border border-b-0 border-border">
            {columnHeaders.map(col => (
              <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
            ))}
          </div>

          <div className="border border-border rounded-b-2xl overflow-hidden bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            {loading ? (
              <div className="flex flex-col">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`grid grid-cols-[110px_1.2fr_1.2fr_220px_70px_160px] gap-0 p-4 ${i < 3 ? 'border-b border-border' : ''}`}>
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
                  This is where the processing is done — work through them before the release date
                </span>
              </div>
            </div>

            {!loading && processingQueue.length > 0 && (
              <div className="grid grid-cols-[110px_1.2fr_1.2fr_220px_160px] gap-0 px-5 py-3 rounded-t-2xl bg-surface/50 backdrop-blur-sm border border-b-0 border-border opacity-80">
                {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'ACTION'].map(col => (
                  <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                ))}
              </div>
            )}

            <div className="border border-border rounded-b-2xl overflow-hidden bg-white opacity-90 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
              {loading ? (
                <div className="p-6 text-center text-xs text-text-muted">Loading…</div>
              ) : processingQueue.length === 0 ? (
                <div className="p-8 text-center border border-border rounded-[14px]">
                  <div className="flex justify-center text-text-muted mb-2"><Cog size={28} /></div>
                  <p className="text-sm font-semibold text-text-main m-0 mb-1">Nothing in back-office processing</p>
                  <p className="text-[13px] text-text-muted m-0">Tickets land here after being submitted, before release.</p>
                </div>
              ) : (
                processingQueue.map((item, idx) => renderQueueRow(item, idx, processingQueue.length, 'Mark Complete', false))
              )}
            </div>
          </div>

          {/* Completed section */}
          {done.length > 0 && !loading && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0">Completed Today — {done.length} tickets</p>
                {done.length > 10 && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-text-muted">
                      Showing {(completedPage - 1) * 10 + 1}-{Math.min(completedPage * 10, done.length)} / {done.length}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                        disabled={completedPage === 1}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-surface text-text-main border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border transition-colors cursor-pointer"
                      >
                        Prev
                      </button>
                      <button 
                        onClick={() => setCompletedPage(p => Math.min(Math.ceil(done.length / 10), p + 1))}
                        disabled={completedPage >= Math.ceil(done.length / 10)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-surface text-text-main border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border transition-colors cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {done.slice((completedPage - 1) * 10, completedPage * 10).map(({ ticket }) => (
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

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3.5 rounded-full shadow-[0_8px_30px_rgba(34,197,94,0.4)] border border-green-500 z-2000 animate-fade-down font-sans text-[14.5px] font-bold flex items-center gap-3 whitespace-nowrap">
          <div className="bg-white text-success rounded-full p-0.5">
            <Check size={14} strokeWidth={4} />
          </div>
          {toastMsg}
        </div>
      )}

    </div>
  )
}