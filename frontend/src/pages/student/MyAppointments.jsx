import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray500: '#706B65', text: '#1C1917' }

const STATUS = {
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  pending: { label: 'Pending', bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  cancelled: { label: 'Cancelled', bg: M.maroonLight, color: M.maroon, border: '#FECACA' },
  completed: { label: 'Completed', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  no_show: { label: 'No Show', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
}

export default function MyAppointments() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError] = useState('')

  const fetch = async () => {
    try { setAppointments(await getMyAppointments(token)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return
    setCancelling(id)
    try { await cancelAppointment(token, id); await fetch() }
    catch (e) { setError(e.message) }
    finally { setCancelling(null) }
  }

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar backTo="/student/dashboard" title="My Appointments" />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '16px', border: `1px solid ${M.gray200}` }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No appointments yet</p>
            <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.5rem' }}>Book your first registrar transaction</p>
            <button onClick={() => navigate('/student/book')} style={{ padding: '11px 24px', borderRadius: '8px', border: 'none', background: M.maroon, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Book an Appointment</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {appointments.map(appt => {
              const s = STATUS[appt.status] || STATUS.pending
              return (
                <div key={appt.id} style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: 0 }}>{appt.transaction_types?.name || 'Transaction'}</h3>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: M.gray500, marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>📅 {appt.appointment_date} at {appt.time_slot}</span>
                    <span>🏷️ Priority: <span style={{ textTransform: 'capitalize' }}>{appt.priority_class}</span></span>
                    {appt.notes && <span>📝 {appt.notes}</span>}
                  </div>
                  {appt.transaction_types?.processing_steps && (
                    <div style={{ padding: '10px 0', borderTop: `1px solid ${M.gray200}`, marginTop: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: M.gray500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Processing Steps</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {appt.transaction_types.processing_steps.map((s, i) => (
                          <span key={i} style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '100px', border: '1px solid #BFDBFE' }}>{i + 1}. {s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {appt.status === 'confirmed' && (
                    <button onClick={() => handleCancel(appt.id)} disabled={cancelling === appt.id}
                      style={{ marginTop: '10px', fontSize: '12px', color: M.maroon, background: 'none', border: `1px solid ${M.maroon}40`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', opacity: cancelling === appt.id ? 0.5 : 1 }}>
                      {cancelling === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}