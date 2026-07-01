import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'
import RescheduleModal from '../../components/RescheduleModal'
import { Inbox, Calendar, Tag, FileText, AlertTriangle, ChevronLeft, Clock, CheckCircle } from 'lucide-react'

const STATUS = {
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  pending: { label: 'Pending', bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  cancelled: { label: 'Cancelled', bg: '#F9F0F1', color: '#7B1A2A', border: '#FECACA' },
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
    <StudentLayout activeTab="appointments" mobileTitle="My Appointments" backTo="/student/dashboard">
      <div className="max-w-[480px] mx-auto py-5 px-4">
        {error && <div className="py-2.5 px-3.5 rounded-lg bg-maroon-light text-maroon text-[13px] mb-4 font-medium">{error}</div>}

        {/* ── Filter Tabs ── */}
        <div className="flex overflow-x-auto gap-1 mb-5 pb-1 hide-scrollbar">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-1.5 px-3 rounded-full border border-solid text-[12px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 font-sans min-h-[36px] ${
                filter === f ? 'bg-maroon text-white border-maroon' : 'bg-white text-text-main border-border'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-border">
                <div className="flex justify-between items-center mb-2.5">
                  <div className="animate-pulse w-[120px] h-[18px] rounded bg-border" />
                  <div className="animate-pulse w-[60px] h-[18px] rounded-full bg-border" />
                </div>
                <div className="animate-pulse w-[160px] h-[14px] rounded bg-border mb-1.5" />
                <div className="animate-pulse w-[100px] h-[14px] rounded bg-border mb-4" />
                <div className="animate-pulse w-full h-8 rounded-lg bg-border" />
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="animate-fade-up text-center py-16 px-8 bg-white rounded-2xl border border-border shadow-sm">
            <div className="text-gold mb-4 flex justify-center"><Inbox size={48} /></div>
            <p className="text-[15px] font-semibold text-text-main m-0 mb-1.5">No appointments found</p>
            <p className="text-[13px] text-text-sub m-0 mb-6">{filter === 'all' ? 'Book your first registrar transaction' : `You have no ${filter} appointments`}</p>
            {filter === 'all' && (
              <button onClick={() => navigate('/student/book')} className="py-3 px-6 rounded-[10px] border-none bg-gold text-maroon text-[14px] font-bold cursor-pointer font-sans shadow-sm transition-transform active:scale-95">Book an Appointment</button>
            )}
          </div>
        ) : (
          <div className="animate-fade-up flex flex-col gap-3">
            {filteredAppointments.map(appt => {
              const s = STATUS[appt.status] || STATUS.pending
              return (
                <div key={appt.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  <div className="flex justify-between items-start mb-2.5">
                    <h3 className="font-serif text-[15px] font-semibold text-text-main m-0">{appt.transaction_types?.name || 'Transaction'}</h3>
                    <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
                  </div>
                  <div className="text-[13px] text-text-sub mb-3 flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5"><Calendar size={13} className="text-gold" /> {appt.appointment_date} at {(() => {
                      const [hStr, mStr] = appt.time_slot.split(':')
                      const h = parseInt(hStr, 10)
                      const suffix = h < 12 ? 'AM' : 'PM'
                      const h12 = h % 12 || 12
                      return `${h12}:${mStr} ${suffix}`
                    })()}</span>
                    <span className="flex items-center gap-1.5"><Tag size={13} className="text-gold" /> Priority: <span className="capitalize ml-1">{appt.priority_class}</span></span>
                    {appt.notes && <span className="flex items-start gap-1.5"><FileText size={13} className="text-gold shrink-0 mt-0.5" /> <span>{appt.notes}</span></span>}
                  </div>
                  {appt.transaction_types?.processing_steps && (
                    <div className="pt-3 pb-1 border-t border-border">
                      <p className="text-[10px] font-bold text-gold m-0 mb-2 uppercase tracking-[0.04em]">Processing Steps</p>
                      <div className="flex flex-wrap gap-1.5">
                        {appt.transaction_types.processing_steps.map((step, i) => (
                          <span key={i} className="text-[11px] bg-surface text-text-sub py-1 px-2.5 rounded-full font-medium">{i + 1}. {step}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(appt.status === 'confirmed' || appt.status === 'pending') && (
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => setReschedulingAppt(appt)} 
                        disabled={cancelling === appt.id || !canReschedule(appt.appointment_date, appt.time_slot)}
                        title={!canReschedule(appt.appointment_date, appt.time_slot) ? "Cannot reschedule within 24 hours of appointment" : ""}
                        className={`flex-1 min-h-[44px] text-[13px] font-semibold text-text-main bg-white border border-border rounded-[10px] font-sans ${(!canReschedule(appt.appointment_date, appt.time_slot) || cancelling === appt.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-off-white'}`}>
                        Reschedule
                      </button>
                      <button 
                        onClick={() => setConfirmCancelId(appt.id)} 
                        disabled={cancelling === appt.id}
                        className={`flex-1 min-h-[44px] text-[13px] font-semibold text-maroon bg-transparent border border-maroon-border rounded-[10px] font-sans ${cancelling === appt.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-maroon-light'}`}>
                        {cancelling === appt.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmCancelId(null)} />
          <div className="animate-fade-up relative w-[90%] max-w-[320px] bg-white rounded-[20px] p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <div className="w-12 h-12 rounded-full bg-maroon-light text-maroon flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-serif text-[18px] font-bold text-text-main m-0 mb-2">Cancel Appointment?</h3>
            <p className="text-[13px] text-text-sub m-0 mb-6 leading-[1.4]">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmCancelId(null)}
                className="flex-1 p-2.5 rounded-[10px] border border-border bg-white text-text-main text-[13px] font-semibold cursor-pointer font-sans hover:bg-off-white"
              >
                Keep It
              </button>
              <button 
                onClick={handleCancelConfirm}
                className="flex-1 p-2.5 rounded-[10px] border-none bg-maroon text-white text-[13px] font-semibold cursor-pointer font-sans hover:bg-maroon-dark"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  )
}
