import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyQueue, activateQueue, getTimeEstimate } from '../../services/queueService'
import { getMyAppointments } from '../../services/appointmentService'
import { Clock, Hourglass, PartyPopper, Ticket, Calendar, Inbox } from 'lucide-react'

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
  const today    = new Date().toISOString().split('T')[0]
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

  const handleActivate = async (id) => {
    setActivating(id); setError('')
    try { await activateQueue(token, id); await Promise.all([fetchQueue(), fetchAppts()]) }
    catch (e) { setError(e.message) }
    finally { setActivating(null) }
  }

  const ticket = queueData?.ticket
  const steps  = queueData?.steps || []

  return (
    <StudentLayout activeTab="queue" mobileTitle="My Queue" backTo="/student/dashboard">

      <div className="max-w-[560px] mx-auto pt-6 px-4 pb-20">
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
          <h2 className="hidden md:block font-serif text-[22px] font-bold text-text-main mb-4">Active Queue</h2>
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="animate-pulse w-[80px] h-[12px] rounded bg-border mb-2" />
                    <div className="animate-pulse w-[60px] h-[48px] rounded-lg bg-border" />
                  </div>
                  <div className="animate-pulse w-[90px] h-[24px] rounded-full bg-border" />
                </div>
                <div className="animate-pulse w-[180px] h-[14px] rounded bg-border mb-1.5" />
                <div className="animate-pulse w-[140px] h-[12px] rounded bg-border" />
              </div>
              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="animate-pulse w-[150px] h-[16px] rounded bg-border mb-6" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3.5 mb-4 last:mb-0">
                    <div className="animate-pulse w-7 h-7 rounded-full bg-border shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <div className="animate-pulse w-[100px] h-[14px] rounded bg-border" />
                        <div className="animate-pulse w-[60px] h-[16px] rounded-full bg-border" />
                      </div>
                      <div className="animate-pulse w-[140px] h-[12px] rounded bg-border" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : ticket ? (
            <div className="animate-fade-up">
              {/* Queue ticket card */}
              <div className="bg-gradient-to-br from-maroon to-maroon-dark rounded-2xl p-7 mb-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[11px] text-white/50 m-0 mb-1 uppercase tracking-[0.08em]">Queue Number</p>
                    <div className="font-serif text-[48px] font-bold text-gold leading-none">{ticket.queue_number}</div>
                  </div>
                  <span className={`text-[12px] font-semibold py-1 px-3 rounded-full border ${
                    ticket.status === 'completed' 
                      ? 'bg-success-light text-success border-success-border' 
                      : 'bg-gold/20 text-gold border-gold/30'
                  }`}>
                    {ticket.status === 'in_progress' ? 'In Progress' : ticket.status === 'completed' ? 'Completed' : ticket.status}
                  </span>
                </div>
                <p className="text-[13px] text-white/70 m-0 mb-1 relative z-10">{ticket.appointments?.transaction_types?.name}</p>
                <p className="text-[12px] text-white/45 m-0 relative z-10">{ticket.appointments?.appointment_date} at {ticket.appointments?.time_slot}</p>
              </div>

              {/* Step tracker */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-[14px] font-bold text-text-main m-0 mb-5 uppercase tracking-[0.05em]">Transaction Progress</h3>
                <div className="flex flex-col">
                  {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1
                    const est = estimates.find(e => e.step === step.step_number)

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
                            <div className={`w-0.5 flex-1 min-h-[24px] my-1 ${step.status === 'completed' ? 'bg-maroon' : 'bg-border'}`} />
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
                              {step.status === 'in_progress' ? 'In Progress' : step.status === 'completed' ? 'Done' : 'Pending'}
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

                          {/* Sub-labels */}
                          {step.status === 'in_progress' && (
                            <p className="text-[12px] text-gold m-0 flex items-center gap-1 font-medium"><Hourglass size={12} className="text-gold animate-pulse" /> Please proceed to this counter</p>
                          )}
                          {step.status === 'completed' && step.confirmed_at && (
                            <p className="text-[11px] text-text-muted m-0">✓ Confirmed at {new Date(step.confirmed_at).toLocaleTimeString()}</p>
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
          <h2 className="hidden md:block font-serif text-[22px] font-bold text-text-main mb-4">Upcoming Appointments</h2>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-[14px] p-5 border border-border shadow-sm">
                  <div className="flex justify-between mb-3">
                    <div className="animate-pulse w-[140px] h-[16px] rounded bg-border" />
                    <div className="animate-pulse w-[70px] h-[20px] rounded-full bg-border" />
                  </div>
                  <div className="animate-pulse w-[120px] h-[14px] rounded bg-border mb-4" />
                  <div className="animate-pulse w-full h-[44px] rounded-lg bg-border" />
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
                      <p className="text-[13px] text-text-sub m-0 mb-4 flex items-center gap-1.5"><Calendar size={13} className="text-gold" /> {appt.appointment_date} at {appt.time_slot}</p>
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
                          onClick={() => handleActivate(appt.id)}
                          disabled={activating === appt.id || !isToday || ticket}
                          title={ticket ? "You already have an active queue ticket" : ""}
                          className={`w-full py-3 rounded-lg border-none text-[14px] font-bold font-sans flex items-center justify-center gap-2 transition-colors ${
                            (!isToday || ticket) ? 'bg-border text-text-sub cursor-not-allowed' : 
                            activating === appt.id ? 'bg-[#B8667A] text-white cursor-not-allowed' : 
                            'bg-maroon text-white cursor-pointer hover:bg-maroon-dark shadow-sm'
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
    </StudentLayout>
  )
}
