import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { useToast } from '../../context/ToastContext'
import {
  getTodaysQueue,
  getUncollectedDocuments,
  getCollectedDocuments,
  remindStudent
} from '../../services/queueService'
import { getTransactionTypes } from '../../services/appointmentService'
import { getDocumentColor } from '../../utils/colors'
import DonutChart from '../../components/DonutChart'
import {
  RefreshCw,
  AlertTriangle,
  Ticket,
  Users,
  Clock,
  Check,
  Cog,
  FolderOpen,
  CheckCircle2,
  Search,
  Download,
  ChevronDown,
  Calendar,
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
  serving: '#006600',    // Green
  waiting: '#B8900A',    // Gold
  prep: '#1D4ED8',       // Blue
  ready: '#15803D',      // Green
  completed: '#7B1A2A',  // Maroon
}

const cleanDocName = (name = '') => {
  if (!name) return ''
  return String(name).replace(/([^\s])\(/g, '$1 (').trim()
}

const CustomDropdown = ({ value, onChange, options, label, isOpen, onToggle, onClose, align = 'left' }) => {
  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className="relative z-20 group min-w-36">
      {label && <div className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.08em] mb-1">{label}</div>}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border bg-white text-fluid-12 text-text-main font-semibold outline-none cursor-pointer font-sans transition-all shadow-2xs ${
          isOpen ? 'border-maroon/50 ring-2 ring-maroon/10 shadow-xs' : 'border-border hover:border-maroon/30 hover:bg-surface/30'
        }`}
      >
        <span className="truncate pr-1 text-left">{currentLabel}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-maroon' : 'group-hover:text-text-main'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-max min-w-48 max-w-72 sm:max-w-80 bg-white rounded-2xl border border-border shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-fade-up max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar`}>
            {options.map(o => {
              const isActive = value === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); onClose?.(); }}
                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-2.5 text-fluid-12 font-medium transition-colors ${
                    isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main hover:bg-off-white'
                  }`}
                >
                  <span className="truncate pr-1" title={o.label}>{o.label}</span>
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
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
      {/* Modal Dialog Box */}
      <div 
        className="animate-fade-up relative my-auto w-full max-w-2xl bg-white text-text-main rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border flex flex-col max-h-[88vh] font-sans overflow-hidden z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Top decorative accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-maroon via-maroon-dark to-gold" />

        {/* Modal Header: Pinned */}
        <div className="flex justify-between items-start mb-5 pb-4 border-b border-border shrink-0 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-light text-gold text-fluid-11 font-extrabold uppercase tracking-wider border border-gold-border">
                <Ticket size={13} /> Queue Ticket Details
              </span>
              <span className={`text-fluid-11 font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                item.statusKey === 'serving' ? 'bg-success-light text-success border-success-border' :
                item.statusKey === 'waiting' ? 'bg-gold-light text-gold border-gold-border' :
                item.statusKey === 'prep' ? 'bg-blue-light text-blue border-blue-border' :
                item.statusKey === 'overdue' ? 'bg-danger-light text-danger border-danger-border' :
                item.statusKey === 'ready' ? 'bg-success-light text-success border-success-border' :
                'bg-success-light text-success border-success-border'
              }`}>
                {item.statusLabel}
              </span>
              {item.priority_class && item.priority_class !== 'regular' && (
                <span className="text-fluid-11 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-maroon-light text-maroon border border-maroon-border">
                  {item.priority_class} Priority
                </span>
              )}
            </div>
            <h2 className="font-serif text-fluid-28 sm:text-fluid-32 font-extrabold text-maroon m-0 leading-none">
              {item.queue_number}
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="overflow-y-auto flex-1 pr-1.5 flex flex-col gap-4">
          
          {/* 1. Student Information */}
          <div className="p-4.5 sm:p-5 rounded-2xl bg-surface border border-border">
            <div className="text-fluid-11 font-extrabold text-maroon uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users size={14} className="text-gold" /> Student Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-fluid-11-5 text-text-muted font-medium block">Full Name</span>
                <strong className="text-fluid-14 text-text-main font-bold block mt-0.5">{studentName}</strong>
              </div>
              <div>
                <span className="text-fluid-11-5 text-text-muted font-medium block">Student ID Number</span>
                <strong className="text-fluid-13 text-text-main font-mono font-bold mt-0.5 bg-white px-2.5 py-1 rounded-lg border border-border inline-block">
                  {item.student_id || user.student_id || '—'}
                </strong>
              </div>
              <div>
                <span className="text-fluid-11-5 text-text-muted font-medium block">Priority Category</span>
                <span className="text-fluid-13 text-text-main font-semibold block mt-0.5 capitalize">
                  {item.priority_class || 'Regular'}
                </span>
              </div>
              {user.email && (
                <div>
                  <span className="text-fluid-11-5 text-text-muted font-medium block">Email Address</span>
                  <span className="text-fluid-13 text-text-sub font-medium block mt-0.5 truncate">{user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Document & Service Details */}
          <div className="p-4.5 sm:p-5 rounded-2xl bg-surface border border-border">
            <div className="text-fluid-11 font-extrabold text-maroon uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText size={14} className="text-gold" /> Document &amp; Service Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <span className="text-fluid-11-5 text-text-muted font-medium block">Requested Document</span>
                <strong className="text-fluid-14-5 text-maroon font-bold block mt-0.5">{item.transaction_type}</strong>
              </div>
              {appt.notes && (
                <div className="sm:col-span-2">
                  <span className="text-fluid-11-5 text-text-muted font-medium block">Purpose / Student Remarks</span>
                  <p className="text-fluid-12-5 text-text-main font-medium mt-1 bg-white p-3 rounded-xl border border-border m-0">
                    {appt.notes}
                  </p>
                </div>
              )}
              {reqDocs.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-fluid-11-5 text-text-muted font-medium block mb-1.5">Required Documents</span>
                  <div className="flex flex-wrap gap-2">
                    {reqDocs.map((doc, idx) => (
                      <span key={idx} className="text-fluid-11-5 font-semibold bg-white text-text-main px-3 py-1 rounded-lg border border-border flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-success" /> {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Queue Schedule & Release Timeline */}
          <div className="p-4.5 sm:p-5 rounded-2xl bg-surface border border-border">
            <div className="text-fluid-11 font-extrabold text-maroon uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-gold" /> Queue Timeline &amp; Release Schedule
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-fluid-11-5 text-text-muted font-medium block">Ticket Generated At</span>
                <span className="text-fluid-13 text-text-main font-semibold block mt-0.5">
                  {item.rawDate ? new Date(item.rawDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                </span>
              </div>
              <div>
                <span className="text-fluid-11-5 text-text-muted font-medium block">Target Release Date</span>
                <span className="text-fluid-13 text-gold font-bold block mt-0.5 items-center gap-1.5">
                  <Calendar size={13} className="text-gold" />
                  {item.releaseDate ? new Date(item.releaseDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled yet'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-fluid-11-5 text-text-muted font-medium block">Queue Wait Time</span>
                <span className="text-fluid-13 text-text-main font-semibold block mt-0.5">
                  {item.elapsedText}
                </span>
              </div>
              {lastConfirmedStep && (
                <div className="sm:col-span-2 pt-3 border-t border-border">
                  <span className="text-fluid-11-5 text-text-muted font-medium block">Last Confirmed Step</span>
                  <span className="text-fluid-13 text-success font-bold block mt-0.5">
                    ✓ {lastConfirmedStep.step_name} at {new Date(lastConfirmedStep.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer: Pinned at bottom */}
        <div className="mt-5 pt-4 border-t border-border flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-fluid-13 font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
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
  const [uncollected, setUncollected] = useState([])
  const [collected, setCollected] = useState([])
  const [availableTxTypes, setAvailableTxTypes] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow] = useState(new Date())
  const toast = useToast()

  // Filters & State
  const [activeTab, setActiveTab] = useState('all_active') // 'all_active', 'counter', 'processing', 'releases', 'completed'
  const [search, setSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PER_PAGE = 10

  // Details Modal
  const [viewingTicketData, setViewingTicketData] = useState(null)
  const [remindingId, setRemindingId] = useState(null)

  const showToast = (msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
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
      const [queueData, uncollectedData, collectedData] = await Promise.all([
        getTodaysQueue(token),
        getUncollectedDocuments(token),
        getCollectedDocuments(token, 100)
      ])
      setQueue(queueData || [])
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

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(['QUEUE_UPDATED', 'WINDOW_UPDATED', 'RELEASES_UPDATED'], () => {
    fetchAllData(false)
  })

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(() => fetchAllData(false), 60000)
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

  // ── Categorize Queue Data ──
  const {
    atWindows,
    waitingInLine,
    inPreparation,
    readyReleases,
    overdueReleases,
    completedTodayCount
  } = useMemo(() => {
    const nonCompleted = queue.filter(q => 
      q.ticket.status !== 'completed' && 
      q.ticket.status !== 'cancelled' && 
      q.ticket.status !== 'no_show' && 
      q.ticket.appointments?.status !== 'cancelled'
    )
    
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

    // Deduplicate unique completed tickets/releases for today in local timezone
    const completedTodayMap = new Map()
    queue.forEach(q => {
      if (q.ticket.status === 'completed') {
        const lastConfirmed = q.steps?.filter(s => s.status === 'completed' && s.confirmed_at)
          .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at))[0]
        const ts = lastConfirmed?.confirmed_at || q.ticket.updated_at || q.ticket.created_at
        if (isSameLocalDate(ts)) {
          completedTodayMap.set(q.ticket.queue_number, true)
        }
      }
    })
    collected.forEach(d => {
      if (isSameLocalDate(d.confirmed_at)) {
        completedTodayMap.set(d.queue_number, true)
      }
    })
    const completedTodayCount = completedTodayMap.size

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
    
    // 1. Count from active queue (count each requested document towards document demand)
    queue.filter(q => 
      q.ticket.status !== 'cancelled' && 
      q.ticket.status !== 'no_show' && 
      q.ticket.appointments?.status !== 'cancelled'
    ).forEach(q => {
      const docs = q.ticket.appointments?.selected_documents || (q.ticket.appointments?.transaction_types ? [q.ticket.appointments.transaction_types] : []);
      if (docs.length > 0) {
        docs.forEach(d => {
          const name = d.name || 'Other'
          counts[name] = (counts[name] || 0) + 1
        })
      } else {
        const name = q.ticket.appointments?.transaction_types?.name || 'Other'
        counts[name] = (counts[name] || 0) + 1
      }
    })

    // 2. Count uncollected releases
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
    const queueItems = queue.filter(q => 
      q.ticket.status !== 'cancelled' && 
      q.ticket.status !== 'no_show' && 
      q.ticket.appointments?.status !== 'cancelled'
    ).map(q => {
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

      // Compute human-readable wait time
      let elapsedText = 'Completed'
      if (ticket.status !== 'completed' && ticket.created_at) {
        const elapsedMins = Math.max(0, Math.floor((now.getTime() - Date.parse(ticket.created_at)) / 60000))
        if (elapsedMins >= 1440) {
          const days = Math.floor(elapsedMins / 1440)
          const hours = Math.floor((elapsedMins % 1440) / 60)
          elapsedText = hours > 0 ? `${days}d ${hours}h` : `${days}d`
        } else if (elapsedMins >= 60) {
          const hours = Math.floor(elapsedMins / 60)
          const mins = elapsedMins % 60
          elapsedText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
        } else {
          elapsedText = `${elapsedMins} min`
        }
      }

      return {
        id: ticket.id,
        queue_number: ticket.queue_number,
        student_name: studentName,
        student_id: studentId,
        transaction_type: txName,
        selected_documents: ticket.appointments?.selected_documents || [],
        priority_class: pClass,
        stage,
        statusKey,
        statusLabel,
        locationLabel,
        releaseDate: ticket.appointments?.release_date || null,
        elapsedText,
        rawDate: ticket.created_at,
        isReleaseOnly: false,
        rawTicketData: q
      }
    })

    // 2. Uncollected Releases
    const releaseItems = uncollected.map(d => {
      const isOverdue = (d.days_waiting || 0) >= 3
      const elapsedText = d.days_waiting !== null && d.days_waiting !== undefined
        ? (d.days_waiting === 0 ? 'Ready today' : `${d.days_waiting}d waiting`)
        : 'Ready today'

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
        elapsedText,
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

    // 3. Collected Releases (Completed Pickups)
    const collectedItems = collected.map(d => {
      return {
        id: d.queue_ticket_id || `collected-${d.queue_number}`,
        queue_number: d.queue_number,
        student_name: d.student_name || 'Unknown Student',
        student_id: d.student_id || '—',
        transaction_type: d.transaction_type,
        priority_class: d.priority_class || 'regular',
        stage: 'Claimed / Completed',
        statusKey: 'completed',
        statusLabel: 'Completed',
        locationLabel: 'Release Window',
        releaseDate: d.release_date || null,
        elapsedText: 'Completed',
        rawDate: d.confirmed_at,
        isReleaseOnly: true,
        step_number: 3,
        rawTicketData: {
          ticket: {
            id: d.queue_ticket_id,
            queue_number: d.queue_number,
            student_id: d.student_id,
            status: 'completed',
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
              step_number: 3,
              step_name: 'Document Release / Issuance',
              status: 'completed',
              confirmed_at: d.confirmed_at,
              released_to: d.released_to,
              location: 'Release Window'
            }
          ]
        }
      }
    })

    // Combine avoiding duplication by queue_number
    const existingQueueNumbers = new Set(queueItems.map(item => item.queue_number))
    const uniqueReleaseItems = releaseItems.filter(item => !existingQueueNumbers.has(item.queue_number))
    const uniqueCollectedItems = collectedItems.filter(item => !existingQueueNumbers.has(item.queue_number))
    
    let combined = [...queueItems, ...uniqueReleaseItems, ...uniqueCollectedItems]

    // ── Tab Filtering ──
    if (activeTab === 'counter') {
      combined = combined.filter(i => i.statusKey === 'serving' || i.statusKey === 'waiting')
    } else if (activeTab === 'processing') {
      combined = combined.filter(i => i.statusKey === 'prep')
    } else if (activeTab === 'releases') {
      combined = combined.filter(i => i.statusKey === 'ready' || i.statusKey === 'overdue')
    } else if (activeTab === 'completed') {
      const isItemCompletedToday = (item) => {
        if (item.statusKey !== 'completed') return false
        const lastConfirmed = item.rawTicketData?.steps?.filter(s => s.status === 'completed' && s.confirmed_at)
          .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at))[0]
        const ts = lastConfirmed?.confirmed_at || item.rawDate
        if (!ts) return false
        const d = new Date(ts)
        const nowDate = new Date()
        return d.getFullYear() === nowDate.getFullYear() &&
               d.getMonth() === nowDate.getMonth() &&
               d.getDate() === nowDate.getDate()
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
      } else if (priorityFilter === 'pregnant') {
        prioMatch = item.priority_class === 'pregnant'
      } else if (priorityFilter === 'pwd') {
        prioMatch = item.priority_class === 'pwd'
      } else if (priorityFilter === 'alumni') {
        prioMatch = item.priority_class === 'alumni'
      } else if (priorityFilter === 'regular') {
        prioMatch = item.priority_class === 'regular' || !item.priority_class
      }

      return searchMatch && txMatch && prioMatch
    })
  }, [queue, uncollected, collected, activeTab, search, txTypeFilter, priorityFilter, now])

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
    <div className="animate-fade-up font-sans flex flex-col gap-6 w-full pb-10">
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-2 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0">Queue &amp; Releases</p>
            <span className="text-border-strong">•</span>
            <span className="flex items-center gap-1.5 text-fluid-10 font-bold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
            </span>
          </div>
          <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
            <Activity className="text-maroon shrink-0" size={26} /> Queue &amp; Document Monitoring
          </h1>
          <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
            Real-time monitoring for counter windows, document processing, and student pickups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {lastUpdated && (
            <span className="text-fluid-11 text-text-muted font-medium bg-white px-3 py-2 rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              Updated: <strong className="text-text-main">{lastUpdated}</strong>
            </span>
          )}
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-white text-text-main text-fluid-12-5 font-bold cursor-pointer hover:bg-surface transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-maroon' : 'text-text-muted'} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-white text-text-main text-fluid-12-5 font-bold cursor-pointer hover:bg-surface transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        
        {/* At Windows */}
        <div className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-4.5 sm:py-4 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">Serving Now</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-maroon-light text-maroon border border-maroon-border/60 flex items-center justify-center shrink-0">
              <UserCheck size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
              {loading ? <div className="animate-pulse w-10 h-6 sm:h-7 bg-border rounded-md" /> : atWindows.length}
            </div>
            <div className="text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 text-maroon flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
              <span>Students at counter</span>
            </div>
          </div>
        </div>

        {/* Waiting in Line */}
        <div className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-4.5 sm:py-4 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">Waiting in Line</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-gold-light text-gold border border-gold-border/60 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
              {loading ? <div className="animate-pulse w-10 h-6 sm:h-7 bg-border rounded-md" /> : waitingInLine.length}
            </div>
            <div className="text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 text-gold flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
              <span>Next in queue line</span>
            </div>
          </div>
        </div>

        {/* In Document Prep */}
        <div className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-4.5 sm:py-4 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">Preparing Docs</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-blue-light text-blue border border-blue-border/60 flex items-center justify-center shrink-0">
              <FileEdit size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
              {loading ? <div className="animate-pulse w-10 h-6 sm:h-7 bg-border rounded-md" /> : inPreparation.length}
            </div>
            <div className="text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 text-blue flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
              <span>Processing records</span>
            </div>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-4.5 sm:py-4 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">Ready for Pickup</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-gold-light text-gold border border-gold-border/60 flex items-center justify-center shrink-0">
              <FolderOpen size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0 flex items-baseline gap-2">
              {loading ? <div className="animate-pulse w-10 h-6 sm:h-7 bg-border rounded-md" /> : readyReleases.length}
              {overdueReleases.length > 0 && (
                <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.2 rounded border border-danger-border">
                  {overdueReleases.length} overdue
                </span>
              )}
            </div>
            <div className="text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 text-gold flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
              <span>Waiting for student claim</span>
            </div>
          </div>
        </div>

        {/* Finished Today */}
        <div className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-4.5 sm:py-4 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">Finished Today</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-success-light text-success border border-success-border/60 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-success leading-tight tracking-tight m-0">
              {loading ? <div className="animate-pulse w-10 h-6 sm:h-7 bg-border rounded-md" /> : completedTodayCount}
            </div>
            <div className="text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 text-success flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
              <span>Completed transactions</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Donut Reports & Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        
        {/* Donut 1: Overall Queue Status */}
        <div className="animate-fade-up bg-white rounded-2xl p-4.5 sm:p-5 border border-border shadow-2xs flex flex-col justify-between" style={{ animationDelay: '0.35s' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-fluid-9-5 font-extrabold text-gold uppercase tracking-wider m-0 mb-0.5">QUEUE OVERVIEW</p>
                <h3 className="font-serif text-fluid-15 font-bold text-text-main m-0">Where Students Are Now</h3>
              </div>
              <span className="text-fluid-10 font-bold text-text-muted bg-off-white px-2 py-0.5 rounded-full border border-border">
                {pipelineDonut.total} Active Total
              </span>
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="animate-spin text-text-muted" size={20} /></div>
            ) : pipelineDonut.total === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-text-muted text-xs">
                <Layers size={28} className="opacity-30 mb-1.5" />
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
        <div className="animate-fade-up bg-white rounded-2xl p-4.5 sm:p-5 border border-border shadow-2xs flex flex-col justify-between" style={{ animationDelay: '0.4s' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-fluid-9-5 font-extrabold text-gold uppercase tracking-wider m-0 mb-0.5">DOCUMENTS &amp; SERVICES</p>
                <h3 className="font-serif text-fluid-15 font-bold text-text-main m-0">Requests by Document Type</h3>
              </div>
              <span className="text-fluid-10 font-bold text-text-muted bg-off-white px-2 py-0.5 rounded-full border border-border">
                {docDistributionDonut.total} Tracked
              </span>
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="animate-spin text-text-muted" size={20} /></div>
            ) : docDistributionDonut.total === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-text-muted text-xs">
                <FileText size={28} className="opacity-30 mb-1.5" />
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

      </div>

      {/* ── Live Monitoring Table ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border shadow-2xs overflow-hidden" style={{ animationDelay: '0.5s' }}>
        
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
                  className={`relative pb-3.5 px-3.5 text-fluid-13 font-bold cursor-pointer transition-all flex items-center gap-2 border-none bg-transparent whitespace-nowrap ${
                    isActive ? 'text-maroon' : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-fluid-11 font-extrabold px-2 py-0.5 rounded-full transition-all ${
                    isActive 
                      ? 'bg-maroon text-white shadow-2xs' 
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
          <div className="p-4 px-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-surface/50">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search queue number, student name, ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-white text-fluid-12-5 font-medium outline-none text-text-main focus:border-maroon focus:ring-1 focus:ring-maroon transition-all shadow-2xs"
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
                isOpen={openDropdown === 'txType'}
                onToggle={() => setOpenDropdown(openDropdown === 'txType' ? null : 'txType')}
                onClose={() => setOpenDropdown(null)}
                align="left"
                options={[
                  { value: 'all', label: 'All Document Types' },
                  ...availableTxTypes.map(t => ({ value: t, label: cleanDocName(t) }))
                ]}
              />

              <CustomDropdown
                value={priorityFilter}
                onChange={val => { setPriorityFilter(val); setCurrentPage(1); }}
                isOpen={openDropdown === 'priority'}
                onToggle={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                onClose={() => setOpenDropdown(null)}
                align="right"
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'high', label: 'High Priority (PWD / Pregnant / Alumni)' },
                  { value: 'pregnant', label: 'Pregnant' },
                  { value: 'pwd', label: 'PWD' },
                  { value: 'alumni', label: 'Alumni' },
                  { value: 'regular', label: 'Regular Students' },
                ]}
              />
            </div>
          </div>

        </div>

        {/* ── Mobile Queue Cards (< lg screens) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden p-3.5 sm:p-4 bg-surface/30">
          {loading ? (
            <div className="col-span-full py-12 text-center text-text-muted">
              <RefreshCw className="animate-spin mx-auto mb-2 text-maroon" size={24} />
              <p className="text-fluid-13 m-0 font-medium">Loading live queue and pickup records...</p>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-2.5 border border-border text-text-muted">
                <Layers size={22} />
              </div>
              <h4 className="text-fluid-14 font-bold text-text-main m-0 mb-1">No Queue Records Found</h4>
              <p className="text-fluid-12 text-text-sub m-0 max-w-xs mx-auto">
                {search ? 'No tickets match your search.' : 'There are currently no tickets in this tab.'}
              </p>
            </div>
          ) : (
            paginatedItems.map((item) => {
              const isHighPrio = item.priority_class === 'alumni' || item.priority_class === 'pwd' || item.priority_class === 'pregnant'
              return (
                <div 
                  key={item.id || item.queue_number}
                  className="bg-white rounded-2xl border border-border p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-maroon/30 transition-all"
                >
                  {/* Card Header: Queue #, Priority, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-fluid-20 font-extrabold text-maroon leading-none">
                          {item.queue_number}
                        </span>
                        {isHighPrio && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border uppercase tracking-wider">
                            {item.priority_class}
                          </span>
                        )}
                      </div>
                      <div className="text-fluid-13 font-bold text-text-main mt-1.5 leading-snug">
                        {item.student_name}
                      </div>
                      <div className="text-fluid-11 font-mono text-text-muted">
                        ID: {item.student_id || '—'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {item.statusKey === 'serving' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" /> Serving Now
                        </span>
                      ) : item.statusKey === 'waiting' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold-light text-gold border border-gold-border whitespace-nowrap">
                          <Clock size={11} className="shrink-0" /> In Line
                        </span>
                      ) : item.statusKey === 'prep' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-light text-blue border border-blue-border whitespace-nowrap">
                          <Cog size={11} className="animate-spin shrink-0" style={{ animationDuration: '3s' }} /> Preparing
                        </span>
                      ) : item.statusKey === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-danger-light text-danger border border-danger-border animate-pulse whitespace-nowrap">
                          <AlertTriangle size={11} className="shrink-0" /> Overdue
                        </span>
                      ) : item.statusKey === 'ready' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border whitespace-nowrap">
                          <FolderOpen size={11} className="shrink-0" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border whitespace-nowrap">
                          <CheckCircle2 size={11} className="shrink-0" /> Done
                        </span>
                      )}

                      {item.statusKey !== 'completed' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface text-text-sub border border-border">
                          {item.elapsedText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document and Target Release Date */}
                  <div className="pt-2 border-t border-border/70 flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1">
                      {item.selected_documents && item.selected_documents.length > 1 ? (
                        item.selected_documents.map((d, idx) => (
                          <span
                            key={d.id || idx}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap"
                            style={{
                              backgroundColor: `${getDocumentColor(d.name)}12`,
                              color: getDocumentColor(d.name),
                              borderColor: `${getDocumentColor(d.name)}30`,
                            }}
                          >
                            <FileText size={11} className="shrink-0" />
                            <span>{d.name}</span>
                          </span>
                        ))
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-fluid-11-5 font-semibold px-2 py-0.5 rounded-lg border whitespace-nowrap"
                          style={{
                            backgroundColor: `${getDocumentColor(item.transaction_type)}12`,
                            color: getDocumentColor(item.transaction_type),
                            borderColor: `${getDocumentColor(item.transaction_type)}30`,
                          }}
                        >
                          <FileText size={11.5} className="shrink-0" />
                          <span>{item.transaction_type}</span>
                        </span>
                      )}
                    </div>

                    {item.releaseDate && (
                      <div className="text-[11.5px] font-medium text-text-sub flex items-center gap-1">
                        <Calendar size={12} className="text-text-muted" />
                        <span>Target: {new Date(item.releaseDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-border/70 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingTicketData(item)}
                      className="flex-1 py-2 px-3 rounded-xl border border-border bg-white text-text-main text-fluid-12 font-bold cursor-pointer hover:bg-surface active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>

                    {(item.statusKey === 'ready' || item.statusKey === 'overdue') && (
                      <button
                        type="button"
                        onClick={() => handleRemindStudent(item.id, item.student_name)}
                        disabled={remindingId === item.id}
                        className="py-2 px-3 rounded-xl border border-gold-border bg-gold-light text-gold text-fluid-12 font-bold cursor-pointer hover:bg-gold hover:text-white active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Bell size={13} className={remindingId === item.id ? 'animate-spin' : ''} />
                        <span>Remind</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Table View (>= lg screens) ── */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-240">
            <thead>
              <tr className="border-b border-border bg-off-white/80 text-fluid-10-5 font-extrabold text-text-muted uppercase tracking-[0.08em]">
                <th className="py-3.5 px-5 whitespace-nowrap">Queue No.</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Student Name &amp; ID</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Document / Service</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Target Release Date</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Wait Time</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-text-muted">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-maroon" size={24} />
                    <p className="text-fluid-13 m-0 font-medium">Loading live queue and pickup records...</p>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 border border-border text-text-muted">
                      <Layers size={24} />
                    </div>
                    <h4 className="text-fluid-15 font-bold text-text-main m-0 mb-1">No Queue Records Found</h4>
                    <p className="text-fluid-12-5 text-text-sub m-0 max-w-sm mx-auto">
                      {search ? 'No tickets match your search.' : 'There are currently no tickets in this tab.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isHighPrio = item.priority_class === 'alumni' || item.priority_class === 'pwd' || item.priority_class === 'pregnant'
                  return (
                    <tr key={item.id || item.queue_number} className="hover:bg-surface/60 transition-colors group">
                      
                      {/* Queue Number */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-serif text-fluid-17-5 font-bold text-maroon leading-none">
                          {item.queue_number}
                        </div>
                        {isHighPrio && (
                          <span className="inline-block mt-1 text-fluid-9 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border whitespace-nowrap">
                            {item.priority_class}
                          </span>
                        )}
                      </td>

                      {/* Student Details */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-fluid-13-5 font-bold text-text-main leading-snug group-hover:text-maroon transition-colors">
                          {item.student_name}
                        </div>
                        <div className="text-fluid-11-5 text-text-muted font-mono mt-0.5">
                          ID: {item.student_id}
                        </div>
                      </td>

                      {/* Document / Service */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {item.selected_documents && item.selected_documents.length > 1 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.selected_documents.map((d, idx) => (
                              <span
                                key={d.id || idx}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap"
                                style={{
                                  backgroundColor: `${getDocumentColor(d.name)}12`,
                                  color: getDocumentColor(d.name),
                                  borderColor: `${getDocumentColor(d.name)}30`,
                                }}
                              >
                                <FileText size={11} className="shrink-0" />
                                <span>{d.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 text-fluid-12 font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap"
                            style={{
                              backgroundColor: `${getDocumentColor(item.transaction_type)}12`,
                              color: getDocumentColor(item.transaction_type),
                              borderColor: `${getDocumentColor(item.transaction_type)}30`,
                            }}
                          >
                            <FileText size={12} className="shrink-0" />
                            <span>{item.transaction_type}</span>
                          </span>
                        )}
                      </td>

                      {/* Target Release Date */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {item.releaseDate ? (
                          <div className="text-fluid-13 font-semibold text-text-main flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar size={13.5} className="text-text-muted shrink-0" />
                            <span>{new Date(item.releaseDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          <span className="text-fluid-12 text-text-muted italic whitespace-nowrap">
                            Not set yet
                          </span>
                        )}
                      </td>

                      {/* Elapsed / Waiting */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {item.statusKey === 'completed' ? (
                          <span className="text-fluid-12 text-text-muted font-medium italic">
                            Completed
                          </span>
                        ) : (
                          <div className="text-fluid-12-5 font-semibold text-text-main flex items-center gap-1.5 whitespace-nowrap">
                            <Clock size={13.5} className="text-text-muted shrink-0" />
                            <span>{item.elapsedText}</span>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {item.statusKey === 'serving' ? (
                          <span className="inline-flex items-center gap-1 text-fluid-10-5 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" /> Serving Now
                          </span>
                        ) : item.statusKey === 'waiting' ? (
                          <span className="inline-flex items-center gap-1 text-fluid-10-5 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold-light text-gold border border-gold-border whitespace-nowrap">
                            <Clock size={11} className="shrink-0" /> In Line
                          </span>
                        ) : item.statusKey === 'prep' ? (
                          <span className="inline-flex items-center gap-1 text-fluid-10-5 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-light text-blue border border-blue-border whitespace-nowrap">
                            <Cog size={11} className="animate-spin shrink-0" style={{ animationDuration: '3s' }} /> Preparing
                          </span>
                        ) : item.statusKey === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 text-fluid-10-5 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-danger-light text-danger border border-danger-border animate-pulse whitespace-nowrap">
                            <AlertTriangle size={11} className="shrink-0" /> Overdue Pickup
                          </span>
                        ) : item.statusKey === 'ready' ? (
                          <span className="inline-flex items-center gap-1 text-fluid-10-5 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border whitespace-nowrap">
                            <FolderOpen size={11} className="shrink-0" /> Ready for Pickup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-fluid-10-5 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success-light text-success border border-success-border whitespace-nowrap">
                            <CheckCircle2 size={11} className="shrink-0" /> Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => setViewingTicketData(item)}
                            title="View full ticket details and schedule"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-fluid-11-5 font-bold cursor-pointer hover:bg-maroon hover:text-white hover:border-maroon transition-all shadow-2xs"
                          >
                            <Eye size={12} className="shrink-0" />
                            <span>Details</span>
                          </button>

                          {/* Remind Button for uncollected / overdue releases */}
                          {(item.statusKey === 'ready' || item.statusKey === 'overdue') && (
                            <button
                              type="button"
                              onClick={() => handleRemindStudent(item.id, item.student_name)}
                              disabled={remindingId === item.id}
                              title="Send reminder notification to student"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gold-border bg-gold-light text-gold text-fluid-11-5 font-bold cursor-pointer hover:bg-gold hover:text-white transition-all shadow-2xs disabled:opacity-50"
                            >
                              <Bell size={12} className={remindingId === item.id ? 'animate-spin text-gold shrink-0' : 'text-gold shrink-0'} />
                              <span>{remindingId === item.id ? 'Sending...' : 'Remind'}</span>
                            </button>
                          )}

                          {/* Tag for completed items */}
                          {item.statusKey === 'completed' && (
                            <span className="text-fluid-11 text-text-muted font-medium italic">
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
        <div className="p-4 border-t border-border bg-surface/40 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-fluid-12 text-text-muted">
            Showing <strong className="text-text-main">{allUnifiedItems.length > 0 ? (currentPage - 1) * PER_PAGE + 1 : 0}</strong> to <strong className="text-text-main">{Math.min(currentPage * PER_PAGE, allUnifiedItems.length)}</strong> of <strong className="text-text-main">{allUnifiedItems.length}</strong> tickets
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, currentPage - 3),
              Math.min(totalPages, currentPage + 2)
            ).map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentPage(num)}
                className={`w-8 h-8 rounded-lg text-fluid-12 font-bold cursor-pointer transition-colors shadow-2xs ${currentPage === num ? 'bg-maroon text-white border border-maroon' : 'bg-white text-text-main border border-border hover:bg-surface'}`}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
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