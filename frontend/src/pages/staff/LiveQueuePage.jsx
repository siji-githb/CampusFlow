import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep } from '../../services/queueService'
import { updateReleaseDate } from '../../services/adminService'
import { Check, Circle, Clock, X, Search, RefreshCw, Users, CheckSquare, AlertTriangle, Download, Inbox, Play } from 'lucide-react'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  in_progress: { label: 'Serving Now',  bg: 'bg-success-light',  color: 'text-success',  border: 'border-success-border'  },
  pending:     { label: 'Waiting',      bg: 'bg-gold-light',   color: 'text-gold',   border: 'border-gold-border'   },
  completed:   { label: 'Completed',    bg: 'bg-blue-light',   color: 'text-blue',   border: 'border-blue-border'   },
  no_show:     { label: 'No Show',      bg: 'bg-gray-50',     color: 'text-gray-500',border: 'border-gray-200'      },
  cancelled:   { label: 'Cancelled',    bg: 'bg-danger-light',    color: 'text-danger',    border: 'border-danger-border'    },
}

// ── Small Stat Card ────────────────────────────────────────────────────────────
const MiniStat = ({ icon, value, label, sub, subColorClass = 'text-success', loading, delay }) => (
  <div className="animate-fade-up bg-white rounded-[14px] px-5 py-[18px] border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-3 flex-1" style={{ animationDelay: delay || '0s' }}>
    <div className="flex items-start justify-between">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.06em] mt-1.5">{label}</div>
      <div className="w-9 h-9 rounded-[10px] bg-maroon-light flex items-center justify-center text-maroon shrink-0">
        {icon}
      </div>
    </div>
    <div>
      <div className="font-serif text-[28px] font-extrabold text-maroon leading-none m-0 min-h-[28px]">
        {loading ? <div className="animate-pulse w-[60px] h-7 rounded-md bg-border" /> : value}
      </div>
      {sub && <div className={`text-[11px] font-semibold mt-1.5 ${subColorClass}`}>{sub}</div>}
    </div>
  </div>
)

// ── Progress Steps Bar ─────────────────────────────────────────────────────────
const StepsBar = ({ steps, current, total }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: total }).map((_, i) => {
      const stepNum = i + 1
      const done    = stepNum < current
      const active  = stepNum === current
      return (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${done ? 'bg-success text-white' : active ? 'bg-maroon text-white border-2 border-maroon-dark' : 'bg-border text-text-muted'}`}>
            {done ? <Check size={10} /> : stepNum}
          </div>
          {i < total - 1 && <div className={`w-3 h-0.5 rounded-[1px] ${done ? 'bg-success' : 'bg-border'}`} />}
        </div>
      )
    })}
  </div>
)

// ── Filter Sidebar ─────────────────────────────────────────────────────────────
const FilterSidebar = ({ filters, onChange, highPriorityCount, onReset }) => {
  const statuses = ['in_progress', 'pending', 'completed', 'no_show']

  return (
    <aside className="w-[220px] shrink-0 bg-white border border-border rounded-2xl px-4 py-5 h-fit sticky top-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="font-serif text-[17px] font-bold text-text-main mb-5">Filters</div>

      {/* Status */}
      <div className="mb-5">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.08em] mb-2.5">Status</div>
        <div className="flex flex-col gap-1.5">
          {statuses.map(s => {
            const cfg = STATUS_CFG[s]
            const checked = filters.statuses.includes(s)
            return (
              <label key={s} className="flex items-center gap-2 cursor-pointer text-[13px] text-text-sub">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? filters.statuses.filter(x => x !== s)
                      : [...filters.statuses, s]
                    onChange({ ...filters, statuses: next })
                  }}
                  className="accent-maroon w-3.5 h-3.5"
                />
                <span className="flex-1">{cfg.label}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-[1px] rounded-full border flex items-center ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                  {s === 'in_progress' ? <Play size={10} fill="currentColor" /> : s === 'pending' ? <Clock size={10} /> : s === 'completed' ? <Check size={10} /> : <X size={10} />}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Priority */}
      <div className="mb-5">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.08em] mb-2.5">Priority Level</div>
        <div className="flex flex-col gap-1.5">
          {[
            { val: 'high', lbl: 'High Priority', badgeBg: 'bg-danger-light', badgeColor: 'text-danger', badgeBorder: 'border-danger-border' },
            { val: 'regular', lbl: 'Regular', badgeBg: 'bg-off-white', badgeColor: 'text-text-sub', badgeBorder: 'border-transparent' }
          ].map(({ val, lbl, badgeBg, badgeColor, badgeBorder }) => {
            const checked = filters.priority === val || filters.priority === 'all'
            return (
              <label key={val} className="flex items-center gap-2 cursor-pointer text-[13px] text-text-sub">
                <input type="radio" name="priority" checked={filters.priority === val} onChange={() => onChange({ ...filters, priority: val })}
                  className="accent-maroon w-3.5 h-3.5" />
                <span className="flex-1">{lbl}</span>
                {val === 'high' && highPriorityCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded-full border ${badgeBg} ${badgeColor} ${badgeBorder}`}>
                    {highPriorityCount}
                  </span>
                )}
              </label>
            )
          })}
          <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text-sub">
            <input type="radio" name="priority" checked={filters.priority === 'all'} onChange={() => onChange({ ...filters, priority: 'all' })}
              className="accent-maroon w-3.5 h-3.5" />
            <span>All</span>
          </label>
        </div>
      </div>

      {/* Transaction Type */}
      <div className="mb-5">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.08em] mb-2.5">Transaction Type</div>
        <select
          value={filters.transactionType}
          onChange={e => onChange({ ...filters, transactionType: e.target.value })}
          className="w-full px-2.5 py-2 rounded-lg border border-border bg-off-white text-[12px] text-text-main outline-none cursor-pointer font-sans"
        >
          <option value="all">All Transactions</option>
          <option value="TOR">Transcript of Records</option>
          <option value="COE">Certificate of Enrollment</option>
          <option value="Diploma">Diploma Release</option>
          <option value="Grades">Grades</option>
        </select>
      </div>

      <button onClick={onReset} className="w-full p-2.5 rounded-xl border border-border bg-off-white text-text-sub text-[13px] font-semibold cursor-pointer font-sans hover:bg-border transition-colors">
        Reset Filters
      </button>
    </aside>
  )
}

// ── Queue Details Modal ────────────────────────────────────────────────────────
const QueueDetailsModal = ({ ticketData, onClose, onConfirm, confirming, onSetReleaseDate }) => {
  const { ticket, steps } = ticketData
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  
  const [releaseDate, setReleaseDate] = useState(appt?.release_date || '')
  const [savingDate, setSavingDate] = useState(false)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px]" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-[680px] bg-white rounded-3xl p-7 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-[0.08em] mb-1.5">Queue Details</div>
            <h2 className="font-serif text-[28px] font-extrabold text-maroon m-0 leading-none">{ticket.queue_number}</h2>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-text-muted flex items-center justify-center hover:text-text-main transition-colors"><X size={24} /></button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3.5 mb-7">
          <div className="p-4 bg-surface rounded-[14px] border border-border">
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-[0.04em] mb-1.5">Student</div>
            <div className="text-[15px] font-bold text-text-main mb-0.5">{name}</div>
            <div className="text-[13px] text-text-sub font-mono">{student?.student_id || '—'}</div>
          </div>
          <div className="p-4 bg-surface rounded-[14px] border border-border">
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-[0.04em] mb-1.5">Transaction</div>
            <div className="text-[14px] font-semibold text-text-main leading-snug">{appt?.transaction_types?.name}</div>
          </div>
        </div>

        {/* Release Date */}
        <div className="mb-7 bg-off-white p-4 rounded-[14px] border border-border flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.04em] mb-1.5">Document Release Date</label>
            <input 
              type="date" 
              value={releaseDate} 
              onChange={e => setReleaseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm outline-none text-text-main font-sans focus:border-maroon transition-colors"
            />
          </div>
          <button 
            onClick={async () => {
              setSavingDate(true)
              await onSetReleaseDate(appt?.id, releaseDate)
              setSavingDate(false)
            }}
            disabled={savingDate || releaseDate === (appt?.release_date || '')}
            className={`px-4.5 py-2.5 rounded-lg border-none text-[13px] font-bold h-[42px] font-sans whitespace-nowrap transition-colors
              ${(savingDate || releaseDate === (appt?.release_date || '')) 
                ? 'bg-border text-text-muted cursor-not-allowed' 
                : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}
            `}
          >
            {savingDate ? 'Saving...' : 'Set Date'}
          </button>
        </div>

        {/* Steps */}
        <div>
          <h3 className="text-sm font-bold text-text-main uppercase tracking-[0.06em] mb-5">Processing Steps</h3>
          <div className="flex flex-col gap-0">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1
              const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
              const confirmKey = `${ticket.id}-${step.step_number}`
              const isConfirming = confirming === confirmKey
              
              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold
                      ${step.status === 'completed' ? 'bg-success text-white' : 
                        step.status === 'in_progress' ? 'bg-gold text-white border-2 border-gold-border' : 
                        'bg-border text-text-muted'}`}
                    >
                      {step.status === 'completed' ? <Check size={14} /> : step.step_number}
                    </div>
                    {!isLast && <div className={`w-[2px] flex-1 min-h-[36px] my-1 ${step.status === 'completed' ? 'bg-success' : 'bg-border'}`} />}
                  </div>
                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                    <div className={`flex justify-between items-center rounded-xl ${isCurrent ? 'bg-gold-light p-3 border border-gold-border -mt-1.5' : 'bg-transparent py-1.5 border-none mt-0'}`}>
                      <div>
                        <div className={`text-[15px] font-semibold ${step.status === 'completed' ? 'text-success' : 'text-text-main'}`}>{step.step_name}</div>
                        {step.status === 'completed' && step.confirmed_at && (
                          <div className="text-xs text-text-muted mt-0.5">Confirmed at {new Date(step.confirmed_at).toLocaleTimeString()}</div>
                        )}
                        {isCurrent && (
                          <div className="text-xs text-gold mt-0.5 font-semibold">Active Step</div>
                        )}
                      </div>
                      {isCurrent && (
                        <button
                          onClick={() => onConfirm(ticket.id, step.step_number)}
                          disabled={isConfirming}
                          className={`px-4.5 py-2.5 rounded-[10px] border-none text-[13px] font-bold font-sans transition-colors
                            ${isConfirming ? 'bg-maroon/50 text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}
                          `}
                        >
                          {isConfirming ? 'Confirming...' : 'Confirm Step'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main LiveQueuePage ─────────────────────────────────────────────────────────
export default function LiveQueuePage() {
  const { token } = useAuth()
  const [queue, setQueue]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [error, setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow]           = useState(new Date())
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState({ statuses: ['in_progress', 'pending'], priority: 'all', transactionType: 'all' })
  const [viewingTicketId, setViewingTicketId] = useState(null)

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      setQueue(await getTodaysQueue(token))
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
    setConfirming(key); setError('')
    try { await confirmStep(token, ticketId, stepNum); await fetchQueue() }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  const handleSetReleaseDate = async (appointmentId, dateVal) => {
    try {
      await updateReleaseDate(token, appointmentId, dateVal)
      await fetchQueue()
    } catch (e) {
      setError(e.message)
    }
  }

  // ── Derived stats ──
  const active    = queue.filter(q => q.ticket.status !== 'completed')
  const done      = queue.filter(q => q.ticket.status === 'completed')
  const serving   = queue.filter(q => q.ticket.status === 'in_progress')
  const waiting   = queue.filter(q => q.ticket.status === 'pending')
  const highPrio  = queue.filter(q => {
    const pc = q.ticket.appointments?.priority_class
    return pc === 'graduating' || pc === 'pwd'
  })

  // Calculate Average Wait Time from completed tickets today
  let avgWait = 0
  if (done.length > 0) {
    let totalMinutes = 0
    let validCount = 0
    done.forEach(({ ticket, steps }) => {
      if (!ticket.created_at) return
      const created = new Date(ticket.created_at)
      const lastStep = steps.slice().reverse().find(s => s.status === 'completed' && s.confirmed_at)
      if (lastStep) {
        const completed = new Date(lastStep.confirmed_at)
        totalMinutes += Math.max(0, (completed - created) / 60000)
        validCount++
      }
    })
    avgWait = validCount > 0 ? Math.round(totalMinutes / validCount) : 12 // fallback 12m if no valid steps
  } else {
    avgWait = 12 // Fallback historical average if none done today
  }

  // ── Filtered & searched queue ──
  const displayed = queue.filter(({ ticket, steps }) => {
    const statusOk = filters.statuses.includes(ticket.status)
    const prioOk = filters.priority === 'all'
      || (filters.priority === 'high' && (ticket.appointments?.priority_class === 'graduating' || ticket.appointments?.priority_class === 'pwd'))
      || (filters.priority === 'regular' && ticket.appointments?.priority_class === 'regular')
    const txOk = filters.transactionType === 'all'
      || (ticket.appointments?.transaction_types?.name || '').includes(filters.transactionType)
    const name = `${ticket.users?.first_name} ${ticket.users?.last_name}`.toLowerCase()
    const srchOk = !search || name.includes(search.toLowerCase()) || ticket.queue_number.toLowerCase().includes(search.toLowerCase())
    return statusOk && prioOk && txOk && srchOk
  })

  const currentTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-bold text-gold tracking-[0.1em] uppercase m-0 mb-1">Real-Time</p>
          <h1 className="font-serif text-[24px] font-bold text-text-main m-0">Live Queue Management</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or ticket…"
              className="py-[9px] pr-3.5 pl-[34px] rounded-[9px] border border-border bg-white text-[13px] text-text-main outline-none w-[220px] font-sans focus:border-maroon transition-colors"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center"><Search size={14} className="text-text-muted" /></span>
          </div>
          {/* Refresh */}
          <button onClick={fetchQueue} title="Refresh Queue" className="p-0 rounded-full border border-border bg-white text-text-sub text-[15px] cursor-pointer flex items-center justify-center w-[34px] h-[34px] hover:bg-off-white transition-colors">
            <RefreshCw size={15} />
          </button>
          {/* Current time */}
          <div className="bg-maroon text-white px-4 py-[9px] rounded-[9px] text-sm font-bold font-serif">
            {currentTime}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="flex gap-3.5">
        <MiniStat 
          icon={<Clock size={20} />} 
          value={`${avgWait}m`} 
          label="Average Wait Time" 
          sub={avgWait > 15 ? "↑ Higher than avg" : "↓ Fast processing"} 
          subColorClass={avgWait > 15 ? 'text-orange' : 'text-success'} 
          loading={loading} delay="0.1s"
        />
        <MiniStat icon={<Users size={20} />} value={waiting.length} label="Waiting in Queue" sub={`${serving.length} serving now`} subColorClass="text-success" loading={loading} delay="0.2s" />
        <MiniStat icon={<CheckSquare size={20} />} value={done.length} label="Total Serviced" sub={done.length >= 80 ? 'High volume — Important' : 'Normal volume'} subColorClass={done.length >= 80 ? 'text-danger' : 'text-success'} loading={loading} delay="0.3s" />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-[10px] bg-danger-light border border-danger-border text-danger text-[13px] flex items-center">
          <AlertTriangle size={13} className="mr-1" /> {error}
        </div>
      )}

      {/* ── Main content: Table + Filter ── */}
      <div className="flex gap-5 items-start">

        {/* Queue Table */}
        <div className="animate-fade-up flex-1 min-w-0" style={{ animationDelay: '0.4s' }}>
          {/* Table header */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <span className="text-[16px] font-serif font-bold text-text-main">Active Queue</span>
              <span className="text-xs text-text-muted ml-2.5">
                {loading ? 'Loading…' : `${displayed.length} records · Updated ${lastUpdated || '—'}`}
              </span>
            </div>
            <button className="px-3.5 py-1.5 rounded-lg border border-border bg-white text-text-sub text-xs font-semibold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-off-white transition-colors">
              <Download size={14} /> Export
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 px-4 py-2.5 rounded-t-[10px] bg-surface border border-b-0 border-border">
            {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS / PROGRESS', 'WAIT', 'ACTION'].map(col => (
              <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="border border-border rounded-b-[14px] overflow-hidden bg-white">
            {loading ? (
              <div className="flex flex-col">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 p-4 ${i < 5 ? 'border-b border-border' : ''}`}>
                    <div className="animate-pulse w-10 h-5 rounded bg-border" />
                    <div>
                      <div className="animate-pulse w-[120px] h-3.5 rounded bg-border mb-1.5" />
                      <div className="animate-pulse w-20 h-3 rounded bg-border" />
                    </div>
                    <div>
                      <div className="animate-pulse w-[100px] h-3.5 rounded bg-border mb-1.5" />
                      <div className="animate-pulse w-[60px] h-3 rounded bg-border" />
                    </div>
                    <div className="animate-pulse w-[100px] h-5 rounded-full bg-border" />
                    <div className="animate-pulse w-[30px] h-4 rounded bg-border" />
                    <div className="animate-pulse w-[80px] h-7 rounded-lg bg-border" />
                  </div>
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center text-text-muted mb-3"><Inbox size={40} /></div>
                <p className="text-sm font-semibold text-text-main m-0 mb-1">No tickets match the current filters</p>
                <p className="text-[13px] text-text-muted m-0">Try adjusting the status or priority filters on the right.</p>
              </div>
            ) : (
              displayed.map(({ ticket, steps }, idx) => {
                const student = ticket.users
                const name    = student ? `${ticket.users.last_name}, ${ticket.users.first_name}` : 'Unknown'
                const sid     = student?.student_id || '—'
                const appt    = ticket.appointments
                const txName  = appt?.transaction_types?.name || 'Transaction'
                const pClass  = appt?.priority_class || 'regular'
                const statusCfg = STATUS_CFG[ticket.status] || STATUS_CFG.pending
                const isHighPrio = pClass === 'graduating' || pClass === 'pwd'
                const inProgressStep = steps?.find(s => s.status === 'in_progress')
                const confirmKey = inProgressStep ? `${ticket.id}-${inProgressStep.step_number}` : null
                const isConfirming = confirming === confirmKey
                const waitMins  = Math.floor(Math.random() * 20) + 5 // placeholder until API provides it

                return (
                  <div key={ticket.id} className={`grid grid-cols-[100px_1fr_160px_180px_70px_160px] gap-0 p-4 items-center transition-colors duration-150
                    ${idx < displayed.length - 1 ? 'border-b border-border' : ''}
                    ${ticket.status === 'in_progress' ? 'bg-success-light/30' : 'bg-white hover:bg-off-white/50'}
                  `}>

                    {/* Queue No. */}
                    <div>
                      <div className="font-serif text-[20px] font-extrabold text-maroon leading-none">{ticket.queue_number}</div>
                      {isHighPrio && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-danger-light text-danger border border-danger-border mt-1 inline-block uppercase tracking-[0.04em]">
                          Priority
                        </span>
                      )}
                    </div>

                    {/* Student Details */}
                    <div>
                      <div className="text-[13px] font-semibold text-text-main mb-0.5">{name}</div>
                      <div className="text-[11px] text-text-muted font-mono">{sid}</div>
                      <div className="mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-gold-light text-gold border border-gold-border">
                          {pClass}
                        </span>
                      </div>
                    </div>

                    {/* Transaction */}
                    <div>
                      <div className="text-xs font-semibold text-text-main leading-snug">{txName}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{appt?.time_slot || '—'}</div>
                    </div>

                    {/* Status + Progress */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                        {inProgressStep && <span className="text-[11px] text-text-muted">Step {inProgressStep.step_number}</span>}
                      </div>
                      {steps && steps.length > 0 && (
                        <StepsBar steps={steps} current={ticket.current_step} total={ticket.total_steps} />
                      )}
                    </div>

                    {/* Wait */}
                    <div>
                      <div className={`text-sm font-bold ${ticket.status === 'in_progress' ? 'text-success' : 'text-text-sub'}`}>{waitMins}m</div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {ticket.status === 'in_progress' && inProgressStep && (
                        <button
                          onClick={() => setViewingTicketId(ticket.id)}
                          className="px-3.5 py-2 rounded-lg border-none bg-maroon text-white text-xs font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-maroon-dark transition-colors"
                        >
                          View Details
                        </button>
                      )}
                      {ticket.status === 'pending' && (
                        <button
                          onClick={() => handleConfirm(ticket.id, ticket.current_step)}
                          disabled={isConfirming}
                          className={`px-3.5 py-2 rounded-lg border text-xs font-bold font-sans whitespace-nowrap transition-colors
                            ${isConfirming ? 'bg-gold-light border-gold text-gold/50 cursor-not-allowed' : 'bg-gold-light border-gold text-gold cursor-pointer hover:bg-gold hover:text-white'}
                          `}
                        >
                          Call Next
                        </button>
                      )}
                      {ticket.status === 'completed' && (
                        <span className="text-xs font-semibold text-blue flex items-center gap-1"><Check size={12} /> Done</span>
                      )}
                      {ticket.status === 'no_show' && (
                        <span className="text-xs font-semibold text-gray-500">No Show</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Completed section */}
          {done.length > 0 && !loading && (
            <div className="mt-6">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-2.5">Completed Today — {done.length} tickets</p>
              <div className="flex flex-col gap-1.5">
                {done.map(({ ticket }) => (
                  <div key={ticket.id} className="flex items-center justify-between px-4 py-3 rounded-[10px] bg-white border border-border hover:border-maroon-border transition-colors">
                    <div className="flex items-center gap-3.5">
                      <span className="font-serif font-bold text-text-muted text-[16px]">{ticket.queue_number}</span>
                      <span className="text-[13px] text-text-sub">{ticket.users?.last_name}, {ticket.users?.first_name}</span>
                      <span className="text-[11px] text-text-muted">{ticket.appointments?.transaction_types?.name}</span>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-light text-blue border border-blue-border">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            highPriorityCount={highPrio.length}
            onReset={() => setFilters({ statuses: ['in_progress', 'pending'], priority: 'all', transactionType: 'all' })}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {viewingTicketId && (() => {
        const activeModalData = queue.find(q => q.ticket.id === viewingTicketId)
        if (!activeModalData) return null
        return (
          <QueueDetailsModal
            ticketData={activeModalData}
            onClose={() => setViewingTicketId(null)}
            onConfirm={(ticketId, stepNum) => handleConfirm(ticketId, stepNum)}
            confirming={confirming}
            onSetReleaseDate={handleSetReleaseDate}
          />
        )
      })()}

    </div>
  )
}
