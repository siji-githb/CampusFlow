import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyQueue, activateQueue, getTimeEstimate } from '../../services/queueService'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'
import { Clock, Hourglass, PartyPopper, Ticket, Calendar, Inbox, Cog } from 'lucide-react'

const STEP_STYLE = {
  pending:     { bg: '#F9F9F9', color: '#706B65' }, // text-text-sub
  in_progress: { bg: '#FDF6E3', color: '#B8900A' }, // text-gold
  completed:   { bg: '#F9F0F1', color: '#7B1A2A' }, // text-maroon
}

export default function MyQueue() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [queueData, setQueueData]   = useState(null)
  const [upcomingAppts, setUpcomingAppts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [activating, setActivating] = useState(null)
  const [error, setError]           = useState('')
  const [estimates, setEstimates]   = useState([])
  const [activeTab, setActiveTab]   = useState('active')
  const [cancelConfirmId, setCancelConfirmId] = useState(null)
  const [activateConfirmId, setActivateConfirmId] = useState(null)
  const today    = new Date().toISOString().split('T')[0]

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

  const fetchQueue = async () => {
    try {
      const data = await getMyQueue(token)
      setQueueData(data.ticket ? data : null)
    } catch (e) { setError(e.message) }
  }

  const fetchAppts = async () => {
    try {
      const all = await getMyAppointments(token)
      setUpcomingAppts(all.filter(a => a.appointment_date >= today && a.status === 'confirmed'))
    } catch (e) { setError(e.message) }
  }

  const fetchEstimates = async (appointmentId) => {
    try {
      const data = await getTimeEstimate(token, appointmentId)
      setEstimates(data.estimates || [])
    } catch {
      setEstimates([])
    }
  }

  useEffect(() => {
    Promise.all([fetchQueue(), fetchAppts()]).finally(() => setLoading(false))
    pollRef.current = setInterval(fetchQueue, 15000)
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (queueData?.ticket?.appointment_id) {
      fetchEstimates(queueData.ticket.appointment_id)
    }
  }, [queueData?.ticket?.appointment_id])

  const handleActivate = async () => {
    if (!activateConfirmId) return
    setActivating(activateConfirmId); setError('')
    try { 
      await activateQueue(token, activateConfirmId) 
      await Promise.all([fetchQueue(), fetchAppts()]) 
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
  const currentRequiresPresence = currentStep?.requires_presence !== false // default true if missing/undefined

  return (
    <StudentLayout activeTab="queue" mobileTitle="My Queue" backTo="/student/dashboard">

      <div className="w-full max-w-140 mx-auto pt-6 px-4 pb-20 md:max-w-225 md:mx-0 md:pt-0 md:px-0">
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
          <div className="py-2.5 px-3.5 rounded-lg bg-danger-light text-danger text-[13px] mb-4">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 px-4 rounded-lg border-none text-[14px] font-semibold cursor-pointer transition-all duration-200 font-sans ${activeTab === 'active' ? 'bg-maroon-light text-maroon' : 'bg-transparent text-text-sub hover:bg-off-white'}`}
          >
            Active Queue
          </button>
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2.5 px-4 rounded-lg border-none text-[14px] font-semibold cursor-pointer transition-all duration-200 font-sans ${activeTab === 'upcoming' ? 'bg-maroon-light text-maroon' : 'bg-transparent text-text-sub hover:bg-off-white'}`}
          >
            Upcoming
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
            <div className="animate-fade-up">
              {/* Queue ticket card */}
              <div className="bg-maroon rounded-2xl p-7 mb-4 shadow-lg border border-maroon-light/20 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold/10 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex justify-between items-start mb-5">
                  <div>
                    <p className="text-[11px] text-maroon-light/60 m-0 mb-1.5 uppercase tracking-widest font-medium">Queue Number</p>
                    <div className="font-serif text-[52px] font-bold text-white leading-none drop-shadow-md">{ticket.queue_number}</div>
                  </div>
                </div>
                
                <div className="relative z-10 flex justify-between items-end mt-3">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[16px] font-medium text-white m-0 drop-shadow-sm">{ticket.appointments?.transaction_types?.name}</p>
                    <p className="text-[13px] text-white/70 m-0 font-light tracking-wide">{ticket.appointments?.appointment_date} <span className="text-white/30 mx-1.5">|</span> {fmt12h(ticket.appointments?.time_slot)}</p>
                  </div>
                  <button 
                    onClick={() => setCancelConfirmId(ticket.appointment_id)} 
                    className="bg-white/10 hover:bg-danger text-white text-[12px] font-medium py-1.5 px-4 rounded-full transition-colors border border-white/20 hover:border-danger cursor-pointer"
                  >
                    Cancel Queue
                  </button>
                </div>

                {ticket.status === 'in_progress' && !currentRequiresPresence && (
                  <div className="mt-4 pt-3 border-t border-white/10 relative z-10">
                    <p className="text-[12px] text-white/80 m-0 flex items-center gap-2">
                      <Cog size={14} className="text-gold" /> No need to wait in line — we'll notify you when it's your turn.
                    </p>
                  </div>
                )}
              </div>

              {/* Step tracker */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-[14px] font-bold text-text-main m-0 mb-5 uppercase tracking-wider">Transaction Progress</h3>
                <div className="flex flex-col">
                  {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1
                    const est = estimates.find(e => e.step === step.step_number)
                    const stepRequiresPresence = step.requires_presence !== false

                    return (
                      <div key={step.id} className="flex gap-3.5">
                        {/* Step dot + connector */}
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold ${
                            step.status === 'completed' ? 'bg-maroon text-white' : 
                            step.status === 'in_progress' ? 'bg-gold text-white shadow-[0_0_0_4px_rgba(184,144,10,0.15)]' : 
                            'bg-border text-text-sub'
                          }`}>
                            {step.status === 'completed' ? '✓' : step.step_number}
                          </div>
                          {!isLast && (
                            <div className={`w-0.5 flex-1 min-h-6 my-1 ${step.status === 'completed' ? 'bg-maroon' : 'bg-border'}`} />
                          )}
                        </div>

                        {/* Step content */}
                        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                          {/* Name row + status badge */}
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[14px] font-semibold ${step.status === 'pending' ? 'text-text-sub' : 'text-text-main'}`}>{step.step_name}</span>
                            <span className="text-[11px] font-semibold py-0.5 px-2 rounded-full" style={{
                               background: STEP_STYLE[step.status]?.bg || '#F9F9F9',
                               color: STEP_STYLE[step.status]?.color || '#706B65'
                            }}>
                              {step.status === 'in_progress' ? (stepRequiresPresence ? 'In Progress' : 'Processing') : step.status === 'completed' ? 'Done' : 'Pending'}
                            </span>
                          </div>

                          {/* estimate badge */}
                          {est && step.status === 'pending' && (
                            <div className="mb-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gold/10 text-gold border border-gold/25 rounded-full py-0.5 px-2.5 font-mono tracking-wide">
                                <Clock size={11} className="text-gold" /> {est.label}
                              </span>
                            </div>
                          )}

                          {/* Sub-labels — this is the core fix: back-office steps no
                              longer tell the student to "proceed to a counter" */}
                          {step.status === 'in_progress' && stepRequiresPresence && (
                            <p className="text-[12px] text-gold m-0 flex items-center gap-1 font-medium"><Hourglass size={12} className="text-gold animate-pulse" /> Please proceed to this counter</p>
                          )}
                          {step.status === 'in_progress' && !stepRequiresPresence && (
                            <p className="text-[12px] text-text-sub m-0 flex items-center gap-1 font-medium"><Cog size={12} className="text-text-muted" /> Being processed — no need to wait in line</p>
                          )}
                          {step.status === 'completed' && step.confirmed_at && (
                            <p className="text-[11px] text-text-muted m-0">✓ Confirmed at {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {ticket.status === 'completed' && (
                  <div className="mt-4 p-4 bg-maroon-light rounded-xl text-center border border-maroon-border animate-fade-up">
                    <p className="text-[15px] font-bold text-maroon m-0 mb-1 flex items-center justify-center gap-1.5"><PartyPopper size={18} className="text-gold" /> Transaction Complete!</p>
                    <p className="text-[12px] text-text-sub m-0">All steps have been processed.</p>
                  </div>
                )}
              </div>
            </div>
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
          ) : upcomingAppts.length > 0 ? (
            <div className="animate-fade-up">
              <p className="text-[13px] text-text-sub m-0 mb-5 leading-relaxed bg-off-white p-3 rounded-lg border border-border">Activate your queue number when you arrive at the Registrar's Office on your appointment date.</p>
              <div className="flex flex-col gap-3">
                {upcomingAppts.map(appt => {
                  const isToday = appt.appointment_date === today;
                  return (
                    <div key={appt.id} className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                      <div className="flex justify-between mb-2">
                        <h3 className="text-[15px] font-semibold text-text-main m-0">{appt.transaction_types?.name}</h3>
                        <span className="text-[11px] font-semibold py-0.5 px-2.5 rounded-full bg-success-light text-success border border-success-border">Confirmed</span>
                      </div>
                      <p className="text-[13px] text-text-sub m-0 mb-4 flex items-center gap-1.5"><Calendar size={13} className="text-gold" /> {appt.appointment_date} at {fmt12h(appt.time_slot)}</p>
                      {ticket && ticket.appointment_id === appt.id ? (
                        <div className="flex gap-2">
                          <button
                            disabled
                            className="flex-1 py-3 px-4 rounded-lg border border-border bg-success-light text-success text-[14px] font-bold cursor-default font-sans text-center"
                          >
                            ✓ Activated
                          </button>
                          <button
                            onClick={() => setActiveTab('active')}
                            className="flex-1 py-3 px-4 rounded-lg border-none bg-maroon text-white text-[14px] font-bold cursor-pointer font-sans transition-colors hover:bg-maroon-dark text-center"
                          >
                            View Details
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActivateConfirmId(appt.id)}
                          disabled={activating === appt.id || !isToday || ticket}
                          title={ticket ? "You already have an active queue ticket" : ""}
                          className={`w-full py-3 px-4 rounded-lg border-none text-[14px] font-bold font-sans transition-colors ${
                            activating === appt.id ? 'bg-maroon-mid text-text-muted cursor-wait' :
                            !isToday ? 'bg-border text-text-sub cursor-not-allowed' :
                            ticket ? 'bg-border text-text-sub cursor-not-allowed' :
                            'bg-gold text-white cursor-pointer hover:bg-gold-light hover:text-gold shadow-sm'
                          }`}
                        >
                          {activating === appt.id ? 'Activating...' : !isToday ? 'Available on Appointment Date' : <><Ticket size={16} className="text-gold" /> Get Queue Number</>}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="animate-fade-up text-center py-16 px-8 bg-white rounded-2xl border border-border shadow-sm">
              <div className="text-gold mb-4 flex justify-center"><Inbox size={48} /></div>
              <p className="text-[15px] font-semibold text-text-main m-0 mb-1.5">No upcoming appointments</p>
              <p className="text-[13px] text-text-sub m-0 mb-6">Queue numbers are only available on your appointment date.</p>
              <button onClick={() => navigate('/student/book')} className="py-2.5 px-6 rounded-lg border-none bg-maroon text-white text-[14px] font-semibold cursor-pointer hover:bg-maroon-dark transition-colors">
                Book an Appointment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-fade-in pointer-events-auto">
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-fade-in pointer-events-auto">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl animate-fade-up">
            <h3 className="text-[18px] font-bold text-text-main m-0 mb-2">Get Queue Number?</h3>
            <p className="text-[14px] text-text-sub m-0 mb-6">
              Are you sure you want to activate your queue ticket now? Make sure you are already at the Campus or heading there shortly.
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

    </StudentLayout>
  )
}