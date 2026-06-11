import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import BottomNav from '../../components/layout/BottomNav'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'
import RescheduleModal from '../../components/RescheduleModal'
import { Inbox, Calendar, Tag, FileText, AlertTriangle } from 'lucide-react'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray500: '#706B65', text: '#1C1917', white: '#FFFFFF' }

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
  const [filter, setFilter] = useState('all')
  const [reschedulingAppt, setReschedulingAppt] = useState(null)
  const [confirmCancelId, setConfirmCancelId] = useState(null)

  const canReschedule = (apptDateStr, apptTimeStr) => {
    const apptDate = new Date(`${apptDateStr}T${apptTimeStr}:00`)
    const now = new Date()
    const diffHours = (apptDate - now) / (1000 * 60 * 60)
    return diffHours >= 24
  }

  const fetch = async () => {
    try { setAppointments(await getMyAppointments(token)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [token])

  const handleCancelConfirm = async () => {
    if (!confirmCancelId) return
    const id = confirmCancelId
    setConfirmCancelId(null)
    setCancelling(id)
    try { await cancelAppointment(token, id); await fetch() }
    catch (e) { setError(e.message) }
    finally { setCancelling(null) }
  }

  const filteredAppointments = appointments.filter(appt => {
    if (filter === 'all') return true;
    return appt.status === filter;
  }).sort((a, b) => {
    const aEnd = a.status === 'completed' || a.status === 'cancelled';
    const bEnd = b.status === 'completed' || b.status === 'cancelled';
    if (aEnd && !bEnd) return 1;
    if (!aEnd && bEnd) return -1;
    
    const dateCmp = (a.appointment_date || '').localeCompare(b.appointment_date || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.time_slot || '').localeCompare(b.time_slot || '');
  });

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif", paddingBottom: '88px' }}>
      
      {/* ── Top Header ── */}
      <header style={{
        background: `linear-gradient(135deg, ${M.maroon} 0%, #5C1320 100%)`,
        padding: '20px 16px',
        color: M.white,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(123,26,42,0.2)',
      }}>
        <button onClick={() => navigate('/student/dashboard')} style={{
          background: 'none', border: 'none', color: M.white, fontSize: '24px', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, margin: 0 }}>
          My Appointments
        </h1>
      </header>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
        {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}

        {/* ── Filter Tabs ── */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', marginBottom: '20px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                border: `1px solid ${filter === f ? M.maroon : M.gray200}`,
                background: filter === f ? M.maroon : M.white,
                color: filter === f ? M.white : M.text,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontFamily: "'IBM Plex Sans', sans-serif",
                minHeight: '44px',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: M.white, borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div className="animate-shimmer" style={{ width: '120px', height: '18px', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ width: '60px', height: '18px', borderRadius: '100px' }} />
                </div>
                <div className="animate-shimmer" style={{ width: '160px', height: '14px', borderRadius: '4px', marginBottom: '6px' }} />
                <div className="animate-shimmer" style={{ width: '100px', height: '14px', borderRadius: '4px', marginBottom: '16px' }} />
                <div className="animate-shimmer" style={{ width: '100%', height: '32px', borderRadius: '8px' }} />
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="animate-fade-up" style={{ textAlign: 'center', padding: '4rem 2rem', background: M.white, borderRadius: '16px', border: `1px solid ${M.gray200}` }}>
            <div style={{ color: M.gold, marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Inbox size={48} /></div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No appointments found</p>
            <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.5rem' }}>{filter === 'all' ? 'Book your first registrar transaction' : `You have no ${filter} appointments`}</p>
            {filter === 'all' && (
              <button onClick={() => navigate('/student/book')} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: M.gold, color: M.maroon, fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>Book an Appointment</button>
            )}
          </div>
        ) : (
          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAppointments.map(appt => {
              const s = STATUS[appt.status] || STATUS.pending
              return (
                <div key={appt.id} style={{ background: M.white, borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: 0, fontFamily: "'Fraunces', serif" }}>{appt.transaction_types?.name || 'Transaction'}</h3>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: M.gray500, marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color={M.gold} /> {appt.appointment_date} at {(() => {
                      const [hStr, mStr] = appt.time_slot.split(':')
                      const h = parseInt(hStr, 10)
                      const suffix = h < 12 ? 'AM' : 'PM'
                      const h12 = h % 12 || 12
                      return `${h12}:${mStr} ${suffix}`
                    })()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={13} color={M.gold} /> Priority: <span style={{ textTransform: 'capitalize', marginLeft: '4px' }}>{appt.priority_class}</span></span>
                    {appt.notes && <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}><FileText size={13} color={M.gold} style={{ flexShrink: 0, marginTop: '2px' }} /> <span>{appt.notes}</span></span>}
                  </div>
                  {appt.transaction_types?.processing_steps && (
                    <div style={{ padding: '12px 0 4px', borderTop: `1px solid ${M.gray200}` }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: M.gold, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Processing Steps</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {appt.transaction_types.processing_steps.map((step, i) => (
                          <span key={i} style={{ fontSize: '11px', background: '#F2EDE8', color: M.textSub, padding: '4px 10px', borderRadius: '100px', fontWeight: 500 }}>{i + 1}. {step}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(appt.status === 'confirmed' || appt.status === 'pending') && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button 
                        onClick={() => setReschedulingAppt(appt)} 
                        disabled={cancelling === appt.id || !canReschedule(appt.appointment_date, appt.time_slot)}
                        title={!canReschedule(appt.appointment_date, appt.time_slot) ? "Cannot reschedule within 24 hours of appointment" : ""}
                        style={{ flex: 1, minHeight: '44px', fontSize: '13px', fontWeight: 600, color: M.text, background: M.white, border: `1px solid ${M.gray200}`, borderRadius: '10px', cursor: !canReschedule(appt.appointment_date, appt.time_slot) ? 'not-allowed' : 'pointer', opacity: (!canReschedule(appt.appointment_date, appt.time_slot) || cancelling === appt.id) ? 0.5 : 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        Reschedule
                      </button>
                      <button 
                        onClick={() => setConfirmCancelId(appt.id)} 
                        disabled={cancelling === appt.id}
                        style={{ flex: 1, minHeight: '44px', fontSize: '13px', fontWeight: 600, color: M.maroon, background: 'transparent', border: `1px solid ${M.maroonBorder || 'rgba(123,26,42,0.2)'}`, borderRadius: '10px', cursor: 'pointer', opacity: cancelling === appt.id ? 0.5 : 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {cancelling === appt.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <BottomNav active="appointments" />

      {reschedulingAppt && (
        <RescheduleModal 
          token={token}
          appointment={reschedulingAppt}
          onClose={() => setReschedulingAppt(null)}
          onSuccess={() => {
            setReschedulingAppt(null)
            fetch()
          }}
        />
      )}

      {confirmCancelId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmCancelId(null)} />
          <div className="animate-fade-up" style={{ position: 'relative', width: '90%', maxWidth: '320px', background: M.white, borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: M.maroonLight, color: M.maroon, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: '0 0 8px' }}>Cancel Appointment?</h3>
            <p style={{ fontSize: '13px', color: M.textSub, margin: '0 0 24px', lineHeight: 1.4 }}>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setConfirmCancelId(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${M.gray200}`, background: M.white, color: M.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                Keep It
              </button>
              <button 
                onClick={handleCancelConfirm}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}