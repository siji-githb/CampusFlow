import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import campusFlowLogo from '../../assets/logo.png';
import StudentLayout, { useWindowWidth, ProfileDropdown } from '../../components/layout/StudentLayout';
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService';
import { getMyQueue, getTimeEstimate } from '../../services/queueService';
import { LogOut, ClipboardList, Ticket, Home, Calendar, Bot, Clock, Search, ChevronRight } from 'lucide-react';
import NotificationDropdown from '../../components/NotificationDropdown';
import GlobalSearch from '../../components/GlobalSearch';

// ── Status Styles ──
const STATUS_STYLES = {
  confirmed:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  completed:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  cancelled:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  pending:     { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  in_progress: { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  no_show:     { bg: '#F9F9F9', color: '#A8A29E', border: '#EAE7E2' },
};

// ── Draggable AI Bot ──
const DraggableBot = ({ navigate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 20 - 56, 
    y: window.innerHeight - 84 - 56 
  });
  const buttonRef = useRef(null);
  const hasDragged = useRef(false);
  const startPos = useRef({ x: 0, y: 0, btnX: 0, btnY: 0 });

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const x = Math.min(prev.x, window.innerWidth - 56);
        const y = Math.min(prev.y, window.innerHeight - 56);
        return { x: Math.max(0, x), y: Math.max(0, y) };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerDown = (e) => {
    setIsDragging(true);
    hasDragged.current = false;
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      btnX: position.x,
      btnY: position.y
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    
    if (!hasDragged.current && Math.sqrt(dx*dx + dy*dy) > 5) {
      hasDragged.current = true;
    }

    if (hasDragged.current) {
      let newX = startPos.current.btnX + dx;
      let newY = startPos.current.btnY + dy;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - 56));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 56));

      setPosition({ x: newX, y: newY });
    }
  };

  const onPointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const onClick = (e) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate('/student/ai-chat');
  };

  return (
    <button
      ref={buttonRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      className={`fixed w-14 h-14 rounded-full bg-maroon text-white border-none shadow-[0_4px_16px_rgba(123,26,42,0.3)] flex items-center justify-center cursor-pointer z-90 touch-none hover:scale-110 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(123,26,42,0.45)] ${isDragging ? 'transition-none' : 'transition-all duration-300 ease-out-back'}`}
      style={{ left: position.x + 'px', top: position.y + 'px' }}
    >
      <Bot size={26} className="pointer-events-none" />
    </button>
  );
};

// ── Main Page Component ──
export default function StudentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [liveTicket, setLiveTicket] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelTicket = async () => {
    if (!liveTicket || !liveTicket.id) return;
    if (!window.confirm('Are you sure you want to cancel your queue ticket?')) return;
    
    setCancelling(true);
    try {
      await cancelAppointment(token, liveTicket.id);
      setLiveTicket(null);
      fetchDashboardData();
    } catch (e) {
      alert('Failed to cancel ticket: ' + e.message);
    } finally {
      setCancelling(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Fetch appointments
      const allAppts = await getMyAppointments(token);
      const formatTime12 = (t) => {
        if (!t) return '';
        const parts = t.split(':');
        if (parts.length < 2) return t;
        const h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
      };

      const upcoming = allAppts
        .filter(a => a.appointment_date >= today && a.status === 'confirmed')
        .slice(0, 3)
        .map(a => ({
          id: a.id,
          type: a.transaction_types?.name || 'Registrar Transaction',
          step: 'Registrar',
          date: a.appointment_date === today ? 'Today' : a.appointment_date,
          time: formatTime12(a.time_slot),
          status: a.status
        }));
      setAppointments(upcoming);

      // 2. Fetch live queue ticket
      const qData = await getMyQueue(token);
      if (qData.ticket && (qData.ticket.status === 'pending' || qData.ticket.status === 'in_progress')) {
        let estMins = '--';
        try {
          const estData = await getTimeEstimate(token, qData.ticket.appointment_id);
          if (estData.estimates && estData.estimates.length > 0) {
            // Find the pending step estimate or just use the first one
            const est = estData.estimates.find(e => e.label.includes('min')) || estData.estimates[0];
            if (est) {
              estMins = est.label.split(' ')[0] || '--';
            }
          }
        } catch (error) {
          // fail silently for time estimate parsing
        }

        setLiveTicket({
          id: qData.ticket.appointment_id,
          queue_number: qData.ticket.queue_number,
          est_wait_mins: estMins,
          currently_serving: 'Processing',
          transaction_type: qData.ticket.appointments?.transaction_types?.name || 'Registrar'
        });
      } else {
        setLiveTicket(null);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 20000); // refresh every 20s
      return () => clearInterval(interval);
    }
  }, [token]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <StudentLayout activeTab="home">
      <div className="flex-1 w-full pb-[88px] md:pb-0 px-4 md:px-0">
        
        {/* ── Unified Hero greeting card ── */}
        <div 
          className="animate-fade-up bg-linear-to-br from-maroon to-maroon-dark rounded-[24px] md:rounded-3xl pt-6 px-5 pb-8 md:py-10 md:px-12 mb-8 relative overflow-hidden shadow-[0_8px_20px_rgba(123,26,42,0.15)] md:shadow-[0_20px_40px_-15px_rgba(123,26,42,0.3)]"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Blurred abstract glows */}
          <div className="absolute right-[-10%] top-[-30%] w-[200px] h-[200px] md:w-[300px] md:h-[300px] rounded-full pointer-events-none animate-float-bubble blur-2xl md:blur-2xl" style={{ background: `radial-gradient(circle, rgba(184,144,10,0.18) 0%, transparent 70%)` }} />
          <div className="absolute right-[15%] bottom-[-45%] w-[150px] h-[150px] md:w-[250px] md:h-[250px] rounded-full pointer-events-none animate-float-bubble-alt blur-[20px] md:blur-[30px]" style={{ background: `radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)` }} />

          <div className="relative z-1">
            <span className="inline-block text-[11px] font-bold text-gold uppercase tracking-[0.12em] mb-2 md:mb-3 bg-gold/15 px-2.5 py-1 rounded-[20px] border-[1.5px] border-gold/25">
              Student Portal Active
            </span>
            <p className="md:hidden text-[13px] text-white/55 m-0 mb-1">{getGreeting()},</p>
            <h1 className="font-serif text-[clamp(24px,5vw,42px)] font-bold text-white m-0 mb-2 md:mb-3 leading-[1.15]">
              <span className="hidden md:inline">{getGreeting()}, </span>{user?.first_name || 'Student'}!
            </h1>
            <p className="text-[13px] md:text-[15px] text-white/65 m-0 max-w-[580px] leading-normal md:leading-[1.6]">
              <span className="md:hidden">Welcome to your CRMC Student Portal. Here is your campus overview for today.</span>
              <span className="hidden md:inline">Manage your academic documents, track live queue ticket status, or chat with our virtual guide—all from your personalized dashboard.</span>
            </p>
          </div>
        </div>

        {/* ── Cards section ── */}
        <div className="flex flex-col gap-6 mb-8">

          {/* Compact action + queue row */}
          <div
            className="animate-fade-up grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5"
            style={{ animationDelay: '0.2s' }}
          >
            {/* Book Appointment card */}
            <button
              onClick={() => navigate('/student/book')}
              className="bg-white rounded-[20px] py-[22px] px-6 border border-border cursor-pointer text-left shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all duration-200 font-sans hover:border-maroon-border hover:shadow-[0_6px_20px_rgba(123,26,42,0.08)] group"
            >
              <div className="w-11 h-11 rounded-xl text-maroon bg-maroon-mid flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <div className="text-[15px] font-bold text-maroon font-serif">Book Appointment</div>
                <div className="text-[11px] md:text-xs text-text-sub mt-[3px]">Schedule an appointment with campus registrar</div>
              </div>
            </button>

            {/* My Queue compact card */}
            <div className="bg-white rounded-[20px] py-[22px] px-6 border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl text-gold bg-gold-mid flex items-center justify-center shrink-0">
                <Ticket size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">My Queue</span>
                  {liveTicket && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-gold bg-gold-light px-2 py-0.5 rounded-[10px] border border-gold-border">
                      <span className="w-[7px] h-[7px] rounded-full bg-gold inline-block animate-pulse-live" /> Live
                    </span>
                  )}
                </div>
                {loading ? (
                  <div className="animate-pulse h-5 rounded-md w-[60%] bg-border" />
                ) : liveTicket ? (
                  <div>
                    <div className="text-[15px] font-bold text-maroon font-serif">{liveTicket.queue_number}</div>
                    <div className="text-[11px] md:text-xs text-text-sub mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      {liveTicket.transaction_type || 'Registrar'} · Est. {liveTicket.est_wait_mins} min wait
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-text-muted">No active queue ticket</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid: Upcoming Appointments + Live Queue ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-8 items-start">
          
          {/* Upcoming Appointments */}
          <div 
            className="animate-fade-up bg-transparent lg:bg-white rounded-[20px] p-0 lg:p-7 shadow-none lg:shadow-[0_8px_30px_rgba(0,0,0,0.02),0_0_0_1px_rgba(123,26,42,0.04)]"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <div>
                <p className="text-[11px] font-bold text-gold tracking-[0.12em] uppercase m-0 mb-1">
                  Schedule Overview
                </p>
                <h2 className="font-serif text-[17px] lg:text-[20px] font-bold text-text-main m-0 leading-tight">
                  Upcoming Appointments
                </h2>
              </div>
              <button 
                onClick={() => navigate('/student/appointments')} 
                className="text-[13px] font-semibold text-maroon bg-transparent lg:bg-maroon-light border-none lg:border-[1.5px] lg:border-maroon-border rounded-[10px] py-1 lg:py-2 px-0 lg:px-4 cursor-pointer font-sans transition-all duration-200 hover:text-maroon-dark lg:hover:bg-maroon lg:hover:text-white shrink-0 flex items-center gap-1"
              >
                <span className="md:hidden">View All</span>
                <span className="hidden md:inline">View History</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-2xl border border-border bg-white lg:bg-off-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="hidden lg:block animate-pulse w-[46px] h-[46px] rounded-xl bg-border" />
                      <div>
                        <div className="animate-pulse w-[120px] h-[14px] rounded bg-border mb-2" />
                        <div className="animate-pulse w-[180px] h-[12px] rounded bg-border" />
                      </div>
                    </div>
                    <div className="animate-pulse w-[60px] lg:w-[80px] h-6 rounded-full bg-border" />
                  </div>
                ))}
              </div>
            ) : appointments.length > 0 ? (
              <div className="flex flex-col gap-3">
                {appointments.map(apt => (
                  <div 
                    key={apt.id} 
                    className="flex justify-between items-center p-4 rounded-2xl border border-border bg-white lg:bg-off-white transition-all duration-400 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_-4px_rgba(123,26,42,0.08),0_4px_12px_-2px_rgba(0,0,0,0.02)] hover:border-maroon-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="hidden lg:flex w-[46px] h-[46px] rounded-xl text-maroon bg-white border-[1.5px] border-border items-center justify-center shrink-0">
                        <ClipboardList size={22} />
                      </div>
                      <div>
                        <div className="text-[14px] lg:text-[15px] font-semibold text-text-main m-0 mb-1 lg:mb-0">{apt.type}</div>
                        <div className="lg:hidden text-[12px] text-text-sub m-0 mb-1.5">{apt.step}</div>
                        <div className="flex flex-wrap gap-2 items-center mt-0 lg:mt-1.5 text-[12px] lg:text-[12px]">
                          <span className="text-text-sub bg-transparent lg:bg-white border-none lg:border lg:border-border py-0 lg:py-0.5 px-0 lg:px-2 rounded-md flex items-center gap-1">
                            <Calendar size={12} /> {apt.date}
                          </span>
                          <span className="text-text-sub bg-transparent lg:bg-white border-none lg:border lg:border-border py-0 lg:py-0.5 px-0 lg:px-2 rounded-md flex items-center gap-1">
                            <Clock size={12} /> {apt.time}
                          </span>
                          <span className="hidden lg:inline text-xs text-text-muted">
                            · &nbsp;{apt.step}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold py-1 lg:py-1.5 px-2.5 lg:px-3.5 rounded-full whitespace-nowrap uppercase tracking-[0.02em] lg:tracking-[0.04em]"
                      style={{
                        background: STATUS_STYLES[apt.status].bg, color: STATUS_STYLES[apt.status].color,
                        border: `1.5px solid ${STATUS_STYLES[apt.status].border}`,
                      }}
                    >
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 lg:p-8 text-text-muted bg-white lg:bg-off-white rounded-2xl border border-dashed border-border">
                No upcoming appointments.
              </div>
            )}
          </div>

          {/* Large Live Queue Block */}
          <div className="animate-fade-up order-first lg:order-0" style={{ animationDelay: '0.3s' }}>
            <div className="flex justify-between items-end mb-3 lg:mb-4">
              <div>
                <p className="text-[11px] font-semibold text-gold tracking-widest uppercase m-0 mb-0.5">Live Queue</p>
                <h2 className="font-serif text-[18px] lg:text-[20px] font-bold text-text-main m-0">Active Registrar Queue</h2>
              </div>
            </div>

            {loading ? (
              <div className="bg-surface rounded-2xl py-6 px-5 border border-border text-center">
                <div className="animate-pulse w-[120px] h-[14px] rounded bg-border mx-auto mb-3" />
                <div className="animate-pulse w-[80px] h-16 rounded-lg bg-border mx-auto mb-4" />
                <div className="flex justify-center gap-4 bg-white p-3 rounded-[10px] mx-auto mb-4 w-full">
                  <div className="animate-pulse flex-1 h-8 rounded bg-border" />
                  <div className="w-px bg-border" />
                  <div className="animate-pulse flex-1 h-8 rounded bg-border" />
                </div>
                <div className="animate-pulse w-full h-11 rounded-[10px] bg-border" />
              </div>
            ) : liveTicket ? (
              <div className="bg-surface rounded-2xl py-6 px-5 shadow-[0_4px_12px_rgba(0,0,0,0.03),0_0_0_1px_rgba(123,26,42,0.04)] text-center">
                <p className="text-[11px] font-semibold text-text-sub tracking-[0.12em] uppercase m-0 mb-2">Your Queue Number</p>
                <div className="font-serif text-[42px] lg:text-[56px] font-bold text-maroon leading-none m-0 mb-3 tracking-[-0.02em]">
                  {liveTicket.queue_number}
                </div>
                <div className="flex justify-center gap-4 bg-white p-3 rounded-[10px] border border-maroon/5 mx-auto mb-4 w-full">
                  <div className="flex-1">
                    <span className="text-[10px] text-text-muted block">Serving</span>
                    <strong className="text-[13px] text-text-main">{liveTicket.currently_serving}</strong>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex-1">
                    <span className="text-[10px] text-text-muted block">Est. Wait</span>
                    <strong className="text-[13px] text-text-main">{liveTicket.est_wait_mins} min</strong>
                  </div>
                </div>
                <button 
                  onClick={handleCancelTicket}
                  disabled={cancelling}
                  className="w-full min-h-[44px] p-2.5 rounded-[10px] border border-danger-border bg-danger-light text-danger text-[13px] font-semibold cursor-pointer font-sans transition-colors hover:bg-danger/10 disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Cancel Queue Ticket'}
                </button>
              </div>
            ) : (
              <div className="text-center py-10 px-5 text-text-muted flex-1 flex flex-col justify-center items-center bg-off-white rounded-2xl border border-dashed border-border">
                <div className="text-text-muted mb-3.5"><Ticket size={42} /></div>
                <p className="text-sm lg:text-[15px] m-0 font-bold lg:font-medium text-text-main lg:text-text-muted">No Active Queue Ticket</p>
                <p className="text-xs lg:text-[13px] mt-1 lg:mt-1.5 mb-0 text-text-muted">Get a ticket to start your transaction</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </StudentLayout>
  );
}
