import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import crmcLogo from '../../assets/crmc-logo.webp'
import LiveQueuePage from './LiveQueuePage'
import MessagesPage from './MessagesPage'
import AppointmentsPage from './AppointmentsPage'
import { getTodaysQueue } from '../../services/queueService'
import { getMessages, markMessageRead } from '../../services/messagesService'
import { getAppointmentStats } from '../../services/appointmentService'

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
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
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
const SideItem = ({ icon, label, active, onClick, badge }) => (

  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '11px',
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: 'none', cursor: 'pointer', textAlign: 'left',
    background: active ? M.maroonMid : 'transparent',
    color: active ? M.maroon : M.textSub,
    fontSize: '13.5px', fontWeight: active ? 600 : 400,
    fontFamily: "'IBM Plex Sans', sans-serif",
    position: 'relative', transition: 'background 0.15s, color 0.15s',
  }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = M.surface; e.currentTarget.style.color = M.text; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.textSub; } }}
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
  <div className="animate-fade-up" style={{ animationDelay: delay || '0s', background: M.white, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 700, color, lineHeight: 1, minHeight: '28px' }}>
        {loading ? <div className="animate-shimmer" style={{ width: '50px', height: '28px', borderRadius: '6px', background: M.border }} /> : value}
      </div>
      <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '4px' }}>{label}</div>
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
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
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
  const [apptStats, setApptStats] = useState({ today_total: 0, today_completed: 0, monthly_total: 0 })

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [qData, aStats] = await Promise.all([
        getTodaysQueue(token),
        getAppointmentStats(token).catch(() => ({ today_total: 0, today_completed: 0, monthly_total: 0 }))
      ])
      setQueue(qData)
      setApptStats(aStats)
    } catch (e) { console.error("Error loading dashboard stats", e) }
    finally { setLoadingQueue(false) }
  }, [token])

  useEffect(() => {
    loadData()
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
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

  const pendingAppts = Math.max(0, apptStats.today_total - apptStats.today_completed)

  const stats = [
    { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, value: activeInQueue.toString(), label: 'Active in Queue', color: M.maroon, bg: M.maroonLight, loading: loadingQueue, delay: '0.1s' },
    { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M9 12.5L11.5 15L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, value: completedToday.toString(), label: 'Completed Today', color: M.green, bg: M.greenLight, loading: loadingQueue, delay: '0.2s' },
    { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="13" r="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><path d="M12 9V13L14.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 3H14M12 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, value: `${avgWait}m`, label: 'Avg. Process Time', color: M.gold, bg: M.goldLight, loading: loadingQueue, delay: '0.3s' },
    { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="4" width="14" height="18" rx="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="2" width="6" height="4" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/><path d="M9 11H15M9 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, value: pendingAppts.toString(), label: 'Pending Appts.', color: M.blue, bg: M.blueLight, loading: loadingQueue, delay: '0.4s' },
  ]

  const navItems = [
    { id: 'overview', icon: '📊', label: 'Dashboard' },
    { id: 'queue', icon: '🎫', label: 'Live Queue Management' },
    { id: 'appointments', icon: '📅', label: 'Appointments' },
    { id: 'messages', icon: '💬', label: 'Messages' },
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
            <SideItem key={item.id} icon={item.icon} label={item.label} active={activeNav === item.id} onClick={() => setActiveNav(item.id)} badge={item.badge} />
          ))}
        </nav>
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
            <span style={{ fontSize: '18px', fontFamily: "'Fraunces', serif", fontWeight: 700, color: M.maroon }}>Welcome back, {user?.first_name}. Here's what's happening today.</span>
          </div>

          {/* Search + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>


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
                  <button onClick={() => { logout(); navigate('/login') }} style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px', border: 'none',
                    background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>
                    <span>🚪</span> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main style={{ padding: '28px', flex: 1 }}>

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
        </main>
      </div>
    </div>
  )
}