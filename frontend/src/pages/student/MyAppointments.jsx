import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyAppointments, cancelAppointment, clearCancelledAppointments } from '../../services/appointmentService'
import RescheduleModal from '../../components/RescheduleModal'
import { 
  Inbox, Calendar, Tag, FileText, AlertTriangle, ChevronLeft, ChevronRight, 
  Clock, CheckCircle, Filter, ChevronDown, Trash2, FileCheck, MapPin, 
  Building2, ShieldCheck, ArrowRight, PlusCircle, Sparkles, CheckCircle2, Zap, Info 
} from 'lucide-react'

const CustomDropdown = ({ value, onChange, options, icon }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className="relative inline-block w-full sm:max-w-55 z-20 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2.5 pl-10 pr-3.5 rounded-xl border-[1.5px] border-border bg-white text-[13.5px] text-text-main font-bold outline-none cursor-pointer font-sans hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          {icon}
        </div>
        <span className="truncate pr-2">{currentLabel}</span>
        <ChevronDown size={16} className={`text-text-sub transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : 'group-hover:text-text-main'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-[110%] bg-white rounded-xl border border-border shadow-lg p-2 z-50 animate-fade-up max-h-75 overflow-y-auto" style={{ animationDuration: '0.2s' }}>
            {options.map(o => {
              const isActive = value === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon' : 'text-text-main hover:bg-off-white'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                    </div>
                    <span className="text-[13px] font-semibold whitespace-nowrap">{o.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const STATUS = {
  ready_for_pickup: { label: 'Ready for Pickup', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  pending: { label: 'Pending', bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  cancelled: { label: 'Cancelled', bg: '#F9F0F1', color: '#7B1A2A', border: '#FECACA' },
  completed: { label: 'Completed', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  no_show: { label: 'No Show', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
}

export const isAppointmentToday = (dateStr) => {
  if (!dateStr) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const localToday = `${y}-${m}-${d}`;
  return dateStr === localToday;
};

export const isReadyForPickup = (appt) => {
  if (!appt) return false;
  if (appt.status === 'completed' || appt.status === 'cancelled') return false;
  if (appt.release_date) return true;
  const tickets = Array.isArray(appt.queue_tickets) ? appt.queue_tickets : (appt.queue_tickets ? [appt.queue_tickets] : []);
  return tickets.some(qt => {
    if (qt.status === 'completed') return false;
    return qt.current_step && qt.total_steps && qt.current_step >= qt.total_steps;
  });
};

export const getEffectiveStatus = (appt) => {
  if (!appt) return 'pending';
  if (appt.status === 'cancelled') return 'cancelled';
  if (appt.status === 'completed') return 'completed';
  if (isReadyForPickup(appt)) return 'ready_for_pickup';
  return appt.status || 'pending';
};

export default function MyAppointments() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [selectedApptId, setSelectedApptId] = useState(null)
  
  const selectedAppt = useMemo(() => {
    return appointments.find(a => a.id === selectedApptId) || null
  }, [appointments, selectedApptId])

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
    if (!apptDateStr || !apptTimeStr) return false;
    const [year, month, day] = apptDateStr.split('-').map(Number);
    const [hour, min] = apptTimeStr.split(':').map(Number);
    const apptDate = new Date(year, month - 1, day, hour, min);
    const now = new Date();
    const diffHours = (apptDate - now) / (1000 * 60 * 60);
    return diffHours >= 24;
  }

  const fetch = useCallback(async () => {
    try { 
      const data = await getMyAppointments(token)
      setAppointments(data || [])
      if (data && data.length > 0 && !selectedApptId) {
        setSelectedApptId(data[0].id)
      }
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token, selectedApptId])
  
  useEffect(() => { fetch() }, [fetch])

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

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const effStatus = getEffectiveStatus(appt);
      if (filter === 'all') return true;
      if (filter === 'ready_for_pickup') return effStatus === 'ready_for_pickup';
      if (filter === 'confirmed') return effStatus === 'confirmed';
      return appt.status === filter;
    }).sort((a, b) => {
      const aEff = getEffectiveStatus(a);
      const bEff = getEffectiveStatus(b);
      const aEnd = a.status === 'completed' || a.status === 'cancelled';
      const bEnd = b.status === 'completed' || b.status === 'cancelled';
      
      // Separate active/pending from ended appointments
      if (aEnd && !bEnd) return 1;
      if (!aEnd && bEnd) return -1;

      // Prioritize ready_for_pickup at the top of active appointments
      if (aEff === 'ready_for_pickup' && bEff !== 'ready_for_pickup') return -1;
      if (aEff !== 'ready_for_pickup' && bEff === 'ready_for_pickup') return 1;
      
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
  }, [appointments, filter]);

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
              View and manage your scheduled appointments, claim stubs, and collection history.
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
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

          {/* ── Left Column: Appointment Cards ── */}
          <div className="md:w-105 shrink-0">
            {successMsg && <div className="py-2.5 px-3.5 rounded-lg bg-success-light text-success border border-success-border text-[13px] mb-4 font-medium animate-fade-in">{successMsg}</div>}

            {/* ── Filter Dropdown & Clear Button ── */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <CustomDropdown 
                  value={filter}
                  onChange={(val) => { setFilter(val); }}
                  icon={<Filter size={16} className="text-gold" />}
                  options={[
                    { value: 'all', label: 'All Appointments' },
                    { value: 'ready_for_pickup', label: 'Pending Pickup' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                />
                
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
                <p className="text-[13px] text-text-sub m-0 mb-6">{filter === 'all' ? 'Book your first registrar transaction' : `You have no ${filter === 'ready_for_pickup' ? 'pending pickup' : filter} appointments`}</p>
                {filter === 'all' && (
                  <button onClick={() => navigate('/student/book')} className="py-3 px-6 rounded-[10px] border-none bg-maroon text-white text-[14px] font-bold cursor-pointer font-sans shadow-sm transition-transform active:scale-95">Book an Appointment</button>
                )}
              </div>
            ) : (
              <div className="animate-fade-up flex flex-col gap-3">
                {filteredAppointments.slice(0, visibleCount).map(appt => {
                  const effStatus = getEffectiveStatus(appt)
                  const s = STATUS[effStatus] || STATUS.pending
                  const isReady = effStatus === 'ready_for_pickup'
                  const isCompleted = effStatus === 'completed'
                  const isSelected = selectedAppt?.id === appt.id
                  return (
                    <div 
                      key={appt.id} 
                      onClick={() => setSelectedApptId(appt.id)}
                      className={`group bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${isSelected ? 'md:ring-2 md:ring-maroon md:shadow-[0_4px_12px_rgba(123,26,42,0.15)]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2.5">
                        <h3 className="font-serif text-[15px] font-semibold text-text-main m-0">{appt.transaction_types?.name || 'Transaction'}</h3>
                        <span className="text-[11px] font-bold py-1 px-2.5 rounded-full whitespace-nowrap flex items-center gap-1" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {isReady ? <FileCheck size={12} /> : isCompleted ? <CheckCircle size={12} /> : null} {s.label}
                        </span>
                      </div>
                      <div className="text-[13px] text-text-sub flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-gold" /> {appt.appointment_date} at {fmt12h(appt.time_slot)}</span>
                        <span className="flex items-center gap-1.5"><Tag size={13} className="text-gold" /> Priority: <span className="capitalize ml-1">{appt.priority_class}</span></span>
                        {appt.notes && <span className="flex items-start gap-1.5"><FileText size={13} className="text-gold shrink-0 mt-0.5" /> <span className="truncate">{appt.notes}</span></span>}
                      </div>
                      
                      {/* MOBILE ONLY Details & Actions */}
                      <div className="md:hidden">
                        {isReady ? (
                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="bg-success-light/60 border border-success-border rounded-xl p-3 mb-3 text-[12px] text-success">
                              <p className="font-bold m-0 mb-1 flex items-center gap-1.5"><Building2 size={13} /> Pickup at Registrar's Office</p>
                              <p className="m-0 text-text-sub text-[11.5px]">Please present your Digital Claim Stub at the window to claim.</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate('/student/queue?tab=active') }} 
                              className="w-full min-h-11 text-[13px] font-bold text-white bg-success border-none rounded-[10px] font-sans cursor-pointer hover:bg-success-dark transition-colors flex items-center justify-center gap-2 shadow-xs"
                            >
                              <FileCheck size={16} /> View Digital Claim Stub
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-[12px] text-blue-800 flex items-center gap-2">
                              <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                              <span>Official document released and claimed.</span>
                            </div>
                          </div>
                        ) : (
                          <>
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
                          </>
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
          <div className="hidden md:flex flex-col flex-1 bg-white border border-border rounded-3xl p-8 shadow-sm sticky top-24 min-h-115">
            {selectedAppt ? (
              <div className="animate-fade-up flex flex-col h-full">
                {(() => {
                  const selEff = getEffectiveStatus(selectedAppt)
                  const selStatusObj = STATUS[selEff] || STATUS.pending
                  const isSelReady = selEff === 'ready_for_pickup'
                  const isSelCompleted = selEff === 'completed'
                  const isSelCancelled = selEff === 'cancelled'

                  return (
                    <>
                      {/* Top Header */}
                      <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
                        <div>
                          <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-1.5">TRANSACTION OVERVIEW</p>
                          <h2 className="font-serif text-[22px] font-bold text-text-main m-0 mb-2">{selectedAppt.transaction_types?.name || 'Transaction'}</h2>
                          <span className="text-[11.5px] font-bold py-1.5 px-3 rounded-full inline-flex items-center gap-1.5" style={{ background: selStatusObj.bg, color: selStatusObj.color, border: `1px solid ${selStatusObj.border}` }}>
                            {isSelReady ? <FileCheck size={13} /> : isSelCompleted ? <CheckCircle size={13} /> : null} {selStatusObj.label}
                          </span>
                        </div>
                      </div>

                      {/* ── CASE 1: READY FOR PICKUP VIEW ── */}
                      {isSelReady ? (
                        <div className="flex flex-col flex-1">
                          {/* Ready Notice Banner */}
                          <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-success text-white flex items-center justify-center shrink-0 shadow-sm">
                                <FileCheck size={22} />
                              </div>
                              <div>
                                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Document Ready for Collection</h4>
                                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                                  Your requested official document is verified, printed, sealed, and ready for claiming at the Registrar's Office.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Pickup Location & Hours */}
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                                <MapPin size={12} className="text-maroon" /> PICKUP LOCATION
                              </p>
                              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Registrar's Office</p>
                              <p className="text-[12px] text-text-sub m-0">Window 1 / Releasing Counter</p>
                            </div>
                            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                                <Clock size={12} className="text-gold" /> OFFICE HOURS
                              </p>
                              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Mon – Fri (8:00 AM – 5:00 PM)</p>
                              <p className="text-[12px] text-text-sub m-0">Excluding official holidays</p>
                            </div>
                          </div>

                          {/* Requirements Checklist */}
                          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
                              <ShieldCheck size={12} className="text-success" /> WHAT TO PRESENT UPON CLAIMING
                            </p>
                            <div className="flex flex-col gap-2 text-[13px] text-text-main">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-success-light text-success flex items-center justify-center text-[10px] font-bold">✓</div>
                                <span>Digital Claim Stub / Active Queue Number on this app</span>
                              </div>
                            </div>
                          </div>

                          {/* Request Metadata */}
                          <div className="grid grid-cols-2 gap-4 text-[13px] text-text-sub mb-6 border-t border-border pt-4">
                            <div>
                              <span className="font-semibold text-text-muted text-[11px] uppercase tracking-wider block mb-1">Appointment Schedule</span>
                              <span className="font-bold text-text-main">{selectedAppt.appointment_date} at {fmt12h(selectedAppt.time_slot)}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-text-muted text-[11px] uppercase tracking-wider block mb-1">Recorded Purpose</span>
                              <span className="font-bold text-text-main">{selectedAppt.notes || 'Official Document Request'}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="mt-auto pt-4">
                            <button 
                              onClick={() => navigate('/student/queue?tab=active')} 
                              className="w-full py-3.5 px-4 text-[14px] font-bold text-white bg-success border-none rounded-xl font-sans flex items-center justify-center gap-2 cursor-pointer hover:bg-success-dark transition-all shadow-sm hover:-translate-y-0.5"
                            >
                              <FileCheck size={18} /> View Digital Claim Stub
                            </button>
                          </div>
                        </div>
                      ) : isSelCompleted ? (
                        /* ── CASE 2: COMPLETED VIEW ── */
                        <div className="flex flex-col flex-1">
                          {/* Completed Hero Card */}
                          <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <CheckCircle size={22} />
                              </div>
                              <div>
                                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Document Officially Released</h4>
                                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                                  This document was verified, claimed, and released by the Registrar's Office. The transaction is marked complete.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Release Summary Record */}
                          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3.5 flex items-center gap-1.5">
                              <Building2 size={12} className="text-maroon" /> TRANSACTION SUMMARY
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-[13px]">
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">DOCUMENT</span>
                                <span className="font-bold text-text-main">{selectedAppt.transaction_types?.name}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">APPOINTMENT DATE</span>
                                <span className="font-bold text-text-main">{selectedAppt.appointment_date}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">PRIORITY CLASSIFICATION</span>
                                <span className="font-bold text-text-main capitalize">{selectedAppt.priority_class}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">STATUS</span>
                                <span className="font-bold text-blue-700">Official Release Completed</span>
                              </div>
                            </div>
                            {selectedAppt.notes && (
                              <div className="mt-4 pt-3.5 border-t border-border text-[12.5px]">
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">PURPOSE / REMARKS</span>
                                <span className="text-text-main font-medium">{selectedAppt.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Helpful Advisory */}
                          <div className="p-4.5 rounded-2xl bg-white border border-border text-[12.5px] text-text-sub leading-relaxed mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <p className="font-bold text-text-main m-0 mb-1 flex items-center gap-1.5"><Sparkles size={14} className="text-gold" /> Need another document copy?</p>
                            Please keep your physical document secure. If you require additional official certifications or records, you can submit a new appointment request anytime.
                          </div>

                          {/* Action Button */}
                          <div className="mt-auto pt-4">
                            <button 
                              onClick={() => navigate('/student/book')} 
                              className="w-full py-3.5 px-4 text-[13.5px] font-bold text-maroon bg-maroon-light border border-maroon-border rounded-xl font-sans flex items-center justify-center gap-2 cursor-pointer hover:bg-maroon hover:text-white transition-all shadow-xs"
                            >
                              <PlusCircle size={16} /> Request Another Document
                            </button>
                          </div>
                        </div>
                      ) : isSelCancelled ? (
                        /* ── CASE 3: CANCELLED VIEW ── */
                        <div className="flex flex-col flex-1">
                          <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-maroon text-white flex items-center justify-center shrink-0 shadow-sm">
                                <AlertTriangle size={22} />
                              </div>
                              <div>
                                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Appointment Cancelled</h4>
                                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                                  This appointment slot was cancelled. You may schedule a new appointment whenever you are ready.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
                              <Building2 size={12} className="text-maroon" /> CANCELLED BOOKING RECORD
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-[13px]">
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Transaction</span>
                                <span className="font-bold text-text-main">{selectedAppt.transaction_types?.name}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Original Date</span>
                                <span className="font-bold text-text-main">{selectedAppt.appointment_date} ({fmt12h(selectedAppt.time_slot)})</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto pt-4">
                            <button 
                              onClick={() => navigate('/student/book')} 
                              className="w-full py-3.5 px-4 text-[13.5px] font-bold text-white bg-maroon border-none rounded-xl font-sans flex items-center justify-center gap-2 cursor-pointer hover:bg-maroon-dark transition-all shadow-xs"
                            >
                              <PlusCircle size={16} /> Book New Appointment
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── CASE 4: CONFIRMED / SCHEDULED APPOINTMENT VIEW ── */
                        <div className="flex flex-col flex-1">
                          {/* Hero Status Card: Today vs Upcoming */}
                          {isAppointmentToday(selectedAppt.appointment_date) ? (
                            <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                              <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center shrink-0 shadow-sm">
                                  <Zap size={22} className="text-white fill-white" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Appointment is Today!</h4>
                                  <p className="text-[12.5px] text-text-sub m-0 leading-relaxed mb-3">
                                    When you arrive at the Registrar's Office, activate your ticket on the <strong className="text-maroon font-semibold">My Queue</strong> tab to enter the live waiting line.
                                  </p>
                                  <button
                                    onClick={() => navigate('/student/queue')}
                                    className="py-2 px-3.5 text-[12px] font-bold text-white bg-maroon border-none rounded-lg font-sans inline-flex items-center gap-1.5 cursor-pointer hover:bg-maroon-dark transition-colors shadow-2xs"
                                  >
                                    <Zap size={14} className="fill-white" /> Go to Live Queue
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                              <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-success text-white flex items-center justify-center shrink-0 shadow-sm">
                                  <Calendar size={22} />
                                </div>
                                <div>
                                  <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Appointment Confirmed & Reserved</h4>
                                  <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                                    Your appointment slot is reserved. Please review the checklist below and bring all required items on your scheduled day.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Schedule & Campus Location Grid */}
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                                <Calendar size={12} className="text-gold" /> SCHEDULED DATE & TIME
                              </p>
                              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">{selectedAppt.appointment_date}</p>
                              <p className="text-[12px] text-text-sub m-0">{fmt12h(selectedAppt.time_slot)}</p>
                            </div>
                            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                                <MapPin size={12} className="text-maroon" /> LOCATION & COUNTER
                              </p>
                              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Registrar's Office</p>
                              <p className="text-[12px] text-text-sub m-0">Service Windows 1 – 4</p>
                            </div>
                          </div>

                          {/* Transaction Details & Priority */}
                          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5 flex items-center gap-1.5">
                              <Tag size={12} className="text-gold" /> APPOINTMENT DETAILS
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-[13px]">
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Priority Lane</span>
                                <span className="font-bold text-text-main capitalize">{selectedAppt.priority_class || 'Regular'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Stated Purpose</span>
                                <span className="font-bold text-text-main">{selectedAppt.notes || 'Official Registrar Request'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Checklist: Required Documents to Bring */}
                          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
                              <ShieldCheck size={12} className="text-maroon" /> REQUIRED DOCUMENTS TO BRING
                            </p>
                            <div className="flex flex-col gap-2 text-[13px] text-text-main">
                              {selectedAppt.transaction_types?.required_documents?.length > 0 ? (
                                selectedAppt.transaction_types.required_documents.map((doc, i) => (
                                  <div key={i} className="flex items-center gap-2.5">
                                    <div className="w-4.5 h-4.5 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                                    <span>{doc}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-4.5 h-4.5 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                                  <span>Valid Student ID / Official School Registration Form</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Processing Steps Pipeline */}
                          {selectedAppt.transaction_types?.processing_steps?.length > 0 && (
                            <div className="mb-5">
                              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
                                <Clock size={12} className="text-gold" /> SERVICE WORKFLOW AT COUNTER
                              </p>
                              <div className="flex flex-col gap-2">
                                {selectedAppt.transaction_types.processing_steps.map((step, i) => (
                                  <div key={i} className="flex items-center gap-3 text-[13px] font-medium text-text-main p-2.5 rounded-xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                                    <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-bold text-maroon shrink-0 shadow-2xs">
                                      {i + 1}
                                    </div>
                                    <span>{typeof step === 'object' ? step.name : step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reschedule & Cancel Action Buttons */}
                          {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'pending') && (
                            <div className="mt-auto pt-4 border-t border-border">
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setReschedulingAppt(selectedAppt)} 
                                  disabled={cancelling === selectedAppt.id || !canReschedule(selectedAppt.appointment_date, selectedAppt.time_slot)}
                                  className={`flex-1 py-3 px-4 text-[13px] font-bold text-text-main bg-white border-[1.5px] border-border rounded-xl font-sans transition-all ${(!canReschedule(selectedAppt.appointment_date, selectedAppt.time_slot) || cancelling === selectedAppt.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-off-white hover:border-text-sub/40'}`}
                                >
                                  Reschedule
                                </button>
                                <button 
                                  onClick={() => setConfirmCancelId(selectedAppt.id)} 
                                  disabled={cancelling === selectedAppt.id}
                                  className={`flex-1 py-3 px-4 text-[13px] font-bold text-maroon bg-transparent border-[1.5px] border-maroon-border rounded-xl font-sans transition-all ${cancelling === selectedAppt.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-maroon-light hover:border-maroon'}`}
                                >
                                  {cancelling === selectedAppt.id ? 'Cancelling...' : 'Cancel Appointment'}
                                </button>
                              </div>
                              <p className="text-[11px] text-text-muted text-center m-0 mt-2.5">
                                * Rescheduling is allowed up to 24 hours prior to appointment time.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmCancelId(null)} />
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
