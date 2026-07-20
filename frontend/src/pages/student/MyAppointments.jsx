import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyAppointments, cancelAppointment, clearCancelledAppointments } from '../../services/appointmentService'
import RescheduleModal from '../../components/RescheduleModal'
import { Inbox, Calendar, Tag, FileText, AlertTriangle, ChevronLeft, ChevronRight, Clock, CheckCircle, Filter, ChevronDown, Trash2 } from 'lucide-react'

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
  const [selectedAppt, setSelectedAppt] = useState(null)

  const fmt12h = (t) => {
    if (!t) return ''
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [reschedulingAppt, setReschedulingAppt] = useState(null)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [visibleCount, setVisibleCount] = useState(4)

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

  // Sync selectedAppt when appointments data changes (e.g. after cancellation)
  useEffect(() => {
    if (selectedAppt) {
      const fresh = appointments.find(a => a.id === selectedAppt.id)
      if (fresh && fresh.status !== selectedAppt.status) {
        setSelectedAppt(fresh)
      } else if (!fresh) {
        setSelectedAppt(null)
      }
    }
  }, [appointments])

  const handleCancelConfirm = async () => {
    if (!confirmCancelId) return
    const id = confirmCancelId
    setConfirmCancelId(null)
    setCancelling(id)
    try { await cancelAppointment(token, id); await fetch(); setSuccessMsg('Appointment cancelled successfully.') }
    catch (e) { setError(e.message) }
    finally { setCancelling(null); setTimeout(() => setSuccessMsg(''), 4000) }
  }

  const handleClearCancelled = async () => {
    setClearingAll(true)
    try { 
      await clearCancelledAppointments(token)
      await fetch()
      setShowClearConfirm(false)
      setSuccessMsg('All cancelled appointments have been cleared.')
    }
    catch (e) { setError(e.message) }
    finally { setClearingAll(false); setTimeout(() => setSuccessMsg(''), 4000) }
  }

  const filteredAppointments = appointments.filter(appt => {
    if (filter === 'all') return true;
    return appt.status === filter;
  }).sort((a, b) => {
    const aEnd = a.status === 'completed' || a.status === 'cancelled';
    const bEnd = b.status === 'completed' || b.status === 'cancelled';
    
    // Separate active from ended appointments
    if (aEnd && !bEnd) return 1;
    if (!aEnd && bEnd) return -1;
    
    // If both are ended, sort descending (newest first)
    if (aEnd && bEnd) {
      const dateCmp = (b.appointment_date || '').localeCompare(a.appointment_date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.time_slot || '').localeCompare(a.time_slot || '');
    }
    
    // If both are active, sort ascending (oldest/soonest first)
    const dateCmp = (a.appointment_date || '').localeCompare(b.appointment_date || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.time_slot || '').localeCompare(b.time_slot || '');
  });

  return (
    <StudentLayout activeTab="appointments" mobileTitle="My Appointments" backTo="/student/dashboard">
      <div className="w-full max-w-120 mx-auto py-5 px-4 md:max-w-262.5 md:mx-0 md:py-0 md:px-0">
        <div className="hidden md:flex justify-between items-start mb-8">
          <div>
            <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">APPOINTMENTS</div>
            <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
              <Calendar className="text-maroon" size={24} /> My Appointments
            </h1>
            <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
              View and manage your scheduled appointments.
            </p>
          </div>
          <div className="text-[13px] text-text-sub font-medium flex items-center gap-2 mt-2">
            <Link to="/student/dashboard" className="text-maroon hover:underline cursor-pointer">Home</Link>
            <span className="text-border-strong">›</span>
            <span>My Appointments</span>
          </div>
        </div>

        {error && <div className="py-2.5 px-3.5 rounded-lg bg-maroon-light text-maroon text-[13px] mb-4 font-medium">{error}</div>}

        <div className="md:flex md:gap-8 md:items-start">
          
          {/* ── Confirmation Modal for Clear All Cancelled ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-90 shadow-xl animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-maroon-light flex items-center justify-center mb-4 text-maroon mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="font-serif text-[20px] font-bold text-text-main m-0 mb-2 text-center">Clear Cancelled?</h3>
            <p className="text-[13px] text-text-sub m-0 mb-6 text-center leading-relaxed">
              Are you sure you want to remove all cancelled appointments from your history? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearingAll}
                className="flex-1 py-2.5 px-4 rounded-[10px] bg-white border border-border text-text-main text-[13px] font-bold cursor-pointer hover:bg-off-white transition-colors"
              >
                Keep Them
              </button>
              <button
                onClick={handleClearCancelled}
                disabled={clearingAll}
                className="flex-1 py-2.5 px-4 rounded-[10px] bg-maroon border-none text-white text-[13px] font-bold cursor-pointer hover:bg-maroon-dark transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {clearingAll ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Single Cancel ── */}
          <div className="md:w-105 shrink-0">
            {successMsg && <div className="py-2.5 px-3.5 rounded-lg bg-success-light text-success border border-success-border text-[13px] mb-4 font-medium animate-fade-in">{successMsg}</div>}

            {/* ── Filter Dropdown & Clear Button ── */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative inline-block w-full sm:max-w-55">
                  <select 
                    value={filter}
                    onChange={(e) => { setFilter(e.target.value); setSelectedAppt(null); }}
                    className="appearance-none w-full bg-white border-[1.5px] border-border text-text-main text-[13.5px] font-bold py-2.5 pl-10 pr-8 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] outline-none focus:border-maroon focus:ring-4 focus:ring-maroon/10 cursor-pointer hover:border-text-sub transition-all font-sans"
                  >
                    <option value="all">All Appointments</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Filter size={16} className="text-gold" />
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <ChevronDown size={16} className="text-text-sub" />
                  </div>
                </div>
                
                {appointments.some(a => a.status === 'cancelled') && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-text-sub text-[12px] font-bold cursor-pointer hover:border-maroon hover:text-maroon transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    title="Clear all cancelled appointments"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
              <div className="text-[12px] font-medium text-text-sub whitespace-nowrap">
                {filteredAppointments.length} {filteredAppointments.length === 1 ? 'result' : 'results'}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-border">
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="animate-pulse w-30 h-4.5 rounded bg-border" />
                      <div className="animate-pulse w-15 h-4.5 rounded-full bg-border" />
                    </div>
                    <div className="animate-pulse w-40 h-3.5 rounded bg-border mb-1.5" />
                    <div className="animate-pulse w-25 h-3.5 rounded bg-border mb-4" />
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
                  <button onClick={() => navigate('/student/book')} className="py-3 px-6 rounded-[10px] border-none bg-maroon text-white text-[14px] font-bold cursor-pointer font-sans shadow-sm transition-transform active:scale-95">Book an Appointment</button>
                )}
              </div>
            ) : (
              <div className="animate-fade-up flex flex-col gap-3">
                {filteredAppointments.slice(0, visibleCount).map(appt => {
                  const s = STATUS[appt.status] || STATUS.pending
                  const isSelected = selectedAppt?.id === appt.id
                  return (
                    <div 
                      key={appt.id} 
                      onClick={() => setSelectedAppt(appt)}
                      className={`group bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${isSelected ? 'md:ring-2 md:ring-maroon md:shadow-[0_4px_12px_rgba(123,26,42,0.15)]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2.5">
                        <h3 className="font-serif text-[15px] font-semibold text-text-main m-0">{appt.transaction_types?.name || 'Transaction'}</h3>
                        <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
                      </div>
                      <div className="text-[13px] text-text-sub flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-gold" /> {appt.appointment_date} at {fmt12h(appt.time_slot)}</span>
                        <span className="flex items-center gap-1.5"><Tag size={13} className="text-gold" /> Priority: <span className="capitalize ml-1">{appt.priority_class}</span></span>
                        {appt.notes && <span className="flex items-start gap-1.5"><FileText size={13} className="text-gold shrink-0 mt-0.5" /> <span className="truncate">{appt.notes}</span></span>}
                      </div>
                      
                      {/* MOBILE ONLY Details & Actions */}
                      <div className="md:hidden">
                        {appt.transaction_types?.required_documents?.length > 0 && (
                          <div className="pt-3 pb-1 border-t border-border mt-3">
                            <p className="text-[10px] font-bold text-maroon m-0 mb-2 uppercase tracking-[0.04em]">Bring These Documents</p>
                            <div className="flex flex-wrap gap-1.5">
                              {appt.transaction_types.required_documents.map((doc, i) => (
                                <span key={i} className="text-[11px] bg-maroon-light text-maroon py-1 px-2.5 rounded-full font-medium">{doc}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {appt.transaction_types?.processing_steps && (
                          <div className="pt-3 pb-1 border-t border-border mt-3">
                            <p className="text-[10px] font-bold text-gold m-0 mb-2 uppercase tracking-[0.04em]">Processing Steps</p>
                            <div className="flex flex-wrap gap-1.5">
                              {appt.transaction_types.processing_steps.map((step, i) => (
                                <span key={i} className="text-[11px] bg-surface text-text-sub py-1 px-2.5 rounded-full font-medium">{i + 1}. {typeof step === 'object' ? step.name : step}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(appt.status === 'confirmed' || appt.status === 'pending') && (
                          <div className="flex gap-2 mt-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setReschedulingAppt(appt) }} 
                              disabled={cancelling === appt.id || !canReschedule(appt.appointment_date, appt.time_slot)}
                              className={`flex-1 min-h-11 text-[13px] font-semibold text-text-main bg-white border border-border rounded-[10px] font-sans ${(!canReschedule(appt.appointment_date, appt.time_slot) || cancelling === appt.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-off-white'}`}>
                              Reschedule
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmCancelId(appt.id) }} 
                              disabled={cancelling === appt.id}
                              className={`flex-1 min-h-11 text-[13px] font-semibold text-maroon bg-transparent border border-maroon-border rounded-[10px] font-sans ${cancelling === appt.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-maroon-light'}`}>
                              {cancelling === appt.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* DESKTOP ONLY View Details Indicator */}
                      <div className="hidden md:flex justify-end mt-3 pt-3 border-t border-border border-dashed">
                        <span className="text-[12px] font-bold text-maroon flex items-center gap-1 transition-transform group-hover:translate-x-1">
                          {isSelected ? 'Viewing Details' : 'View Details'} <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  )
                })}
                
                {/* ── Limit Indicator & Load More ── */}
                {filteredAppointments.length > 0 && (
                  <div className="flex items-center justify-end gap-4 mt-2">
                    <span className="text-[11px] font-bold text-text-muted tracking-wide uppercase">
                      Showing {Math.min(visibleCount, filteredAppointments.length)} out of {filteredAppointments.length}
                    </span>
                    {filteredAppointments.length > visibleCount && (
                      <button 
                        onClick={() => setVisibleCount(prev => prev + 4)}
                        className="text-[12px] font-bold text-maroon hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Load More
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Column: Details (Desktop Only) ── */}
          <div className="hidden md:flex flex-col flex-1 bg-white border border-border rounded-3xl p-8 shadow-sm sticky top-24 min-h-100">
            {selectedAppt ? (
              <div className="animate-fade-up flex flex-col h-full">
                <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2">TRANSACTION</p>
                    <h2 className="font-serif text-[22px] font-bold text-text-main m-0 mb-2">{selectedAppt.transaction_types?.name || 'Transaction'}</h2>
                    <span className="text-[11px] font-semibold py-1.5 px-3 rounded-full inline-flex items-center" style={{ background: STATUS[selectedAppt.status]?.bg || STATUS.pending.bg, color: STATUS[selectedAppt.status]?.color || STATUS.pending.color, border: `1px solid ${STATUS[selectedAppt.status]?.border || STATUS.pending.border}` }}>
                      {STATUS[selectedAppt.status]?.label || 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-border">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3">SCHEDULE</p>
                    <div className="flex flex-col gap-2.5 text-[14px] text-text-main font-medium">
                      <span className="flex items-center gap-2.5"><Calendar size={15} className="text-gold" /> {selectedAppt.appointment_date}</span>
                      <span className="flex items-center gap-2.5"><Clock size={15} className="text-gold" /> {fmt12h(selectedAppt.time_slot)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3">DETAILS</p>
                    <div className="flex flex-col gap-2.5 text-[14px] text-text-main font-medium">
                      <span className="flex items-center gap-2.5"><Tag size={15} className="text-gold" /> Priority: <span className="capitalize">{selectedAppt.priority_class}</span></span>
                      {selectedAppt.notes && <span className="flex items-start gap-2.5"><FileText size={15} className="text-gold shrink-0 mt-0.5" /> <span className="whitespace-pre-wrap leading-relaxed">{selectedAppt.notes}</span></span>}
                    </div>
                  </div>
                </div>

                {selectedAppt.transaction_types?.required_documents?.length > 0 && (
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3">REQUIRED DOCUMENTS TO BRING</p>
                    <div className="flex flex-col gap-2">
                      {selectedAppt.transaction_types.required_documents.map((doc, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-[14px] text-text-main">
                          <div className="w-4.5 h-4.5 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                          {doc}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAppt.transaction_types?.processing_steps && (
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3">PROCESSING STEPS</p>
                    <div className="flex flex-col gap-3">
                      {selectedAppt.transaction_types.processing_steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-3 text-[14px] font-medium text-text-main">
                          <div className="w-6 h-6 rounded-full bg-off-white border border-border flex items-center justify-center text-[11px] font-bold text-text-sub shrink-0">{i + 1}</div>
                          <span>{typeof step === 'object' ? step.name : step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'pending') && (
                  <div className="flex gap-3 mt-auto pt-6">
                    <button 
                      onClick={() => setReschedulingAppt(selectedAppt)} 
                      disabled={cancelling === selectedAppt.id || !canReschedule(selectedAppt.appointment_date, selectedAppt.time_slot)}
                      className={`flex-1 py-3 px-4 text-[13px] font-bold text-text-main bg-white border-[1.5px] border-border rounded-[10px] font-sans transition-colors ${(!canReschedule(selectedAppt.appointment_date, selectedAppt.time_slot) || cancelling === selectedAppt.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-off-white'}`}>
                      Reschedule
                    </button>
                    <button 
                      onClick={() => setConfirmCancelId(selectedAppt.id)} 
                      disabled={cancelling === selectedAppt.id}
                      className={`flex-1 py-3 px-4 text-[13px] font-bold text-maroon bg-transparent border-[1.5px] border-maroon-border rounded-[10px] font-sans transition-colors ${cancelling === selectedAppt.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-maroon-light'}`}>
                      {cancelling === selectedAppt.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted animate-fade-up">
                <FileText size={48} className="mb-4 text-border-strong" />
                <p className="text-[16px] font-bold text-text-main m-0 mb-1.5 font-serif">No appointment selected</p>
                <p className="text-[13px] m-0">Click an appointment from the list to view its full details.</p>
              </div>
            )}
          </div>
        </div>
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
        <div className="fixed inset-0 z-100 flex items-center justify-center">
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
