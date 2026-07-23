import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep, getLiveQueueStats } from '../../services/queueService'
import { RefreshCw, AlertTriangle, Inbox, Ticket, Users, Clock, TrendingUp, Check, DoorOpen, Cog } from 'lucide-react'

// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  high:    { label: 'HIGH',     bg: 'bg-danger-light',   color: 'text-danger',    border: 'border-danger-border'  },
  normal:  { label: 'NORMAL',   bg: 'bg-gold-light',  color: 'text-gold',   border: 'border-gold-border' },
  low:     { label: 'LOW',      bg: 'bg-info-light',  color: 'text-info',   border: 'border-info-border' },
  resolved:{ label: 'RESOLVED', bg: 'bg-success-light', color: 'text-success',  border: 'border-success-border'},
}
const getPriority = (ticket) => {
  const pc = ticket.appointments?.priority_class
  if (pc === 'graduating' || pc === 'pwd' || pc === 'pregnant') return 'high'
  if (ticket.status === 'completed') return 'resolved'
  return 'normal'
}

// ── Priority Badge ─────────────────────────────────────────────────────────────
const PriorityBadge = ({ level }) => {
  const cfg = PRIORITY_CFG[level] || PRIORITY_CFG.normal
  return (
    <span className={`text-[10px] font-extrabold py-1 px-3 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} tracking-[0.06em] uppercase`}>
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
  const [page, setPage]         = useState(1)
  const PER_PAGE = 10

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
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 5000)
    return () => clearInterval(t)
  }, [fetchQueue])


  // ── Derived data ──
  const completed = queue.filter(q => q.ticket.status === 'completed')
  const nonCompleted = queue.filter(q => q.ticket.status !== 'completed')

  // ── Split by whether the CURRENT active step needs the student physically
  //    present — same convention as staff's Live Queue page ──
  const getRequiresPresence = (steps) => {
    const current = steps?.find(s => s.status === 'in_progress')
    if (current?.location === 'Back Office') return false
    return current?.requires_presence !== false // default true if missing/undefined
  }
  const atCounter       = nonCompleted.filter(({ steps }) => getRequiresPresence(steps))
  const processingQueue = nonCompleted.filter(({ steps }) => !getRequiresPresence(steps))

  // "Up Next" pagination — now over atCounter instead of the old 'pending'-status filter
  const totalPages = Math.max(1, Math.ceil(atCounter.length / PER_PAGE))
  const upNext = atCounter.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Peak forecast hour
  const peakHour = queueStats?.peak_forecast || '—'
  const avgWait = queueStats?.avg_wait_minutes || 0

  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // ── Reusable row for both sections ──
  const renderRow = ({ ticket, steps }, idx, arrLength, showWait = true) => {
    const student  = ticket.users
    const name     = student ? `${student.first_name} ${student.last_name}` : 'Unknown'
    const txName   = ticket.appointments?.transaction_types?.name || 'Transaction'
    const priority = getPriority(ticket)
    const waitMin  = Math.max(3, (idx + 1) * (avgWait || 5)) + 'm'
    const isLast   = idx === arrLength - 1
    const currentStep = steps?.find(s => s.status === 'in_progress')
    const confirmKey = `${ticket.id}-${ticket.current_step}`

    return (
      <div key={ticket.id} className={`group grid ${showWait ? 'grid-cols-[120px_1.5fr_1.5fr_100px_120px]' : 'grid-cols-[120px_1.5fr_1.5fr_120px]'} p-[16px_24px] items-center transition-all duration-200 hover:bg-surface border-l-2 border-l-transparent ${isLast ? 'border-none' : 'border-b border-border'} bg-white`}>
        <span className="font-serif text-[18px] font-bold text-maroon">{ticket.queue_number}</span>
        <div>
          <span className="text-[14px] font-bold text-text-main group-hover:text-maroon transition-colors block">{name}</span>
          {currentStep && currentStep.location && (
            <div className="text-[11px] font-bold text-text-sub mt-1 flex items-center gap-1 uppercase tracking-[0.04em]">
              {currentStep.location} serving
            </div>
          )}
        </div>
        <span className="text-[13.5px] font-medium text-text-sub">{txName}</span>
        {showWait && <span className="text-[13.5px] font-bold text-text-main">{waitMin}</span>}
        <div className="flex items-center"><PriorityBadge level={priority} /></div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">QUEUE MANAGEMENT</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <Ticket className="text-maroon" size={24} /> Live Operations Dashboard
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
            Monitor registrar queues, track wait times, and manage active processing in real-time.
          </p>
        </div>
        <div className="flex items-center">
          <div className="bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] py-2.25 px-4 rounded-xl flex items-center gap-2">
            <Clock size={16} strokeWidth={2.5} className="text-maroon" />
            <span className="font-sans text-[15px] font-bold text-text-main tracking-wide">
              {currentTime}
            </span>
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
        {[
          { label: 'At the Counter', value: atCounter.length, icon: <DoorOpen size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: 'Physically waiting' },
          { label: 'In Processing', value: processingQueue.length, icon: <Cog size={18} />, bg: 'bg-gray-100', fg: 'text-gray-500', sub: 'Back-office, no line' },
          { label: 'Avg. Wait Time', value: <>{avgWait}m&nbsp;<span className="text-[20px]">{queueStats?.avg_wait_seconds || 0}s</span></>, icon: <Clock size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'Rolling average' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-5 bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{c.label}</div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div className="font-serif text-3xl font-extrabold text-maroon leading-none m-0 min-h-9">
              {loading ? <div className="animate-pulse w-15 h-9 rounded-md bg-border" /> : c.value}
            </div>
            <div className="text-[11px] font-medium text-text-muted mt-1.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── At the Counter ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-text-main m-0 flex items-center gap-2">
              <DoorOpen size={18} className="text-maroon" /> At the Counter
            </h2>
            <p className="text-xs text-text-muted mt-1 mb-0 ml-7">Students physically waiting — call in order</p>
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[120px_1.5fr_1.5fr_100px_120px] p-[14px_24px] rounded-t-2xl bg-off-white border border-border border-b-0">
          {['Queue No.', 'Student Name', 'Transaction', 'Wait Time', 'Priority'].map(h => (
            <span key={h} className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {/* Table rows */}
        <div className="border border-border rounded-b-2xl overflow-hidden bg-white shadow-sm">
          {loading ? (
            [1, 2, 3].map((n, idx) => (
              <div key={n} className={`grid grid-cols-[120px_1.5fr_1.5fr_100px_120px] p-4 items-center ${idx === 2 ? 'border-none' : 'border-b border-border/60'} bg-white`}>
                <div className="animate-pulse w-12.5 h-4.5 rounded bg-border" />
                <div className="animate-pulse w-24 h-4.5 rounded bg-border" />
                <div className="animate-pulse w-28 h-4.5 rounded bg-border" />
                <div className="animate-pulse w-7.5 h-4.5 rounded bg-border" />
                <div className="animate-pulse w-17.5 h-4.5 rounded bg-border" />
              </div>
            ))
          ) : upNext.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex justify-center mb-4 text-text-muted/50"><Inbox size={52} strokeWidth={1.5} /></div>
              <p className="font-serif text-lg font-bold text-text-main m-0 mb-1">No one at the counter</p>
              <p className="text-[13px] text-text-muted m-0">No students are currently waiting to be served.</p>
            </div>
          ) : (
            upNext.map((item, i) => renderRow(item, i, upNext.length))
          )}

          {/* Footer pagination */}
          {atCounter.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-surface rounded-b-2xl">
              <span className="text-[13px] font-semibold text-text-muted">
                Showing {Math.min((page - 1) * PER_PAGE + 1, atCounter.length)}–{Math.min(page * PER_PAGE, atCounter.length)} of {atCounter.length} at the counter
              </span>
              <div className="flex gap-2 items-center">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className={`py-1.5 px-3 rounded-lg border border-border text-xs font-bold font-sans shadow-sm transition-colors ${page === 1 ? 'bg-off-white text-text-muted cursor-not-allowed opacity-60' : 'bg-white text-text-main hover:bg-surface cursor-pointer'}`}>
                  Prev
                </button>
                <div className="text-[12.5px] font-bold text-text-main mx-1">
                  Page {page} <span className="text-text-muted font-medium">of {totalPages}</span>
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className={`py-1.5 px-3 rounded-lg border border-border text-xs font-bold font-sans shadow-sm transition-colors ${page === totalPages ? 'bg-off-white text-text-muted cursor-not-allowed opacity-60' : 'bg-white text-text-main hover:bg-surface cursor-pointer'}`}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Processing ── */}
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-bold text-text-main m-0 flex items-center gap-2">
              <Cog size={18} className="text-text-muted" /> Processing
            </h2>
            <p className="text-xs text-text-muted mt-1 mb-0 ml-7">Back-office — no one is waiting for these</p>
          </div>

          {processingQueue.length > 0 && (
            <div className="grid grid-cols-[120px_1.5fr_1.5fr_120px] gap-0 px-6 py-3 rounded-t-[14px] bg-surface border border-b-0 border-border">
              {['Queue No.', 'Student Name', 'Transaction', 'Priority'].map(h => (
                <div key={h} className="text-[10px] font-bold text-text-muted tracking-[0.08em] uppercase">{h}</div>
              ))}
            </div>
          )}

          <div className="border border-border rounded-b-2xl overflow-hidden bg-white shadow-sm opacity-90">
            {loading ? (
              <div className="p-8 text-center text-xs text-text-muted">Loading…</div>
            ) : processingQueue.length === 0 ? (
              <div className="text-center p-20 border border-border rounded-[14px]">
                <div className="flex justify-center mb-3 text-text-muted/50"><Cog size={40} strokeWidth={1.5} /></div>
                <p className="font-serif text-base font-bold text-text-main m-0 mb-1">Nothing in processing</p>
                <span className="text-xs text-text-muted ml-6 block mt-0.5">Tickets land here after being submitted, before release.</span>
              </div>
            ) : (
              processingQueue.map((item, i) => renderRow(item, i, processingQueue.length, false))
            )}
          </div>
        </div>

        {/* Completed section */}
        {completed.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em] m-0 mb-4 flex items-center gap-2">
               Completed Today — {completed.length} tickets
            </p>
            <div className="flex flex-col gap-2.5">
              {completed.map(({ ticket }) => (
                <div key={ticket.id} className="flex items-center justify-between p-[16px_24px] rounded-2xl bg-white border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <span className="font-serif font-bold text-text-muted text-[16px] w-20">{ticket.queue_number}</span>
                    <span className="text-[14px] font-bold text-text-main">{ticket.users?.first_name} {ticket.users?.last_name}</span>
                    <span className="text-[13.5px] font-medium text-text-sub before:content-['•'] before:mr-3 before:text-border">{ticket.appointments?.transaction_types?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-success-light text-success border border-success-border">
                    <Check size={14} strokeWidth={3} />
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.06em]">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}