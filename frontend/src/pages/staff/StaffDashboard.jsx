import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import crmcLogo from '../../assets/crmc-logo.webp'
import LiveQueuePage from './LiveQueuePage'
import MessagesPage from './MessagesPage'
import AppointmentsPage from './AppointmentsPage'
import StudentRecordsPage from './StudentRecordsPage'
import { getTodaysQueue } from '../../services/queueService'
import { getMessages, markMessageRead } from '../../services/messagesService'
import { getAppointmentStats } from '../../services/appointmentService'
import { Inbox, MessageSquare, BarChart2, Ticket, Calendar, ClipboardList, LogOut, Users, CheckSquare, Clock, CalendarClock, Monitor, MonitorX } from 'lucide-react'
import { getWindowAssignments, claimWindow, releaseWindow } from '../../services/adminService'

// ── Design Tokens ──────────────────────────────────────────────────────────────
const M = {
  maroon: '#7B1A2A',
  maroonDark: '#5C1320',
  maroonLight: '#F9F0F1',
  maroonMid: 'rgba(123,26,42,0.08)',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold: '#B8900A',
  goldLight: '#FDF6E3',
  goldBorder: 'rgba(184,144,10,0.3)',
  white: '#FFFFFF',
  offWhite: '#F9F7F4',
  surface: '#F2EDE8',
  border: '#EAE7E2',
  text: '#1C1917',
  textSub: '#57534E',
  textMuted: '#A8A29E',
  green: '#15803D',
  greenLight: '#F0FDF4',
  greenBorder: '#BBF7D0',
  blue: '#1D4ED8',
  blueLight: '#EFF6FF',
  blueBorder: '#BFDBFE',
  red: '#DC2626',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
}

const PRIORITY = {
  urgent: { bg: M.redLight, color: M.red, border: M.redBorder, label: 'Urgent' },
  normal: { bg: M.goldLight, color: M.gold, border: M.goldBorder, label: 'Normal' },
  fyi: { bg: M.blueLight, color: M.blue, border: M.blueBorder, label: 'FYI' },
}
const CATEGORY = {
  requirements: { label: 'Requirements' },
  scheduling: { label: 'Scheduling' },
  process: { label: 'Process' },
  complaint: { label: 'Complaint' },
  other: { label: 'Other' },
}

// ── Compact Queue Preview (Overview panel) ─────────────────────────────────────
function CompactQueuePreview({ queue, loading }) {
  const active = queue.filter(q => q.ticket.status !== 'completed').slice(0, 4)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1,2,3].map(i => <div key={i} style={{ height: '48px', borderRadius: '10px' }} className="animate-shimmer" />)}
    </div>
  )

  if (active.length === 0) return (
    <div style={{ textAlign: 'center', padding: '28px 0', color: M.textMuted, fontSize: '13px' }}>
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><Inbox size={32} /></div>
      No active tickets right now
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {active.map(({ ticket }) => {
        const name = ticket.users ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
        const isServing = ticket.status === 'in_progress'
        return (
          <div key={ticket.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '10px',
            border: `1px solid ${isServing ? M.greenBorder : M.border}`,
            background: isServing ? M.greenLight : M.offWhite,
          }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 800, color: M.maroon, minWidth: '60px' }}>{ticket.queue_number}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: '11px', color: M.textMuted, marginTop: '1px' }}>{ticket.appointments?.transaction_types?.name || 'Transaction'}</div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', whiteSpace: 'nowrap', background: isServing ? M.greenLight : M.goldLight, color: isServing ? M.green : M.gold, border: `1px solid ${isServing ? M.greenBorder : M.goldBorder}` }}>
              {isServing ? '● Serving' : '◔ Waiting'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sidebar Item ───────────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick, badge, style, disabled }) => (

  <button onClick={disabled ? undefined : onClick} style={{
    display: 'flex', alignItems: 'center', gap: '11px',
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
    background: active ? M.maroonMid : 'transparent',
    color: active ? M.maroon : M.textSub,
    fontSize: '13.5px', fontWeight: active ? 600 : 400,
    fontFamily: "'IBM Plex Sans', sans-serif",
    position: 'relative', transition: 'background 0.15s, color 0.15s',
    ...style
  }}
    disabled={disabled}
    onMouseEnter={e => { if (!active && !disabled) { e.currentTarget.style.background = M.surface; e.currentTarget.style.color = M.text; } }}
    onMouseLeave={e => { if (!active && !disabled) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.textSub; } }}
  >
    <span style={{ fontSize: '17px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge > 0 && (
      <span style={{ background: M.maroon, color: M.white, fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '100px', minWidth: '18px', textAlign: 'center' }}>
        {badge}
      </span>
    )}
  </button>
)

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, color = M.maroon, bg = M.maroonLight, loading, delay }) => (
  <div className="animate-fade-up" style={{ animationDelay: delay || '0s', background: M.white, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${M.border}`, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>{label}</div>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, flexShrink: 0 }}>
        {icon}
      </div>
    </div>
    <div style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 800, color, lineHeight: 1, margin: 0, minHeight: '28px' }}>
      {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '28px', borderRadius: '6px', background: M.border }} /> : value}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1,2,3].map(i => <div key={i} style={{ height: '64px', borderRadius: '12px' }} className="animate-shimmer" />)}
    </div>
  )

  if (unread.length === 0) return (
    <div style={{ textAlign: 'center', padding: '28px 0', color: M.textMuted, fontSize: '13px' }}>
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><MessageSquare size={32} /></div>
      No new escalations
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {unread.map(msg => {
        const name = msg.users ? `${msg.users.first_name} ${msg.users.last_name}` : 'Unknown Student'
        const raw = msg.content || ''
        const body = (raw.match(/^\[.*?\]\s*\n\n([\s\S]*)/) || [])[1]?.trim() || raw
        return (
          <div key={msg.id} style={{
            background: M.white, borderRadius: '12px',
            border: `1px solid ${M.maroonBorder}`,
            padding: '12px 14px',
            boxShadow: '0 1px 6px rgba(123,26,42,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: M.text }}>{name}</span>
              {msg.priority === 'urgent' && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '100px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}` }}>URGENT</span>}
            </div>
            <p style={{ fontSize: '12px', color: M.textSub, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
  const [loadingQueue, setLoadingQueue] = useState(true)
  const [apptStats, setApptStats] = useState({ today_appointments: 0, completed_today: 0, total_monthly: 0 })

  // Window assignment state
  const [numWindows, setNumWindows] = useState(3)
  const [windowAssignments, setWindowAssignments] = useState({}) // { userId: windowNum }
  const [myWindow, setMyWindow] = useState(null)
  const [windowError, setWindowError] = useState('')
  const [claimingWindow, setClaimingWindow] = useState(null)

  const loadWindowData = async () => {
    try {
      const data = await getWindowAssignments(token)
      setNumWindows(data.num_windows || 3)
      setWindowAssignments(data.assignments || {})
      setMyWindow(data.assignments?.[user?.id] || null)
    } catch (e) { console.error('Window fetch error', e) }
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
    try {
      await releaseWindow(token)
      await loadWindowData()
    } catch (e) { setWindowError(e.message) }
  }

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [qData, aStats] = await Promise.all([
        getTodaysQueue(token),
        getAppointmentStats(token).catch(() => ({ today_appointments: 0, completed_today: 0, total_monthly: 0 }))
      ])
      setQueue(qData)
      setApptStats(aStats)
    } catch (e) { console.error("Error loading dashboard stats", e) }
    finally { setLoadingQueue(false) }
  }, [token])

  useEffect(() => {
    loadData()
    loadWindowData()
    const t = setInterval(loadData, 30000)
    const wt = setInterval(loadWindowData, 20000)
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
    { icon: <Users size={20} />, value: activeInQueue.toString(), label: 'Active in Queue', color: M.maroon, bg: M.maroonLight, loading: loadingQueue, delay: '0.1s' },
    { icon: <CheckSquare size={20} />, value: completedToday.toString(), label: 'Completed Today', color: M.green, bg: M.greenLight, loading: loadingQueue, delay: '0.2s' },
    { icon: <Clock size={20} />, value: `${avgWait}m`, label: 'Avg. Process Time', color: M.gold, bg: M.goldLight, loading: loadingQueue, delay: '0.3s' },
    { icon: <CalendarClock size={20} />, value: pendingAppts.toString(), label: 'Pending Appts.', color: M.blue, bg: M.blueLight, loading: loadingQueue, delay: '0.4s' },
  ]

  const navItems = [
    { id: 'overview', icon: <BarChart2 size={18} />, label: 'Dashboard' },
    { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue Management' },
    { id: 'appointments', icon: <Calendar size={18} />, label: 'Appointments' },
    { id: 'records', icon: <ClipboardList size={18} />, label: 'Student Records' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Messages' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Fixed Left Sidebar ── */}
      <aside style={{
        width: '240px', flexShrink: 0,
        background: M.white, borderRight: `1px solid ${M.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0,
        zIndex: 50, padding: '20px 14px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '6px', marginBottom: '28px' }}>
          <img src={crmcLogo} alt="CRMC" style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, color: M.maroon }}>CampusFlow</div>
            <div style={{ fontSize: '10px', color: M.textMuted, letterSpacing: '0.04em' }}>Staff Portal</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 14px', marginBottom: '6px' }}>Navigation</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          {navItems.map(item => (
            <SideItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.id}
              onClick={() => myWindow ? setActiveNav(item.id) : null}
              badge={item.badge}
              style={!myWindow ? { opacity: 0.4 } : {}}
              disabled={!myWindow}
            />
          ))}
        </nav>
        {/* Window required hint in sidebar */}
        {!myWindow && (
          <div style={{
            margin: '0 4px 8px', padding: '10px 12px', borderRadius: '10px',
            background: M.goldLight, border: `1px solid ${M.goldBorder}`,
            fontSize: '11px', color: M.gold, fontWeight: 600, lineHeight: 1.5,
          }}>
            ⚠ Claim a window to unlock navigation.
          </div>
        )}
      </aside>

      {/* ── Right Content ── */}
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top Bar */}
        <header style={{
          background: M.white, borderBottom: `1px solid ${M.border}`,
          padding: '0 28px', height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 40,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div>
            <span style={{ fontSize: '18px', fontFamily: "'Fraunces', serif", fontWeight: 700, color: M.maroon }}>Welcome back, Staff. Here's what's happening today.</span>
          </div>

          {/* Window Badge + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Active Window Badge */}
            {myWindow ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                background: M.greenLight, border: `1.5px solid ${M.greenBorder}`,
                borderRadius: '10px', padding: '6px 14px',
              }}>
                <Monitor size={16} color={M.green} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: M.green, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Window {myWindow}
                </span>
                <button
                  onClick={handleReleaseWindow}
                  title="Release window"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.green, display: 'flex', alignItems: 'center', padding: '0 0 0 4px', opacity: 0.6 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                >
                  <MonitorX size={15} />
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: M.textMuted, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                No window assigned
              </div>
            )}

            {/* Avatar dropdown */}
            <div style={{ position: 'relative' }}>
              {profileOpen && <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 105 }} />}
              <button onClick={() => setProfileOpen(!profileOpen)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0', borderRadius: '50%', border: 'none',
                background: 'transparent', cursor: 'pointer', outline: 'none',
              }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: M.maroonMid, border: `1.5px solid ${M.maroonBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: M.maroon }}>
                  {user?.first_name?.[0]?.toUpperCase() || 'S'}
                </div>
              </button>
              {profileOpen && (
                <div style={{ position: 'absolute', top: '44px', right: 0, width: '200px', background: M.white, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)', padding: '12px', zIndex: 110 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: M.text, marginBottom: '4px' }}>{user?.first_name} {user?.last_name}</div>
                  <div style={{ fontSize: '11px', color: M.textMuted, marginBottom: '12px', wordBreak: 'break-all' }}>{user?.email}</div>
                  <div style={{ height: '1px', background: M.border, marginBottom: '10px' }} />
                  <button onClick={async () => {
                    if (myWindow) {
                      try {
                        await releaseWindow(token)
                      } catch (e) {
                        console.error('Failed to release window on logout', e)
                      }
                    }
                    logout(); navigate('/login')
                  }} style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px', border: 'none',
                    background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}><LogOut size={16} /></span> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main style={{ padding: '28px', flex: 1, position: 'relative' }}>

          {/* ──── WINDOW GATE OVERLAY ──── */}
          {!myWindow && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(242, 237, 232, 0.85)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '28px',
            }}>
              <div style={{
                background: M.white, borderRadius: '24px', padding: '40px 40px 36px',
                border: `1.5px solid ${M.goldBorder}`,
                boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
                width: '100%', maxWidth: '560px', textAlign: 'center',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: M.goldLight, border: `2px solid ${M.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <Monitor size={28} color={M.gold} />
                </div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Action Required</p>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: M.text, margin: '0 0 10px' }}>Claim Your Service Window</h2>
                <p style={{ fontSize: '14px', color: M.textSub, margin: '0 0 28px', lineHeight: 1.6 }}>
                  You must be assigned to a window before you can access the queue, appointments, or any other features.
                </p>
                {windowError && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.redLight, color: M.red, fontSize: '13px', marginBottom: '20px', border: `1px solid ${M.redBorder}` }}>
                    {windowError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Array.from({ length: numWindows }, (_, i) => i + 1).map(winNum => {
                    const occupiedByOther = Object.entries(windowAssignments).some(([uid, wn]) => wn === winNum && uid !== user?.id)
                    const isClaiming = claimingWindow === winNum
                    return (
                      <button
                        key={winNum}
                        onClick={() => !occupiedByOther && handleClaimWindow(winNum)}
                        disabled={occupiedByOther || !!claimingWindow}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '8px', width: '110px', height: '100px', borderRadius: '16px',
                          border: `2px solid ${occupiedByOther ? M.border : M.maroonBorder}`,
                          background: occupiedByOther ? M.surface : M.maroonLight,
                          cursor: occupiedByOther ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          opacity: occupiedByOther ? 0.6 : 1,
                        }}
                        onMouseEnter={e => { if (!occupiedByOther && !claimingWindow) { e.currentTarget.style.background = M.maroon; e.currentTarget.style.borderColor = M.maroon; e.currentTarget.querySelector('.win-label').style.color = '#fff'; e.currentTarget.querySelector('.win-icon').style.color = '#fff'; } }}
                        onMouseLeave={e => { if (!occupiedByOther) { e.currentTarget.style.background = M.maroonLight; e.currentTarget.style.borderColor = M.maroonBorder; e.currentTarget.querySelector('.win-label').style.color = M.maroon; e.currentTarget.querySelector('.win-icon').style.color = M.maroon; } }}
                      >
                        <span className="win-icon" style={{ color: occupiedByOther ? M.textMuted : M.maroon, display: 'flex' }}>
                          {occupiedByOther ? <MonitorX size={24} /> : <Monitor size={24} />}
                        </span>
                        <span className="win-label" style={{ fontSize: '13px', fontWeight: 700, color: occupiedByOther ? M.textMuted : M.maroon }}>
                          {isClaiming ? 'Claiming…' : occupiedByOther ? 'Occupied' : `Window ${winNum}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──── OVERVIEW VIEW ──── */}
          {activeNav === 'overview' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Today's Summary</p>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 700, color: M.text, margin: 0 }}>Daily Overview</h1>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {stats.map((s, i) => <StatCard key={i} {...s} />)}
              </div>

              {/* Two-column: Queue preview + AI Escalations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

                {/* Live Queue Preview */}
                <div className="animate-fade-up" style={{ animationDelay: '0.5s', background: M.white, borderRadius: '16px', padding: '24px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Real-Time</p>
                      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Live Queue Management</h2>
                    </div>
                    <button onClick={() => setActiveNav('queue')} style={{
                      padding: '6px 14px', borderRadius: '8px', border: `1px solid ${M.maroonBorder}`,
                      background: M.maroonLight, color: M.maroon,
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                    }}>View All</button>
                  </div>
                  <CompactQueuePreview queue={queue} loading={loadingQueue} />
                </div>

                {/* AI Escalations Panel */}
                <div className="animate-fade-up" style={{ animationDelay: '0.6s', background: M.white, borderRadius: '16px', padding: '24px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Inbox</p>
                      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>AI Escalations</h2>
                    </div>
                    <span style={{ background: '#DC2626', color: M.white, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>New</span>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <CompactMessagesPreview />
                  </div>
                  <button onClick={() => setActiveNav('messages')} style={{
                    marginTop: '16px', width: '100%', padding: '9px', borderRadius: '9px',
                    border: `1px solid ${M.border}`, background: M.offWhite,
                    color: M.textSub, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>View All Messages</button>
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
        </main>
      </div>
    </div>
  )
}