import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { useToast } from '../../context/ToastContext'
import { getTodaysQueue, confirmStep, callTicket, remindStudent, getLiveQueueStats } from '../../services/queueService'
import { updateReleaseDate } from '../../services/adminService'
import { getTransactionTypes } from '../../services/appointmentService'
import { Check, CheckCircle2, Circle, Clock, X, Users, CheckSquare, AlertTriangle, Download, Inbox, Play, Ticket, DoorOpen, Cog, ChevronDown, SlidersHorizontal, FolderOpen } from 'lucide-react'
import QueueDetailsModal from '../../components/QueueDetailsModal'

// ── Helper to determine whether student presence is required ──────────────────
const getRequiresPresence = (steps) => {
  const current = steps?.find(s => s.status === 'in_progress') || steps?.[0]
  if (!current) return false
  const stepName = (current.step_name || '').toLowerCase()
  const location = (current.location || '').toLowerCase()
  if (
    stepName.includes('preparation') ||
    stepName.includes('release') ||
    stepName.includes('claim') ||
    stepName.includes('pickup') ||
    location === 'back office' ||
    location.includes('release')
  ) {
    return false
  }
  return current.requires_presence !== false // default true if missing/undefined
}

// ── Helper to resolve the actual document / workflow status ───────────────────
const getDocStatusConfig = (ticket, steps) => {
  if (!ticket) {
    return { label: 'Pending', bg: 'bg-gold-light', color: 'text-gold', border: 'border-gold-border' }
  }

  if (ticket.status === 'completed') {
    return { label: 'Completed', bg: 'bg-blue-light', color: 'text-blue', border: 'border-blue-border' }
  }
  if (ticket.status === 'cancelled') {
    return { label: 'Cancelled', bg: 'bg-danger-light', color: 'text-danger', border: 'border-danger-border' }
  }
  if (ticket.status === 'no_show') {
    return { label: 'No Show', bg: 'bg-gray-50', color: 'text-gray-500', border: 'border-gray-200' }
  }

  const currentStep = steps?.find(s => s.status === 'in_progress') || steps?.[ticket.current_step - 1]
  const stepNameLower = (currentStep?.step_name || '').toLowerCase()
  const locLower = (currentStep?.location || '').toLowerCase()

  if (ticket.status === 'in_progress') {
    // 1. Ready for Pickup / Release
    if (
      stepNameLower.includes('release') ||
      stepNameLower.includes('claim') ||
      stepNameLower.includes('pickup') ||
      locLower.includes('release')
    ) {
      return { label: 'Ready for Pickup', bg: 'bg-success-light', color: 'text-success', border: 'border-success-border' }
    }

    // 2. Document Prepared / Dry Seal / Signing
    if (
      stepNameLower.includes('document prepared') ||
      stepNameLower.includes('document ready') ||
      stepNameLower.includes('dry seal') ||
      stepNameLower.includes('signing')
    ) {
      return { label: 'Document Prepared', bg: 'bg-gold-light', color: 'text-gold-dark', border: 'border-gold-border' }
    }

    // 3. Processing / Verification / Preparation
    if (
      stepNameLower.includes('preparation') ||
      stepNameLower.includes('verification') ||
      stepNameLower.includes('records') ||
      stepNameLower.includes('filing') ||
      stepNameLower.includes('printing') ||
      stepNameLower.includes('evaluat') ||
      locLower === 'back office' ||
      currentStep?.requires_presence === false
    ) {
      return { label: 'In Processing', bg: 'bg-gold-light', color: 'text-gold-dark', border: 'border-gold-border' }
    }

    // 4. Serving at Counter Window
    return { label: 'Serving Now', bg: 'bg-success-light', color: 'text-success', border: 'border-success-border' }
  }

  // Waiting / Pending
  const isCounter = getRequiresPresence(steps)
  return {
    label: isCounter ? 'Waiting' : 'In Processing Queue',
    bg: 'bg-gold-light',
    color: 'text-gold',
    border: 'border-gold-border'
  }
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
  <div className="flex-1 bg-white rounded-xl sm:rounded-[14px] border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] p-3.5 sm:px-5 sm:py-4.5 flex flex-col justify-between gap-2.5 sm:gap-3 animate-fade-up" style={{ animationDelay: delay }}>
    <div className="flex items-start justify-between gap-2">
      <div className="text-fluid-10-5 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.06em] mt-0.5 sm:mt-1.5 leading-tight">{label}</div>
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-[10px] bg-maroon-light flex items-center justify-center text-maroon shrink-0">
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-fluid-22 sm:text-fluid-28 font-extrabold text-text-main leading-none m-0 min-h-6 sm:min-h-7">
        {loading ? <div className="animate-pulse w-15 h-6 sm:h-7 rounded-md bg-border" /> : value}
      </div>
      {sub && <div className={`text-fluid-10-5 sm:text-fluid-11 font-semibold mt-1 sm:mt-1.5 truncate ${subColorClass}`}>{sub}</div>}
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
          <div className={`w-5.5 h-5.5 rounded-full shrink-0 flex items-center justify-center text-fluid-10 font-bold ${done ? 'bg-success text-white' : active ? 'bg-maroon text-white border-2 border-maroon-dark' : 'bg-border text-text-muted'}`}>
            {done ? <Check size={10} /> : stepNum}
          </div>
          {i < total - 1 && <div className={`w-3 h-0.5 rounded-[1px] ${done ? 'bg-success' : 'bg-border'}`} />}
        </div>
      )
    })}
  </div>
)


const CustomDropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className="relative z-10 w-full group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 rounded-full border border-border bg-white text-fluid-12-5 text-text-main font-semibold outline-none cursor-pointer font-sans hover:border-maroon/30 transition-all shadow-sm"
      >
        <span className="truncate pr-2">{currentLabel}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : 'group-hover:text-text-main'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-[120%] bg-white rounded-xl border border-border shadow-lg p-2 z-50 animate-fade-up max-h-75 overflow-y-auto" style={{ animationDuration: '0.2s' }}>
            {options.map(o => {
              const isActive = value === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon' : 'text-text-main hover:bg-off-white'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                    </div>
                    <span className="text-fluid-12 font-semibold whitespace-nowrap">{o.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Filter Sidebar ─────────────────────────────────────────────────────────────
const FilterBar = ({ filters, onChange, onReset, availableTxTypes = [] }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] px-5 py-4 flex flex-wrap items-center gap-4 animate-fade-up relative z-20" style={{ animationDelay: '0.4s' }}>
      <div className="text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] mr-2 flex items-center gap-1.5"><SlidersHorizontal size={14} /> Filters</div>
      
      {/* Status Dropdown */}
      <div className="flex-1 min-w-37.5">
        <CustomDropdown
          value={filters.status}
          onChange={val => onChange({ ...filters, status: val })}
          options={[
            { value: 'active', label: 'All Active' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'waiting', label: 'Waiting' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </div>

      {/* Priority Dropdown */}
      <div className="flex-1 min-w-37.5">
        <CustomDropdown
          value={filters.priority}
          onChange={val => onChange({ ...filters, priority: val })}
          options={[
            { value: 'all', label: 'All Priorities' },
            { value: 'high', label: 'High Priority' },
            { value: 'regular', label: 'Regular Priority' },
          ]}
        />
      </div>

      {/* Transaction Type Dropdown */}
      <div className="flex-1 min-w-40">
        <CustomDropdown
          value={filters.transactionType}
          onChange={val => onChange({ ...filters, transactionType: val })}
          options={[
            { value: 'all', label: 'All Transactions' },
            ...availableTxTypes.map(t => ({ value: t, label: t }))
          ]}
        />
      </div>

      <button onClick={onReset} className="px-5 py-2 rounded-full border border-border bg-off-white text-text-main text-fluid-12-5 font-bold cursor-pointer font-sans hover:bg-white hover:border-maroon-border hover:text-maroon hover:shadow-sm transition-all whitespace-nowrap">
        Reset
      </button>
    </div>
  )
}

// ── Main LiveQueuePage ─────────────────────────────────────────────────────────
export default function LiveQueuePage({ onNavigate }) {
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
  const [availableTxTypes, setAvailableTxTypes] = useState([])
  const toast = useToast()

  const [queueStats, setQueueStats] = useState({ avg_wait_minutes: 0, peak_forecast: 'No Data' })

  const showToast = (msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
  }

  useEffect(() => {
    getTransactionTypes()
      .then(data => setAvailableTxTypes(data.map(t => t.name)))
      .catch(console.error)
  }, [])

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      const [queueData, statsData] = await Promise.all([
        getTodaysQueue(token),
        getLiveQueueStats(token)
      ])
      setQueue(queueData)
      setQueueStats(statsData)
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(['QUEUE_UPDATED', 'WINDOW_UPDATED'], () => {
    fetchQueue()
  })

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 60000)
    return () => clearInterval(t)
  }, [fetchQueue])

  const handleConfirm = async (ticketId, stepNum, txName, studentName, confirmLabel, releaseDateToSet, releasedTo, documentVerified) => {
    const key = `${ticketId}-${stepNum}`
    setConfirming(key); setError('')
    try {
      await confirmStep(token, ticketId, stepNum, releasedTo, documentVerified)
      
      if (releaseDateToSet) {
        const ticketItem = queue.find(q => q.ticket.id === ticketId)
        if (ticketItem) {
          const apptId = ticketItem.ticket.appointment_id || ticketItem.ticket.appointments?.id
          if (apptId) {
            await updateReleaseDate(token, apptId, releaseDateToSet)
          }
        }
      }

      await fetchQueue()
      if (confirmLabel === 'Mark as Done' || confirmLabel === 'Release Document') {
        showToast(`${txName || 'Transaction'} for ${studentName || 'Student'} completed successfully!`)
      } else {
        showToast(`Step ${stepNum} (${confirmLabel || 'Confirmed'}) for ${studentName || 'Student'} completed successfully!`)
      }
    }
    catch (e) { 
      setError(e.message)
      showToast(e.message || 'Failed to confirm step', 'error')
    }
    finally { setConfirming(null) }
  }

  const handleSetReleaseDate = async (appointmentId, dateVal) => {
    try {
      await updateReleaseDate(token, appointmentId, dateVal)
      await fetchQueue()
      showToast('Document release date saved')
    } catch (e) {
      setError(e.message)
      showToast(e.message || 'Failed to set release date', 'error')
      throw e
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
  const { active, done, serving, waiting, servingCounter, servingProcessing, highPrio } = useMemo(() => {
    const active = queue.filter(q => q.ticket.status !== 'completed')
    const done = queue.filter(q => q.ticket.status === 'completed')
    const serving = queue.filter(q => q.ticket.status === 'in_progress')
    const waiting = queue.filter(q => (q.ticket.status === 'pending' || q.ticket.status === 'waiting') && getRequiresPresence(q.steps))
    const servingCounter = queue.filter(q => q.ticket.status === 'in_progress' && getRequiresPresence(q.steps))
    const servingProcessing = queue.filter(q => q.ticket.status !== 'completed' && !getRequiresPresence(q.steps))
    const highPrio = queue.filter(q => {
      const pc = q.ticket.appointments?.priority_class
      return pc === 'alumni' || pc === 'pwd' || pc === 'pregnant'
    })
    return { active, done, serving, waiting, servingCounter, servingProcessing, highPrio }
  }, [queue])

  const servingSubText = useMemo(() => {
    return `${servingCounter.length} at the counter`
  }, [servingCounter.length])

  const avgWait = queueStats.avg_wait_minutes || 0

  // ── Filtered & searched queue ──
  const displayed = useMemo(() => {
    return queue.filter(({ ticket, steps }) => {
      let statusOk = false
      if (filters.status === 'active') {
        statusOk = ['in_progress', 'pending', 'waiting'].includes(ticket.status)
      } else if (filters.status === 'all') {
        statusOk = true
      } else {
        statusOk = ticket.status === filters.status
      }

      const prioOk = filters.priority === 'all'
        || (filters.priority === 'high' && (ticket.appointments?.priority_class === 'alumni' || ticket.appointments?.priority_class === 'pwd' || ticket.appointments?.priority_class === 'pregnant'))
        || (filters.priority === 'regular' && ticket.appointments?.priority_class === 'regular')
      const txOk = filters.transactionType === 'all'
        || (ticket.appointments?.transaction_types?.name || '').includes(filters.transactionType)
      const name = `${ticket.users?.first_name} ${ticket.users?.last_name}`.toLowerCase()
      const srchOk = !search || name.includes(search.toLowerCase()) || ticket.queue_number.toLowerCase().includes(search.toLowerCase())
      return statusOk && prioOk && txOk && srchOk
    })
  }, [queue, filters, search])

  // ── Split into "At the Counter" (physical line) vs "Processing" (back office) ──
  const { atCounter, processingQueue } = useMemo(() => {
    const nonCompleted = displayed.filter(({ ticket }) => ticket.status !== 'completed')
    const atCounter = nonCompleted.filter(({ steps }) => getRequiresPresence(steps))
    const processingQueue = nonCompleted.filter(({ steps }) => !getRequiresPresence(steps))
    return { atCounter, processingQueue }
  }, [displayed])

  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // ── Reusable row renderer — used by both "At the Counter" and "Processing" tables ──
  const renderQueueRow = ({ ticket, steps }, idx, arrLength, actionLabel = 'Confirm', showWait = true) => {
    const student = ticket.users
    const name    = student ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
    const sid     = student?.student_id || '—'
    const appt    = ticket.appointments
    const txName  = appt?.transaction_types?.name || 'Transaction'
    const pClass  = appt?.priority_class || 'regular'
    const statusCfg = getDocStatusConfig(ticket, steps)
    const isHighPrio = pClass === 'alumni' || pClass === 'pwd' || pClass === 'pregnant'
    const inProgressStep = steps?.find(s => s.status === 'in_progress')
    const confirmKey = inProgressStep ? `${ticket.id}-${inProgressStep.step_number}` : null
    const isConfirming = confirming === confirmKey
    
    let waitMins = 0
    if (ticket.created_at) {
      waitMins = Math.max(0, Math.floor((now.getTime() - Date.parse(ticket.created_at)) / 60000))
    } else {
      waitMins = Math.max(3, (idx + 1) * 5)
    }

    return (
      <div key={ticket.id} className={`grid grid-cols-1 ${showWait ? 'lg:grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px]' : 'lg:grid-cols-[150px_1.5fr_1.2fr_220px_160px]'} gap-6 px-5 py-4 items-center transition-all duration-300
        ${idx < arrLength - 1 ? 'border-b border-border/60' : ''}
        ${ticket.status === 'in_progress' ? 'bg-success-light/30' : 'bg-white hover:bg-off-white/80 hover:shadow-sm hover:-translate-y-px'}
      `}>

        {/* Queue No. */}
        <div>
          <div className="font-serif text-fluid-20 font-extrabold text-maroon leading-none">{ticket.queue_number}</div>
          {isHighPrio && (
            <span className="text-fluid-9 font-bold px-1.5 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border mt-1 inline-block uppercase tracking-[0.04em]">
              Priority
            </span>
          )}
          {ticket.status === 'in_progress' && inProgressStep?.location && getRequiresPresence(steps) && !inProgressStep.location.toLowerCase().includes('back office') && (
            <div className="text-fluid-11 font-bold text-text-sub mt-1.5 flex items-center gap-1 uppercase tracking-[0.04em]">
              {inProgressStep.location}
            </div>
          )}
        </div>

        {/* Student Details */}
        <div>
          <div className="text-fluid-13 font-semibold text-text-main mb-0.5">{name}</div>
          <div className="text-fluid-11 text-text-muted font-mono">{sid}</div>
          <div className="mt-1">
            <span className="text-fluid-10 font-semibold px-2 py-0.5 rounded-full capitalize bg-gold-light text-gold border border-gold-border">
              {pClass}
            </span>
          </div>
        </div>

        {/* Transaction */}
        <div>
          {appt?.selected_documents && appt.selected_documents.length > 1 ? (
            <div className="flex flex-wrap gap-1 mb-1">
              {appt.selected_documents.map((d, idx) => (
                <span key={d.id || idx} className="text-[11px] font-semibold text-maroon bg-maroon-light py-0.5 px-2 rounded-md border border-maroon-border/30">
                  {d.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-semibold text-text-main leading-snug">{txName}</div>
          )}
          <div className="text-fluid-11 text-text-muted mt-0.5">{fmt12h(appt?.time_slot) || '—'}</div>
        </div>

        {/* Status + Progress */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-fluid-11 font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              {statusCfg.label}
            </span>
            {inProgressStep && <span className="text-fluid-11 text-text-muted font-medium">Step {inProgressStep.step_number}</span>}
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
                    className={`px-4 py-2 rounded-full border text-fluid-12 font-bold cursor-pointer font-sans whitespace-nowrap transition-all shadow-sm hover:-translate-y-0.5
                      ${confirming === ticket.id
                        ? 'border-border bg-off-white text-text-muted cursor-not-allowed'
                        : 'border-blue-border bg-blue-light text-blue hover:bg-blue hover:text-white'}
                    `}
                  >
                    {confirming === ticket.id ? '...' : 'Call Ticket'}
                  </button>
                  <button
                    onClick={() => setViewingTicketId(ticket.id)}
                    className="px-4 py-2 rounded-full border border-border bg-white text-text-main text-fluid-12 font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-surface transition-all shadow-sm hover:-translate-y-0.5"
                  >
                    Details
                  </button>
                </>
              ) : (
                <>

                  <button
                    onClick={() => setViewingTicketId(ticket.id)}
                    className="px-4 py-2 rounded-full border border-maroon-border bg-maroon-light text-maroon text-fluid-12 font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-maroon hover:text-white transition-all shadow-sm hover:-translate-y-0.5"
                  >
                    Update Progress
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
          <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Real-Time</p>
          <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 flex items-center gap-2">
            <Ticket size={24} className="text-maroon shrink-0" /> Live Queue Management
          </h1>
          <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0">
            Monitor and manage the active flow of student transactions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Current time */}
          <div className="bg-white border border-border shadow-xs text-text-main px-3.5 py-1.5 sm:px-4 sm:py-2.25 rounded-xl text-fluid-13 sm:text-fluid-15 font-bold font-sans flex items-center gap-2 mt-2 sm:mt-8">
            <Clock size={16} strokeWidth={2.5} className="text-maroon" />
            {currentTime}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <MiniStat 
          icon={<Clock size={18} />} 
          value={`${avgWait}m`} 
          label="Avg. Wait Time" 
          sub={avgWait > 15 ? "↑ Higher wait" : "Fast processing"} 
          subColorClass={avgWait > 15 ? 'text-orange' : 'text-text-muted'} 
          loading={loading} delay="0.1s"
        />
        <MiniStat 
          icon={<Users size={18} />} 
          value={waiting.length} 
          label="Waiting in Queue" 
          sub={`${servingCounter.length} at counter`} 
          subColorClass="text-text-muted" 
          loading={loading} delay="0.2s" 
        />
        <MiniStat 
          icon={<FolderOpen size={18} />} 
          value={servingProcessing.length} 
          label="In Processing" 
          sub="Processing table" 
          subColorClass="text-text-muted" 
          loading={loading} delay="0.25s" 
        />
        <MiniStat 
          icon={<CheckSquare size={18} />} 
          value={done.length} 
          label="Total Serviced" 
          sub={done.length >= 80 ? 'High volume' : 'Normal volume'} 
          subColorClass={done.length >= 80 ? 'text-danger' : 'text-text-muted'} 
          loading={loading} delay="0.3s" 
        />
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ status: 'active', priority: 'all', transactionType: 'all' })}
        availableTxTypes={availableTxTypes}
      />

      {error && (
        <div className="px-4 py-3 rounded-[10px] bg-danger-light border border-danger-border text-danger text-fluid-13 flex items-center justify-between mb-4">
          <div className="flex items-center"><AlertTriangle size={13} className="mr-1.5" /> {error}</div>
          <button onClick={() => setError('')} className="bg-transparent border-none text-danger cursor-pointer hover:opacity-70 flex"><X size={15} /></button>
        </div>
      )}

      {/* ── Main content: Table + Filter ── */}
      <div className="flex gap-5 items-start">

        {/* Queue Tables */}
        <div className="animate-fade-up flex-1 min-w-0" style={{ animationDelay: '0.4s' }}>

          {/* ═══ AT THE COUNTER — real physical line, call these in order ═══ */}
          <div className="flex items-center justify-between mb-4 mt-2 px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-maroon-light to-surface flex items-center justify-center border border-maroon-border shadow-sm">
                <Users size={20} className="text-maroon" />
              </div>
              <div>
                <h2 className="text-fluid-22 font-serif font-extrabold text-text-main m-0 leading-tight">At the Counter</h2>
              </div>
            </div>
            {!loading && atCounter.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border shadow-sm">
                <div className="w-2 h-2 rounded-full bg-maroon animate-pulse" />
                <span className="text-fluid-13 font-bold text-text-main tracking-wide">
                  {atCounter.length} <span className="text-text-muted font-semibold">at the counter</span>
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <div className="min-w-237.5">
              <div className="hidden lg:grid grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px] gap-6 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border">
                {columnHeaders.map(col => (
                  <div key={col} className="text-fluid-10 font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                ))}
              </div>

              <div className="bg-white">
            {loading ? (
              <div className="flex flex-col">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`grid grid-cols-1 lg:grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px] gap-6 p-4 ${i < 3 ? 'border-b border-border' : ''}`}>
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
                <div className="flex justify-center text-text-muted mb-2.5"><Users size={32} /></div>
                <p className="text-sm font-semibold text-text-main m-0 mb-1">No one at the counter right now</p>
              </div>
            ) : (
              atCounter.map((item, idx) => renderQueueRow(item, idx, atCounter.length, 'Call Next'))
            )}
            </div>
          </div>
        </div>


          {/* ═══ PROCESSING — back office, no line, work at own pace ═══ */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-surface to-off-white flex items-center justify-center border border-border shadow-sm">
                  <Inbox size={20} className="text-text-muted" />
                </div>
                <div>
                  <h2 className="text-fluid-22 font-serif font-extrabold text-text-main m-0 leading-tight">Processing</h2>
                </div>
              </div>
              {!loading && processingQueue.length > 0 && (
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-text-muted/50" />
                  <span className="text-fluid-13 font-bold text-text-main tracking-wide">
                    {processingQueue.length} <span className="text-text-muted font-semibold">in processing</span>
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)] opacity-95">
              <div className="min-w-212.5">
                {(loading || processingQueue.length > 0) && (
                  <div className="grid grid-cols-[150px_1.5fr_1.2fr_220px_160px] gap-6 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border">
                    {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'ACTION'].map(col => (
                      <div key={col} className="text-fluid-10 font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                    ))}
                  </div>
                )}

                <div className="bg-white">
                  {loading ? (
                    <div>
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`grid grid-cols-[150px_1.5fr_1.2fr_220px_160px] gap-6 p-4 items-center ${i < 3 ? 'border-b border-border' : ''}`}>
                          <div className="animate-pulse w-14 h-5 rounded bg-border" />
                          <div>
                            <div className="animate-pulse w-32 h-3.5 rounded bg-border mb-1.5" />
                            <div className="animate-pulse w-20 h-3 rounded bg-border" />
                          </div>
                          <div>
                            <div className="animate-pulse w-28 h-3.5 rounded bg-border mb-1.5" />
                            <div className="animate-pulse w-16 h-3 rounded bg-border" />
                          </div>
                          <div className="animate-pulse w-24 h-5 rounded-full bg-border" />
                          <div className="animate-pulse w-28 h-8 rounded-lg bg-border" />
                        </div>
                      ))}
                    </div>
                  ) : processingQueue.length === 0 ? (
                    <div className="p-8 text-center border border-border rounded-[14px]">
                      <div className="flex justify-center text-text-muted mb-2"><Inbox size={28} /></div>
                      <p className="text-sm font-semibold text-text-main m-0 mb-1">Nothing in back-office processing</p>
                    </div>
                  ) : (
                    processingQueue.map((item, idx) => renderQueueRow(item, idx, processingQueue.length, 'Mark Complete', false))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {viewingTicketId && queue.find(q => q.ticket.id === viewingTicketId) && (
        <QueueDetailsModal 
          ticketData={queue.find(q => q.ticket.id === viewingTicketId)} 
          onClose={() => setViewingTicketId(null)} 
          onConfirm={handleConfirm}
          confirming={confirming}
          onSetReleaseDate={handleSetReleaseDate}
          onNavigate={onNavigate}
        />
      )}

    </div>
  )
}