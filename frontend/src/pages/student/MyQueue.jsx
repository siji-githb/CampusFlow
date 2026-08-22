import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyQueue, activateQueue, getTimeEstimate, getMyDocumentsToClaim } from '../../services/queueService'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'
import { Clock, Hourglass, PartyPopper, Ticket, Calendar, Inbox, Cog, FileCheck, Sparkles } from 'lucide-react'

const STEP_STYLE = {
  pending:     { bg: '#F9F9F9', color: '#706B65' }, // text-text-sub
  in_progress: { bg: '#FDF6E3', color: '#B8900A' }, // text-gold
  completed:   { bg: '#F9F0F1', color: '#7B1A2A' }, // text-maroon
}

export default function MyQueue({ embedded = false }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [queueData, setQueueData]   = useState(null)
  const [upcomingAppts, setUpcomingAppts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [activating, setActivating] = useState(null)
  const [error, setError]           = useState('')
  const [estimates, setEstimates]   = useState([])
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab]   = useState(tabParam === 'upcoming' ? 'upcoming' : 'active')
  const [documentsToClaim, setDocumentsToClaim] = useState([])
  const [cancelConfirmId, setCancelConfirmId] = useState(null)
  const [activateConfirmId, setActivateConfirmId] = useState(null)

  useEffect(() => {
    if (tabParam === 'upcoming') {
      setActiveTab('upcoming')
    } else if (tabParam === 'active') {
      setActiveTab('active')
    }
  }, [tabParam])

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const today = getTodayStr(); // evaluated per-render for local UI checks

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const fmt12h = (t) => {
    if (!t) return ''
    const parts = t.split(':')
    if (parts.length < 2) return t
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m} ${ampm}`
  }
  const pollRef  = useRef(null)

  const fetchQueue = useCallback(async () => {
    try {
      const data = await getMyQueue(token)
      setQueueData(data.ticket ? data : null)
      
      const claims = await getMyDocumentsToClaim(token)
      setDocumentsToClaim(claims || [])
    } catch (e) { setError(e.message) }
  }, [token])

  const fetchAppts = useCallback(async () => {
    try {
      const all = await getMyAppointments(token)
      const currentToday = getTodayStr();
      setUpcomingAppts((all || []).filter(a => {
        const apptTickets = Array.isArray(a.queue_tickets) ? a.queue_tickets : (a.queue_tickets ? [a.queue_tickets] : []);
        const isTicketCompleted = apptTickets.some(qt => qt.status === 'completed');
        
        // Exclude cancelled, no_show, or completed appointments
        if (a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show' || isTicketCompleted) {
          return false;
        }

        const hasActiveTicket = apptTickets.some(qt => qt.status === 'waiting' || qt.status === 'in_progress');
        
        // If already activated on queue, keep it visible in Upcoming too
        if (hasActiveTicket) {
          return true;
        }

        // If NOT activated, only show if today or future (removes unactivated past due tickets)
        return a.appointment_date >= currentToday;
      }))
    } catch (e) { setError(e.message) }
  }, [token])

  const fetchEstimates = useCallback(async (appointmentId) => {
    try {
      const data = await getTimeEstimate(token, appointmentId)
      setEstimates(data.estimates || [])
    } catch {
      setEstimates([])
    }
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent(['QUEUE_UPDATED', 'WINDOW_UPDATED', 'RELEASES_UPDATED'], () => {
    fetchQueue()
    fetchAppts()
  })

  useEffect(() => {
    Promise.all([fetchQueue(), fetchAppts()]).finally(() => setLoading(false))
    pollRef.current = setInterval(fetchQueue, 60000)
    return () => clearInterval(pollRef.current)
  }, [fetchQueue, fetchAppts])

  useEffect(() => {
    if (queueData?.ticket?.appointment_id) {
      fetchEstimates(queueData.ticket.appointment_id)
    }
  }, [queueData?.ticket?.appointment_id, fetchEstimates])

  const handleActivate = async () => {
    if (!activateConfirmId) return
    setActivating(activateConfirmId); setError('')
    try { 
      await activateQueue(token, activateConfirmId) 
      await Promise.all([fetchQueue(), fetchAppts()]) 
      setActiveTab('active')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    catch (e) { setError(e.message) }
    finally { 
      setActivating(null)
      setActivateConfirmId(null)
    }
  }

  const handleCancelQueue = async () => {
    if (!cancelConfirmId) return
    try {
      await cancelAppointment(token, cancelConfirmId)
      await Promise.all([fetchQueue(), fetchAppts()])
    } catch (e) {
      setError(e.message)
    } finally {
      setCancelConfirmId(null)
    }
  }

  const ticket = queueData?.ticket
  const steps  = queueData?.steps || []

  // ── Is the CURRENT active step one that needs the student physically
  //    present, or is it back-office processing with no line to stand in? ──
  const currentStep = steps.find(s => s.status === 'in_progress')
  const currentStepNameLower = (currentStep?.step_name || '').toLowerCase()
  const currentRequiresPresence = currentStep?.requires_presence !== false // default true if missing/undefined
  const isCurrentStepRelease = currentStepNameLower.includes('release') || currentStepNameLower.includes('claim') || currentStepNameLower.includes('pickup')
  const isCurrentStepDocPrepared = currentStepNameLower.includes('document prepared') || currentStepNameLower.includes('document ready')
  const isCurrentStepPrep = !isCurrentStepDocPrepared && !isCurrentStepRelease && (currentStepNameLower.includes('preparation') || currentStepNameLower.includes('verification') || currentStepNameLower.includes('records') || !currentRequiresPresence)
  const isCurrentStepReceipt = currentStepNameLower.includes('receipt') || currentStepNameLower.includes('payment')
  
  const releaseDateVal = ticket?.appointments?.release_date
  const isFutureScheduled = Boolean(releaseDateVal && releaseDateVal > today)
  const isReleaseActive = ticket?.status === 'in_progress' && isCurrentStepRelease && !isFutureScheduled

  if (loading && !queueData && upcomingAppts.length === 0) {
    const skeleton = (
      <div className="flex-1 w-full pb-22 md:pb-0 px-4 md:px-0 animate-pulse">
        {/* Header Skeleton */}
        <div className="hidden md:flex justify-between items-start mb-8">
          <div>
            <div className="h-3 w-24 bg-border/60 rounded mb-2" />
            <div className="h-7 w-36 bg-border/80 rounded mb-2" />
            <div className="h-3.5 w-64 bg-border/40 rounded" />
          </div>
          <div className="h-4 w-28 bg-border/40 rounded" />
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-border">
          <div className="flex-1 h-9 bg-border/50 rounded-xl" />
          <div className="flex-1 h-9 bg-border/30 rounded-xl" />
        </div>

        {/* Ticket Card Skeleton */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-border mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="h-3 w-28 bg-border/60 rounded mb-2" />
              <div className="h-12 w-32 bg-border/80 rounded-xl mb-2" />
              <div className="h-4 w-48 bg-border/50 rounded" />
            </div>
            <div className="h-7 w-28 bg-border/50 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-off-white rounded-2xl border border-border">
            <div className="h-12 bg-border/40 rounded-xl" />
            <div className="h-12 bg-border/40 rounded-xl" />
            <div className="h-12 bg-border/40 rounded-xl" />
          </div>
        </div>

        {/* Steps Timeline Skeleton */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-border">
          <div className="h-5 w-40 bg-border/80 rounded mb-6" />
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-off-white border border-border">
                <div className="w-9 h-9 rounded-full bg-border/60 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-40 bg-border/70 rounded mb-1.5" />
                  <div className="h-3 w-56 bg-border/40 rounded" />
                </div>
                <div className="h-6 w-20 bg-border/40 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    if (embedded) return skeleton;
    return <StudentLayout activeTab="queue" mobileTitle="My Queue">{skeleton}</StudentLayout>;
  }

  const content = (
    <>
      <div className="flex-1 w-full pb-22 md:pb-0 px-4 md:px-0">
      <div className="hidden md:flex justify-between items-start mb-8">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">LIVE TRACKING</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <Ticket className="text-maroon" size={24} /> My Queue
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
            Monitor your active processing status and upcoming appointments.
          </p>
        </div>
        <div className="text-[13px] text-text-sub font-medium flex items-center gap-2 mt-2">
          <Link to="/student/dashboard" className="text-maroon hover:underline cursor-pointer">Home</Link>
          <span className="text-border-strong">›</span>
          <span>My Queue</span>
        </div>
      </div>

      {error && (
        <div className="py-2.5 px-3.5 rounded-xl bg-danger-light text-danger text-xs sm:text-sm mb-4 border border-danger-border font-medium">
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 bg-white p-1 sm:p-1.5 rounded-2xl border border-border shadow-2xs">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border-none text-xs sm:text-sm font-bold cursor-pointer transition-all duration-200 font-sans ${activeTab === 'active' ? 'bg-maroon-light text-maroon shadow-2xs' : 'bg-transparent text-text-sub hover:bg-off-white'}`}
        >
          Active Queue Ticket
        </button>
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border-none text-xs sm:text-sm font-bold cursor-pointer transition-all duration-200 font-sans ${activeTab === 'upcoming' ? 'bg-maroon-light text-maroon shadow-2xs' : 'bg-transparent text-text-sub hover:bg-off-white'}`}
        >
          Upcoming Tickets
        </button>
      </div>

      <div className={`${activeTab === 'active' ? 'block' : 'hidden'}`}>
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="animate-pulse w-20 h-3 rounded bg-border mb-2" />
                    <div className="animate-pulse w-15 h-12 rounded-lg bg-border" />
                  </div>
                  <div className="animate-pulse w-22.5 h-6 rounded-full bg-border" />
                </div>
                <div className="animate-pulse w-45 h-3.5 rounded bg-border mb-1.5" />
                <div className="animate-pulse w-35 h-3 rounded bg-border" />
              </div>
              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="animate-pulse w-37.5 h-4 rounded bg-border mb-6" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3.5 mb-4 last:mb-0">
                    <div className="animate-pulse w-7 h-7 rounded-full bg-border shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <div className="animate-pulse w-25 h-3.5 rounded bg-border" />
                        <div className="animate-pulse w-15 h-4 rounded-full bg-border" />
                      </div>
                      <div className="animate-pulse w-35 h-3 rounded bg-border" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : ticket ? (
            ticket.status === 'completed' ? (
              (() => {
                const releaseDate = ticket.appointments?.release_date;
                return (
                  <div className="animate-fade-up text-center py-16 px-8 bg-white rounded-2xl border border-border shadow-sm">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center text-success mx-auto mb-5 shadow-sm border border-success/20">
                      <PartyPopper size={32} />
                    </div>
                    <h2 className="font-serif text-[26px] font-bold text-success-dark m-0 mb-3">
                      Transaction Completed
                    </h2>
                    <p className="text-[14px] text-text-sub m-0 mb-6 max-w-sm mx-auto leading-relaxed">
                      {releaseDate ? (
                        <>Your transaction <strong className="text-maroon font-serif text-[18px]">{ticket.queue_number}</strong> is complete. Your document was released on <strong>{formatFullDate(releaseDate)}</strong>.</>
                      ) : (
                        <>Your transaction <strong className="text-maroon font-serif text-[18px]">{ticket.queue_number}</strong> is fully complete. Thank you!</>
                      )}
                    </p>
                    <button onClick={() => setActiveTab('upcoming')} className="py-2.5 px-6 rounded-lg border border-border bg-off-white text-text-main text-[14px] font-semibold cursor-pointer hover:bg-white transition-colors">
                      View Upcoming Appointments
                    </button>
                  </div>
                );
              })()
            ) : (
            <div className="animate-fade-up">
              {/* Queue ticket card (White Theme) */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 mb-4 shadow-sm border border-border relative overflow-hidden">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] text-text-muted m-0 mb-1 uppercase tracking-widest font-extrabold">Queue Number</p>
                    <div className="font-serif text-[32px] sm:text-[44px] md:text-[50px] font-extrabold text-maroon whitespace-nowrap leading-none tracking-tight">
                      {ticket.queue_number}
                    </div>
                  </div>
                  <div className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap ${
                    isReleaseActive
                      ? 'bg-success/10 text-success border border-success/20'
                      : isFutureScheduled && isCurrentStepRelease
                      ? 'bg-gold/10 text-gold-dark border border-gold/25'
                      : isCurrentStepDocPrepared
                      ? 'bg-gold/10 text-gold-dark border border-gold/25'
                      : isCurrentStepPrep
                      ? 'bg-gold/10 text-gold-dark border border-gold/25'
                      : ticket.status === 'in_progress' 
                      ? 'bg-maroon/10 text-maroon border border-maroon/20' 
                      : 'bg-surface text-text-sub border border-border'
                  }`}>
                    <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                      isReleaseActive
                        ? 'bg-success animate-pulse'
                        : isFutureScheduled && isCurrentStepRelease
                        ? 'bg-gold'
                        : isCurrentStepDocPrepared || isCurrentStepPrep
                        ? 'bg-gold animate-pulse'
                        : ticket.status === 'in_progress' 
                        ? 'bg-maroon animate-pulse' 
                        : 'bg-text-muted'
                    }`} />
                    <span>
                      {isReleaseActive 
                        ? 'Ready for Pickup' 
                        : isFutureScheduled && isCurrentStepRelease
                        ? `Scheduled (${formatShortDate(releaseDateVal)})` 
                        : isCurrentStepDocPrepared
                        ? 'Finalizing Document'
                        : isCurrentStepPrep
                        ? 'Processing Document'
                        : ticket.status === 'in_progress' 
                        ? 'Serving Now' 
                        : 'In Line (Waiting)'}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-border/70 gap-2.5 sm:gap-0">
                  <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                    <p className="text-[14px] sm:text-[16px] font-bold text-text-main m-0 truncate">{ticket.appointments?.transaction_types?.name}</p>
                    <p className="text-xs sm:text-[12.5px] text-text-sub m-0 font-medium flex items-center gap-1.5 flex-wrap">
                      <Calendar size={12} className="text-gold shrink-0" />
                      <span>{ticket.appointments?.appointment_date}</span>
                      <span className="text-border-strong mx-0.5">|</span>
                      <span>{fmt12h(ticket.appointments?.time_slot)}</span>
                    </p>
                  </div>
                  {(ticket.status === 'waiting' || ticket.status === 'pending') && (
                    <button 
                      onClick={() => setCancelConfirmId(ticket.appointment_id)} 
                      className="bg-danger/8 hover:bg-danger text-danger hover:text-white text-xs sm:text-[12px] font-bold py-1.5 px-3.5 sm:px-4 rounded-full transition-colors border border-danger/20 hover:border-danger cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      Cancel Queue
                    </button>
                  )}
                </div>

                {ticket.status === 'in_progress' && !currentRequiresPresence && (
                  <div className="mt-3 pt-2.5 border-t border-border/70">
                    <p className="text-xs sm:text-[12px] text-text-sub m-0 flex items-center gap-2 font-medium">
                      <Cog size={13} className="text-gold animate-spin shrink-0" style={{ animationDuration: '3s' }} /> No need to wait in line — we'll notify you when it's your turn.
                    </p>
                  </div>
                )}
              </div>

              {/* Release Date Card (if set) */}
              {ticket.appointments?.release_date && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-border p-4 sm:p-6 shadow-sm mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-extrabold text-text-muted uppercase tracking-[0.06em] mb-1">Document Release Date</p>
                    <p className="text-sm sm:text-base font-bold text-text-main m-0">
                      {new Date(ticket.appointments.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold shrink-0">
                    <Calendar size={16} strokeWidth={2.5} />
                  </div>
                </div>
              )}

              {/* ── Live Monitoring Panel ── */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-border shadow-sm overflow-hidden">
                
                {/* Live Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-linear-to-r from-off-white to-white flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative">
                      <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === 'in_progress' ? 'bg-success' : 'bg-gold'}`} />
                      <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-60 ${ticket.status === 'in_progress' ? 'bg-success' : 'bg-gold'}`} />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-text-main uppercase tracking-[0.06em]">
                      {ticket.status === 'in_progress' ? 'Live Serving' : 'Waiting in Queue'}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-text-muted">
                    Auto-updating 15s
                  </span>
                </div>

                {/* Overall Progress Bar */}
                {(() => {
                  const isWaiting = ticket.status === 'waiting' || ticket.status === 'pending';
                  const completedCount = steps.filter(s => s.status === 'completed').length;
                  const inProgressCount = !isWaiting ? steps.filter(s => s.status === 'in_progress').length : 0;
                  const totalSteps = steps.length;
                  const progressPercent = totalSteps > 0 && !isWaiting 
                    ? Math.round(((completedCount + (inProgressCount * 0.5)) / totalSteps) * 100) 
                    : 0;
                  return (
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/60">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-xs font-bold text-text-sub">Overall Progress</span>
                        <span className="text-xs sm:text-[12px] font-extrabold text-maroon tabular-nums">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-border/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ 
                            width: `${progressPercent}%`,
                            background: progressPercent === 100 ? '#15803D' : 'linear-gradient(90deg, #7B1A2A, #B8900A)'
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 flex-wrap gap-1">
                        <span className="text-[10px] sm:text-[11px] text-text-muted font-medium">
                          {isWaiting ? 'Waiting for staff to call your number' : `${completedCount} of ${totalSteps} steps completed`}
                        </span>
                        {isWaiting ? (
                          <span className="text-[10px] sm:text-[11px] text-gold font-bold flex items-center gap-1">
                            <Clock size={11} className="text-gold shrink-0" /> Waiting in Line
                          </span>
                        ) : inProgressCount > 0 && (
                          <span className="text-[10px] sm:text-[11px] text-gold font-bold flex items-center gap-1">
                            <Hourglass size={10} className="animate-pulse shrink-0" /> Step {steps.find(s => s.status === 'in_progress')?.step_number} active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Step Timeline */}
                <div className="px-3 sm:px-5 md:px-6 py-4 sm:py-5">
                  <div className="flex flex-col">
                    {steps.map((step, idx) => {
                      const isLast = idx === steps.length - 1
                      const stepRequiresPresence = step.requires_presence !== false
                      const stepNameLower = (step.step_name || '').toLowerCase()
                      const isRelease = stepNameLower.includes('release') || stepNameLower.includes('claim') || stepNameLower.includes('pickup')
                      const isDocPrepared = stepNameLower.includes('document prepared') || stepNameLower.includes('document ready')
                      const isPrep = !isDocPrepared && !isRelease && (stepNameLower.includes('preparation') || stepNameLower.includes('verification') || stepNameLower.includes('records') || !stepRequiresPresence)
                      const isReceipt = stepNameLower.includes('receipt') || stepNameLower.includes('payment')
                      
                      const isTicketWaiting = ticket.status === 'waiting' || ticket.status === 'pending'
                      const isActiveStep = step.status === 'in_progress' && !isTicketWaiting
                      const releaseWindow = step.location && !step.location.toLowerCase().includes('release') ? step.location : 'Window 1'

                      return (
                        <div key={step.id} className="flex gap-2.5 sm:gap-3.5 md:gap-4">
                          {/* Timeline Column */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                              step.status === 'completed' || (isActiveStep && isReleaseActive) 
                                ? 'bg-success text-white shadow-[0_0_0_3px_rgba(21,128,61,0.15)]' : 
                              isActiveStep 
                                ? 'bg-maroon text-white shadow-[0_0_0_3px_rgba(123,26,42,0.15)]' : 
                                'bg-surface border-[1.5px] border-border text-text-muted'
                            }`}>
                              {step.status === 'completed' || (isActiveStep && isReleaseActive) ? '✓' : step.step_number}
                              {isActiveStep && !isReleaseActive && (
                                <div className="absolute inset-0 rounded-full border-2 border-maroon/30 animate-ping" />
                              )}
                            </div>
                            {!isLast && (
                              <div className={`w-0.5 flex-1 min-h-5 my-1 transition-colors duration-500 ${
                                step.status === 'completed' || (isActiveStep && isReleaseActive) ? 'bg-success/40' : 'bg-border/60'
                              }`} />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-5'}`}>
                            <div className={`rounded-2xl transition-all duration-300 ${
                              isActiveStep 
                                ? 'bg-linear-to-r from-maroon/3 to-gold/3 p-3 sm:p-4 border border-maroon/10 -mt-1' 
                                : 'py-0.5'
                            }`}>
                              {/* Step Header */}
                              <div className="flex justify-between items-center gap-2 mb-0.5">
                                <span className={`text-xs sm:text-sm font-bold leading-tight truncate ${
                                  step.status === 'completed' || (isActiveStep && isReleaseActive) ? 'text-success' : 
                                  isActiveStep ? 'text-text-main' : 'text-text-sub'
                                }`}>
                                  {step.step_name}
                                </span>
                                <span className={`shrink-0 text-[9px] sm:text-[10px] font-bold py-0.5 sm:py-1 px-2 sm:px-2.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                                  step.status === 'completed' || (isActiveStep && isReleaseActive)
                                    ? 'bg-success/10 text-success border border-success/20' :
                                  isActiveStep && isFutureScheduled && isRelease
                                    ? 'bg-gold/10 text-gold-dark border border-gold/25' :
                                  isActiveStep && isDocPrepared
                                    ? 'bg-gold/10 text-gold-dark border border-gold/25' :
                                  isActiveStep
                                    ? 'bg-maroon/10 text-maroon border border-maroon/20' :
                                    'bg-surface text-text-muted border border-border'
                                }`}>
                                  {isActiveStep ? (
                                    isReleaseActive ? 'Ready for Pickup' : isFutureScheduled && isRelease ? `Scheduled (${new Date(releaseDateVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : isDocPrepared ? 'Finalizing' : (isPrep || !stepRequiresPresence ? 'Processing' : 'In Progress')
                                  ) : step.status === 'completed' ? 'Done' : (isTicketWaiting && idx === 0 ? 'Waiting in Line' : 'Queued')}
                                </span>
                              </div>

                              {/* Completed timestamp */}
                              {step.status === 'completed' && step.confirmed_at && (
                                <p className="text-[10.5px] sm:text-[11px] text-success/70 m-0 mt-0.5 font-medium">
                                  ✓ Confirmed at {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </p>
                              )}

                              {/* Waiting in line message for step 1 when ticket is waiting to be called */}
                              {isTicketWaiting && idx === 0 && (
                                <div className="mt-2.5 p-3 bg-surface border border-border/80 rounded-xl">
                                  <p className="text-xs text-text-sub m-0 flex items-center gap-2 font-medium">
                                    <Hourglass size={13} className="text-gold animate-pulse shrink-0" /> Please wait in line. We will notify you when your number is called to a window.
                                  </p>
                                </div>
                              )}

                              {/* Active step contextual cards (only when ticket is called/in_progress) */}
                              {isActiveStep && isRelease && (
                                <div className="mt-3 flex flex-col gap-2.5 sm:gap-3">
                                  {isFutureScheduled ? (
                                    <div className="p-3.5 sm:p-4 bg-gold/8 border border-gold/25 rounded-xl">
                                      <p className="text-xs sm:text-[13px] text-gold-dark font-bold m-0 flex items-center gap-2">
                                        <Calendar size={14} className="shrink-0 text-gold" /> Scheduled for Release on {new Date(releaseDateVal).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                      </p>
                                      <p className="text-[11px] sm:text-[12px] text-text-sub m-0 mt-1.5 leading-relaxed">
                                        Your document is currently being prepared and processed. Please visit the Registrar's Office on or after your scheduled release date to claim it.
                                      </p>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="p-3 sm:p-3.5 bg-success/[0.07] border border-success/20 rounded-xl">
                                        <p className="text-xs sm:text-[13px] text-success font-bold m-0 flex items-center gap-2">
                                          <FileCheck size={14} className="shrink-0" /> Your document is now ready for pick up at {releaseWindow}
                                        </p>
                                        <p className="text-[11px] sm:text-[11.5px] text-text-sub m-0 mt-1 ml-5 leading-relaxed">
                                          Please proceed to {releaseWindow} and present your queue ticket to claim your document.
                                        </p>
                                      </div>

                                      {/* Official Digital Claim Stub (White Theme) */}
                                      <div className="bg-white rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-md border-2 border-dashed border-maroon/25 relative overflow-hidden text-left">
                                        {/* Subtle decorative background gradient */}
                                        <div className="absolute top-0 right-0 w-36 h-36 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 w-28 h-28 bg-maroon/5 rounded-full blur-2xl pointer-events-none" />
                                        
                                        {/* Stub Header */}
                                        <div className="relative z-10 flex flex-row items-center justify-between gap-2 mb-3 pb-3 border-b border-dashed border-border flex-wrap sm:flex-nowrap">
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[10px] sm:text-[11px] text-gold-dark m-0 mb-1 uppercase tracking-[0.12em] font-bold flex items-center gap-1.5">
                                              <Ticket size={12} className="text-gold shrink-0" /> Official Claim Stub
                                            </p>
                                            <div className="font-serif text-[28px] sm:text-[38px] md:text-[42px] font-extrabold text-maroon whitespace-nowrap leading-none tracking-tight">
                                              {ticket.queue_number}
                                            </div>
                                          </div>
                                          <div className="bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full shadow-2xs shrink-0 self-start sm:self-center">
                                            <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider whitespace-nowrap">Ready for Pickup</span>
                                          </div>
                                        </div>
                                        
                                        {/* Document & Window info */}
                                        <div className="relative z-10 bg-off-white/80 p-3 sm:p-4 rounded-xl border border-border">
                                          <p className="text-[13.5px] sm:text-[15px] font-bold text-text-main m-0 mb-1 leading-snug truncate">
                                            {ticket.appointments?.transaction_types?.name || 'Document'}
                                          </p>
                                          <p className="text-xs sm:text-[12.5px] text-text-sub m-0 font-medium">
                                            Pickup Location: <span className="text-maroon font-bold">{releaseWindow}</span>
                                          </p>
                                        </div>
                                        
                                        {/* Instruction */}
                                        <div className="relative z-10 mt-2.5 sm:mt-3 p-2.5 sm:p-3.5 bg-gold/8 border border-gold/20 rounded-xl flex gap-2 items-start">
                                          <span className="shrink-0 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-[10px] sm:text-[11px] border border-gold/30 mt-0.5">!</span>
                                          <p className="text-xs sm:text-[12px] text-text-main m-0 leading-relaxed font-medium">
                                            <strong className="text-maroon">Instruction:</strong> Present this digital claim stub at <strong className="text-text-main">{releaseWindow}</strong> to claim your document.
                                          </p>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {isActiveStep && isDocPrepared && (
                                <div className="mt-3 flex flex-col gap-2.5 sm:gap-3">
                                  <div className="p-3.5 sm:p-4 bg-gold/8 border border-gold/25 rounded-xl">
                                    <p className="text-xs sm:text-[13px] text-gold-dark font-bold m-0 flex items-center gap-2">
                                      <Sparkles size={14} className="shrink-0 text-gold" /> Finalizing Document for Release
                                    </p>
                                    <p className="text-[11px] sm:text-[12px] text-text-sub m-0 mt-1.5 leading-relaxed">
                                      Your document records are verified. Staff is currently printing, signing, and dry-sealing the official copy.
                                      {isFutureScheduled && releaseDateVal && (
                                        <span className="block mt-1 font-semibold text-gold-dark">
                                          Scheduled Pickup Date: {new Date(releaseDateVal).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {isActiveStep && isPrep && !isDocPrepared && (
                                <div className="mt-2.5 p-3 bg-gold/6 border border-gold/15 rounded-xl">
                                  <p className="text-xs sm:text-[13px] text-gold font-bold m-0 flex items-center gap-2">
                                    <Cog size={13} className="text-gold animate-spin shrink-0" style={{ animationDuration: '4s' }} /> Your requested document records are being verified
                                  </p>
                                  <p className="text-[11px] sm:text-[11.5px] text-text-sub m-0 mt-1 ml-5 leading-relaxed">
                                    No need to wait in line — we will notify you once it's prepared and ready for pickup.
                                  </p>
                                </div>
                              )}
                              
                              {isActiveStep && isReceipt && stepRequiresPresence && (
                                <div className="mt-2.5 p-3 bg-gold/6 border border-gold/15 rounded-xl">
                                  <p className="text-xs sm:text-[13px] text-gold font-bold m-0 flex items-center gap-2">
                                    <Hourglass size={13} className="animate-pulse shrink-0" /> Please proceed to {step.location && !step.location.toLowerCase().includes('checking') ? step.location : 'Window 1'}
                                  </p>
                                  <p className="text-[11px] sm:text-[11.5px] text-text-sub m-0 mt-1 ml-5 leading-relaxed">
                                    Present your queue ticket and official payment receipt to the registrar counter window.
                                  </p>
                                </div>
                              )}

                              {isActiveStep && !isRelease && !isDocPrepared && !isPrep && !isReceipt && stepRequiresPresence && (
                                <div className="mt-2.5 p-3 bg-gold/6 border border-gold/15 rounded-xl">
                                  <p className="text-xs sm:text-[13px] text-gold font-bold m-0 flex items-center gap-2">
                                    <Hourglass size={13} className="animate-pulse shrink-0" /> Please proceed to {step.location && !step.location.toLowerCase().includes('checking') ? step.location : 'the counter'}
                                  </p>
                                  <p className="text-[11px] sm:text-[11.5px] text-text-sub m-0 mt-1 ml-5 leading-relaxed">
                                    Present your queue ticket and required requirements to the registrar window.
                                  </p>
                                </div>
                              )}
                              
                              {isActiveStep && !isRelease && !isDocPrepared && !isPrep && !stepRequiresPresence && (
                                <div className="mt-2.5 p-3 bg-surface border border-border rounded-xl">
                                  <p className="text-xs text-text-sub m-0 flex items-center gap-2 font-medium">
                                    <Cog size={13} className="text-text-muted animate-spin shrink-0" style={{ animationDuration: '3s' }} /> Being processed — no need to wait in line
                                  </p>
                                </div>
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
            ) : (
            <div className="animate-fade-up text-center py-16 px-8 bg-white rounded-2xl border border-border shadow-sm">
              <div className="text-text-muted mb-4 flex justify-center"><Ticket size={48} className="text-gold" /></div>
              <p className="text-[15px] font-semibold text-text-main m-0 mb-1.5">No Active Queue Ticket</p>
              <p className="text-[13px] text-text-sub m-0 mb-6">Check your upcoming appointments to activate a queue number.</p>
              <button onClick={() => setActiveTab('upcoming')} className="py-2.5 px-6 rounded-lg border-none bg-maroon text-white text-[14px] font-semibold cursor-pointer hover:bg-maroon-dark transition-colors">
                View Upcoming
              </button>
            </div>
          )}
        </div>

        <div className={`${activeTab === 'upcoming' ? 'block' : 'hidden'}`}>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-[14px] p-5 border border-border shadow-sm">
                  <div className="flex justify-between mb-3">
                    <div className="animate-pulse w-35 h-4 rounded bg-border" />
                    <div className="animate-pulse w-17.5 h-5 rounded-full bg-border" />
                  </div>
                  <div className="animate-pulse w-30 h-3.5 rounded bg-border mb-4" />
                  <div className="animate-pulse w-full h-11 rounded-lg bg-border" />
                </div>
              ))}
            </div>
          ) : (() => {
            const validUpcoming = upcomingAppts.filter(appt => {
              const apptTickets = Array.isArray(appt.queue_tickets) ? appt.queue_tickets : (appt.queue_tickets ? [appt.queue_tickets] : []);
              const hasActive = apptTickets.some(qt => qt.status === 'waiting' || qt.status === 'in_progress');
              const isCurrent = ticket && (ticket.appointment_id === appt.id || ticket.appointments?.id === appt.id);
              if (hasActive || isCurrent) return true;
              return appt.appointment_date >= today;
            });
            if (validUpcoming.length === 0) {
              return (
                <div className="animate-fade-up text-center py-16 px-8 bg-white rounded-2xl border border-border shadow-sm">
                  <div className="text-gold mb-4 flex justify-center"><Inbox size={48} /></div>
                  <p className="text-[15px] font-semibold text-text-main m-0 mb-1.5">No upcoming appointments</p>
                  <p className="text-[13px] text-text-sub m-0 mb-6">Queue numbers are only available on your appointment date.</p>
                  <button onClick={() => navigate('/student/book')} className="py-2.5 px-6 rounded-lg border-none bg-maroon text-white text-[14px] font-semibold cursor-pointer hover:bg-maroon-dark transition-colors">
                    Book an Appointment
                  </button>
                </div>
              );
            }
            return (
              <div className="animate-fade-up">
                <p className="text-[13px] m-0 mb-6 flex items-center gap-2 bg-blue-50 text-blue-800 p-3.5 rounded-xl border border-blue-100">
                  <Ticket size={16} className="text-blue-500" />
                  Activate your queue number when you arrive at the Registrar's Office.
                </p>
                <div className="flex flex-col gap-4">
                  {validUpcoming.map(appt => {
                    const isToday = appt.appointment_date === today;
                    const apptTickets = Array.isArray(appt.queue_tickets) ? appt.queue_tickets : [];
                    const activeTicket = apptTickets.find(qt => qt.status === 'waiting' || qt.status === 'in_progress');
                    const isCurrentTicketForThisAppt = ticket && (ticket.appointment_id === appt.id || ticket.appointments?.id === appt.id);
                    const liveTicketForAppt = activeTicket || (isCurrentTicketForThisAppt ? ticket : null);

                    const relDate = appt.release_date || liveTicketForAppt?.appointments?.release_date || liveTicketForAppt?.release_date;
                    const isFutureApptScheduled = Boolean(relDate && relDate > today);
                    const isReadyToday = Boolean(relDate && relDate <= today);
                    const isReadyForPickup = !isFutureApptScheduled && (isReadyToday || (liveTicketForAppt && isReleaseActive));
                    const isActivated = !isReadyForPickup && !isFutureApptScheduled && !!liveTicketForAppt && (liveTicketForAppt.status === 'waiting' || liveTicketForAppt.status === 'in_progress');
                    const isAnotherTicketActiveForToday = ticket && ticket.status !== 'completed' && !isCurrentTicketForThisAppt && ((ticket.appointments?.appointment_date || ticket.appointment_date) === today);

                    return (
                      <div key={appt.id} className="bg-white rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${
                          isReadyForPickup ? 'bg-success' : (isFutureApptScheduled || isActivated) ? 'bg-gold' : 'bg-border group-hover:bg-maroon'
                        }`} />
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4 pl-1">
                          <div>
                            <h3 className="text-[16px] font-bold text-text-main m-0 mb-1.5 leading-tight">{appt.transaction_types?.name}</h3>
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold py-1 px-3 rounded-full bg-surface text-text-muted border border-border">
                              <Calendar size={12} className="text-text-muted" /> {new Date(appt.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} at {fmt12h(appt.time_slot)}
                            </span>
                          </div>

                          {/* Dynamic Status Badge */}
                          {isReadyForPickup ? (
                            <span className="shrink-0 text-[11px] font-extrabold py-1 px-3 rounded-full bg-success-light text-success border border-success-border uppercase tracking-wider self-start flex items-center gap-1.5">
                              <FileCheck size={13} /> Ready for Pickup
                            </span>
                          ) : isFutureApptScheduled ? (
                            <span className="shrink-0 text-[11px] font-extrabold py-1 px-3 rounded-full bg-gold-light text-gold border border-gold-border uppercase tracking-wider self-start flex items-center gap-1.5">
                              <Calendar size={13} /> Scheduled ({new Date(relDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                            </span>
                          ) : isActivated ? (
                            <span className="shrink-0 text-[11px] font-extrabold py-1 px-3 rounded-full bg-gold-light text-gold border border-gold-border uppercase tracking-wider self-start flex items-center gap-1.5">
                              <Clock size={13} /> In Progress
                            </span>
                          ) : (
                            <span className="shrink-0 text-[11px] font-bold py-1 px-3 rounded-full bg-surface text-text-sub border border-border uppercase tracking-wider self-start">
                              Confirmed
                            </span>
                          )}
                        </div>
                        
                        {/* Dynamic Action Button */}
                        {isReadyForPickup ? (
                          <button
                            onClick={() => {
                              setActiveTab('active');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-3.5 px-4 rounded-xl border border-success-border bg-success-light text-success hover:bg-success hover:text-white text-[14px] font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5"
                          >
                            <FileCheck size={16} /> Ready for Pickup • View Claim Stub
                          </button>
                        ) : isFutureApptScheduled && liveTicketForAppt ? (
                          <button
                            onClick={() => {
                              setActiveTab('active');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-3.5 px-4 rounded-xl border border-gold-border bg-gold-light text-gold hover:bg-gold hover:text-white text-[14px] font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5"
                          >
                            <Calendar size={16} /> Scheduled for Release • View Queue Ticket ({liveTicketForAppt.queue_number})
                          </button>
                        ) : isActivated ? (
                          <button
                            onClick={() => {
                              setActiveTab('active');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-3.5 px-4 rounded-xl border border-gold-border bg-gold-light text-gold hover:bg-gold hover:text-white text-[14px] font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5"
                          >
                            <Ticket size={16} /> In Progress • View Active Queue Ticket ({liveTicketForAppt.queue_number})
                          </button>
                        ) : (
                          <button
                            onClick={() => setActivateConfirmId(appt.id)}
                            disabled={activating === appt.id || !isToday || isAnotherTicketActiveForToday}
                            title={isAnotherTicketActiveForToday ? "You already have an active queue ticket for today" : ""}
                            className={`w-full py-3.5 px-4 rounded-xl border text-[14px] font-bold font-sans transition-all flex items-center justify-center gap-2 ${
                              activating === appt.id ? 'bg-surface text-text-muted border-border cursor-wait' :
                              !isToday ? 'bg-surface text-text-sub border-border cursor-not-allowed opacity-70' :
                              isAnotherTicketActiveForToday ? 'bg-surface text-text-sub border-border cursor-not-allowed opacity-70' :
                              'bg-gold text-white border-gold-dark cursor-pointer hover:bg-gold-light hover:text-gold hover:border-gold-light shadow-sm hover:-translate-y-0.5'
                            }`}
                          >
                            {activating === appt.id ? 'Activating...' : !isToday ? 'Available on Appointment Date' : isAnotherTicketActiveForToday ? 'Another Ticket is Active' : <><Ticket size={16} /> Get Queue Number</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 animate-fade-in pointer-events-auto">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl animate-fade-up">
            <h3 className="text-[18px] font-bold text-text-main m-0 mb-2">Cancel Queue Ticket?</h3>
            <p className="text-[14px] text-text-sub m-0 mb-6">
              Are you sure you want to cancel this active queue ticket? This action cannot be undone and you will lose your spot in line.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCancelConfirmId(null)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-border text-text-main font-semibold hover:bg-surface transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button 
                onClick={handleCancelQueue}
                className="flex-1 py-2.5 px-4 rounded-lg bg-danger text-white font-semibold hover:bg-danger-dark transition-colors border-none cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Activate Confirmation Modal */}
      {activateConfirmId && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 animate-fade-in pointer-events-auto">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl animate-fade-up">
            <h3 className="text-[18px] font-bold text-text-main m-0 mb-2">Get Queue Number?</h3>
            <p className="text-[14px] text-text-sub m-0 mb-6">
              Are you sure you want to activate your queue ticket now? Make sure you are already at the Campus and you already have the receipt or documents needed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setActivateConfirmId(null)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-border text-text-main font-semibold hover:bg-surface transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button 
                onClick={handleActivate}
                disabled={activating === activateConfirmId}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gold text-white font-semibold hover:bg-gold-dark transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                {activating === activateConfirmId ? 'Activating...' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );

  if (embedded) return content;
  return <StudentLayout activeTab="queue" mobileTitle="My Queue">{content}</StudentLayout>;
}