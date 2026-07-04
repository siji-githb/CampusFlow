import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep, getLiveQueueStats } from '../../services/queueService'
import { RefreshCw, AlertTriangle, Inbox } from 'lucide-react'

// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  high:    { label: 'HIGH',     bg: 'bg-danger-light',   color: 'text-danger',    border: 'border-danger-border'  },
  normal:  { label: 'NORMAL',   bg: 'bg-gold-light',  color: 'text-gold',   border: 'border-gold-border' },
  low:     { label: 'LOW',      bg: 'bg-info-light',  color: 'text-info',   border: 'border-info-border' },
  resolved:{ label: 'RESOLVED', bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border'},
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
    <span className={`text-[10px] font-bold py-[3px] px-2.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} tracking-wider`}>
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
    const t = setInterval(fetchQueue, 5000)
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
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-[30px] font-bold text-maroon m-0 mb-1.5">Live Operations Dashboard</h1>
          <p className="text-[14px] text-text-muted m-0">Real-time monitoring of registrar queues and service windows.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 py-2 px-3.5 rounded-full bg-success-light border border-success-border">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_#15803D]" />
            <span className="text-[12px] font-semibold text-success">System Online & Active</span>
          </div>
          <button onClick={fetchQueue} className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-text-main" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <div className="bg-maroon text-white py-2 px-4 rounded-[9px] font-serif text-[15px] font-bold">
            {currentTime}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-[12px_16px] rounded-[10px] bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-1.5">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {/* Total in Queue */}
        <div className="animate-fade-up bg-white rounded-2xl p-[20px_22px] border border-border shadow-sm" style={{ animationDelay: '0.1s' }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-2.5">Total in Queue</div>
          <div className="font-serif text-[36px] font-bold text-maroon leading-none mb-1.5 min-h-[36px]">
            {loading ? <div className="animate-pulse w-[60px] h-[36px] bg-border rounded-lg" /> : waiting.length}
          </div>
        </div>

        {/* Avg Wait Time */}
        <div className="animate-fade-up bg-white rounded-2xl p-[20px_22px] border border-border shadow-sm" style={{ animationDelay: '0.2s' }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-2.5">Avg. Wait Time</div>
          <div className="font-serif text-[36px] font-bold text-maroon leading-none mb-1.5 min-h-[36px]">
            {loading ? <div className="animate-pulse w-[80px] h-[36px] bg-border rounded-lg" /> : <>{avgWait}m&nbsp;<span className="text-[22px]">{queueStats?.avg_wait_seconds || 0}s</span></>}
          </div>
        </div>

        {/* Peak Forecast */}
        <div className="animate-fade-up bg-maroon rounded-2xl p-[20px_22px] shadow-[0_4px_16px_rgba(123,26,42,0.25)] relative overflow-hidden" style={{ animationDelay: '0.3s' }}>
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="text-[11px] font-semibold text-white/65 uppercase tracking-[0.06em] mb-2.5 relative z-10">Peak Forecast</div>
          <div className="font-serif text-[28px] font-bold text-white leading-none mb-1.5 min-h-[28px] relative z-10">
            {loading ? <div className="animate-pulse w-[90px] h-[28px] bg-white/20 rounded-lg" /> : peakHour}
          </div>
        </div>
      </div>

      {/* ── Up Next (Live Queue) ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-[18px] font-bold text-text-main m-0">
            Up Next <span className="text-text-muted font-normal text-[16px]">(Live Queue)</span>
          </h2>
          <button onClick={() => setShowAll(!showAll)} className="bg-transparent border-none cursor-pointer text-[13px] font-semibold text-maroon font-sans flex items-center gap-1">
            {showAll ? 'Show Less' : 'View Full Queue'} →
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[110px_1.5fr_1.5fr_90px_110px_140px] py-3 px-5 rounded-t-xl bg-surface border border-border border-b-0">
          {['Queue No.', 'Student Name', 'Transaction', 'Wait Time', 'Priority', 'Action'].map(h => (
            <span key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-[0.06em]">{h}</span>
          ))}
        </div>

        {/* Table rows */}
        <div className="border border-border rounded-b-2xl overflow-hidden bg-white">
          {loading ? (
            [1, 2, 3].map((n, idx) => (
              <div key={n} className={`grid grid-cols-[110px_1.5fr_1.5fr_90px_110px_140px] p-[16px_20px] items-center ${idx === 2 ? 'border-none' : 'border-b border-border'} ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFCFB]'}`}>
                <div className="animate-pulse h-5 w-[50px] rounded bg-border" />
                <div className="animate-pulse h-[18px] w-[60%] rounded bg-border" />
                <div className="animate-pulse h-4 w-[80%] rounded bg-border" />
                <div className="animate-pulse h-4 w-[30px] rounded bg-border" />
                <div className="animate-pulse h-6 w-[70px] rounded-full bg-border" />
                <div className="animate-pulse h-[30px] w-[80px] rounded-lg bg-border" />
              </div>
            ))
          ) : upNext.length === 0 ? (
            <div className="p-10 text-center">
              <div className="flex justify-center mb-2.5 text-text-muted"><Inbox size={40} /></div>
              <p className="text-[14px] font-semibold text-text-main m-0 mb-1">Queue is clear</p>
              <p className="text-[13px] text-text-muted m-0">No students are currently waiting.</p>
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
                <div key={ticket.id} className={`grid grid-cols-[110px_1.5fr_1.5fr_90px_110px_140px] p-[16px_20px] items-center transition-colors duration-150 ${isLast ? 'border-none' : 'border-b border-border'} ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFCFB]'}`}>
                  <span className="font-serif text-[16px] font-bold text-maroon">{ticket.queue_number}</span>
                  <span className="text-[14px] font-semibold text-text-main">{name}</span>
                  <span className="text-[13px] text-text-sub">{txName}</span>
                  <span className="text-[13px] font-semibold text-text-sub">{waitMin}</span>
                  <div className="flex items-center"><PriorityBadge level={priority} /></div>
                  <button
                    onClick={() => handleConfirm(ticket.id, ticket.current_step)}
                    className="py-2 px-3.5 rounded-lg border border-maroon-border bg-maroon-light text-maroon text-[12px] font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-maroon hover:text-white transition-colors"
                  >
                    Call Now
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Completed section */}
        {completed.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-3">
              Completed Today — {completed.length} tickets
            </p>
            <div className="flex flex-col gap-1.5">
              {completed.map(({ ticket }) => (
                <div key={ticket.id} className="flex items-center justify-between p-[12px_20px] rounded-[10px] bg-white border border-border">
                  <div className="flex items-center gap-3.5">
                    <span className="font-serif font-bold text-text-muted text-[15px]">{ticket.queue_number}</span>
                    <span className="text-[13px] text-text-sub">{ticket.users?.last_name}, {ticket.users?.first_name}</span>
                    <span className="text-[12px] text-text-muted">{ticket.appointments?.transaction_types?.name}</span>
                  </div>
                  <span className="text-[11px] font-bold py-[3px] px-2.5 rounded-full bg-success-light text-success border border-success-border">Completed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
