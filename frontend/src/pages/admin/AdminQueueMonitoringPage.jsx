import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import {
  getTodaysQueue,
  getLiveQueueStats,
  getUncollectedDocuments,
  getCollectedDocuments,
  confirmStep,
  remindStudent
} from '../../services/queueService'
import { getTransactionTypes } from '../../services/appointmentService'
import { updateReleaseDate } from '../../services/adminService'
import { getDocumentColor } from '../../utils/colors'
import DonutChart from '../../components/DonutChart'
import {
  RefreshCw,
  AlertTriangle,
  Ticket,
  Users,
  Clock,
  Check,
  DoorOpen,
  Cog,
  FolderOpen,
  FileCheck,
  CheckCircle2,
  Search,
  Download,
  ChevronDown,
  Calendar,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileEdit,
  UserCheck,
  Eye,
  Bell,
  Layers,
  Activity
} from 'lucide-react'

// ── Status & Color Mapping ──────────────────────────────────────────────────
const PIPELINE_COLORS = {
  serving: '#15803D',    // Green
  waiting: '#B8900A',    // Gold
  prep: '#1D4ED8',       // Blue
  ready: '#EA580C',      // Orange
  completed: '#7B1A2A',  // Maroon
}

const CustomDropdown = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className="relative z-20 group min-w-36">
      {label && <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] mb-1">{label}</div>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-border bg-white text-[12px] text-text-main font-semibold outline-none cursor-pointer font-sans hover:border-maroon/30 transition-all shadow-xs"
      >
        <span className="truncate pr-2">{currentLabel}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : 'group-hover:text-text-main'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-full min-w-48 bg-white rounded-xl border border-border shadow-lg p-1.5 z-50 animate-fade-up max-h-60 overflow-y-auto">
            {options.map(o => {
              const isActive = value === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between text-[12px] font-medium transition-colors ${isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main hover:bg-off-white'}`}
                >
                  <span>{o.label}</span>
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

// ── Comprehensive Admin Ticket Details Modal ────────────────────────────────
function AdminTicketDetailsModal({ item, onClose }) {
  if (!item) return null

  const ticket = item.rawTicketData?.ticket || {}
  const appt = ticket.appointments || {}
  const user = ticket.users || {}
  const steps = item.rawTicketData?.steps || []
  const reqDocs = appt.transaction_types?.required_documents || []
  
  // Format clean student name without stray commas
  let studentName = item.student_name
  if (!studentName || studentName === 'Unknown Student') {
    if (user.first_name || user.last_name) {
      studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    } else {
      studentName = 'Student'
    }
  }
  // Strip any leading commas if present
  studentName = studentName.replace(/^[\s,]+/, '')

  const lastConfirmedStep = steps
    .filter(s => s.status === 'completed' && s.confirmed_at)
    .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at))[0]

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop without blur */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog Box */}
      <div className="animate-fade-up relative w-full max-w-2xl bg-[#0A2218] text-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.6)] max-h-[88vh] flex flex-col border border-emerald-800/50 z-10">
        
        {/* Modal Header: Pinned */}
        <div className="flex justify-between items-start mb-5 pb-4 border-b border-emerald-800/60 shrink-0">
          <div>
            <div className="text-[11px] font-extrabold text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Ticket size={14} /> QUEUE TICKET DETAILS
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-serif text-[30px] sm:text-[34px] font-extrabold text-white m-0 leading-none">
                {item.queue_number}
              </h2>
              <span className={`text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                item.statusKey === 'serving' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                item.statusKey === 'waiting' ? 'bg-gold/20 text-gold border-gold/40' :
                item.statusKey === 'prep' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                item.statusKey === 'overdue' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                item.statusKey === 'ready' ? 'bg-gold/20 text-gold border-gold/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {item.statusLabel}
              </span>
              {item.priority_class && item.priority_class !== 'regular' && (
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  {item.priority_class} Priority
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 border-none cursor-pointer text-white/80 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors p-2 rounded-full"><X size={20} /></button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="overflow-y-auto flex-1 pr-1.5 flex flex-col gap-4">
          
          {/* 1. Student Information */}
          <div className="p-5 rounded-2xl bg-[#061811] border border-emerald-900/60">
            <div className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users size={14} className="text-gold" /> Student Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Full Name</span>
                <strong className="text-[14.5px] text-white font-bold block mt-0.5">{studentName}</strong>
              </div>
              <div>
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Student ID Number</span>
                <strong className="text-[13.5px] text-white font-mono font-bold mt-0.5 bg-[#030E09] px-2.5 py-1 rounded-lg border border-emerald-800/60 inline-block">
                  {item.student_id || user.student_id || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Priority Category</span>
                <span className="text-[13px] text-white font-semibold block mt-0.5 capitalize">
                  {item.priority_class || 'Regular'}
                </span>
              </div>
              {user.email && (
                <div>
                  <span className="text-[11.5px] text-emerald-300/80 font-medium block">Email Address</span>
                  <span className="text-[13px] text-emerald-200 font-medium block mt-0.5 truncate">{user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Document & Service Details */}
          <div className="p-5 rounded-2xl bg-[#061811] border border-emerald-900/60">
            <div className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText size={14} className="text-gold" /> Document &amp; Service Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Requested Document</span>
                <strong className="text-[15px] text-gold font-bold block mt-0.5">{item.transaction_type}</strong>
              </div>
              {appt.notes && (
                <div className="sm:col-span-2">
                  <span className="text-[11.5px] text-emerald-300/80 font-medium block">Purpose / Student Remarks</span>
                  <p className="text-[12.5px] text-emerald-200 font-medium mt-1 bg-[#030E09] p-3 rounded-xl border border-emerald-800/60 m-0">
                    {appt.notes}
                  </p>
                </div>
              )}
              {reqDocs.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-[11.5px] text-emerald-300/80 font-medium block mb-1.5">Required Documents</span>
                  <div className="flex flex-wrap gap-2">
                    {reqDocs.map((doc, idx) => (
                      <span key={idx} className="text-[11.5px] font-semibold bg-[#030E09] text-emerald-200 px-3 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400" /> {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Queue Schedule & Release Timeline */}
          <div className="p-5 rounded-2xl bg-[#061811] border border-emerald-900/60">
            <div className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-400" /> Queue Timeline &amp; Release Schedule
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Ticket Generated At</span>
                <span className="text-[13px] text-white font-semibold block mt-0.5">
                  {item.rawDate ? new Date(item.rawDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Target Release Date</span>
                <span className="text-[13.5px] text-gold font-bold block mt-0.5 items-center gap-1.5">
                  <Calendar size={13} className="text-gold" />
                  {item.releaseDate ? new Date(item.releaseDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled yet'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11.5px] text-emerald-300/80 font-medium block">Queue Wait Time</span>
                <span className="text-[13px] text-white font-semibold block mt-0.5">
                  {item.elapsedText}
                </span>
              </div>
              {lastConfirmedStep && (
                <div className="sm:col-span-2 pt-3 border-t border-emerald-800/60">
                  <span className="text-[11.5px] text-emerald-300/80 font-medium block">Last Confirmed Step</span>
                  <span className="text-[13px] text-emerald-300 font-bold block mt-0.5">
                    ✓ {lastConfirmedStep.step_name} at {new Date(lastConfirmedStep.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer: Pinned at bottom */}
        <div className="mt-5 pt-4 border-t border-emerald-800/60 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gold text-[#061811] font-sans font-extrabold text-[13px] cursor-pointer hover:bg-yellow-400 transition-colors border-none shadow-md"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}

export default function AdminQueueMonitoringPage() {
  const { token } = useAuth()
  const [queue, setQueue] = useState([])
  const [queueStats, setQueueStats] = useState(null)
  const [uncollected, setUncollected] = useState([])
  const [collected, setCollected] = useState([])
  const [availableTxTypes, setAvailableTxTypes] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow] = useState(new Date())
  const [toastMsg, setToastMsg] = useState(null)

  // Filters & State
  const [activeTab, setActiveTab] = useState('all_active') // 'all_active', 'counter', 'processing', 'releases', 'completed'
  const [search, setSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const PER_PAGE = 10

  // Details Modal
  const [viewingTicketData, setViewingTicketData] = useState(null)
  const [remindingId, setRemindingId] = useState(null)
  const [confirmingKey, setConfirmingKey] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Update clock every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Load Transaction Types
  useEffect(() => {
    getTransactionTypes()
      .then(data => setAvailableTxTypes(data.map(t => t.name)))
      .catch(console.error)
  }, [])

  // ── Fetch All Operational Data ──
  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    setError('')
    try {
      const [queueData, statsData, uncollectedData, collectedData] = await Promise.all([
        getTodaysQueue(token),
        getLiveQueueStats(token),
        getUncollectedDocuments(token),
        getCollectedDocuments(token, 100)
      ])
      setQueue(queueData || [])
      setQueueStats(statsData)
      setUncollected(uncollectedData || [])
      setCollected(collectedData || [])
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(() => fetchAllData(false), 10000)
    return () => clearInterval(interval)
  }, [fetchAllData])

  // ── Send Reminder to Student ──
  const handleRemindStudent = async (queueTicketId, studentName) => {
    setRemindingId(queueTicketId)
    try {
      await remindStudent(token, queueTicketId)
      showToast(`Reminder sent to ${studentName}!`)
    } catch (err) {
      showToast(`Could not send reminder: ${err.message}`, 'error')
    } finally {
      setRemindingId(null)
    }
  }

  // ── Modal Actions (Confirm / Release Date) ──
  const handleConfirmStep = async (ticketId, stepNum, txName, studentName, confirmLabel, releaseDateToSet, releasedTo, documentVerified) => {
    const key = `${ticketId}-${stepNum}`
    setConfirmingKey(key)
    try {
      await confirmStep(token, ticketId, stepNum, releasedTo, documentVerified)
      if (releaseDateToSet && viewingTicketData) {
        const apptId = viewingTicketData.ticket?.appointment_id || viewingTicketData.ticket?.appointments?.id
        if (apptId) {
          await updateReleaseDate(token, apptId, releaseDateToSet)
        }
      }
      showToast(`Step ${stepNum} for ${studentName} completed!`)
      setViewingTicketData(null)
      await fetchAllData(true)
    } catch (err) {
      showToast(`Failed to update step: ${err.message}`, 'error')
    } finally {
      setConfirmingKey(null)
    }
  }

  const handleSetReleaseDate = async (appointmentId, dateVal) => {
    try {
      await updateReleaseDate(token, appointmentId, dateVal)
      await fetchAllData(true)
      showToast('Release date updated successfully!')
    } catch (err) {
      showToast(`Failed to update release date: ${err.message}`, 'error')
      throw err
    }
  }

  // ── Categorize Queue Data ──
  const {
    atWindows,
    waitingInLine,
    inPreparation,
    readyReleases,
    overdueReleases,
    completedTodayCount
  } = useMemo(() => {
    const nonCompleted = queue.filter(q => q.ticket.status !== 'completed')
    
    // Serving at counter windows
    const atWindows = nonCompleted.filter(({ ticket, steps }) => {
      if (ticket.status !== 'in_progress') return false
      const current = steps?.find(s => s.status === 'in_progress')
      if (!current) return false
      const stepName = (current.step_name || '').toLowerCase()
      const location = (current.location || '').toLowerCase()
      if (stepName.includes('preparation') || stepName.includes('release') || location === 'back office') {
        return false
      }
      return current.requires_presence !== false
    })

    // Waiting in line
    const waitingInLine = nonCompleted.filter(({ ticket }) => ticket.status === 'waiting' || ticket.status === 'pending')

    // In Preparation (Back Office)
    const inPreparation = nonCompleted.filter(({ ticket, steps }) => {
      if (ticket.status !== 'in_progress') return false
      const current = steps?.find(s => s.status === 'in_progress')
      if (!current) return false
      const stepName = (current.step_name || '').toLowerCase()
      const location = (current.location || '').toLowerCase()
      return stepName.includes('preparation') || location === 'back office' || current.requires_presence === false
    })

    // Helper to check if a timestamp matches today in user's local timezone
    const isSameLocalDate = (dateStr) => {
      if (!dateStr) return false
      const d = new Date(dateStr)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate()
    }

    // Ready for pickup releases
    const readyReleases = uncollected
    const overdueReleases = uncollected.filter(d => (d.days_waiting || 0) >= 3)

    // Completed strictly today in local timezone
    const isTicketCompletedToday = (q) => {
      if (q.ticket.status !== 'completed') return false
      const lastConfirmed = q.steps?.filter(s => s.status === 'completed' && s.confirmed_at)
        .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at))[0]
      const ts = lastConfirmed?.confirmed_at || q.ticket.updated_at || q.ticket.created_at
      return isSameLocalDate(ts)
    }
    const queueCompletedToday = queue.filter(isTicketCompletedToday).length
    const releasesCollectedToday = collected.filter(d => isSameLocalDate(d.confirmed_at)).length
    const completedTodayCount = queueCompletedToday + releasesCollectedToday

    return {
      atWindows,
      waitingInLine,
      inPreparation,
      readyReleases,
      overdueReleases,
      completedTodayCount
    }
  }, [queue, uncollected, collected])

  // ── Donut 1: Overall Queue Breakdown ──
  const pipelineDonut = useMemo(() => {
    const data = [
      { name: 'Serving at Windows', count: atWindows.length },
      { name: 'Waiting in Line', count: waitingInLine.length },
      { name: 'Preparing Documents', count: inPreparation.length },
      { name: 'Ready for Pickup', count: readyReleases.length },
      { name: 'Finished Today', count: completedTodayCount },
    ].filter(d => d.count > 0)

    const colors = data.map(d => {
      if (d.name.includes('Serving')) return PIPELINE_COLORS.serving
      if (d.name.includes('Waiting')) return PIPELINE_COLORS.waiting
      if (d.name.includes('Preparing')) return PIPELINE_COLORS.prep
      if (d.name.includes('Ready')) return PIPELINE_COLORS.ready
      return PIPELINE_COLORS.completed
    })

    const total = data.reduce((sum, d) => sum + d.count, 0)
    return { data, colors, total }
  }, [atWindows, waitingInLine, inPreparation, readyReleases, completedTodayCount])

  // ── Donut 2: Document Distribution ──
  const docDistributionDonut = useMemo(() => {
    const counts = {}
    
    // Count active queue
    queue.forEach(q => {
      const name = q.ticket.appointments?.transaction_types?.name || 'Other'
      counts[name] = (counts[name] || 0) + 1
    })
    // Count uncollected releases
    uncollected.forEach(d => {
      const name = d.transaction_type || 'Other'
      counts[name] = (counts[name] || 0) + 1
    })

    const data = Object.entries(counts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 6)

    const colors = data.map((d, i) => getDocumentColor(d.name, i))
    const total = data.reduce((sum, d) => sum + d.count, 0)
    return { data, colors, total }
  }, [queue, uncollected])

  // ── Unified Table Items Mapping ──
  const allUnifiedItems = useMemo(() => {
    // 1. Live Queue Items
    const queueItems = queue.map(q => {
      const { ticket, steps } = q
      const currentStep = steps?.find(s => s.status === 'in_progress')
      const student = ticket.users
      const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
      const studentId = student?.student_id || '—'
      const txName = ticket.appointments?.transaction_types?.name || 'Transaction'
      const pClass = ticket.appointments?.priority_class || 'regular'

      let stage = 'Waiting in Line'
      let statusKey = 'waiting'
      let statusLabel = 'In Line'
      let locationLabel = 'Counter Line'

      if (ticket.status === 'completed') {
        stage = 'Done'
        statusKey = 'completed'
        statusLabel = 'Completed'
        locationLabel = 'Archived'
      } else if (ticket.status === 'in_progress') {
        const stepName = (currentStep?.step_name || '').toLowerCase()
        const loc = (currentStep?.location || '').toLowerCase()
        
        if (stepName.includes('preparation') || loc === 'back office' || currentStep?.requires_presence === false) {
          stage = 'Preparing Document'
          statusKey = 'prep'
          statusLabel = 'Preparing'
          locationLabel = 'Back Office'
        } else if (stepName.includes('release')) {
          stage = 'Ready for Pickup'
          statusKey = 'ready'
          statusLabel = 'Ready for Pickup'
          locationLabel = currentStep?.location || 'Release Window'
        } else {
          stage = 'Serving at Counter'
          statusKey = 'serving'
          statusLabel = 'Serving Now'
          locationLabel = currentStep?.location || 'Window Counter'
        }
      }

      // Compute wait time in minutes
      let elapsedMins = 0
      if (ticket.created_at) {
        elapsedMins = Math.max(0, Math.floor((now.getTime() - Date.parse(ticket.created_at)) / 60000))
      }

      return {
        id: ticket.id,
        queue_number: ticket.queue_number,
        student_name: studentName,
        student_id: studentId,
        transaction_type: txName,
        priority_class: pClass,
        stage,
        statusKey,
        statusLabel,
        locationLabel,
        releaseDate: ticket.appointments?.release_date || null,
        elapsedText: `${elapsedMins} min`,
        rawDate: ticket.created_at,
        isReleaseOnly: false,
        rawTicketData: q
      }
    })

    // 2. Uncollected Releases
    const releaseItems = uncollected.map(d => {
      const isOverdue = (d.days_waiting || 0) >= 3
      return {
        id: d.queue_ticket_id,
        queue_number: d.queue_number,
        student_name: d.student_name || 'Unknown Student',
        student_id: d.student_id || '—',
        transaction_type: d.transaction_type,
        priority_class: d.priority_class || 'regular',
        stage: 'Ready for Pickup',
        statusKey: isOverdue ? 'overdue' : 'ready',
        statusLabel: isOverdue ? 'Overdue for Pickup' : 'Ready for Pickup',
        locationLabel: 'Release Window',
        releaseDate: d.release_date || null,
        elapsedText: d.days_waiting !== null ? `${d.days_waiting} days waiting` : 'Ready today',
        rawDate: d.release_date || d.activated_at,
        isReleaseOnly: true,
        step_number: d.step_number,
        rawTicketData: {
          ticket: {
            id: d.queue_ticket_id,
            queue_number: d.queue_number,
            student_id: d.student_id,
            users: {
              first_name: d.student_name,
              last_name: '',
              student_id: d.student_id
            },
            appointments: {
              transaction_types: { name: d.transaction_type },
              priority_class: d.priority_class || 'regular',
              release_date: d.release_date || null
            }
          },
          steps: [
            {
              step_number: d.step_number || 3,
              step_name: 'Document Release / Issuance',
              status: 'in_progress',
              location: 'Release Window'
            }
          ]
        }
      }
    })

    // Combine avoiding duplication by queue_number
    const existingQueueNumbers = new Set(queueItems.map(item => item.queue_number))
    const uniqueReleaseItems = releaseItems.filter(item => !existingQueueNumbers.has(item.queue_number))
    
    let combined = [...queueItems, ...uniqueReleaseItems]

    // ── Tab Filtering ──
    if (activeTab === 'counter') {
      combined = combined.filter(i => i.statusKey === 'serving' || i.statusKey === 'waiting')
    } else if (activeTab === 'processing') {
      combined = combined.filter(i => i.statusKey === 'prep')
    } else if (activeTab === 'completed') {
      const isItemCompletedToday = (item) => {
        if (item.statusKey !== 'completed') return false
        const lastConfirmed = item.rawTicketData?.steps?.filter(s => s.status === 'completed' && s.confirmed_at)
          .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at))[0]
        const ts = lastConfirmed?.confirmed_at || item.rawDate
        if (!ts) return false
        const d = new Date(ts)
        const now = new Date()
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate()
      }
      combined = combined.filter(isItemCompletedToday)
    } else if (activeTab === 'all_active') {
      combined = combined.filter(i => i.statusKey !== 'completed')
    }

    // ── Search & Dropdown Filters ──
    return combined.filter(item => {
      const s = search.toLowerCase().trim()
      const searchMatch = !s ||
        item.queue_number.toLowerCase().includes(s) ||
        item.student_name.toLowerCase().includes(s) ||
        item.student_id.toLowerCase().includes(s) ||
        item.transaction_type.toLowerCase().includes(s)

      const txMatch = txTypeFilter === 'all' || item.transaction_type === txTypeFilter
      
      let prioMatch = true
      if (priorityFilter === 'high') {
        prioMatch = item.priority_class === 'alumni' || item.priority_class === 'pwd' || item.priority_class === 'pregnant'
      } else if (priorityFilter === 'regular') {
        prioMatch = item.priority_class === 'regular' || !item.priority_class
      }

      return searchMatch && txMatch && prioMatch
    })
  }, [queue, uncollected, activeTab, search, txTypeFilter, priorityFilter, now])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allUnifiedItems.length / PER_PAGE))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return allUnifiedItems.slice(start, start + PER_PAGE)
  }, [allUnifiedItems, currentPage])

  // ── CSV Export ──
  const exportToCSV = () => {
    if (allUnifiedItems.length === 0) return
    const headers = ['Queue Number', 'Student Name', 'Student ID', 'Document / Service', 'Priority', 'Target Release Date', 'Wait Time', 'Status']
    const rows = allUnifiedItems.map(d => [
      d.queue_number,
      `"${d.student_name}"`,
      d.student_id || '—',
      `"${d.transaction_type}"`,
      d.priority_class || 'regular',
      d.releaseDate ? `"${d.releaseDate}"` : 'Not set',
      d.elapsedText,
      d.statusLabel
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `queue_monitoring_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Downloaded monitoring report to CSV!')
  }

  return (
    <div className="animate-fade-up font-sans flex flex-col gap-6 max-w-400 mx-auto pb-12">
      
      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className={`fixed bottom-10 right-8 z-9999 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border text-[13.5px] font-bold animate-fade-up ${
          toastMsg.type === 'error' 
            ? 'bg-red-600 text-white border-red-700' 
            : 'bg-[#006600] text-white border-[#005200]'
        }`}>
          {toastMsg.type === 'error' ? (
            <AlertTriangle size={17} className="shrink-0 text-white" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Check size={13} className="text-white stroke-3" />
            </div>
          )}
          <span className="text-white">{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2.5 bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-0 flex items-center shrink-0 transition-opacity">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-2 flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2 flex items-center gap-2">
            <span>QUEUE &amp; RELEASES</span>
            <span className="text-border-strong">•</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE (10s)
            </span>
          </div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <Activity className="text-maroon" size={24} /> Queue &amp; Document Monitoring
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
            Real-time monitoring for counter windows, document processing, and student pickups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {lastUpdated && (
            <span className="text-[11px] text-text-muted font-medium bg-white px-3 py-2 rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              Updated: <strong className="text-text-main">{lastUpdated}</strong>
            </span>
          )}
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-white text-text-main text-[12.5px] font-bold cursor-pointer hover:bg-surface transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-maroon' : 'text-text-muted'} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-white text-text-main text-[12.5px] font-bold cursor-pointer hover:bg-surface transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <Download size={14} className="text-text-muted" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-light text-danger p-4 rounded-xl text-sm font-semibold border border-danger-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
          <button onClick={() => setError('')} className="bg-transparent border-none text-danger cursor-pointer"><X size={15} /></button>
        </div>
      )}

      {/* ── Real-Time Status Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* At Windows */}
        <div className="bg-white rounded-2xl p-4.5 border border-border shadow-xs flex flex-col justify-between transition-all hover:border-maroon/40 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Serving </span>
            <div className="w-8 h-8 rounded-lg bg-maroon-light text-maroon flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[28px] font-extrabold text-maroon leading-none mb-1">
              {loading ? <div className="animate-pulse w-10 h-7 bg-border rounded" /> : atWindows.length}
            </div>
            <div className="text-[10.5px] text-text-sub font-medium">Students at counter</div>
          </div>
        </div>

        {/* Waiting in Line */}
        <div className="bg-white rounded-2xl p-4.5 border border-border shadow-xs flex flex-col justify-between transition-all hover:border-gold/40 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Waiting in Line</span>
            <div className="w-8 h-8 rounded-lg bg-gold-light text-gold flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[28px] font-extrabold text-maroon leading-none mb-1">
              {loading ? <div className="animate-pulse w-10 h-7 bg-border rounded" /> : waitingInLine.length}
            </div>
            <div className="text-[10.5px] text-text-sub font-medium">Next in line</div>
          </div>
        </div>

        {/* In Document Prep */}
        <div className="bg-white rounded-2xl p-4.5 border border-border shadow-xs flex flex-col justify-between transition-all hover:border-maroon/40 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Preparing Docs</span>
            <div className="w-8 h-8 rounded-lg bg-maroon-light text-maroon flex items-center justify-center">
              <FileEdit size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[28px] font-extrabold text-maroon leading-none mb-1">
              {loading ? <div className="animate-pulse w-10 h-7 bg-border rounded" /> : inPreparation.length}
            </div>
            <div className="text-[10.5px] text-text-sub font-medium">Processing documents</div>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="bg-white rounded-2xl p-4.5 border border-border shadow-xs flex flex-col justify-between transition-all hover:border-gold/40 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Ready for Pickup</span>
            <div className="w-8 h-8 rounded-lg bg-gold-light text-gold flex items-center justify-center">
              <FolderOpen size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[28px] font-extrabold text-maroon leading-none mb-1 flex items-baseline gap-2">
              {loading ? <div className="animate-pulse w-10 h-7 bg-border rounded" /> : readyReleases.length}
              {overdueReleases.length > 0 && (
                <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.5 rounded border border-danger-border">
                  {overdueReleases.length} overdue
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-text-sub font-medium">Waiting for student claim</div>
          </div>
        </div>

        {/* Finished Today */}
        <div className="bg-white rounded-2xl p-4.5 border border-border shadow-xs flex flex-col justify-between transition-all hover:border-maroon/40 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Finished Today</span>
            <div className="w-8 h-8 rounded-lg bg-maroon-light text-maroon flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[28px] font-extrabold text-maroon leading-none mb-1">
              {loading ? <div className="animate-pulse w-10 h-7 bg-border rounded" /> : completedTodayCount}
            </div>
            <div className="text-[10.5px] text-text-sub font-medium">Completed transactions</div>
          </div>
        </div>

      </div>

      {/* ── Donut Reports & Highlights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Donut 1: Overall Queue Status */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-extrabold text-gold uppercase tracking-wider m-0 mb-0.5">QUEUE OVERVIEW</p>
                <h3 className="font-serif text-[17px] font-bold text-text-main m-0">Where Students Are Now</h3>
              </div>
              <span className="text-[11px] font-bold text-text-muted bg-off-white px-2.5 py-1 rounded-full border border-border">
                {pipelineDonut.total} Active Total
              </span>
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center"><RefreshCw className="animate-spin text-text-muted" size={24} /></div>
            ) : pipelineDonut.total === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-text-muted text-sm">
                <Layers size={32} className="opacity-30 mb-2" />
                No active queue records today
              </div>
            ) : (
              <DonutChart
                data={pipelineDonut.data}
                total={pipelineDonut.total}
                colors={pipelineDonut.colors}
              />
            )}
          </div>
        </div>

        {/* Donut 2: Most Requested Documents */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-extrabold text-gold uppercase tracking-wider m-0 mb-0.5">DOCUMENTS &amp; SERVICES</p>
                <h3 className="font-serif text-[17px] font-bold text-text-main m-0">Requests by Document Type</h3>
              </div>
              <span className="text-[11px] font-bold text-text-muted bg-off-white px-2.5 py-1 rounded-full border border-border">
                {docDistributionDonut.total} Tracked
              </span>
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center"><RefreshCw className="animate-spin text-text-muted" size={24} /></div>
            ) : docDistributionDonut.total === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-text-muted text-sm">
                <FileText size={32} className="opacity-30 mb-2" />
                No active document requests
              </div>
            ) : (
              <DonutChart
                data={docDistributionDonut.data}
                total={docDistributionDonut.total}
                colors={docDistributionDonut.colors}
              />
            )}
          </div>
        </div>

        {/* Quick Summary & Alerts */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-gold" />
              <h3 className="font-serif text-[17px] font-bold text-maroon m-0">AI Summary </h3>
            </div>
            <p className="text-[12px] text-text-sub leading-relaxed mb-4">
              Important updates on student wait times, counter workload, and pickups.
            </p>

            {loading ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-off-white border border-border flex items-start gap-3 animate-pulse">
                    <div className="w-7.5 h-7.5 rounded-lg bg-border/60 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="h-3.5 bg-border/70 rounded w-2/5" />
                      <div className="h-2.5 bg-border/50 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {/* Alert 1 */}
                <div className="p-3 rounded-xl bg-off-white border border-border flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold-light text-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-text-main">Busiest Hours Expected</div>
                    <div className="text-[11px] text-text-sub mt-0.5">
                      Highest queue traffic expected around <strong className="text-text-main">{queueStats?.peak_forecast === 'No Data' ? 'None scheduled' : (queueStats?.peak_forecast || 'None')}</strong>.
                    </div>
                  </div>
                </div>

                {/* Alert 2 */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 ${overdueReleases.length > 0 ? 'bg-danger-light/60 border-danger-border' : 'bg-success-light/40 border-success-border/60'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${overdueReleases.length > 0 ? 'bg-danger-light text-danger' : 'bg-success-light text-success'}`}>
                    {overdueReleases.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <div className={`text-[12px] font-bold ${overdueReleases.length > 0 ? 'text-danger' : 'text-success'}`}>
                      {overdueReleases.length > 0 ? `${overdueReleases.length} Overdue Pickups` : 'Pickups On Schedule'}
                    </div>
                    <div className="text-[11px] text-text-sub mt-0.5">
                      {overdueReleases.length > 0 
                        ? 'You can click "Remind" in the table below to alert students.' 
                        : 'Students are picking up their prepared documents on time.'}
                    </div>
                  </div>
                </div>

                {/* Alert 3 */}
                <div className="p-3 rounded-xl bg-off-white border border-border flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-maroon-light text-maroon flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-text-main">Priority Lane Active</div>
                    <div className="text-[11px] text-text-sub mt-0.5">
                      Senior, PWD, Pregnant, and Alumni students are automatically prioritized in the queue.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Live Monitoring Table ── */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        
        {/* Table Filter Tabs and Controls */}
        <div className="border-b border-border bg-white">
          
          {/* Row 1: Dedicated Horizontal Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 px-5 pt-3 overflow-x-auto scrollbar-none border-b border-border/70">
            {[
              { id: 'all_active', label: 'All Active', count: atWindows.length + waitingInLine.length + inPreparation.length + readyReleases.length },
              { id: 'counter', label: 'Counter & Line', count: atWindows.length + waitingInLine.length },
              { id: 'processing', label: 'In Preparation', count: inPreparation.length },
              { id: 'releases', label: 'Ready for Pickup', count: readyReleases.length },
              { id: 'completed', label: 'Finished Today', count: completedTodayCount },
            ].map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                  className={`relative pb-3.5 px-3.5 text-[13px] font-bold cursor-pointer transition-all flex items-center gap-2 border-none bg-transparent whitespace-nowrap ${
                    isActive ? 'text-maroon' : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                    isActive 
                      ? 'bg-maroon text-white shadow-xs' 
                      : 'bg-surface text-text-sub border border-border/80'
                  }`}>
                    {tab.count}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.75 bg-maroon rounded-t-full" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Row 2: Search, Filters & Action Controls */}
          <div className="p-4 px-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-off-white/40">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search queue number, student name, ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-white text-[12.5px] font-medium outline-none text-text-main focus:border-maroon focus:ring-1 focus:ring-maroon transition-all shadow-xs"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main bg-transparent border-none cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <CustomDropdown
                value={txTypeFilter}
                onChange={val => { setTxTypeFilter(val); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'All Document Types' },
                  ...availableTxTypes.map(t => ({ value: t, label: t }))
                ]}
              />

              <CustomDropdown
                value={priorityFilter}
                onChange={val => { setPriorityFilter(val); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'high', label: 'High Priority (Alumni/PWD)' },
                  { value: 'regular', label: 'Regular Students' },
                ]}
              />
            </div>
          </div>

        </div>

        {/* ── Table View ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-235">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em]">
                <th className="py-3.5 px-6">Queue No.</th>
                <th className="py-3.5 px-6">Student Name &amp; ID</th>
                <th className="py-3.5 px-6">Document / Service</th>
                <th className="py-3.5 px-6">Target Release Date</th>
                <th className="py-3.5 px-6">Wait Time</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-text-muted">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-maroon" size={24} />
                    <p className="text-[13px] m-0 font-medium">Loading live queue and pickup records...</p>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-14 h-14 bg-off-white rounded-full flex items-center justify-center mx-auto mb-3 border border-border text-text-muted">
                      <Layers size={24} />
                    </div>
                    <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">No Queue Records Found</h4>
                    <p className="text-[12.5px] text-text-sub m-0 max-w-sm mx-auto">
                      {search ? 'No tickets match your search.' : 'There are currently no tickets in this tab.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isHighPrio = item.priority_class === 'alumni' || item.priority_class === 'pwd' || item.priority_class === 'pregnant'
                  return (
                    <tr key={item.id || item.queue_number} className="hover:bg-off-white/60 transition-colors">
                      
                      {/* Queue Number */}
                      <td className="py-4 px-6">
                        <div className="font-serif text-[20px] font-bold text-maroon leading-tight tracking-tight">
                          {item.queue_number}
                        </div>
                        {isHighPrio && (
                          <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border">
                            {item.priority_class}
                          </span>
                        )}
                      </td>

                      {/* Student Details */}
                      <td className="py-4 px-6">
                        <div className="text-[13.5px] font-bold text-text-main leading-snug">
                          {item.student_name}
                        </div>
                        <div className="text-[11.5px] text-text-muted font-mono mt-0.5">
                          ID: {item.student_id}
                        </div>
                      </td>

                      {/* Document / Service */}
                      <td className="py-4 px-6">
                        <span
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg border"
                          style={{
                            backgroundColor: `${getDocumentColor(item.transaction_type)}12`,
                            color: getDocumentColor(item.transaction_type),
                            borderColor: `${getDocumentColor(item.transaction_type)}30`,
                          }}
                        >
                          <FileText size={12} />
                          <span className="truncate max-w-44">{item.transaction_type}</span>
                        </span>
                      </td>

                      {/* Target Release Date */}
                      <td className="py-4 px-6">
                        {item.releaseDate ? (
                          <div className="text-[13px] font-semibold text-text-main flex items-center gap-1.5">
                            <Calendar size={13} className="text-text-muted shrink-0" />
                            <span>{new Date(item.releaseDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-text-muted italic">
                            Not set yet
                          </span>
                        )}
                      </td>

                      {/* Elapsed / Waiting */}
                      <td className="py-4 px-6">
                        <div className="text-[12.5px] font-semibold text-text-main flex items-center gap-1.5">
                          <Clock size={13} className="text-text-muted" />
                          <span>{item.elapsedText}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        {item.statusKey === 'serving' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Serving Now
                          </span>
                        ) : item.statusKey === 'waiting' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold-light text-gold border border-gold-border">
                            <Clock size={11} /> In Line
                          </span>
                        ) : item.statusKey === 'prep' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-light text-blue border border-blue-border">
                            <Cog size={11} className="animate-spin" style={{ animationDuration: '3s' }} /> Preparing
                          </span>
                        ) : item.statusKey === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-danger-light text-danger border border-danger-border animate-pulse">
                            <AlertTriangle size={11} /> Overdue Pickup
                          </span>
                        ) : item.statusKey === 'ready' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold-light text-gold border border-gold-border">
                            <FolderOpen size={11} /> Ready for Pickup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border">
                            <CheckCircle2 size={11} /> Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Details Button */}
                          <button
                            onClick={() => setViewingTicketData(item)}
                            title="View full ticket details and schedule"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-[11.5px] font-bold cursor-pointer hover:bg-surface hover:border-maroon/30 transition-all shadow-xs"
                          >
                            <Eye size={12} className="text-text-muted" />
                            <span>Details</span>
                          </button>

                          {/* Remind Button for uncollected / overdue releases */}
                          {(item.statusKey === 'ready' || item.statusKey === 'overdue') && (
                            <button
                              onClick={() => handleRemindStudent(item.id, item.student_name)}
                              disabled={remindingId === item.id}
                              title="Send reminder notification to student"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-[11.5px] font-bold cursor-pointer hover:bg-surface hover:border-gold/40 transition-all shadow-xs disabled:opacity-50"
                            >
                              <Bell size={12} className={remindingId === item.id ? 'animate-spin text-gold' : 'text-gold'} />
                              <span>{remindingId === item.id ? 'Sending...' : 'Remind'}</span>
                            </button>
                          )}

                          {/* Tag for completed items */}
                          {item.statusKey === 'completed' && (
                            <span className="text-[11px] text-text-muted font-medium italic">
                              Done
                            </span>
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

        {/* ── Table Footer & Pagination ── */}
        <div className="p-4 border-t border-border bg-off-white/40 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-[12px] text-text-muted">
            Showing <strong className="text-text-main">{allUnifiedItems.length > 0 ? (currentPage - 1) * PER_PAGE + 1 : 0}</strong> to <strong className="text-text-main">{Math.min(currentPage * PER_PAGE, allUnifiedItems.length)}</strong> of <strong className="text-text-main">{allUnifiedItems.length}</strong> tickets
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, currentPage - 3),
              Math.min(totalPages, currentPage + 2)
            ).map(num => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold cursor-pointer transition-colors ${currentPage === num ? 'bg-maroon text-white border border-maroon' : 'bg-white text-text-main border border-border hover:bg-surface'}`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* ── Queue Details Modal ── */}
      {viewingTicketData && (
        <AdminTicketDetailsModal
          item={viewingTicketData}
          onClose={() => setViewingTicketData(null)}
        />
      )}

    </div>
  )
}