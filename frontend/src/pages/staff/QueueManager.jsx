import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep } from '../../services/queueService'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray500: '#706B65', text: '#1C1917' }

export default function QueueManager() {
  const { token } = useAuth()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchQueue = async () => {
    try { setQueue(await getTodaysQueue(token)); setLastUpdated(new Date().toLocaleTimeString()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchQueue(); const t = setInterval(fetchQueue, 30000); return () => clearInterval(t) }, [])

  const handleConfirm = async (ticketId, stepNum) => {
    const key = `${ticketId}-${stepNum}`; setConfirming(key); setError('')
    try { await confirmStep(token, ticketId, stepNum); await fetchQueue() }
    catch (e) { setError(e.message) }
    finally { setConfirming(null) }
  }

  const active = queue.filter(q => q.ticket.status !== 'completed')
  const done = queue.filter(q => q.ticket.status === 'completed')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 3px' }}>Today's Queue</h2>
          <p style={{ fontSize: '13px', color: M.gray500, margin: 0 }}>
            <span style={{ fontWeight: 600, color: active.length > 0 ? M.maroon : M.gray500 }}>{active.length} active</span> · {done.length} completed
            {lastUpdated && <span style={{ color: M.gray500 }}> · Updated {lastUpdated}</span>}
          </p>
        </div>
        <button onClick={fetchQueue} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${M.gray200}`, background: 'white', color: M.text, fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          🔄 Refresh
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading queue...</div>
      ) : queue.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>No queue tickets today</p>
          <p style={{ fontSize: '13px', color: M.gray500, margin: 0 }}>Students will appear here after activating their queue number.</p>
        </div>
      ) : (
        <div>
          {/* Active tickets */}
          {active.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: M.maroon, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Active Tickets</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {active.map(({ ticket, steps }) => (
                  <div key={ticket.id} style={{ background: 'white', borderRadius: '14px', border: `1.5px solid ${M.maroon}25`, padding: '1.25rem', boxShadow: '0 2px 8px rgba(123,26,42,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 800, color: M.maroon }}>{ticket.queue_number}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: M.goldLight, color: M.gold, border: `1px solid ${M.gold}30` }}>In Progress</span>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 2px' }}>{ticket.users?.last_name}, {ticket.users?.first_name}</p>
                        <p style={{ fontSize: '12px', color: M.gray500, margin: 0 }}>ID: {ticket.users?.student_id} · {ticket.appointments?.time_slot}</p>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: M.maroon, background: M.maroonLight, padding: '5px 12px', borderRadius: '8px', border: `1px solid ${M.maroon}20` }}>
                        Step {ticket.current_step}/{ticket.total_steps}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {steps.map(step => (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: step.status === 'in_progress' ? M.goldLight : step.status === 'completed' ? '#F0FDF4' : M.offWhite, border: `1px solid ${step.status === 'in_progress' ? M.gold + '40' : step.status === 'completed' ? '#BBF7D0' : M.gray200}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: step.status === 'in_progress' ? M.gold : step.status === 'completed' ? '#15803D' : M.gray500 }}>{step.step_number}.</span>
                            <span style={{ fontSize: '13px', fontWeight: step.status === 'in_progress' ? 600 : 400, color: step.status === 'in_progress' ? M.text : step.status === 'completed' ? '#15803D' : M.gray500 }}>{step.step_name}</span>
                          </div>
                          <div>
                            {step.status === 'completed' && <span style={{ fontSize: '12px', color: '#15803D', fontWeight: 600 }}>✓ Done</span>}
                            {step.status === 'pending' && <span style={{ fontSize: '12px', color: M.gray400 }}>⏳ Waiting</span>}
                            {step.status === 'in_progress' && (
                              <button onClick={() => handleConfirm(ticket.id, step.step_number)} disabled={confirming === `${ticket.id}-${step.step_number}`}
                                style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: confirming === `${ticket.id}-${step.step_number}` ? M.gold + '80' : M.maroon, color: 'white', fontSize: '12px', fontWeight: 700, cursor: confirming === `${ticket.id}-${step.step_number}` ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                                {confirming === `${ticket.id}-${step.step_number}` ? 'Confirming...' : '✓ Confirm Done'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed tickets */}
          {done.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: M.gray500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Completed Today</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {done.map(({ ticket }) => (
                  <div key={ticket.id} style={{ background: 'white', borderRadius: '10px', border: `1px solid ${M.gray200}`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: M.gray500, fontSize: '1.1rem' }}>{ticket.queue_number}</span>
                      <span style={{ fontSize: '14px', color: M.text }}>{ticket.users?.last_name}, {ticket.users?.first_name}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}