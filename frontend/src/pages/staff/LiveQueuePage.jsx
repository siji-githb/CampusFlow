import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { useToast } from '../../context/ToastContext'
import { getTodaysQueue, confirmStep, callTicket } from '../../services/queueService'
import { updateReleaseDate } from '../../services/adminService'
import { getTransactionTypes } from '../../services/appointmentService'
import { Check, Clock, X, Users, CheckSquare, AlertTriangle, Inbox, Ticket, ChevronDown, SlidersHorizontal, FolderOpen, RotateCcw, DoorOpen } from 'lucide-react'
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

const MiniStat = ({ 
  icon, 
  value, 
  label, 
  sub, 
  subColorClass = 'text-text-muted', 
  colorClass = 'text-maroon', 
  bgClass = 'bg-maroon-light', 
  borderClass = 'border-maroon-border/60',
  loading, 
  delay = '0s',
  className = ''
}) => (
  <div 
    className={`animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 ${className}`}
    style={{ animationDelay: delay }}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">
        {label}
      </span>
      <div className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl ${bgClass} ${colorClass} border ${borderClass} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
        {loading ? <div className="animate-pulse w-14 h-6 sm:h-7 rounded-md bg-border" /> : value}
      </div>
      {sub && (
        <div className={`text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 flex items-center gap-1.5 truncate ${subColorClass}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
          <span>{sub}</span>
        </div>
      )}
    </div>
  </div>
)

// ── Progress Steps Bar ─────────────────────────────────────────────────────────
const StepsBar = ({ current, total }) => (
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


const CustomDropdown = ({ value, onChange, options, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentOpt = options.find(o => o.value === value)
  const currentLabel = currentOpt?.label || value

  return (
    <div className="relative z-10 w-full group min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-1.75 rounded-full border border-border bg-white text-[11px] sm:text-fluid-12 text-text-main font-semibold outline-none cursor-pointer font-sans hover:border-maroon/30 transition-all shadow-2xs min-w-0"
      >
        <span className="truncate pr-1">{currentLabel}</span>
        <ChevronDown size={11} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : 'group-hover:text-text-main'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
          <div className={`absolute ${align === 'right' ? 'right-0 sm:right-auto sm:left-0' : 'left-0'} top-full mt-1.5 min-w-full w-max max-w-[calc(100vw-2rem)] sm:max-w-72 bg-white rounded-xl border border-border shadow-xl p-1.5 z-50 max-h-52 sm:max-h-64 overflow-y-auto`}>
            {options.map(o => {
              const isActive = value === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`p-1.5 sm:p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon' : 'text-text-main hover:bg-off-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                    </div>
                    <span className="text-[11.5px] sm:text-fluid-12 font-semibold whitespace-nowrap">{o.label}</span>
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

// ── Filter Bar ─────────────────────────────────────────────────────────────────
const FilterBar = ({ filters, onChange, onReset, availableTxTypes = [] }) => {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-xs px-2.5 py-1.5 sm:px-5 sm:py-2.5 flex items-center flex-nowrap gap-1.5 sm:gap-3.5 relative z-20">
      {/* Filters Icon & Label */}
      <div className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] flex items-center gap-1 shrink-0">
        <SlidersHorizontal size={13} className="shrink-0 text-text-sub" />
        <span className="hidden sm:inline">Filters</span>
      </div>
      
      {/* Priority Dropdown */}
      <div className="flex-1 sm:w-44 sm:flex-none min-w-0">
        <CustomDropdown
          value={filters.priority}
          onChange={val => onChange({ ...filters, priority: val })}
          align="left"
          options={[
            { value: 'all', label: 'All Priorities' },
            { value: 'high', label: 'High Priority' },
            { value: 'regular', label: 'Regular Priority' },
          ]}
        />
      </div>

      {/* Transaction Type Dropdown */}
      <div className="flex-[1.2] sm:w-60 sm:flex-none min-w-0">
        <CustomDropdown
          value={filters.transactionType}
          onChange={val => onChange({ ...filters, transactionType: val })}
          align="right"
          options={[
            { value: 'all', label: 'All Transactions' },
            ...availableTxTypes.map(t => ({ value: t, label: t }))
          ]}
        />
      </div>

      {/* Reset Button */}
      <button 
        type="button"
        onClick={onReset} 
        title="Reset filters"
        className="px-2.5 py-1.5 sm:px-3 sm:py-1.75 rounded-full border border-border bg-off-white text-text-main text-fluid-10-5 sm:text-fluid-12 font-bold cursor-pointer font-sans hover:bg-white hover:border-maroon-border hover:text-maroon hover:shadow-2xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1 active:scale-95"
      >
        <RotateCcw size={11} className="shrink-0 text-text-muted" />
        <span className="hidden sm:inline">Reset</span>
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
  const [error, setError]       = useState('')
  const [now, setNow]           = useState(new Date())
  const [filters, setFilters]   = useState({ priority: 'all', transactionType: 'all' })
  const [viewingTicketId, setViewingTicketId] = useState(null)
  const [availableTxTypes, setAvailableTxTypes] = useState([])
  const toast = useToast()

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
      const queueData = await getTodaysQueue(token)
      setQueue(queueData)
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



  // ── Derived stats ──
  const { done, waiting, servingCounter, servingProcessing } = useMemo(() => {
    const validQueue = queue.filter(q => 
      q.ticket.status !== 'cancelled' && 
      q.ticket.status !== 'no_show' && 
      q.ticket.appointments?.status !== 'cancelled'
    )
    const done = queue.filter(q => q.ticket.status === 'completed')
    const waiting = validQueue.filter(q => (q.ticket.status === 'pending' || q.ticket.status === 'waiting') && getRequiresPresence(q.steps))
    const servingCounter = validQueue.filter(q => q.ticket.status === 'in_progress' && getRequiresPresence(q.steps))
    const servingProcessing = validQueue.filter(q => q.ticket.status !== 'completed' && !getRequiresPresence(q.steps))
    return { done, waiting, servingCounter, servingProcessing }
  }, [queue])

  // ── Filtered & searched queue ──
  const displayed = useMemo(() => {
    return queue.filter(({ ticket }) => {
      // Exclude cancelled or no-show tickets from the active live queue
      if (ticket.status === 'cancelled' || ticket.status === 'no_show' || ticket.appointments?.status === 'cancelled') {
        return false
      }
      const prioOk = filters.priority === 'all'
        || (filters.priority === 'high' && (ticket.appointments?.priority_class === 'alumni' || ticket.appointments?.priority_class === 'pwd' || ticket.appointments?.priority_class === 'pregnant'))
        || (filters.priority === 'regular' && ticket.appointments?.priority_class === 'regular')
      const txOk = filters.transactionType === 'all'
        || (ticket.appointments?.transaction_types?.name || '').includes(filters.transactionType)
      return prioOk && txOk
    })
  }, [queue, filters])

  // ── Split into "At the Counter" (physical line) vs "Processing" (back office) ──
  const { atCounter, processingQueue } = useMemo(() => {
    const nonCompleted = displayed.filter(({ ticket }) => 
      ticket.status !== 'completed' && 
      ticket.status !== 'cancelled' && 
      ticket.status !== 'no_show' && 
      ticket.appointments?.status !== 'cancelled'
    )
    const atCounter = nonCompleted.filter(({ steps }) => getRequiresPresence(steps))
    const processingQueue = nonCompleted.filter(({ steps }) => !getRequiresPresence(steps))
    return { atCounter, processingQueue }
  }, [displayed])

  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // ── Desktop row renderer (>= lg screens) ──
  const renderQueueDesktopRow = ({ ticket, steps }, idx, arrLength, showWait = true) => {
    const student = ticket.users
    const name    = student ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
    const sid     = student?.student_id || '—'
    const appt    = ticket.appointments
    const txName  = appt?.transaction_types?.name || 'Transaction'
    const pClass  = appt?.priority_class || 'regular'
    const statusCfg = getDocStatusConfig(ticket, steps)
    const isHighPrio = pClass === 'alumni' || pClass === 'pwd' || pClass === 'pregnant'
    const inProgressStep = steps?.find(s => s.status === 'in_progress')
    
    let waitMins = 0
    if (ticket.created_at) {
      waitMins = Math.max(0, Math.floor((now.getTime() - Date.parse(ticket.created_at)) / 60000))
    } else {
      waitMins = Math.max(3, (idx + 1) * 5)
    }

    return (
      <div key={ticket.id} className={`grid ${showWait ? 'grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px]' : 'grid-cols-[150px_1.5fr_1.2fr_220px_160px]'} gap-6 px-5 py-4 items-center transition-all duration-300
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
            <StepsBar current={ticket.current_step} total={ticket.total_steps} />
          )}
        </div>

        {/* Wait */}
        {showWait && (
          <div>
            <div className={`text-sm font-bold ${ticket.status === 'in_progress' ? 'text-success' : 'text-text-sub'}`}>{waitMins}m</div>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {(ticket.status === 'in_progress' || ticket.status === 'waiting' || ticket.status === 'pending') && (
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
                <button
                  onClick={() => setViewingTicketId(ticket.id)}
                  className="px-4 py-2 rounded-full border border-maroon-border bg-maroon-light text-maroon text-fluid-12 font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-maroon hover:text-white transition-all shadow-sm hover:-translate-y-0.5"
                >
                  Update Progress
                </button>
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

  // ── Mobile card renderer (< lg screens) ──
  const renderQueueMobileCard = ({ ticket, steps }, idx, showWait = true) => {
    const student = ticket.users
    const name    = student ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
    const sid     = student?.student_id || '—'
    const appt    = ticket.appointments
    const txName  = appt?.transaction_types?.name || 'Transaction'
    const pClass  = appt?.priority_class || 'regular'
    const statusCfg = getDocStatusConfig(ticket, steps)
    const isHighPrio = pClass === 'alumni' || pClass === 'pwd' || pClass === 'pregnant'
    const inProgressStep = steps?.find(s => s.status === 'in_progress')
    
    let waitMins = 0
    if (ticket.created_at) {
      waitMins = Math.max(0, Math.floor((now.getTime() - Date.parse(ticket.created_at)) / 60000))
    } else {
      waitMins = Math.max(3, (idx + 1) * 5)
    }

    return (
      <div 
        key={ticket.id} 
        className={`p-4 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col gap-3 ${
          ticket.status === 'in_progress' 
            ? 'bg-success-light/25 border-success-border' 
            : 'bg-white border-border hover:border-maroon/30'
        }`}
      >
        {/* Card Header: Queue #, Priority, Location & Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-fluid-20 font-extrabold text-maroon leading-none">
                {ticket.queue_number}
              </span>
              {isHighPrio && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border uppercase tracking-wider">
                  Priority
                </span>
              )}
            </div>
            {ticket.status === 'in_progress' && inProgressStep?.location && getRequiresPresence(steps) && !inProgressStep.location.toLowerCase().includes('back office') && (
              <div className="text-[11px] font-bold text-text-sub mt-1 flex items-center gap-1 uppercase tracking-wider">
                <DoorOpen size={12} className="text-maroon" /> {inProgressStep.location}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shadow-2xs ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              {statusCfg.label}
            </span>
            {showWait && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-surface text-text-sub border border-border">
                {waitMins}m
              </span>
            )}
          </div>
        </div>

        {/* Student & Document Details Info Box */}
        <div className="bg-off-white/80 rounded-xl p-3 border border-border/70 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-fluid-13 font-bold text-text-main truncate">
              {name}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize bg-gold-light text-gold-dark border border-gold-border shrink-0">
              {pClass}
            </span>
          </div>
          
          <div className="text-[11.5px] text-text-muted font-mono flex items-center gap-2">
            <span>ID: <strong className="text-text-sub font-semibold">{sid}</strong></span>
            {appt?.time_slot && (
              <>
                <span>•</span>
                <span className="font-sans text-text-muted flex items-center gap-1">
                  <Clock size={11} /> {fmt12h(appt.time_slot)}
                </span>
              </>
            )}
          </div>

          {/* Requested Documents */}
          <div className="mt-1 pt-1.5 border-t border-border/50">
            {appt?.selected_documents && appt.selected_documents.length > 1 ? (
              <div className="flex flex-wrap gap-1">
                {appt.selected_documents.map((d, idx) => (
                  <span key={d.id || idx} className="text-[11px] font-semibold text-maroon bg-maroon-light py-0.5 px-2 rounded-md border border-maroon-border/30">
                    {d.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[12.5px] font-bold text-maroon leading-snug">
                {txName}
              </div>
            )}
          </div>
        </div>

        {/* Step Progress Bar */}
        {steps && steps.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-0.5 px-1">
            <span className="text-[11px] font-medium text-text-muted">
              {inProgressStep ? `Step ${inProgressStep.step_number} of ${ticket.total_steps || steps.length}` : 'Progress'}
            </span>
            <StepsBar current={ticket.current_step} total={ticket.total_steps} />
          </div>
        )}

        {/* Actions */}
        <div className="pt-1">
          {(ticket.status === 'in_progress' || ticket.status === 'waiting' || ticket.status === 'pending') && (
            <>
              {ticket.status === 'waiting' || ticket.status === 'pending' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCallTicket(ticket.id)}
                    disabled={confirming === ticket.id}
                    className={`w-full py-2.5 px-3 rounded-xl border text-[12.5px] font-bold cursor-pointer font-sans whitespace-nowrap transition-all shadow-xs flex items-center justify-center
                      ${confirming === ticket.id
                        ? 'border-border bg-off-white text-text-muted cursor-not-allowed'
                        : 'border-blue-border bg-blue text-white hover:bg-blue-dark active:scale-[0.98]'}
                    `}
                  >
                    {confirming === ticket.id ? 'Calling...' : 'Call Ticket'}
                  </button>
                  <button
                    onClick={() => setViewingTicketId(ticket.id)}
                    className="w-full py-2.5 px-3 rounded-xl border border-border bg-white text-text-main text-[12.5px] font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-surface active:scale-[0.98] transition-all shadow-xs flex items-center justify-center"
                  >
                    Details
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setViewingTicketId(ticket.id)}
                  className="w-full py-2.5 px-4 rounded-xl border border-maroon-border bg-maroon text-white text-[13px] font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-maroon-dark active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  Update Progress
                </button>
              )}
            </>
          )}
          {ticket.status === 'completed' && (
            <div className="py-2 text-center rounded-xl bg-blue-light text-blue border border-blue-border text-[12px] font-bold flex items-center justify-center gap-1.5">
              <Check size={14} /> Completed
            </div>
          )}
          {ticket.status === 'no_show' && (
            <div className="py-2 text-center rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
              No Show
            </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <MiniStat 
          icon={<Users size={15} strokeWidth={2.4} />} 
          value={waiting.length} 
          label="Waiting in Queue" 
          sub={`${servingCounter.length} at counter`} 
          subColorClass="text-maroon" 
          colorClass="text-maroon"
          bgClass="bg-maroon-light"
          borderClass="border-maroon-border/60"
          loading={loading} delay="0.1s" 
        />
        <MiniStat 
          icon={<FolderOpen size={15} strokeWidth={2.4} />} 
          value={servingProcessing.length} 
          label="In Processing" 
          sub="Processing table" 
          subColorClass="text-gold" 
          colorClass="text-gold"
          bgClass="bg-gold-light"
          borderClass="border-gold-border/60"
          loading={loading} delay="0.15s" 
        />
        <MiniStat 
          icon={<CheckSquare size={15} strokeWidth={2.4} />} 
          value={done.length} 
          label="Total Serviced" 
          sub={done.length >= 80 ? 'High volume' : 'Completed today'} 
          subColorClass={done.length >= 80 ? 'text-danger' : 'text-success'} 
          colorClass="text-success"
          bgClass="bg-success-light"
          borderClass="border-success-border/60"
          loading={loading} delay="0.2s" 
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ priority: 'all', transactionType: 'all' })}
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

          {loading ? (
            <>
              {/* Mobile loading skeleton */}
              <div className="flex flex-col gap-3 lg:hidden">
                {[1, 2].map(i => (
                  <div key={i} className="p-4 rounded-2xl border border-border bg-white animate-pulse flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="w-24 h-6 rounded bg-border" />
                      <div className="w-16 h-5 rounded-full bg-border" />
                    </div>
                    <div className="h-16 rounded-xl bg-off-white" />
                    <div className="w-full h-9 rounded-xl bg-border" />
                  </div>
                ))}
              </div>
              {/* Desktop loading skeleton */}
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                <div className="min-w-237.5">
                  <div className="grid grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px] gap-6 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border">
                    {columnHeaders.map(col => (
                      <div key={col} className="text-fluid-10 font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                    ))}
                  </div>
                  <div className="bg-white">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`grid grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px] gap-6 p-4 items-center ${i < 3 ? 'border-b border-border' : ''}`}>
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
                </div>
              </div>
            </>
          ) : atCounter.length === 0 ? (
            /* Responsive empty state: full width, perfectly centered on all screen sizes */
            <div className="p-8 sm:p-10 text-center bg-white rounded-2xl border border-border shadow-xs">
              <div className="flex justify-center text-text-muted mb-2.5"><Users size={32} /></div>
              <p className="text-fluid-14 font-bold text-text-main m-0 mb-1">No one at the counter right now</p>
              <p className="text-fluid-12 text-text-muted m-0">Tickets requiring physical counter presence will show here.</p>
            </div>
          ) : (
            <>
              {/* Mobile queue cards (< lg) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                {atCounter.map((item, idx) => renderQueueMobileCard(item, idx, true))}
              </div>
              {/* Desktop table (>= lg) */}
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                <div className="min-w-237.5">
                  <div className="grid grid-cols-[150px_1.5fr_1.2fr_220px_70px_160px] gap-6 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border">
                    {columnHeaders.map(col => (
                      <div key={col} className="text-fluid-10 font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                    ))}
                  </div>
                  <div className="bg-white">
                    {atCounter.map((item, idx) => renderQueueDesktopRow(item, idx, atCounter.length, true))}
                  </div>
                </div>
              </div>
            </>
          )}


          {/* ═══ PROCESSING — back office, no line, work at own pace ═══ */}
          <div className="mt-8 sm:mt-12">
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

            {loading ? (
              <>
                {/* Mobile loading skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                  {[1, 2].map(i => (
                    <div key={i} className="p-3.5 sm:p-4 rounded-2xl border border-border bg-white animate-pulse flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <div className="w-24 h-6 rounded bg-border" />
                        <div className="w-16 h-5 rounded-full bg-border" />
                      </div>
                      <div className="h-16 rounded-xl bg-off-white" />
                      <div className="w-full h-9 rounded-xl bg-border" />
                    </div>
                  ))}
                </div>
                {/* Desktop loading skeleton */}
                <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)] opacity-95">
                  <div className="min-w-212.5">
                    <div className="grid grid-cols-[150px_1.5fr_1.2fr_220px_160px] gap-6 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border">
                      {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'ACTION'].map(col => (
                        <div key={col} className="text-fluid-10 font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                      ))}
                    </div>
                    <div className="bg-white">
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
                  </div>
                </div>
              </>
            ) : processingQueue.length === 0 ? (
              /* Responsive empty state: full width, perfectly centered on all screen sizes */
              <div className="p-8 sm:p-10 text-center bg-white rounded-2xl border border-border shadow-xs">
                <div className="flex justify-center text-text-muted mb-2"><Inbox size={28} /></div>
                <p className="text-fluid-14 font-bold text-text-main m-0 mb-1">Nothing in back-office processing</p>
                <p className="text-fluid-12 text-text-muted m-0">Transactions processed without physical presence will appear here.</p>
              </div>
            ) : (
              <>
                {/* Mobile queue cards (< lg) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                  {processingQueue.map((item, idx) => renderQueueMobileCard(item, idx, false))}
                </div>
                {/* Desktop table (>= lg) */}
                <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)] opacity-95">
                  <div className="min-w-212.5">
                    <div className="grid grid-cols-[150px_1.5fr_1.2fr_220px_160px] gap-6 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border">
                      {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'ACTION'].map(col => (
                        <div key={col} className="text-fluid-10 font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                      ))}
                    </div>
                    <div className="bg-white">
                      {processingQueue.map((item, idx) => renderQueueDesktopRow(item, idx, processingQueue.length, false))}
                    </div>
                  </div>
                </div>
              </>
            )}
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