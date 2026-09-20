import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import campusFlowLogo from '../../assets/logo.webp'
import LiveQueuePage from './LiveQueuePage'
import AppointmentsPage from './AppointmentsPage'
import MasterListPage from './MasterListPage'
import IdRequestsPage from './IdRequestsPage'
import StaffGlobalSearch from '../../components/StaffGlobalSearch'
import StaffProfilePage from './StaffProfilePage'
import PriorityRequestsPage from './PriorityRequestsPage'
import DocumentReleasesPage from './DocumentReleasesPage'
import { getTodaysQueue } from '../../services/queueService'
import NotificationDropdown from '../../components/NotificationDropdown'
import { getAppointmentStats } from '../../services/appointmentService'
import { getPendingPriorityRequests } from '../../services/priorityService'
import { Inbox, BarChart2, Ticket, Calendar, ClipboardList, LogOut, Users, User, Settings, CheckSquare, Clock, CalendarClock, Monitor, MonitorX, HelpCircle, LayoutDashboard, ShieldCheck, Loader2, Menu, X, ChevronLeft, ChevronRight, FolderOpen, AlertCircle, IdCard, FileText } from 'lucide-react'
import { getWindowAssignments, claimWindow, releaseWindow, getIdRequests } from '../../services/adminService'

// ── Helper to determine whether student presence is required at the counter ────
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

// ── Compact Queue Preview (Overview panel) ─────────────────────────────────────
function CompactQueuePreview({ queue, loading, onNavigate }) {
  // Filter only active tickets that are at the physical counter (exclude completed, cancelled & processing)
  const activeAll = queue.filter(q => 
    q.ticket.status !== 'completed' && 
    q.ticket.status !== 'cancelled' && 
    q.ticket.status !== 'no_show' && 
    q.ticket.appointments?.status !== 'cancelled' && 
    getRequiresPresence(q.steps)
  )
  const active = activeAll.slice(0, 4)

  if (loading) return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse bg-border/60" />)}
    </div>
  )

  if (active.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center my-auto">
      <div className="w-13 h-13 rounded-2xl bg-surface border border-border flex items-center justify-center mb-3 text-text-muted/70 shadow-2xs">
        <Ticket size={24} strokeWidth={1.5} />
      </div>
      <h3 className="font-serif text-fluid-15 font-bold text-text-main m-0 mb-1">Counter is Clear</h3>
      <p className="text-fluid-12 text-text-muted m-0 max-w-xs leading-relaxed">
        No active student tickets waiting at the counter right now.
      </p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5">
      {active.map(({ ticket }) => {
        const student = ticket.users
        const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student' : 'Unknown Student'
        const isServing = ticket.status === 'in_progress'
        const priorityClass = ticket.appointments?.priority_class
        const isPriority = priorityClass && priorityClass !== 'regular'
        const txName = ticket.appointments?.transaction_types?.name || ticket.transaction_type?.name || 'Document Transaction'
        const selectedDocs = ticket.appointments?.selected_documents
        const hasMultipleDocs = selectedDocs && selectedDocs.length > 1
        const singleDocName = selectedDocs?.[0]?.name || txName

        return (
          <div 
            key={ticket.id} 
            onClick={() => onNavigate && onNavigate('queue')}
            className={`group flex flex-col gap-2 p-3 sm:px-4 sm:py-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              isServing 
                ? 'border-success-border bg-success-light/40 hover:bg-success-light/70' 
                : 'border-border bg-white hover:border-maroon-border hover:bg-surface/50'
            }`}
          >
            {/* Top Row: Queue #, Student Name, Priority & Status */}
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="font-serif text-fluid-16 sm:text-fluid-18 font-extrabold text-maroon shrink-0 whitespace-nowrap tracking-tight">
                  {ticket.queue_number}
                </div>
                <div className="w-px h-5 sm:h-6 bg-border shrink-0" />
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <span className="text-fluid-13 font-bold text-text-main truncate group-hover:text-maroon transition-colors">
                    {name}
                  </span>
                  {isPriority && (
                    <span className="shrink-0 text-fluid-9 font-extrabold px-1.5 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border/60 uppercase tracking-wide">
                      {priorityClass}
                    </span>
                  )}
                </div>
              </div>

              {/* Serving / Waiting Status */}
              <div className="shrink-0 flex items-center">
                <span className={`text-fluid-11 font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 whitespace-nowrap ${
                  isServing 
                    ? 'bg-success-light text-success border-success-border' 
                    : 'bg-gold-light text-gold border-gold-border'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isServing ? 'bg-success animate-pulse' : 'bg-gold'}`} />
                  <span>{isServing ? 'Serving' : 'Waiting'}</span>
                </span>
              </div>
            </div>

            {/* Bottom Row: Selected Documents or Transaction */}
            {hasMultipleDocs ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50">
                <span className="text-fluid-10 font-bold uppercase tracking-wider text-text-muted shrink-0 mr-0.5">
                  Docs:
                </span>
                {selectedDocs.map((d, idx) => (
                  <span key={idx} className="text-fluid-10 font-semibold px-2 py-0.5 rounded-md bg-maroon-light text-maroon border border-maroon-border/40">
                    {d.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/50 text-fluid-11-5 text-text-muted font-medium min-w-0">
                <FileText size={12} className="shrink-0 text-text-muted/70" />
                <span className="truncate">{singleDocName}</span>
              </div>
            )}
          </div>
        )
      })}
      
      {activeAll.length > 4 && (
        <div className="pt-2 text-right">
          <button 
            onClick={() => onNavigate && onNavigate('queue')}
            className="text-fluid-11 font-bold text-maroon hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1"
          >
            + {activeAll.length - 4} more ticket{activeAll.length - 4 > 1 ? 's' : ''} in queue &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sidebar Item ───────────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick, badge, disabled, collapsed }) => (
  <button 
    onClick={disabled ? undefined : onClick} 
    disabled={disabled}
    title={collapsed ? label : undefined}
    className={`flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} w-full rounded-xl border-none text-left font-sans relative transition-all duration-250 ease-out overflow-hidden group
      ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
      ${active ? 'bg-maroon-light/60 text-maroon font-bold' : 'bg-transparent text-text-sub font-medium'}
      ${!active && !disabled ? 'hover:bg-surface hover:text-text-main' : ''}
    `}
  >
    {active && (
      <div className="absolute left-0 top-[15%] bottom-[15%] w-0.75 bg-maroon rounded-r-full shadow-[1px_0_6px_rgba(123,26,42,0.3)]" />
    )}
    <span className={`flex items-center justify-center text-fluid-17 w-5 shrink-0 transition-all duration-250 ease-out ${active ? 'opacity-100 scale-105 text-maroon' : 'opacity-70 group-hover:opacity-100'}`}>
      {icon}
    </span>
    
    <span className={`tracking-wide whitespace-nowrap text-fluid-13 transition-all duration-250 ease-out overflow-hidden ${
      collapsed 
        ? 'opacity-0 max-w-0 -translate-x-2 pointer-events-none' 
        : 'opacity-100 max-w-44 translate-x-0 flex-1'
    }`}>
      {label}
    </span>

    {badge > 0 && (
      <span className={`transition-all duration-250 ease-out font-bold text-center ${
        collapsed 
          ? 'absolute top-1.5 right-2 bg-maroon text-white text-[10px] px-1.5 py-px rounded-full min-w-4 shadow-sm leading-tight' 
          : 'bg-maroon text-white text-fluid-10 px-2 py-0.5 rounded-full min-w-5 shadow-xs ml-auto shrink-0'
      }`}>
        {badge}
      </span>
    )}
  </button>
)

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, sub, subColorClass = "text-text-muted", colorClass = "text-maroon", bgClass = "bg-maroon-light", borderClass = "border-maroon-border/60", loading, delay, className = "" }) => (
  <div className={`animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 border border-border flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] ${className}`} style={{ animationDelay: delay || '0s' }}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">{label}</span>
      <div className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${borderClass} ${bgClass} ${colorClass}`}>
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold leading-tight tracking-tight m-0 text-text-main">
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

// ── Main StaffDashboard ────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user, requestLogout, token } = useAuth()
  const [activeNav, setActiveNav] = useState('overview')
  const [visitedTabs, setVisitedTabs] = useState(new Set(['overview']))
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('cf_staff_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch {
      // Ignore local storage errors
    }
    // Default to compact icon rail (80px) on tablet portrait (<1024px) for optimal content width
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  })

  useEffect(() => {
    try {
      localStorage.setItem('cf_staff_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false')
    } catch {
      // Ignore local storage errors
    }
  }, [sidebarCollapsed])

  // Sync sidebar width CSS variable for layout-aligned overlays (like ToastContainer)
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth >= 768) {
        document.documentElement.style.setProperty('--cf-sidebar-width', sidebarCollapsed ? '80px' : '256px')
      } else {
        document.documentElement.style.setProperty('--cf-sidebar-width', '0px')
      }
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => {
      window.removeEventListener('resize', checkWidth)
      document.documentElement.style.removeProperty('--cf-sidebar-width')
    }
  }, [sidebarCollapsed])

  const handleNavChange = useCallback((tabId) => {
    setActiveNav(tabId)
    setVisitedTabs(prev => {
      if (prev.has(tabId)) return prev
      const next = new Set(prev)
      next.add(tabId)
      return next
    })
  }, [])



  // Data states
  const [queue, setQueue] = useState([])
  const [priorityData, setPriorityData] = useState([])
  const [badgeStats, setBadgeStats] = useState({ idRequests: 0, priorityRequests: 0 })
  const [loadingQueue, setLoadingQueue] = useState(true)
  const [apptStats, setApptStats] = useState({ today_appointments: 0, completed_today: 0, total_monthly: 0 })

  // Window assignment state
  const [numWindows, setNumWindows] = useState(3)
  const [windowAssignments, setWindowAssignments] = useState({}) // { userId: windowNum }
  const [myWindow, setMyWindow] = useState(null)
  const [windowError, setWindowError] = useState('')
  const [claimingWindow, setClaimingWindow] = useState(null)
  const [isLoadingWindow, setIsLoadingWindow] = useState(true)

  const loadWindowData = useCallback(async () => {
    if (!token) return
    try {
      const data = await getWindowAssignments(token, Date.now())
      setNumWindows(data.num_windows != null ? Number(data.num_windows) : 3)
      setWindowAssignments(data.assignments || {})
      setMyWindow(data.assignments?.[user?.id] || null)
      setWindowError('')
    } catch (e) { 
      console.error('Window fetch error', e) 
      setWindowError('Fetch Error: ' + e.message)
    } finally {
      setIsLoadingWindow(false)
    }
  }, [token, user?.id])

  const handleClaimWindow = async (winNum) => {
    setClaimingWindow(winNum); setWindowError('')
    try {
      await claimWindow(token, winNum)
      await loadWindowData()
    } catch (e) { setWindowError(e.message) }
    finally { setClaimingWindow(null) }
  }

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [qData, aStats, reqs, priorityReqs] = await Promise.all([
        getTodaysQueue(token).catch(() => []),
        getAppointmentStats(token).catch(() => ({ today_appointments: 0, completed_today: 0, total_monthly: 0 })),
        getIdRequests(token).catch(() => []),
        getPendingPriorityRequests(token).catch(() => [])
      ])
      setQueue(qData)
      setApptStats(aStats)
      setPriorityData(priorityReqs)
      setBadgeStats({
        idRequests: reqs.filter(r => r.status === 'pending').length,
        priorityRequests: priorityReqs.length
      })
    } catch (e) { console.error("Error loading dashboard stats", e) }
    finally { setLoadingQueue(false) }
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(
    ['QUEUE_UPDATED', 'WINDOW_UPDATED', 'APPOINTMENTS_UPDATED', 'PRIORITY_REQUESTS_UPDATED', 'ID_REQUESTS_UPDATED', 'RELEASES_UPDATED'],
    () => {
      loadData()
      loadWindowData()
    }
  )

  useEffect(() => {
    loadData()
    loadWindowData()
    const t = setInterval(loadData, 60000)
    const wt = setInterval(loadWindowData, 60000)
    return () => { clearInterval(t); clearInterval(wt) }
  }, [loadData, loadWindowData])

  // Calculate stats — only count active tickets (exclude completed, cancelled & no_show)
  const activeQueueTickets = queue.filter(q => 
    q.ticket.status !== 'completed' && 
    q.ticket.status !== 'cancelled' && 
    q.ticket.status !== 'no_show' && 
    q.ticket.appointments?.status !== 'cancelled'
  )
  const activeInQueue = activeQueueTickets.filter(q => getRequiresPresence(q.steps)).length
  const inProcessing = activeQueueTickets.filter(q => !getRequiresPresence(q.steps)).length
  const completedToday = queue.filter(q => q.ticket.status === 'completed').length
  
  const pendingAppts = Math.max(0, (apptStats.today_appointments || 0) - (apptStats.completed_today || 0))

  const stats = [
    { icon: <CalendarClock size={15} strokeWidth={2.4} />, value: pendingAppts.toString(), label: "Today's Appts.", sub: "Scheduled today", colorClass: 'text-blue', bgClass: 'bg-blue-light', borderClass: 'border-blue-border/60', subColorClass: 'text-blue', loading: loadingQueue, delay: '0.1s' },
    { icon: <Users size={15} strokeWidth={2.4} />, value: activeInQueue.toString(), label: 'Active in Queue', sub: "At the counter", colorClass: 'text-maroon', bgClass: 'bg-maroon-light', borderClass: 'border-maroon-border/60', subColorClass: 'text-maroon', loading: loadingQueue, delay: '0.15s' },
    { icon: <FolderOpen size={15} strokeWidth={2.4} />, value: inProcessing.toString(), label: 'In Processing', sub: "Processing table", colorClass: 'text-gold', bgClass: 'bg-gold-light', borderClass: 'border-gold-border/60', subColorClass: 'text-gold', loading: loadingQueue, delay: '0.2s' },
    { icon: <CheckSquare size={15} strokeWidth={2.4} />, value: completedToday.toString(), label: 'Completed Today', sub: "Fully serviced", colorClass: 'text-success', bgClass: 'bg-success-light', borderClass: 'border-success-border/60', subColorClass: 'text-success', loading: loadingQueue, delay: '0.25s' },
  ]

  const navGroups = [
    {
      title: 'Main Menu',
      items: [
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue' },
        { id: 'document-releases', icon: <FolderOpen size={18} />, label: 'Document Releases' },
        { id: 'appointments', icon: <Calendar size={18} />, label: 'Appointments' },
      ]
    },
    {
      title: 'Records & Actions',
      items: [
        { id: 'priority-requests', icon: <ShieldCheck size={18} />, label: 'Priority Requests', badge: badgeStats.priorityRequests },
        { id: 'id-requests', icon: <HelpCircle size={18} />, label: 'Id Requests', badge: badgeStats.idRequests },
        { id: 'records', icon: <ClipboardList size={18} />, label: 'Master List' },
      ]
    }
  ]

  return (
    <div className="min-h-screen flex bg-off-white font-sans">

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-45 md:hidden" />
      )}

      {/* ── Fixed Left Sidebar ── */}
      <aside className={`${sidebarCollapsed ? 'md:w-20 md:px-2.5' : 'md:w-64 md:px-3.5'} w-64 px-3.5 shrink-0 bg-white border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 py-5 transition-[width,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo & Mobile Close */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between pl-1'} mb-7`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={campusFlowLogo} alt="CampusFlow" className="w-8.5 h-8.5 rounded-full bg-white object-contain border border-slate-200 shrink-0 shadow-2xs" />
            <div className={`whitespace-nowrap overflow-hidden transition-all duration-250 ease-out ${
              sidebarCollapsed 
                ? 'opacity-0 max-w-0 -translate-x-2 pointer-events-none' 
                : 'opacity-100 max-w-40 translate-x-0'
            }`}>
              <div className="font-serif text-fluid-15 font-bold text-maroon leading-tight">CampusFlow</div>
              <div className="text-fluid-10 text-text-muted tracking-[0.04em] leading-tight"><strong>Staff Portal</strong></div>
            </div>
          </div>
          
          {/* Mobile responsive close button */}
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-maroon hover:bg-maroon-light/60 border border-transparent hover:border-maroon-border/40 transition-all cursor-pointer" 
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-6 px-0 overflow-y-auto pb-6 scrollbar-hide">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              {idx === 0 ? (
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-3'} mb-1`}>
                  <div className={`transition-all duration-250 ease-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed 
                      ? 'opacity-0 max-w-0 pointer-events-none' 
                      : 'opacity-100 max-w-40'
                  }`}>
                    <span className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.15em]">
                      {group.title}
                    </span>
                  </div>
                  {/* Desktop collapse toggle button */}
                  <button 
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={`hidden md:flex items-center justify-center rounded-lg text-text-muted hover:text-maroon hover:bg-surface transition-all duration-200 cursor-pointer border border-transparent hover:border-border/80 shrink-0 ${
                      sidebarCollapsed ? 'w-8 h-8 bg-surface border-border/80 text-text-sub hover:text-maroon' : 'w-6 h-6 p-0.5'
                    }`}
                  >
                    <ChevronLeft size={15} strokeWidth={2.5} className={`transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarCollapsed ? 'rotate-180 text-maroon' : ''}`} />
                  </button>
                </div>
              ) : (
                <>
                  <div className={`transition-all duration-250 ease-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed 
                      ? 'opacity-0 max-w-0 pointer-events-none h-0' 
                      : 'opacity-100 max-w-40 px-3 mb-1'
                  }`}>
                    <span className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.15em]">
                      {group.title}
                    </span>
                  </div>
                  {sidebarCollapsed && (
                    <div className="h-px bg-border/60 mx-2 my-1 shrink-0 transition-opacity duration-250" />
                  )}
                </>
              )}
              <div className={`flex flex-col gap-1 ${sidebarCollapsed ? 'px-1' : 'px-1.5'}`}>
                {group.items.map(item => (
                  <SideItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeNav === item.id}
                    collapsed={sidebarCollapsed}
                    onClick={() => {
                      if (myWindow) {
                        handleNavChange(item.id)
                        setMobileMenuOpen(false)
                      }
                    }}
                    badge={item.badge}
                    disabled={!myWindow}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        {/* Window required hint in sidebar */}
        {!myWindow && (
          sidebarCollapsed ? (
            <div 
              title="Claim a window to unlock navigation." 
              className="mx-auto mb-2 w-8.5 h-8.5 rounded-lg bg-gold-light border border-gold-border text-gold flex items-center justify-center text-sm font-bold cursor-help shadow-2xs shrink-0"
            >
              ⚠
            </div>
          ) : (
            <div className="mx-1 mb-2 px-3 py-2.5 rounded-[10px] bg-gold-light border border-gold-border text-fluid-11 text-gold font-semibold leading-relaxed">
              ⚠ Claim a window to unlock navigation.
            </div>
          )
        )}
      </aside>

      {/* ── Right Content ── */}
      <div className={`${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 flex-1 flex flex-col min-h-screen min-w-0 transition-[margin-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}>

        {/* Top Bar */}
        <header className="bg-white border-b border-border px-3 sm:px-7 h-14 sm:h-15 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_4px_rgba(0,0,0,0.04)] gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center text-text-main hover:text-maroon hover:bg-surface rounded-xl border border-border/80 transition-all cursor-pointer shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu size={19} strokeWidth={2.2} />
            </button>
            <StaffGlobalSearch setActiveNav={handleNavChange} />
          </div>

          {/* Window Badge + Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* Active Window Badge (Display Indicator Only) */}
            {myWindow ? (
              <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg shadow-xs px-2.5 py-1.5 transition-all">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-2 w-2 rounded-full bg-success opacity-40 animate-ping" style={{ animationDuration: '2s' }}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </div>
                <Monitor size={14} className="text-text-sub hidden sm:inline-block" strokeWidth={2.5} />
                <span className="text-fluid-12 sm:text-fluid-13 font-bold text-text-main font-sans tracking-wide whitespace-nowrap">
                  Window {myWindow}
                </span>
              </div>
            ) : (
              <div className="text-fluid-11 sm:text-xs text-text-muted font-semibold font-sans whitespace-nowrap">
                No window
              </div>
            )}

            <NotificationDropdown />

            {/* Avatar dropdown */}
            <div className="relative">
              {profileOpen && <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-105" />}
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-1.5 sm:gap-2.5 p-0.5 sm:p-1 pr-1 sm:pr-2 rounded-full border-none bg-transparent cursor-pointer outline-none hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-fluid-13 sm:text-fluid-15 font-bold text-maroon overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.first_name?.[0]?.toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-1.5 mr-1">
                  <span className="text-fluid-14 font-bold text-text-main font-sans max-w-45 sm:max-w-55 truncate" title={[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'Staff'}>
                    {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'Staff'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-text-sub transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>
              {profileOpen && (
                <div className="absolute top-11 right-0 w-70 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 z-110 border border-border">
                  <div className="flex gap-3 mb-4 items-start">
                    <div className="w-10.5 h-10.5 rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-fluid-16 font-bold text-maroon overflow-hidden shrink-0">
                      {user?.profile_image ? (
                        <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.first_name?.[0]?.toUpperCase() || 'S'
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-fluid-14 font-bold text-text-main leading-tight truncate">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="text-fluid-11 text-text-muted mt-1 truncate">
                        {user?.email}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-fluid-9 font-bold text-maroon bg-maroon-light border border-maroon-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          ID: {user?.staff_id || user?.id?.substring(0,8) || 'STAFF'}
                        </span>
                        <span className="text-fluid-9 font-bold text-gold bg-gold-light border border-gold-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          {user?.role === 'admin' ? 'ADMIN' : 'STAFF'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <div className="flex flex-col gap-1 py-2">
                    <button onClick={() => { setProfileOpen(false); handleNavChange('profile'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-none bg-transparent hover:bg-slate-50 cursor-pointer text-left transition-colors">
                      <User size={16} className="text-text-main" />
                      <span className="text-fluid-13 font-semibold text-text-main">Manage Profile</span>
                    </button>
                    <button onClick={() => { setProfileOpen(false); handleNavChange('settings'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-none bg-transparent hover:bg-slate-50 cursor-pointer text-left transition-colors">
                      <Settings size={16} className="text-text-main" />
                      <span className="text-fluid-13 font-semibold text-text-main">Account Settings</span>
                    </button>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <button onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      if (myWindow) {
                        await releaseWindow(token);
                      }
                    } catch (err) {
                      console.error('Failed to release window on logout', err);
                    } finally {
                      requestLogout();
                    }
                  }} className="w-full mt-2 py-2.5 px-3 rounded-xl border-none bg-[#FFF0F0] text-[#D92D20] text-fluid-13 font-bold cursor-pointer flex items-center justify-center gap-2 font-sans hover:bg-[#FFE5E5] transition-colors">
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="p-3.5 sm:p-7 flex-1 relative">

          {/* ──── WINDOW GATE OVERLAY ──── */}
          {!myWindow && (
            <div className="absolute inset-0 z-30 bg-surface/95 flex items-start justify-center pt-10 md:pt-16 p-4 sm:p-7 overflow-y-auto">
              {isLoadingWindow ? (
                <div className="w-12 h-12 border-4 border-maroon border-t-transparent rounded-full animate-spin my-auto"></div>
              ) : (
                <div className="bg-white rounded-3xl px-6 sm:px-10 pt-8 sm:pt-10 pb-8 sm:pb-9 border-[1.5px] border-gold-border shadow-[0_8px_40px_rgba(0,0,0,0.1)] w-full max-w-140 text-center animate-fade-up">
                <div className="w-16 h-16 rounded-full bg-gold-light border-2 border-gold-border flex items-center justify-center mx-auto mb-5">
                  <Monitor size={28} className="text-gold" />
                </div>
                <p className="text-fluid-11 font-bold text-gold tracking-[0.12em] uppercase m-0 mb-2">Action Required</p>
                <h2 className="font-serif text-fluid-22 sm:text-fluid-26 font-extrabold text-text-main m-0 mb-2.5">Claim Your Service Window</h2>
                <p className="text-fluid-13 sm:text-fluid-14 text-text-sub m-0 mb-7 leading-relaxed">
                  You must be assigned to a window before you can access the queue, appointments, or any other features.
                </p>
                {windowError && (
                  <div className="px-3.5 py-2.5 rounded-lg bg-danger-light text-danger text-fluid-13 mb-5 border border-danger-border">
                    {windowError}
                  </div>
                )}
                <div className="flex gap-3 flex-wrap justify-center">
                  {Array.from({ length: numWindows }, (_, i) => i + 1).map(winNum => {
                    const occupiedByOther = Object.entries(windowAssignments).some(([uid, wn]) => wn === winNum && uid !== user?.id)
                    const isClaiming = claimingWindow === winNum
                    return (
                      <button
                        key={winNum}
                        onClick={() => !occupiedByOther && handleClaimWindow(winNum)}
                        disabled={occupiedByOther || !!claimingWindow}
                        className={`flex flex-col items-center justify-center gap-2 w-27.5 h-25 rounded-2xl border-2 transition-all duration-200 font-sans group
                          ${occupiedByOther 
                            ? 'border-border bg-surface cursor-not-allowed opacity-60' 
                            : isClaiming
                            ? 'border-maroon bg-maroon-light cursor-wait'
                            : 'border-maroon-border bg-maroon-light cursor-pointer hover:bg-maroon hover:border-maroon'
                          }
                        `}
                      >
                        <span className={`flex transition-colors duration-200 ${occupiedByOther ? 'text-text-muted' : 'text-maroon group-hover:text-white'}`}>
                          {isClaiming ? <Loader2 size={24} className="animate-spin text-maroon" /> : occupiedByOther ? <MonitorX size={24} /> : <Monitor size={24} />}
                        </span>
                        <span className={`text-fluid-13 font-bold transition-colors duration-200 flex items-center gap-1 ${occupiedByOther ? 'text-text-muted' : 'text-maroon group-hover:text-white'}`}>
                          {isClaiming ? 'Claiming...' : occupiedByOther ? 'Occupied' : `Window ${winNum}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              )}
            </div>
          )}

          {/* ──── OVERVIEW VIEW ──── */}
          {visitedTabs.has('overview') && (
            <div className={activeNav === 'overview' ? 'block' : 'hidden'}>
              <div className="mb-5 sm:mb-6">
                <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Today's Summary</p>
                <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 flex items-center gap-2">
                  <BarChart2 size={24} className="text-maroon shrink-0" /> Daily Overview
                </h1>
                <p className="text-fluid-12 text-text-sub mt-2 mb-0">
                  A high-level view of today's queue, active operations, and urgent escalations.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
                {stats.map((s, i) => (
                  <StatCard 
                    key={i} 
                    {...s} 
                  />
                ))}
              </div>

              {/* Two-column: Queue preview + Priority Requests */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">

                {/* Live Queue Preview */}
                <div className="lg:col-span-7 xl:col-span-8 animate-fade-up bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between" style={{ animationDelay: '0.5s' }}>
                  <div>
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-4 sm:mb-5 pb-3.5 border-b border-border/80">
                      <div className="min-w-0">
                        <p className="text-fluid-11 font-extrabold text-gold tracking-[0.08em] uppercase m-0 mb-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                          Real-Time Queue
                        </p>
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                          <h2 className="font-serif text-fluid-18 sm:text-fluid-20 font-bold text-text-main m-0">
                            Live Queue Management
                          </h2>
                          {activeInQueue > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold border border-maroon-border/60 whitespace-nowrap shrink-0">
                              {activeInQueue} Active
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleNavChange('queue')} 
                        className="group px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border border-border bg-white text-text-main hover:border-maroon/40 hover:text-maroon hover:bg-surface text-fluid-11-5 font-bold cursor-pointer font-sans transition-all duration-200 shadow-2xs hover:shadow-xs flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0"
                      >
                        View All
                        <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5 text-text-muted group-hover:text-maroon" />
                      </button>
                    </div>

                    <CompactQueuePreview queue={queue} loading={loadingQueue} onNavigate={handleNavChange} />
                  </div>
                </div>

                {/* Priority Request Panel */}
                <div className="lg:col-span-5 xl:col-span-4 animate-fade-up bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between" style={{ animationDelay: '0.6s' }}>
                  <div>
                    <div className="mb-4 sm:mb-5 pb-3.5 border-b border-border/80">
                      <p className="text-fluid-11 font-extrabold text-gold tracking-[0.08em] uppercase m-0 mb-1">
                        Action Required
                      </p>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="font-serif text-fluid-18 sm:text-fluid-20 font-bold text-text-main m-0 whitespace-nowrap">
                          Priority Requests
                        </h2>
                        {priorityData.length > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold border border-maroon-border/60 whitespace-nowrap shrink-0">
                            {priorityData.length} Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto">
                      {loadingQueue ? (
                        <div className="flex flex-col gap-2.5">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 rounded-xl animate-pulse bg-border/60" />
                          ))}
                        </div>
                      ) : priorityData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center my-auto">
                          <div className="w-13 h-13 rounded-2xl bg-surface border border-border flex items-center justify-center mb-3 text-text-muted/70 shadow-2xs">
                            <ShieldCheck size={24} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-serif text-fluid-15 font-bold text-text-main m-0 mb-1">All Requests Reviewed</h3>
                          <p className="text-fluid-12 text-text-muted m-0 max-w-xs leading-relaxed">
                            No pending student priority verification requests at the moment.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {priorityData.slice(0, 4).map(req => {
                            const student = req.users
                            const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student' : 'Unknown Student'
                            const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
                            const studentId = student?.student_id || 'N/A'
                            const pType = req.priority_type || 'Priority'

                            return (
                              <div 
                                key={req.id} 
                                onClick={() => handleNavChange('priority-requests')}
                                className="group flex items-center justify-between gap-2.5 p-3 sm:px-4 sm:py-3 rounded-xl border border-border bg-white hover:border-maroon-border hover:bg-surface/50 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-9 h-9 rounded-full bg-maroon-light text-maroon border border-maroon-border/60 flex items-center justify-center font-bold text-fluid-12-5 shrink-0">
                                    {initials}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-fluid-13 font-bold text-text-main truncate group-hover:text-maroon transition-colors">
                                      {name}
                                    </div>
                                    <div className="text-fluid-11 font-mono text-text-muted font-medium mt-0.5 truncate">
                                      ID: {studentId}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-fluid-10 font-extrabold px-2.5 py-1 rounded-full bg-maroon-light text-maroon border border-maroon-border/70 uppercase tracking-wider flex items-center gap-1 shrink-0">
                                    <ShieldCheck size={11} className="shrink-0" />
                                    <span>{pType}</span>
                                  </span>
                                  <ChevronRight size={14} className="text-text-muted group-hover:text-maroon group-hover:translate-x-0.5 transition-all shrink-0" />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──── QUEUE VIEW ──── */}
          {visitedTabs.has('queue') && (
            <div className={activeNav === 'queue' ? 'block' : 'hidden'}>
              <LiveQueuePage onNavigate={handleNavChange} />
            </div>
          )}

          {/* ──── APPOINTMENTS VIEW ──── */}
          {visitedTabs.has('appointments') && (
            <div className={activeNav === 'appointments' ? 'block' : 'hidden'}>
              <AppointmentsPage />
            </div>
          )}

          {/* ──── DOCUMENT RELEASES VIEW ──── */}
          {visitedTabs.has('document-releases') && (
            <div className={activeNav === 'document-releases' ? 'block' : 'hidden'}>
              <DocumentReleasesPage />
            </div>
          )}

          {/* ──── MASTER LIST VIEW ──── */}
          {visitedTabs.has('records') && (
            <div className={activeNav === 'records' ? 'block' : 'hidden'}>
              <MasterListPage />
            </div>
          )}

          {/* ──── PRIORITY REQUESTS VIEW ──── */}
          {visitedTabs.has('priority-requests') && (
            <div className={activeNav === 'priority-requests' ? 'block' : 'hidden'}>
              <PriorityRequestsPage />
            </div>
          )}

          {/* ──── ID REQUESTS VIEW ──── */}
          {visitedTabs.has('id-requests') && (
            <div className={activeNav === 'id-requests' ? 'block' : 'hidden'}>
              <IdRequestsPage />
            </div>
          )}

          {/* ──── PROFILE / SETTINGS VIEW ──── */}
          {(visitedTabs.has('profile') || visitedTabs.has('settings')) && (
            <div className={(activeNav === 'profile' || activeNav === 'settings') ? 'block' : 'hidden'}>
              <StaffProfilePage setActiveNav={handleNavChange} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
