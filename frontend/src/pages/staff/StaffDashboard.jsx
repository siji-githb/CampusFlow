import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import campusFlowLogo from '../../assets/logo.png'
import LiveQueuePage from './LiveQueuePage'
import MessagesPage from './MessagesPage'
import AppointmentsPage from './AppointmentsPage'
import MasterListPage from './MasterListPage'
import IdRequestsPage from './IdRequestsPage'
import StaffGlobalSearch from '../../components/StaffGlobalSearch'
import StaffProfilePage from './StaffProfilePage'
import PriorityRequestsPage from './PriorityRequestsPage'
import DocumentReleasesPage from './DocumentReleasesPage'
import { getTodaysQueue } from '../../services/queueService'
import NotificationDropdown from '../../components/NotificationDropdown'
import { getMessages, markMessageRead } from '../../services/messagesService'
import { getAppointmentStats } from '../../services/appointmentService'
import { getPendingPriorityRequests } from '../../services/priorityService'
import { Inbox, MessageSquare, BarChart2, Ticket, Calendar, ClipboardList, LogOut, Users, User, Settings, CheckSquare, Clock, CalendarClock, Monitor, MonitorX, HelpCircle, LayoutDashboard, ShieldCheck, Loader2, Menu, X, PanelLeftClose, FolderOpen, AlertCircle, IdCard, ChevronRight } from 'lucide-react'
import { getWindowAssignments, claimWindow, releaseWindow, getIdRequests } from '../../services/adminService'

// ── Compact Queue Preview (Overview panel) ─────────────────────────────────────
function CompactQueuePreview({ queue, loading }) {
  const getRequiresPresence = (steps) => {
    const current = steps?.find(s => s.status === 'in_progress') || steps?.[0]
    if (current?.location === 'Back Office') return false
    return current?.requires_presence !== false // default true
  }

  // Filter only active tickets that are at the physical counter (exclude processing table)
  const activeAll = queue.filter(q => q.ticket.status !== 'completed' && getRequiresPresence(q.steps))
  const active = activeAll.slice(0, 5)

  if (loading) return (
    <div className="flex flex-col gap-2">
      {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl animate-pulse bg-border" />)}
    </div>
  )

  if (active.length === 0) return (
    <div className="text-center py-7 text-text-muted text-[13px]">
      <div className="mb-2 flex justify-center"><Inbox size={32} /></div>
      No active tickets at the counter right now
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2.5 sm:gap-3.5">
        {active.map(({ ticket }) => {
          const name = ticket.users ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
          const isServing = ticket.status === 'in_progress'
          const priorityClass = ticket.appointments?.priority_class

          return (
            <div key={ticket.id} className={`flex items-center gap-2.5 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-4 rounded-xl border ${isServing ? 'border-success-border bg-success-light' : 'border-border bg-off-white'}`}>
              <span className="font-serif text-[16px] sm:text-[18px] font-extrabold text-maroon min-w-12 sm:min-w-16">{ticket.queue_number}</span>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <span className="text-[13px] sm:text-[14px] font-bold text-text-main truncate">{name}</span>
                  {priorityClass && priorityClass !== 'regular' && (
                    <span className="shrink-0 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border tracking-wider uppercase">
                      {priorityClass}
                    </span>
                  )}
                </div>
                <div className="text-[11px] sm:text-[12px] text-text-sub font-medium truncate">{ticket.appointments?.transaction_types?.name || 'Transaction'}</div>
              </div>
              <span className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap border shrink-0 flex items-center gap-1 sm:gap-1.5 ${isServing ? 'bg-success-light text-success border-success-border' : 'bg-gold-light text-gold border-gold-border'}`}>
                {isServing ? <><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Serving</> : <><Clock size={11} className="opacity-80" /> Waiting</>}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 sm:mt-4 text-right">
        <span className="text-[10px] sm:text-[11px] font-bold text-text-muted tracking-wide">
          Showing {active.length} out of {activeAll.length} tickets at the counter
        </span>
      </div>
    </div>
  )
}

// ── Sidebar Item ───────────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick, badge, disabled }) => (
  <button 
    onClick={disabled ? undefined : onClick} 
    disabled={disabled}
    className={`flex items-center gap-2.75 w-full px-3.5 py-2.5 rounded-[10px] border-none text-left text-[13.5px] font-sans relative transition-all duration-300 overflow-hidden
      ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
      ${active ? 'bg-maroon-light/60 text-maroon font-bold' : 'bg-transparent text-text-sub font-medium'}
      ${!active && !disabled ? 'hover:bg-surface hover:text-text-main' : ''}
    `}
  >
    {active && (
      <div className="absolute left-0 top-[15%] bottom-[15%] w-0.75 bg-maroon rounded-r-full shadow-[1px_0_6px_rgba(123,26,42,0.3)]" />
    )}
    <span className={`flex items-center justify-center text-[17px] w-5 shrink-0 transition-all duration-300 ${active ? 'opacity-100 scale-110 text-maroon' : 'opacity-70'}`}>
      {icon}
    </span>
    <span className="flex-1 tracking-wide">{label}</span>
    {badge > 0 && (
      <span className="bg-maroon text-white text-[10px] font-bold px-1.5 py-px rounded-full min-w-4.5 text-center z-10 relative shadow-sm">
        {badge}
      </span>
    )}
  </button>
)

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, sub, subColorClass = "text-text-muted", colorClass, bgClass, loading, delay, className = "" }) => (
  <div className={`animate-fade-up bg-white rounded-xl sm:rounded-[14px] p-3.5 sm:px-5 sm:py-4.5 border border-border flex flex-col justify-between gap-2.5 sm:gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${className}`} style={{ animationDelay: delay || '0s' }}>
    <div className="flex items-start justify-between gap-2">
      <div className="text-[10.5px] sm:text-xs font-semibold text-text-muted uppercase tracking-[0.06em] mt-0.5 sm:mt-1.5 leading-tight">{label}</div>
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-[10px] flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-[22px] sm:text-[28px] font-extrabold leading-none m-0 min-h-6 sm:min-h-7 text-text-main">
        {loading ? <div className="animate-pulse w-15 h-6 sm:h-7 rounded-md bg-border" /> : value}
      </div>
      {sub && <div className={`text-[10.5px] sm:text-[11px] font-semibold mt-1 sm:mt-1.5 truncate ${subColorClass}`}>{sub}</div>}
    </div>
  </div>
)

// ── Compact Messages Preview (Overview panel) ──────────────────────────────────
function CompactMessagesPreview() {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMessages(token).then(setMessages).catch(() => { }).finally(() => setLoading(false))
  }, [token])

  const unread = messages.filter(m => !m.is_read).slice(0, 3)

  if (loading) return (
    <div className="flex flex-col gap-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-border" />)}
    </div>
  )

  if (unread.length === 0) return (
    <div className="text-center py-7 text-text-muted text-[13px]">
      <div className="mb-2 flex justify-center"><MessageSquare size={32} /></div>
      No new escalations
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {unread.map(msg => {
        const name = msg.users ? `${msg.users.first_name} ${msg.users.last_name}` : 'Unknown Student'
        const raw = msg.content || ''
        const body = (raw.match(/^\[.*?\]\s*\n\n([\s\S]*)/) || [])[1]?.trim() || raw
        return (
          <div key={msg.id} className="bg-white rounded-xl border border-maroon-border px-3.5 py-3 shadow-[0_1px_6px_rgba(123,26,42,0.06)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold text-text-main">{name}</span>
              {msg.priority === 'urgent' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border">URGENT</span>}
            </div>
            <p className="text-xs text-text-sub m-0 leading-relaxed line-clamp-2">
              {body}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Main StaffDashboard ────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user, requestLogout, token } = useAuth()
  const [activeNav, setActiveNav] = useState('overview')
  const [visitedTabs, setVisitedTabs] = useState(new Set(['overview']))
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
  const [idRequestsData, setIdRequestsData] = useState([])
  const [badgeStats, setBadgeStats] = useState({ messages: 0, idRequests: 0, priorityRequests: 0 })
  const [loadingQueue, setLoadingQueue] = useState(true)
  const [apptStats, setApptStats] = useState({ today_appointments: 0, completed_today: 0, total_monthly: 0 })

  // Window assignment state
  const [numWindows, setNumWindows] = useState(3)
  const [windowAssignments, setWindowAssignments] = useState({}) // { userId: windowNum }
  const [myWindow, setMyWindow] = useState(null)
  const [windowError, setWindowError] = useState('')
  const [claimingWindow, setClaimingWindow] = useState(null)
  const [isLoadingWindow, setIsLoadingWindow] = useState(true)

  const loadWindowData = async () => {
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
  }

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
      const [qData, aStats, msgs, reqs, priorityReqs] = await Promise.all([
        getTodaysQueue(token).catch(() => []),
        getAppointmentStats(token).catch(() => ({ today_appointments: 0, completed_today: 0, total_monthly: 0 })),
        getMessages(token).catch(() => []),
        getIdRequests(token).catch(() => []),
        getPendingPriorityRequests(token).catch(() => [])
      ])
      setQueue(qData)
      setApptStats(aStats)
      setPriorityData(priorityReqs)
      setIdRequestsData(reqs.filter(r => r.status === 'pending'))
      setBadgeStats({
        messages: msgs.filter(m => !m.is_read).length,
        idRequests: reqs.filter(r => r.status === 'pending').length,
        priorityRequests: priorityReqs.length
      })
    } catch (e) { console.error("Error loading dashboard stats", e) }
    finally { setLoadingQueue(false) }
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(
    ['QUEUE_UPDATED', 'WINDOW_UPDATED', 'APPOINTMENTS_UPDATED', 'PRIORITY_REQUESTS_UPDATED', 'ID_REQUESTS_UPDATED', 'RELEASES_UPDATED', 'MESSAGES_UPDATED'],
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
  }, [loadData])

  const getRequiresPresence = (steps) => {
    const current = steps?.find(s => s.status === 'in_progress') || steps?.[0]
    if (current?.location === 'Back Office') return false
    return current?.requires_presence !== false // default true
  }

  // Calculate stats — only count tickets at the counter (exclude back-office processing table)
  const activeInQueue = queue.filter(q => q.ticket.status !== 'completed' && getRequiresPresence(q.steps)).length
  const inProcessing = queue.filter(q => q.ticket.status !== 'completed' && !getRequiresPresence(q.steps)).length
  const completedToday = queue.filter(q => q.ticket.status === 'completed').length
  
  let avgWait = 0
  const done = queue.filter(q => q.ticket.status === 'completed')
  if (done.length > 0) {
    let totalMins = 0
    let validCount = 0
    done.forEach(({ ticket, steps }) => {
      if (!ticket.created_at) return
      const created = new Date(ticket.created_at)
      const lastStep = steps.slice().reverse().find(s => s.status === 'completed' && s.confirmed_at)
      if (lastStep) {
        const completed = new Date(lastStep.confirmed_at)
        totalMins += Math.max(0, (completed - created) / 60000)
        validCount++
      }
    })
    avgWait = validCount > 0 ? Math.round(totalMins / validCount) : 12
  } else {
    avgWait = 12
  }

  const pendingAppts = Math.max(0, (apptStats.today_appointments || 0) - (apptStats.completed_today || 0))

  const stats = [
    { icon: <Users size={20} />, value: activeInQueue.toString(), label: 'Active in Queue', sub: "At the counter", colorClass: 'text-gold', bgClass: 'bg-gold-light', loading: loadingQueue, delay: '0.1s' },
    { icon: <FolderOpen size={20} />, value: inProcessing.toString(), label: 'In Processing', sub: "Processing table", colorClass: 'text-gold', bgClass: 'bg-gold-light', loading: loadingQueue, delay: '0.15s' },
    { icon: <CheckSquare size={20} />, value: completedToday.toString(), label: 'Completed Today', sub: "Fully serviced", colorClass: 'text-gold', bgClass: 'bg-gold-light', loading: loadingQueue, delay: '0.2s' },
    { icon: <Clock size={20} />, value: `${avgWait}m`, label: 'Avg. Serving Time', sub: avgWait > 15 ? "High wait times" : "Serving efficiently", subColorClass: avgWait > 15 ? "text-danger" : "text-text-muted", colorClass: 'text-gold', bgClass: 'bg-gold-light', loading: loadingQueue, delay: '0.25s' },
    { icon: <CalendarClock size={20} />, value: pendingAppts.toString(), label: 'Today\'s Appts.', sub: "Scheduled today", colorClass: 'text-gold', bgClass: 'bg-gold-light', loading: loadingQueue, delay: '0.3s' },
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
        { id: 'messages', icon: <MessageSquare size={18} />, label: 'Messages', badge: badgeStats.messages },
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
      <aside className={`w-60 shrink-0 bg-white border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 px-3.5 py-5 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between pl-1.5 mb-7">
          <div className="flex items-center gap-2.5">
            <img src={campusFlowLogo} alt="CampusFlow" className="w-8.5 h-8.5 rounded-full bg-white object-contain border border-slate-200" />
            <div>
              <div className="font-serif text-[15px] font-bold text-maroon">CampusFlow</div>
              <div className="text-[10px] text-text-muted tracking-[0.04em]"><strong>Staff Portal</strong></div>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 text-text-muted hover:text-text-main border-none bg-transparent cursor-pointer">
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-6 px-1 overflow-y-auto pb-6 scrollbar-hide">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] px-4 mb-1">
                {group.title}
              </div>
              <div className="flex flex-col gap-1 pl-3 pr-2">
                {group.items.map(item => (
                  <SideItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeNav === item.id}
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
          <div className="mx-1 mb-2 px-3 py-2.5 rounded-[10px] bg-gold-light border border-gold-border text-[11px] text-gold font-semibold leading-relaxed">
            ⚠ Claim a window to unlock navigation.
          </div>
        )}
      </aside>

      {/* ── Right Content ── */}
      <div className="ml-0 md:ml-60 flex-1 flex flex-col min-h-screen min-w-0">

        {/* Top Bar */}
        <header className="bg-white border-b border-border px-3 sm:px-7 h-14 sm:h-15 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_4px_rgba(0,0,0,0.04)] gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-1.5 text-text-main hover:bg-slate-100 rounded-lg border-none bg-transparent cursor-pointer shrink-0"
              title="Toggle Menu"
            >
              <Menu size={20} />
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
                <span className="text-[12px] sm:text-[13px] font-bold text-text-main font-sans tracking-wide whitespace-nowrap">
                  Window {myWindow}
                </span>
              </div>
            ) : (
              <div className="text-[11px] sm:text-xs text-text-muted font-semibold font-sans whitespace-nowrap">
                No window
              </div>
            )}

            <NotificationDropdown />

            {/* Avatar dropdown */}
            <div className="relative">
              {profileOpen && <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-105" />}
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-1.5 sm:gap-2.5 p-0.5 sm:p-1 pr-1 sm:pr-2 rounded-full border-none bg-transparent cursor-pointer outline-none hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-[13px] sm:text-[15px] font-bold text-maroon overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.first_name?.[0]?.toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-1.5 mr-1">
                  <span className="text-[14px] font-bold text-text-main font-sans">
                    {user?.first_name || 'Staff'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-text-sub transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>
              {profileOpen && (
                <div className="absolute top-11 right-0 w-70 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 z-110 border border-border">
                  <div className="flex gap-3 mb-4 items-start">
                    <div className="w-10.5 h-10.5 rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-[16px] font-bold text-maroon overflow-hidden shrink-0">
                      {user?.profile_image ? (
                        <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.first_name?.[0]?.toUpperCase() || 'S'
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-[14px] font-bold text-text-main leading-tight truncate">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 truncate">
                        {user?.email}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-[9px] font-bold text-maroon bg-maroon-light border border-maroon-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          ID: {user?.staff_id || user?.id?.substring(0,8) || 'STAFF'}
                        </span>
                        <span className="text-[9px] font-bold text-gold bg-gold-light border border-gold-border rounded px-1.5 py-0.5 uppercase tracking-wider">
                          {user?.role === 'admin' ? 'ADMIN' : 'STAFF'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <div className="flex flex-col gap-1 py-2">
                    <button onClick={() => { setProfileOpen(false); handleNavChange('profile'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-none bg-transparent hover:bg-slate-50 cursor-pointer text-left transition-colors">
                      <User size={16} className="text-text-main" />
                      <span className="text-[13px] font-semibold text-text-main">Manage Profile</span>
                    </button>
                    <button onClick={() => { setProfileOpen(false); handleNavChange('settings'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-none bg-transparent hover:bg-slate-50 cursor-pointer text-left transition-colors">
                      <Settings size={16} className="text-text-main" />
                      <span className="text-[13px] font-semibold text-text-main">Account Settings</span>
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
                  }} className="w-full mt-2 py-2.5 px-3 rounded-xl border-none bg-[#FFF0F0] text-[#D92D20] text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 font-sans hover:bg-[#FFE5E5] transition-colors">
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
                <p className="text-[11px] font-bold text-gold tracking-[0.12em] uppercase m-0 mb-2">Action Required</p>
                <h2 className="font-serif text-[22px] sm:text-[26px] font-extrabold text-text-main m-0 mb-2.5">Claim Your Service Window</h2>
                <p className="text-[13px] sm:text-[14px] text-text-sub m-0 mb-7 leading-relaxed">
                  You must be assigned to a window before you can access the queue, appointments, or any other features.
                </p>
                {windowError && (
                  <div className="px-3.5 py-2.5 rounded-lg bg-danger-light text-danger text-[13px] mb-5 border border-danger-border">
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
                        <span className={`text-[13px] font-bold transition-colors duration-200 flex items-center gap-1 ${occupiedByOther ? 'text-text-muted' : 'text-maroon group-hover:text-white'}`}>
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
                <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Today's Summary</p>
                <h1 className="font-serif text-[22px] sm:text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
                  <BarChart2 size={24} className="text-maroon shrink-0" /> Daily Overview
                </h1>
                <p className="text-[12px] text-text-sub mt-2 mb-0">
                  A high-level view of today's queue, active operations, and urgent escalations.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
                {stats.map((s, i) => (
                  <StatCard 
                    key={i} 
                    {...s} 
                    className={i === stats.length - 1 ? 'col-span-2 sm:col-span-1 md:col-span-1' : ''} 
                  />
                ))}
              </div>

              {/* Two-column: Queue preview + AI Escalations */}
              <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-4 sm:gap-6">

                {/* Live Queue Preview */}
                <div className="animate-fade-up bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div>
                      <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1">Real-Time</p>
                      <h2 className="font-serif text-[16px] sm:text-[18px] font-bold text-text-main m-0">Live Queue Management</h2>
                    </div>
                    <button 
                      onClick={() => handleNavChange('queue')} 
                      className="group px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border border-maroon-border bg-maroon-light text-maroon hover:bg-maroon hover:text-white hover:border-maroon text-[11px] sm:text-xs font-semibold cursor-pointer font-sans transition-all duration-200 shadow-2xs hover:shadow-xs flex items-center gap-1 shrink-0"
                    >
                      View All
                      <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                  <CompactQueuePreview queue={queue} loading={loadingQueue} />
                </div>

                <div className="flex flex-col gap-4 sm:gap-5">
                  {/* Priority Request Panel */}
                  <div className="animate-fade-up flex-1 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col" style={{ animationDelay: '0.6s' }}>
                    <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                      <div>
                        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1">Pending</p>
                        <h2 className="font-serif text-[16px] sm:text-[18px] font-bold text-text-main m-0">
                          Priority Requests
                        </h2>
                      </div>
                      <button 
                        onClick={() => handleNavChange('priority-requests')} 
                        className="group px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border border-maroon-border bg-maroon-light text-maroon hover:bg-maroon hover:text-white hover:border-maroon text-[11px] sm:text-xs font-semibold cursor-pointer font-sans transition-all duration-200 shadow-2xs hover:shadow-xs flex items-center gap-1 shrink-0"
                      >
                        View All
                        <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                      {loadingQueue ? (
                        <div className="flex flex-col gap-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 rounded-xl animate-pulse bg-border/60" />
                          ))}
                        </div>
                      ) : priorityData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-text-muted">
                          <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-3 border border-border">
                            <AlertCircle size={20} className="text-text-muted/60" />
                          </div>
                          <span className="text-[12.5px] font-medium">No priority requests</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {priorityData.slice(0, 5).map(req => (
                            <div key={req.id} className="bg-white rounded-xl border border-maroon-border px-3.5 py-3 shadow-sm cursor-pointer hover:bg-maroon-light/20 transition-colors" onClick={() => handleNavChange('priority-requests')}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[13px] font-bold text-text-main">{req.users?.first_name} {req.users?.last_name}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border">{req.priority_type?.toUpperCase()}</span>
                              </div>
                              <div className="text-[11px] text-text-sub font-mono">{req.users?.student_id}</div>
                            </div>
                          ))}
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

          {/* ──── MESSAGES VIEW ──── */}
          {visitedTabs.has('messages') && (
            <div className={activeNav === 'messages' ? 'block' : 'hidden'}>
              <MessagesPage />
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
