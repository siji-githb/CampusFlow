import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import crmcLogo from '../../assets/crmc-logo.webp'
import LiveQueuePage from './LiveQueuePage'
import MessagesPage from './MessagesPage'
import AppointmentsPage from './AppointmentsPage'
import StudentRecordsPage from './StudentRecordsPage'
import IdRequestsPage from './IdRequestsPage'
import { getTodaysQueue } from '../../services/queueService'
import NotificationDropdown from '../../components/NotificationDropdown'
import { getMessages, markMessageRead } from '../../services/messagesService'
import { getAppointmentStats } from '../../services/appointmentService'
import { Inbox, MessageSquare, BarChart2, Ticket, Calendar, ClipboardList, LogOut, Users, CheckSquare, Clock, CalendarClock, Monitor, MonitorX, HelpCircle } from 'lucide-react'
import { getWindowAssignments, claimWindow, releaseWindow, getIdRequests } from '../../services/adminService'

// ── Compact Queue Preview (Overview panel) ─────────────────────────────────────
function CompactQueuePreview({ queue, loading }) {
  const active = queue.filter(q => q.ticket.status !== 'completed').slice(0, 4)

  if (loading) return (
    <div className="flex flex-col gap-2">
      {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse bg-border" />)}
    </div>
  )

  if (active.length === 0) return (
    <div className="text-center py-7 text-text-muted text-[13px]">
      <div className="mb-2 flex justify-center"><Inbox size={32} /></div>
      No active tickets right now
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {active.map(({ ticket }) => {
        const name = ticket.users ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
        const isServing = ticket.status === 'in_progress'
        return (
          <div key={ticket.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] border ${isServing ? 'border-success-border bg-success-light' : 'border-border bg-off-white'}`}>
            <span className="font-serif text-[17px] font-extrabold text-maroon min-w-[60px]">{ticket.queue_number}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-main whitespace-nowrap overflow-hidden text-ellipsis">{name}</div>
              <div className="text-[11px] text-text-muted mt-px">{ticket.appointments?.transaction_types?.name || 'Transaction'}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap border ${isServing ? 'bg-success-light text-success border-success-border' : 'bg-gold-light text-gold border-gold-border'}`}>
              {isServing ? '● Serving' : '◔ Waiting'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sidebar Item ───────────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick, badge, disabled }) => (
  <button 
    onClick={disabled ? undefined : onClick} 
    disabled={disabled}
    className={`flex items-center gap-[11px] w-full px-3.5 py-2.5 rounded-[10px] border-none text-left text-[13.5px] font-sans relative transition-colors duration-150
      ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
      ${active ? 'bg-maroon-mid text-maroon font-semibold' : 'bg-transparent text-text-sub font-normal'}
      ${!active && !disabled ? 'hover:bg-surface hover:text-text-main' : ''}
    `}
  >
    <span className="text-[17px] w-5 text-center shrink-0">{icon}</span>
    <span className="flex-1">{label}</span>
    {badge > 0 && (
      <span className="bg-maroon text-white text-[10px] font-bold px-1.5 py-px rounded-full min-w-[18px] text-center">
        {badge}
      </span>
    )}
  </button>
)

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, colorClass, bgClass, loading, delay }) => (
  <div className="animate-fade-up bg-white rounded-[14px] px-5 py-[18px] border border-border flex flex-col gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ animationDelay: delay || '0s' }}>
    <div className="flex items-start justify-between">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.06em] mt-1.5">{label}</div>
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
    </div>
    <div className={`font-serif text-[28px] font-extrabold leading-none m-0 min-h-[28px] ${colorClass}`}>
      {loading ? <div className="animate-pulse w-[60px] h-7 rounded-md bg-border" /> : value}
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
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('overview')
  const [profileOpen, setProfileOpen] = useState(false)

  // Data states
  const [queue, setQueue] = useState([])
  const [badgeStats, setBadgeStats] = useState({ messages: 0, idRequests: 0 })
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

  const handleReleaseWindow = async () => {
    const prevWindow = myWindow;
    try {
      setIsLoadingWindow(true)
      setMyWindow(null)
      await releaseWindow(token)
      await loadWindowData()
    } catch (e) { 
      console.error(e)
      setMyWindow(prevWindow)
      setWindowError(e.message) 
    } finally {
      setIsLoadingWindow(false)
    }
  }

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [qData, aStats, msgs, reqs] = await Promise.all([
        getTodaysQueue(token),
        getAppointmentStats(token).catch(() => ({ today_appointments: 0, completed_today: 0, total_monthly: 0 })),
        getMessages(token).catch(() => []),
        getIdRequests(token).catch(() => [])
      ])
      setQueue(qData)
      setApptStats(aStats)
      setBadgeStats({
        messages: msgs.filter(m => !m.is_read).length,
        idRequests: reqs.filter(r => r.status === 'pending').length
      })
    } catch (e) { console.error("Error loading dashboard stats", e) }
    finally { setLoadingQueue(false) }
  }, [token])

  useEffect(() => {
    loadData()
    loadWindowData()
    const t = setInterval(loadData, 5000)
    const wt = setInterval(loadWindowData, 12000)
    return () => { clearInterval(t); clearInterval(wt) }
  }, [loadData])

  // Calculate stats
  const activeInQueue = queue.filter(q => q.ticket.status !== 'completed').length
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
    { icon: <Users size={20} />, value: activeInQueue.toString(), label: 'Active in Queue', colorClass: 'text-maroon', bgClass: 'bg-maroon-light', loading: loadingQueue, delay: '0.1s' },
    { icon: <CheckSquare size={20} />, value: completedToday.toString(), label: 'Completed Today', colorClass: 'text-success', bgClass: 'bg-success-light', loading: loadingQueue, delay: '0.2s' },
    { icon: <Clock size={20} />, value: `${avgWait}m`, label: 'Avg. Process Time', colorClass: 'text-gold', bgClass: 'bg-gold-light', loading: loadingQueue, delay: '0.3s' },
    { icon: <CalendarClock size={20} />, value: pendingAppts.toString(), label: 'Pending Appts.', colorClass: 'text-blue', bgClass: 'bg-blue-light', loading: loadingQueue, delay: '0.4s' },
  ]

  const navItems = [
    { id: 'overview', icon: <BarChart2 size={18} />, label: 'Dashboard' },
    { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue Management' },
    { id: 'appointments', icon: <Calendar size={18} />, label: 'Appointments' },
    { id: 'records', icon: <ClipboardList size={18} />, label: 'Student Records' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Messages', badge: badgeStats.messages },
    { id: 'id-requests', icon: <HelpCircle size={18} />, label: 'Id Requests', badge: badgeStats.idRequests },
  ]

  return (
    <div className="min-h-screen flex bg-off-white font-sans">

      {/* ── Fixed Left Sidebar ── */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 px-3.5 py-5">
        {/* Logo */}
        <div className="flex items-center gap-2.5 pl-1.5 mb-7">
          <img src={crmcLogo} alt="CRMC" className="w-[34px] h-[34px] rounded-full" />
          <div>
            <div className="font-serif text-[15px] font-bold text-maroon">CampusFlow</div>
            <div className="text-[10px] text-text-muted tracking-[0.04em]">Staff Portal</div>
          </div>
        </div>

        {/* Nav */}
        <div className="text-[10px] font-bold text-text-muted tracking-[0.08em] uppercase px-3.5 mb-1.5">Navigation</div>
        <nav className="flex flex-col gap-[3px] flex-1">
          {navItems.map(item => (
            <SideItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.id}
              onClick={() => myWindow ? setActiveNav(item.id) : null}
              badge={item.badge}
              disabled={!myWindow}
            />
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
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="bg-white border-b border-border px-7 h-[60px] flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div>
            {/* Empty space for layout balance */}
          </div>

          {/* Window Badge + Avatar */}
          <div className="flex items-center gap-3">

            {/* Active Window Badge */}
            {myWindow ? (
              <div className="flex items-center gap-2 bg-success-light border-[1.5px] border-success-border rounded-[10px] px-3.5 py-1.5">
                <Monitor size={16} className="text-success" />
                <span className="text-[13px] font-bold text-success font-sans">
                  Window {myWindow}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReleaseWindow()
                  }}
                  title="Release window"
                  className="bg-transparent border-none cursor-pointer text-success flex items-center pl-1 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <MonitorX size={15} />
                </button>
              </div>
            ) : (
              <div className="text-xs text-text-muted font-semibold font-sans">
                No window assigned
              </div>
            )}

            <NotificationDropdown />

            {/* Avatar dropdown */}
            <div className="relative">
              {profileOpen && <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-105" />}
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center justify-center p-0 rounded-full border-none bg-transparent cursor-pointer outline-none">
                <div className="w-[38px] h-[38px] rounded-full bg-maroon-mid border-[1.5px] border-maroon-border flex items-center justify-center text-[15px] font-bold text-maroon transition-colors hover:bg-maroon-light">
                  {user?.first_name?.[0]?.toUpperCase() || 'S'}
                </div>
              </button>
              {profileOpen && (
                <div className="absolute top-[44px] right-0 w-[200px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)] p-3 z-110">
                  <div className="text-[13px] font-semibold text-text-main mb-1">{user?.first_name} {user?.last_name}</div>
                  <div className="text-[11px] text-text-muted mb-3 break-all">{user?.email}</div>
                  <div className="h-px bg-border mb-2.5" />
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
                      logout();
                      navigate('/login', { replace: true });
                    }
                  }} className="w-full px-3 py-[9px] rounded-lg border-none bg-danger-light text-danger text-[13px] font-semibold cursor-pointer flex items-center gap-2 font-sans hover:bg-[#FCA5A5] transition-colors">
                    <span className="flex items-center"><LogOut size={16} /></span> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="p-7 flex-1 relative">

          {/* ──── WINDOW GATE OVERLAY ──── */}
          {!myWindow && (
            <div className="absolute inset-0 z-30 bg-surface/85 backdrop-blur-md flex items-center justify-center p-7">
              {isLoadingWindow ? (
                <div className="w-12 h-12 border-4 border-maroon border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="bg-white rounded-[24px] px-10 pt-10 pb-9 border-[1.5px] border-gold-border shadow-[0_8px_40px_rgba(0,0,0,0.1)] w-full max-w-[560px] text-center">
                <div className="w-16 h-16 rounded-full bg-gold-light border-2 border-gold-border flex items-center justify-center mx-auto mb-5">
                  <Monitor size={28} className="text-gold" />
                </div>
                <p className="text-[11px] font-bold text-gold tracking-[0.12em] uppercase m-0 mb-2">Action Required</p>
                <h2 className="font-serif text-[26px] font-extrabold text-text-main m-0 mb-2.5">Claim Your Service Window</h2>
                <p className="text-[14px] text-text-sub m-0 mb-7 leading-relaxed">
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
                        className={`flex flex-col items-center justify-center gap-2 w-[110px] h-[100px] rounded-2xl border-2 transition-all duration-200 font-sans group
                          ${occupiedByOther 
                            ? 'border-border bg-surface cursor-not-allowed opacity-60' 
                            : 'border-maroon-border bg-maroon-light cursor-pointer hover:bg-maroon hover:border-maroon'
                          }
                        `}
                      >
                        <span className={`flex transition-colors duration-200 ${occupiedByOther ? 'text-text-muted' : 'text-maroon group-hover:text-white'}`}>
                          {occupiedByOther ? <MonitorX size={24} /> : <Monitor size={24} />}
                        </span>
                        <span className={`text-[13px] font-bold transition-colors duration-200 ${occupiedByOther ? 'text-text-muted' : 'text-maroon group-hover:text-white'}`}>
                          {isClaiming ? 'Claiming…' : occupiedByOther ? 'Occupied' : `Window ${winNum}`}
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
          {activeNav === 'overview' && (
            <>
              <div className="mb-6">
                <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Today's Summary</p>
                <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
                  <BarChart2 size={24} className="text-maroon" /> Daily Overview
                </h1>
                <p className="text-[12px] text-text-sub mt-2 mb-0">
                  A high-level view of today's queue, active operations, and urgent escalations.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mb-7">
                {stats.map((s, i) => <StatCard key={i} {...s} />)}
              </div>

              {/* Two-column: Queue preview + AI Escalations */}
              <div className="grid grid-cols-[1fr_340px] gap-5">

                {/* Live Queue Preview */}
                <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1">Real-Time</p>
                      <h2 className="font-serif text-[18px] font-bold text-text-main m-0">Live Queue Management</h2>
                    </div>
                    <button onClick={() => setActiveNav('queue')} className="px-3.5 py-1.5 rounded-lg border border-maroon-border bg-maroon-light text-maroon text-xs font-semibold cursor-pointer font-sans hover:bg-maroon-border transition-colors">
                      View All
                    </button>
                  </div>
                  <CompactQueuePreview queue={queue} loading={loadingQueue} />
                </div>

                {/* AI Escalations Panel */}
                <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col" style={{ animationDelay: '0.6s' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1">Inbox</p>
                      <h2 className="font-serif text-[18px] font-bold text-text-main m-0">AI Escalations</h2>
                    </div>
                    <span className="bg-danger text-white text-[11px] font-bold px-2 py-0.5 rounded-full">New</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <CompactMessagesPreview />
                  </div>
                  <button onClick={() => setActiveNav('messages')} className="mt-4 w-full p-2.5 rounded-xl border border-border bg-off-white text-text-sub text-[13px] font-semibold cursor-pointer font-sans hover:bg-border transition-colors">
                    View All Messages
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ──── QUEUE VIEW ──── */}
          {activeNav === 'queue' && (
            <LiveQueuePage />
          )}

          {/* ──── MESSAGES VIEW ──── */}
          {activeNav === 'messages' && (
            <MessagesPage />
          )}

          {/* ──── APPOINTMENTS VIEW ──── */}
          {activeNav === 'appointments' && (
            <AppointmentsPage />
          )}

          {/* ──── STUDENT RECORDS VIEW ──── */}
          {activeNav === 'records' && (
            <StudentRecordsPage />
          )}

          {/* ──── ID REQUESTS VIEW ──── */}
          {activeNav === 'id-requests' && (
            <IdRequestsPage />
          )}
        </main>
      </div>
    </div>
  )
}
