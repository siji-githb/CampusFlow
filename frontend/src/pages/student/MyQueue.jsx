import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { getMyQueue, activateQueue, getTimeEstimate } from '../../services/queueService'  // ← M9
import { getMyAppointments } from '../../services/appointmentService'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray500: '#706B65', text: '#1C1917' }

const STEP_STYLE = {
  pending:     { dot: M.gray200, text: M.gray500, badge: 'Pending',     badgeBg: '#F9F9F9',   badgeColor: M.gray500 },
  in_progress: { dot: M.gold,    text: M.text,    badge: 'In Progress', badgeBg: M.goldLight,  badgeColor: M.gold    },
  completed:   { dot: M.maroon,  text: M.text,    badge: 'Done',        badgeBg: M.maroonLight,badgeColor: M.maroon  },
}

export default function MyQueue() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [queueData, setQueueData]   = useState(null)
  const [todayAppts, setTodayAppts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [activating, setActivating] = useState(null)
  const [error, setError]           = useState('')
  const [estimates, setEstimates]   = useState([])   // ← M9
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
      setTodayAppts(all.filter(a => a.appointment_date === today && a.status === 'confirmed'))
    } catch (e) { setError(e.message) }
  }

  // ── M9: fetch time estimates once we have a queue ticket ──────────────────
  const fetchEstimates = async (appointmentId) => {
    try {
      const data = await getTimeEstimate(token, appointmentId)
      setEstimates(data.estimates || [])
    } catch {
      setEstimates([])   // fail silently — estimates are non-critical
    }
  }

  useEffect(() => {
    Promise.all([fetchQueue(), fetchAppts()]).finally(() => setLoading(false))
    pollRef.current = setInterval(fetchQueue, 15000)
    return () => clearInterval(pollRef.current)
  }, [])

  // ── M9: trigger estimate fetch when ticket becomes available ──────────────
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
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar backTo="/student/dashboard" title="My Queue" />
      <main style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading queue...</div>

        ) : ticket ? (
          <div>
            {/* Queue ticket card */}
            <div style={{ background: `linear-gradient(135deg, ${M.maroon} 0%, #9B2335 100%)`, borderRadius: '16px', padding: '1.75rem', marginBottom: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Queue Number</p>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 800, color: '#F0C040', lineHeight: 1 }}>{ticket.queue_number}</div>
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '100px',
                  background: ticket.status === 'completed' ? '#EFF6FF' : 'rgba(240,192,64,0.2)',
                  color: ticket.status === 'completed' ? '#1D4ED8' : '#F0C040',
                  border: ticket.status === 'completed' ? '1px solid #BFDBFE' : '1px solid rgba(240,192,64,0.3)'
                }}>
                  {ticket.status === 'in_progress' ? 'In Progress' : ticket.status === 'completed' ? 'Completed' : ticket.status}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 3px' }}>{ticket.appointments?.transaction_types?.name}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{ticket.appointments?.appointment_date} at {ticket.appointments?.time_slot}</p>
            </div>

            {/* Step tracker */}
            <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: M.text, margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Progress</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {steps.map((step, idx) => {
                  const ss     = STEP_STYLE[step.status] || STEP_STYLE.pending
                  const isLast = idx === steps.length - 1

                  // ── M9: find estimate for this step ──────────────────────
                  const est = estimates.find(e => e.step === step.step_number)

                  return (
                    <div key={step.id} style={{ display: 'flex', gap: '14px' }}>
                      {/* Step dot + connector */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: step.status === 'completed' ? M.maroon : step.status === 'in_progress' ? M.gold : M.gray200,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: step.status === 'pending' ? M.gray500 : 'white',
                          fontSize: '12px', fontWeight: 700,
                        }}>
                          {step.status === 'completed' ? '✓' : step.step_number}
                        </div>
                        {!isLast && (
                          <div style={{ width: '2px', flex: 1, minHeight: '24px', margin: '3px 0', background: step.status === 'completed' ? M.maroon : M.gray200 }} />
                        )}
                      </div>

                      {/* Step content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '16px' }}>
                        {/* Name row + status badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: ss.text }}>{step.step_name}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: ss.badgeBg, color: ss.badgeColor }}>
                            {ss.badge}
                          </span>
                        </div>

                        {/* ── M9: estimate badge — only on pending steps ── */}
                        {est && step.status === 'pending' && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '11px', fontWeight: 500,
                              background: 'rgba(184,144,10,0.08)',
                              color: M.gold,
                              border: `1px solid rgba(184,144,10,0.25)`,
                              borderRadius: '100px',
                              padding: '2px 10px',
                              fontFamily: 'monospace',
                              letterSpacing: '0.03em',
                            }}>
                              ⏱ {est.label}
                            </span>
                          </div>
                        )}

                        {/* Sub-labels */}
                        {step.status === 'in_progress' && (
                          <p style={{ fontSize: '12px', color: M.gold, margin: 0 }}>⏳ Please proceed to this counter</p>
                        )}
                        {step.status === 'completed' && step.confirmed_at && (
                          <p style={{ fontSize: '11px', color: M.gray500, margin: 0 }}>✓ Confirmed at {new Date(step.confirmed_at).toLocaleTimeString()}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {ticket.status === 'completed' && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: M.maroonLight, borderRadius: '10px', textAlign: 'center', border: `1px solid ${M.maroon}20` }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: M.maroon, margin: '0 0 3px' }}>🎉 Transaction Complete!</p>
                  <p style={{ fontSize: '12px', color: M.gray500, margin: 0 }}>All steps have been processed.</p>
                </div>
              )}
            </div>
          </div>

        ) : todayAppts.length > 0 ? (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Today's Appointments</h2>
            <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.25rem' }}>Activate your queue number when you arrive at the Registrar's Office.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayAppts.map(appt => (
                <div key={appt.id} style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: 0 }}>{appt.transaction_types?.name}</h3>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '100px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>Confirmed</span>
                  </div>
                  <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1rem' }}>📅 {appt.appointment_date} at {appt.time_slot}</p>
                  <button
                    onClick={() => handleActivate(appt.id)}
                    disabled={activating === appt.id}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: activating === appt.id ? '#B8667A' : M.maroon, color: 'white', fontSize: '14px', fontWeight: 700, cursor: activating === appt.id ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {activating === appt.id ? 'Activating...' : '🎫 Get Queue Number'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '16px', border: `1px solid ${M.gray200}` }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No appointments today</p>
            <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.5rem' }}>Queue numbers are only available on your appointment date.</p>
            <button onClick={() => navigate('/student/book')} style={{ padding: '11px 24px', borderRadius: '8px', border: 'none', background: M.maroon, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Book an Appointment
            </button>
          </div>
        )}
      </main>
    </div>
  )
}