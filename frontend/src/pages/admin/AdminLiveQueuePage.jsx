import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep, getLiveQueueStats } from '../../services/queueService'
import { RefreshCw, AlertTriangle, Inbox } from 'lucide-react'

// ── Design Tokens (shared with AdminDashboard) ─────────────────────────────────
const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonMid:    'rgba(123,26,42,0.08)',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.3)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  surface:      '#F2EDE8',
  border:       '#EAE7E2',
  text:         '#1C1917',
  textSub:      '#57534E',
  textMuted:    '#A8A29E',
  green:        '#15803D',
  greenLight:   '#F0FDF4',
  greenBorder:  '#BBF7D0',
  blue:         '#1D4ED8',
  blueLight:    '#EFF6FF',
  blueBorder:   '#BFDBFE',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
}

// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  high:    { label: 'HIGH',     bg: M.redLight,   color: M.red,    border: M.redBorder  },
  normal:  { label: 'NORMAL',   bg: M.goldLight,  color: M.gold,   border: M.goldBorder },
  low:     { label: 'LOW',      bg: M.blueLight,  color: M.blue,   border: M.blueBorder },
  resolved:{ label: 'RESOLVED', bg: M.greenLight, color: M.green,  border: M.greenBorder},
}
const getPriority = (ticket) => {
  const pc = ticket.appointments?.priority_class
  if (pc === 'graduating' || pc === 'pwd') return 'high'
  if (ticket.status === 'completed') return 'resolved'
  return 'normal'
}



// ── Priority Badge ─────────────────────────────────────────────────────────────
const PriorityBadge = ({ level }) => {
  const cfg = PRIORITY_CFG[level] || PRIORITY_CFG.normal
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: '0.05em' }}>
      {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AdminLiveQueuePage
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLiveQueuePage() {
  const { token } = useAuth()
  const [queue, setQueue]       = useState([])
  const [queueStats, setQueueStats] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [error, setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow]           = useState(new Date())
  const [showAll, setShowAll]   = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      const [data, stats] = await Promise.all([
        getTodaysQueue(token),
        getLiveQueueStats(token)
      ])
      setQueue(data)
      setQueueStats(stats)
      setLastUpdated(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 30000)
    return () => clearInterval(t)
  }, [fetchQueue])

  const handleConfirm = async (ticketId, stepNum) => {
    const key = `${ticketId}-${stepNum}`
    setConfirming(key)
    try { await confirmStep(token, ticketId, stepNum); await fetchQueue() }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  // Derived data
  const serving   = queue.filter(q => q.ticket.status === 'in_progress')
  const waiting   = queue.filter(q => q.ticket.status === 'pending')
  const completed = queue.filter(q => q.ticket.status === 'completed')



  // "Up Next" — pending tickets
  const upNext = waiting.slice(0, showAll ? 50 : 5)

  // Peak forecast hour
  const peakHour = queueStats?.peak_forecast || '—'
  const avgWait = queueStats?.avg_wait_minutes || 0

  const currentTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 700, color: M.maroon, margin: '0 0 5px' }}>Live Operations Dashboard</h1>
          <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Real-time monitoring of registrar queues and service windows.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '100px', background: M.greenLight, border: `1px solid ${M.greenBorder}` }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: M.green, boxShadow: `0 0 6px ${M.green}` }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: M.green }}>System Online & Active</span>
          </div>
          <button onClick={fetchQueue} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.text }} title="Refresh">
            <RefreshCw size={18} />
          </button>
          <div style={{ background: M.maroon, color: M.white, padding: '8px 16px', borderRadius: '9px', fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700 }}>
            {currentTime}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {/* Total in Queue */}
        <div className="animate-fade-up" style={{ animationDelay: '0.1s', background: M.white, borderRadius: '16px', padding: '20px 22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Total in Queue</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '6px', minHeight: '36px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: M.border, borderRadius: '8px' }} /> : waiting.length}
          </div>
        </div>

        {/* Avg Wait Time */}
        <div className="animate-fade-up" style={{ animationDelay: '0.2s', background: M.white, borderRadius: '16px', padding: '20px 22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Avg. Wait Time</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '6px', minHeight: '36px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '80px', height: '36px', background: M.border, borderRadius: '8px' }} /> : <>{avgWait}m&nbsp;<span style={{ fontSize: '22px' }}>{queueStats?.avg_wait_seconds || 0}s</span></>}
          </div>
        </div>

        {/* Peak Forecast */}
        <div className="animate-fade-up" style={{ animationDelay: '0.3s', background: M.maroon, borderRadius: '16px', padding: '20px 22px', boxShadow: '0 4px 16px rgba(123,26,42,0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -16, top: -16, width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Peak Forecast</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 800, color: M.white, lineHeight: 1, marginBottom: '6px', minHeight: '28px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '90px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }} /> : peakHour}
          </div>
        </div>
      </div>

      {/* ── Up Next (Live Queue) ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>
            Up Next <span style={{ color: M.textMuted, fontWeight: 400, fontSize: '16px' }}>(Live Queue)</span>
          </h2>
          <button onClick={() => setShowAll(!showAll)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600, color: M.maroon,
            fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            {showAll ? 'Show Less' : 'View Full Queue'} →
          </button>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '110px 1.5fr 1.5fr 90px 110px 140px',
          padding: '11px 20px', borderRadius: '12px 12px 0 0',
          background: M.surface, border: `1px solid ${M.border}`, borderBottom: 'none',
        }}>
          {['Queue No.', 'Student Name', 'Transaction', 'Wait Time', 'Priority', 'Action'].map(h => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {/* Table rows */}
        <div style={{ border: `1px solid ${M.border}`, borderRadius: '0 0 16px 16px', overflow: 'hidden', background: M.white }}>
          {loading ? (
            [1, 2, 3].map((n, idx) => (
              <div key={n} style={{
                display: 'grid', gridTemplateColumns: '110px 1.5fr 1.5fr 90px 110px 140px',
                padding: '16px 20px', alignItems: 'center',
                borderBottom: idx === 2 ? 'none' : `1px solid ${M.border}`,
                background: idx % 2 === 0 ? M.white : '#FDFCFB',
              }}>
                <div className="animate-shimmer" style={{ height: '20px', width: '50px', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '18px', width: '60%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '80%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '30px', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '24px', width: '70px', borderRadius: '100px' }} />
                <div className="animate-shimmer" style={{ height: '30px', width: '80px', borderRadius: '8px' }} />
              </div>
            ))
          ) : upNext.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: M.textMuted }}><Inbox size={40} /></div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>Queue is clear</p>
              <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>No students are currently waiting.</p>
            </div>
          ) : (
            upNext.map(({ ticket }, idx) => {
              const student  = ticket.users
              const name     = student ? `${student.first_name} ${ticket.users.last_name}` : 'Unknown'
              const txName   = ticket.appointments?.transaction_types?.name || 'Transaction'
              const priority = getPriority(ticket)
              const waitMin  = Math.max(3, (idx + 1) * (avgWait || 5)) + 'm'
              const isLast   = idx === upNext.length - 1

              return (
                <div key={ticket.id} style={{
                  display: 'grid', gridTemplateColumns: '110px 1.5fr 1.5fr 90px 110px 140px',
                  padding: '16px 20px', alignItems: 'center',
                  borderBottom: isLast ? 'none' : `1px solid ${M.border}`,
                  background: idx % 2 === 0 ? M.white : '#FDFCFB',
                  transition: 'background 0.12s',
                }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 700, color: M.maroon }}>{ticket.queue_number}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: M.text }}>{name}</span>
                  <span style={{ fontSize: '13px', color: M.textSub }}>{txName}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: M.textSub }}>{waitMin}</span>
                  <PriorityBadge level={priority} />
                  <button
                    onClick={() => handleConfirm(ticket.id, ticket.current_step)}
                    style={{
                      padding: '7px 14px', borderRadius: '8px',
                      border: `1px solid ${M.maroonBorder}`, background: M.maroonLight,
                      color: M.maroon, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap',
                    }}>
                    Call Now
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Completed section */}
        {completed.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              Completed Today — {completed.length} tickets
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {completed.map(({ ticket }) => (
                <div key={ticket.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: '10px', background: M.white, border: `1px solid ${M.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: M.textMuted, fontSize: '15px' }}>{ticket.queue_number}</span>
                    <span style={{ fontSize: '13px', color: M.textSub }}>{ticket.users?.last_name}, {ticket.users?.first_name}</span>
                    <span style={{ fontSize: '12px', color: M.textMuted }}>{ticket.appointments?.transaction_types?.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: M.greenLight, color: M.green, border: `1px solid ${M.greenBorder}` }}>Completed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
