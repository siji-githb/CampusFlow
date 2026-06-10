import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import crmcLogo from '../../assets/crmc-logo.webp';
import BottomNav from '../../components/layout/BottomNav';
import { getMyAppointments } from '../../services/appointmentService';
import { getMyQueue, getTimeEstimate } from '../../services/queueService';

// ── Responsive hook ──
function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// ── Token Object ──
const M = {
  maroon:        '#7B1A2A',
  maroonDark:    '#5C1320',
  maroonLight:   '#F9F0F1',
  maroonMid:     'rgba(123,26,42,0.06)',
  maroonBorder:  'rgba(123,26,42,0.15)',
  gold:          '#B8900A',
  goldLight:     '#FDF6E3',
  goldMid:       'rgba(184,144,10,0.08)',
  goldBorder:    'rgba(184,144,10,0.25)',
  white:         '#FFFFFF',
  offWhite:      '#F9F7F4',
  surface:       '#F2EDE8',
  border:        '#EAE7E2',
  borderStrong:  '#D4CEC8',
  text:          '#1C1917',
  textSub:       '#57534E',
  textMuted:     '#A8A29E',
  green:         '#15803D',
  greenLight:    '#F0FDF4',
  greenBorder:   '#BBF7D0',
  blue:          '#1D4ED8',
  blueLight:     '#EFF6FF',
  blueBorder:    '#BFDBFE',
  red:           '#DC2626',
  redLight:      '#FEF2F2',
  redBorder:     '#FECACA',
};

// ── Status Styles ──
const STATUS_STYLES = {
  confirmed:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  completed:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  cancelled:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  pending:     { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  in_progress: { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  no_show:     { bg: '#F9F9F9', color: '#A8A29E', border: '#EAE7E2' },
};

// ── Desktop Sidebar Nav Item ──
const SideNavItem = ({ icon, label, path, active, navigate, collapsed }) => (
  <button
    onClick={() => navigate(path)}
    title={collapsed ? label : undefined}
    style={{
      display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '14px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      width: '100%', padding: collapsed ? '12px 0' : '12px 16px', borderRadius: '12px',
      border: 'none', cursor: 'pointer', textAlign: 'left',
      background: active ? M.maroonMid : 'transparent',
      color: active ? M.maroon : M.textSub,
      fontSize: '14px', fontWeight: active ? 600 : 500,
      fontFamily: "'IBM Plex Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}
    className="sidebar-item"
  >
    {active && (
      <div style={{
        position: 'absolute', left: 0, top: '25%', bottom: '25%',
        width: '4px', borderRadius: '0 4px 4px 0', background: M.gold
      }} />
    )}
    <span style={{
      fontSize: '18px', width: '22px', textAlign: 'center', flexShrink: 0,
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }} className="sidebar-icon">{icon}</span>
    {!collapsed && (
      <span style={{ transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', whiteSpace: 'nowrap' }} className="sidebar-label">{label}</span>
    )}
  </button>
);

// ── Main Page Component ──
export default function StudentDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const width = useWindowWidth();
  const isDesktop = width >= 768;

  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [liveTicket, setLiveTicket] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Fetch appointments
      const allAppts = await getMyAppointments(token);
      const upcoming = allAppts
        .filter(a => a.appointment_date >= today && a.status === 'confirmed')
        .slice(0, 3)
        .map(a => ({
          id: a.id,
          type: a.transaction_types?.name || 'Registrar Transaction',
          step: 'Registrar',
          date: a.appointment_date === today ? 'Today' : a.appointment_date,
          time: a.time_slot,
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
        } catch(e) {}

        setLiveTicket({
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

  const ProfileDropdown = () => (
    <>
      {profileOpen && isDesktop && (
        <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 105, background: 'transparent' }} />
      )}
      <div style={{ position: 'relative', zIndex: 110 }}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          style={{
            borderRadius: '50%', background: 'none', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none', padding: 0,
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          aria-label="Profile Menu" aria-expanded={profileOpen}
        >
          <div style={{
            width: '38px', height: '38px',
            borderRadius: '50%',
            background: isDesktop ? M.maroonMid : 'rgba(255,255,255,0.15)',
            border: isDesktop ? `1.5px solid ${M.maroonBorder}` : '1.5px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700,
            color: isDesktop ? M.maroon : M.white,
            boxShadow: isDesktop ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            {user?.first_name?.[0]?.toUpperCase() || 'S'}
          </div>
        </button>

        {profileOpen && isDesktop && (
          <div 
            className="profile-dropdown-menu"
            style={{
              position: 'absolute', top: '48px', right: 0,
              width: '260px', background: M.white, borderRadius: '16px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
              padding: '20px', zIndex: 120, textAlign: 'left',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: M.text, lineHeight: 1.2 }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: '12px', color: M.textSub, marginTop: '4px', wordBreak: 'break-all' }}>
                {user?.email || 'student@crmc.edu.ph'}
              </div>
              <div style={{
                display: 'inline-block', fontSize: '9px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: M.gold, background: M.goldLight, border: `1px solid ${M.goldBorder}`,
                borderRadius: '6px', padding: '3px 8px', marginTop: '10px',
              }}>Student Portal</div>
            </div>
            <div style={{ height: '1px', background: M.border, margin: '14px 0' }} />
            <button
              onClick={() => { setProfileOpen(false); logout(); navigate('/login'); }}
              style={{
                width: '100%', minHeight: '44px', padding: '10px 12px', borderRadius: '10px',
                border: 'none', background: M.redLight, color: M.red,
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: "'IBM Plex Sans', sans-serif",
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span>🚪</span> Log Out
            </button>
          </div>
        )}
      </div>
    </>
  );

  // ── Mobile Bottom Drawer Component ──
  const MobileProfileDrawer = () => {
    if (!profileOpen || isDesktop) return null;

    return (
      <>
        {/* Backdrop overlay */}
        <div 
          onClick={() => setProfileOpen(false)} 
          className="drawer-backdrop"
          style={{ 
            position: 'fixed', inset: 0, zIndex: 200, 
            background: 'rgba(28, 25, 23, 0.45)', 
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }} 
        />
        {/* Drawer container */}
        <div 
          className="drawer-content"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: M.white,
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.08)',
            padding: '24px 20px calc(24px + env(safe-area-inset-bottom))',
            zIndex: 210,
            display: 'flex', flexDirection: 'column', gap: '20px',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}
        >
          {/* Top pull bar indicator */}
          <div style={{
            width: '40px', height: '4px', background: M.borderStrong,
            borderRadius: '2px', margin: '0 auto 4px', flexShrink: 0
          }} />

          {/* Header info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: M.maroonMid, border: `2px solid ${M.maroonBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, color: M.maroon,
            }}>
              {user?.first_name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: M.text, fontFamily: "'Fraunces', serif" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: '13px', color: M.textSub, marginTop: '2px', wordBreak: 'break-all' }}>
                {user?.email || 'student@crmc.edu.ph'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: M.gold, background: M.goldLight, border: `1.5px solid ${M.goldBorder}`,
              borderRadius: '6px', padding: '4px 10px',
            }}>Student Portal</span>
            <span style={{
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: M.green, background: M.greenLight, border: `1.5px solid ${M.greenBorder}`,
              borderRadius: '6px', padding: '4px 10px',
            }}>Active Session</span>
          </div>

          <div style={{ height: '1px', background: M.border, margin: '8px 0' }} />

          {/* Settings list or info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => { setProfileOpen(false); navigate('/student/appointments'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '12px', border: 'none',
                background: M.offWhite, cursor: 'pointer', textAlign: 'left',
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text
              }}
            >
              <span>📋</span> My Appointments
            </button>
            <button 
              onClick={() => { setProfileOpen(false); navigate('/student/queue'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '12px', border: 'none',
                background: M.offWhite, cursor: 'pointer', textAlign: 'left',
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text
              }}
            >
              <span>🎫</span> Active Queue Ticket
            </button>
          </div>

          {/* Logout button */}
          <button
            onClick={() => { setProfileOpen(false); logout(); navigate('/login'); }}
            style={{
              width: '100%', minHeight: '52px', padding: '14px', borderRadius: '12px',
              border: 'none', background: M.redLight, color: M.red,
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginTop: '12px'
            }}
          >
            <span>🚪</span> Log Out
          </button>
        </div>
      </>
    );
  };

  /* ───────────────────────── DESKTOP LAYOUT ───────────────────────── */
  if (isDesktop) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif" }}>

        {/* ── Left Sidebar ── */}
        <aside style={{
          width: sidebarCollapsed ? '80px' : '260px', flexShrink: 0,
          background: M.white,
          borderRight: `1px solid ${M.border}`,
          display: 'flex', flexDirection: 'column',
          position: 'fixed', left: 0, top: 0, bottom: 0,
          zIndex: 50, padding: sidebarCollapsed ? '32px 10px' : '32px 20px',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '12px', marginBottom: '40px', paddingLeft: sidebarCollapsed ? '0' : '8px' }}>
            <img src={crmcLogo} alt="CRMC Logo" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
            {!sidebarCollapsed && (
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 700, color: M.maroon, letterSpacing: '-0.01em' }}>CampusFlow</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: M.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>Student Portal</div>
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowX: 'hidden' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
              padding: sidebarCollapsed ? '0' : '0 16px', 
              marginBottom: '8px' 
            }}>
              <div style={{ 
                fontSize: '10px', fontWeight: 700, color: M.textMuted, 
                letterSpacing: '0.1em', textTransform: 'uppercase', 
                display: sidebarCollapsed ? 'none' : 'block' 
              }}>
                Main Menu
              </div>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title="Toggle Sidebar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: M.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  transform: sidebarCollapsed ? 'rotate(180deg)' : 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = M.border; e.currentTarget.style.color = M.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.textMuted; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>
            <SideNavItem icon="🏠" label="Dashboard" path="/student/dashboard" active={true} navigate={navigate} collapsed={sidebarCollapsed} />
            <SideNavItem icon="📅" label="Book Appointment" path="/student/book" active={false} navigate={navigate} collapsed={sidebarCollapsed} />
            <SideNavItem icon="📋" label="My Appointments" path="/student/appointments" active={false} navigate={navigate} collapsed={sidebarCollapsed} />
            <SideNavItem icon="🎫" label="My Queue Status" path="/student/queue" active={false} navigate={navigate} collapsed={sidebarCollapsed} />
            <div style={{ height: '1px', background: M.border, margin: '16px 0' }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', padding: sidebarCollapsed ? '0' : '0 16px', textAlign: sidebarCollapsed ? 'center' : 'left', marginBottom: '8px' }}>{sidebarCollapsed ? '···' : 'Support'}</div>
            <SideNavItem icon="🤖" label="AI Assistant" path="/student/ai-chat" active={false} navigate={navigate} collapsed={sidebarCollapsed} />
          </nav>

        </aside>

        {/* ── Main Content Area ── */}
        <div style={{ marginLeft: sidebarCollapsed ? '80px' : '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

          {/* Desktop Top Bar */}
          <header style={{
            background: M.white, borderBottom: `1px solid ${M.border}`,
            padding: '0 40px', height: '70px',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            position: 'sticky', top: 0, zIndex: 40,
          }}>
            <ProfileDropdown />
          </header>

          {/* Dashboard Body */}
          <main style={{ padding: '40px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

            {/* Hero greeting card */}
            <div 
              className="animate-fade-up"
              style={{
                animationDelay: '0.1s',
                background: `linear-gradient(135deg, ${M.maroon} 0%, ${M.maroonDark} 100%)`,
                borderRadius: '24px', padding: '40px 48px', marginBottom: '32px',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 20px 40px -15px rgba(123, 26, 42, 0.3)',
              }}
            >
              {/* Blurred abstract glows */}
              <div style={{
                position: 'absolute', right: '-10%', top: '-30%',
                width: '300px', height: '300px', borderRadius: '50%',
                background: `radial-gradient(circle, rgba(184,144,10,0.18) 0%, transparent 70%)`,
                filter: 'blur(40px)', pointerEvents: 'none',
                animation: 'floatBubble 8s ease-in-out infinite'
              }} />
              <div style={{
                position: 'absolute', right: '15%', bottom: '-45%',
                width: '250px', height: '250px', borderRadius: '50%',
                background: `radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)`,
                filter: 'blur(30px)', pointerEvents: 'none',
                animation: 'floatBubble 6s ease-in-out infinite alternate'
              }} />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ 
                  display: 'inline-block',
                  fontSize: '11px', fontWeight: 700, 
                  color: M.gold, textTransform: 'uppercase', 
                  letterSpacing: '0.12em', marginBottom: '12px',
                  background: 'rgba(184, 144, 10, 0.15)',
                  padding: '4px 10px', borderRadius: '20px',
                  border: `1.5px solid rgba(184, 144, 10, 0.25)`
                }}>
                  Student Portal Active
                </span>
                <h1 style={{ 
                  fontFamily: "'Fraunces', serif", 
                  fontSize: 'clamp(28px, 3.5vw, 42px)', 
                  fontWeight: 700, color: M.white, 
                  margin: '0 0 12px', lineHeight: 1.15 
                }}>
                  {getGreeting()}, {user?.first_name || 'Student'}!
                </h1>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', margin: 0, maxWidth: '580px', lineHeight: 1.6 }}>
                  Manage your academic documents, track live queue ticket status, or chat with our virtual guide—all from your personalized dashboard.
                </p>
              </div>
            </div>

            {/* Cards section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>

              {/* Compact action + queue row */}
              <div
                className="animate-fade-up"
                style={{ animationDelay: '0.2s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
              >
                {/* Book Appointment card */}
                <button
                  onClick={() => navigate('/student/book')}
                  style={{
                    background: M.white, borderRadius: '20px', padding: '22px 24px',
                    border: `1px solid ${M.border}`, cursor: 'pointer', textAlign: 'left',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    transition: 'all 0.2s', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = M.maroonBorder; e.currentTarget.style.boxShadow = '0 6px 20px rgba(123,26,42,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = M.border; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.02)'; }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: M.maroonMid, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                  }}>📅</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: M.maroon, fontFamily: "'Fraunces', serif" }}>Book Appointment</div>
                    <div style={{ fontSize: '12px', color: M.textSub, marginTop: '3px' }}>Schedule a visit with campus offices</div>
                  </div>
                </button>

                {/* My Queue compact card */}
                <div
                  style={{
                    background: M.white, borderRadius: '20px', padding: '22px 24px',
                    border: `1px solid ${M.border}`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    display: 'flex', alignItems: 'center', gap: '16px',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: M.goldMid, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                  }}>🎫</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>My Queue</span>
                      {liveTicket && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '10px', fontWeight: 600, color: M.gold,
                          background: M.goldLight, padding: '2px 8px', borderRadius: '10px',
                          border: `1px solid ${M.goldBorder}`,
                        }}>
                          <span className="pulse-indicator" /> Live
                        </span>
                      )}
                    </div>
                    {loading ? (
                      <div className="animate-shimmer" style={{ height: '20px', borderRadius: '6px', width: '60%' }} />
                    ) : liveTicket ? (
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: M.maroon, fontFamily: "'Fraunces', serif" }}>{liveTicket.queue_number}</div>
                        <div style={{ fontSize: '12px', color: M.textSub, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {liveTicket.transaction_type || 'Registrar'} · Est. {liveTicket.est_wait_mins} min wait
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: M.textMuted }}>No active queue ticket</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid: Upcoming Appointments + Live Queue */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '32px', alignItems: 'start' }}>
              
              {/* Upcoming Appointments */}
              <div 
              className="animate-fade-up"
              style={{ 
                animationDelay: '0.3s',
                background: M.white, borderRadius: '20px', padding: '28px', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.02), 0 0 0 1px rgba(123, 26, 42, 0.04)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                    Schedule Overview
                  </p>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: M.text, margin: 0 }}>
                    Upcoming Appointments
                  </h2>
                </div>
                <button 
                  onClick={() => navigate('/student/appointments')} 
                  style={{
                    fontSize: '13px', fontWeight: 600, color: M.maroon, background: M.maroonLight,
                    border: `1.5px solid ${M.maroonBorder}`, borderRadius: '10px',
                    padding: '8px 16px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = M.maroon; e.currentTarget.style.color = M.white; }}
                  onMouseLeave={e => { e.currentTarget.style.background = M.maroonLight; e.currentTarget.style.color = M.maroon; }}
                >
                  View History →
                </button>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ padding: '16px 20px', borderRadius: '16px', border: `1px solid ${M.border}`, background: M.offWhite, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="animate-shimmer" style={{ width: '46px', height: '46px', borderRadius: '12px' }} />
                        <div>
                          <div className="animate-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                          <div className="animate-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
                        </div>
                      </div>
                      <div className="animate-shimmer" style={{ width: '80px', height: '24px', borderRadius: '100px' }} />
                    </div>
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {appointments.map(apt => (
                    <div 
                      key={apt.id} 
                      className="hover-card"
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 20px', borderRadius: '16px', border: `1px solid ${M.border}`,
                        background: M.offWhite,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '46px', height: '46px', borderRadius: '12px', 
                          background: M.white, border: `1.5px solid ${M.border}`, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '22px', flexShrink: 0 
                        }}>
                          📋
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: M.text }}>{apt.type}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ fontSize: '12px', color: M.textSub, background: M.white, border: `1px solid ${M.border}`, padding: '2px 8px', borderRadius: '6px' }}>
                              🗓️ {apt.date}
                            </span>
                            <span style={{ fontSize: '12px', color: M.textSub, background: M.white, border: `1px solid ${M.border}`, padding: '2px 8px', borderRadius: '6px' }}>
                              ⏰ {apt.time}
                            </span>
                            <span style={{ fontSize: '12px', color: M.textMuted }}>
                              · &nbsp;{apt.step}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '6px 14px',
                        borderRadius: '100px', whiteSpace: 'nowrap',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        background: STATUS_STYLES[apt.status].bg, color: STATUS_STYLES[apt.status].color,
                        border: `1.5px solid ${STATUS_STYLES[apt.status].border}`,
                      }}>
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: M.textMuted, background: M.offWhite, borderRadius: '16px', border: `1px dashed ${M.border}` }}>
                  No upcoming appointments.
                </div>
              )}
            </div>

              {/* Large Live Queue Block (Desktop) */}
              <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>Live Queue</p>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Active Registrar Queue</h2>
                  </div>
                </div>

                {loading ? (
                  <div style={{ background: M.surface, borderRadius: '16px', padding: '24px 20px', border: `1px solid ${M.border}`, textAlign: 'center' }}>
                    <div className="animate-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px', margin: '0 auto 12px' }} />
                    <div className="animate-shimmer" style={{ width: '80px', height: '64px', borderRadius: '8px', margin: '0 auto 16px' }} />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', background: M.white, padding: '12px', borderRadius: '10px', margin: '0 auto 16px', width: '100%' }}>
                      <div className="animate-shimmer" style={{ flex: 1, height: '32px', borderRadius: '4px' }} />
                      <div style={{ width: '1px', background: M.border }} />
                      <div className="animate-shimmer" style={{ flex: 1, height: '32px', borderRadius: '4px' }} />
                    </div>
                    <div className="animate-shimmer" style={{ width: '100%', height: '44px', borderRadius: '10px' }} />
                  </div>
                ) : liveTicket ? (
                  <div style={{ background: M.surface, borderRadius: '16px', padding: '24px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 0 0 1px rgba(123, 26, 42, 0.04)', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: M.textSub, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Your Queue Number</p>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: '56px', fontWeight: 700, color: M.maroon, lineHeight: 1, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                      {liveTicket.queue_number}
                    </div>
                    <div style={{ 
                      display: 'flex', justifyContent: 'center', gap: '16px', 
                      background: M.white, padding: '12px', borderRadius: '10px',
                      border: `1px solid rgba(123,26,42,0.03)`, margin: '0 auto 16px', width: '100%'
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: M.textMuted, display: 'block' }}>Serving</span>
                        <strong style={{ fontSize: '13px', color: M.text }}>{liveTicket.currently_serving}</strong>
                      </div>
                      <div style={{ width: '1px', background: M.border }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: M.textMuted, display: 'block' }}>Est. Wait</span>
                        <strong style={{ fontSize: '13px', color: M.text }}>{liveTicket.est_wait_mins} min</strong>
                      </div>
                    </div>
                    <button style={{ 
                      width: '100%', minHeight: '44px', padding: '10px', 
                      borderRadius: '10px', border: `1px solid ${M.redBorder}`, 
                      background: M.redLight, color: M.red, 
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" 
                    }}>
                      Cancel Queue Ticket
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: M.textMuted, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: M.offWhite, borderRadius: '16px', border: `1px dashed ${M.border}` }}>
                    <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎫</div>
                    <p style={{ fontSize: '14px', margin: 0, fontWeight: 500 }}>No Active Queue Ticket</p>
                    <p style={{ fontSize: '12px', margin: '4px 0 0', color: M.textMuted }}>Get a ticket to start your transaction</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        <style>{`
          @keyframes pulseLive {
            0% { box-shadow: 0 0 0 0 rgba(184, 144, 10, 0.4); }
            70% { box-shadow: 0 0 0 8px rgba(184, 144, 10, 0); }
            100% { box-shadow: 0 0 0 0 rgba(184, 144, 10, 0); }
          }
          @keyframes floatBubble {
            0% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.05); }
            100% { transform: translateY(0) scale(1); }
          }
          @keyframes dropdownFadeIn {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .sidebar-item:hover {
            background: #F2EDE8 !important;
            color: #1C1917 !important;
          }
          .sidebar-item:hover .sidebar-icon {
            transform: scale(1.1);
          }
          .sidebar-item:hover .sidebar-label {
            transform: translateX(2px);
          }
          .profile-dropdown-menu {
            animation: dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .hover-card {
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .hover-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 30px -4px rgba(123, 26, 42, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.02) !important;
            border-color: rgba(123, 26, 42, 0.15) !important;
          }
          .hover-action-btn {
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .hover-action-btn:hover {
            transform: translateY(-2px);
            background: #FFFFFF !important;
            border-color: rgba(123, 26, 42, 0.15) !important;
            box-shadow: 0 10px 20px -5px rgba(123, 26, 42, 0.05);
          }
          .pulse-indicator {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #B8900A;
            display: inline-block;
            margin-right: 6px;
            animation: pulseLive 2s infinite;
          }
        `}</style>
      </div>
    );
  }

  /* ───────────────────────── MOBILE LAYOUT ───────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif", paddingBottom: '88px' }}>
      {/* ── Hero Banner ── */}
      <div 
        className="animate-fade-up"
        style={{
          animationDelay: '0.1s',
          background: `linear-gradient(135deg, ${M.maroon} 0%, ${M.maroonDark} 100%)`,
          padding: '24px 20px 32px', position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(123, 26, 42, 0.15)',
        }}
      >
        <div style={{
          position: 'absolute', right: '-15%', top: '-20%',
          width: '200px', height: '200px', borderRadius: '50%',
          background: `radial-gradient(circle, rgba(184,144,10,0.15) 0%, transparent 70%)`,
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />
        
        {profileOpen && (
          <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 105, background: 'transparent' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={crmcLogo} alt="CRMC Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, color: M.gold }}>CampusFlow</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>Student Portal</div>
            </div>
          </div>
          <ProfileDropdown />
        </div>
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px' }}>{getGreeting()},</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: M.white, margin: '0 0 8px', lineHeight: 1.15 }}>
            {user?.first_name || 'Student'}!
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
            Welcome to your CRMC Student Portal. Here is your campus overview for today.
          </p>
        </div>
      </div>

      {/* ── Main Scrollable Content ── */}
      <main style={{ padding: '0 16px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Quick Action Cards */}
        <div 
          className="animate-fade-up"
          style={{ animationDelay: '0.1s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '-20px', position: 'relative', marginBottom: '24px' }}
        >
          <div style={{ background: M.white, borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(123, 26, 42, 0.04)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📅</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, marginBottom: '4px' }}>Book Visit</div>
              <div style={{ fontSize: '11px', color: M.textMuted, marginBottom: '14px', lineHeight: 1.4 }}>Schedule document processing</div>
            </div>
            <button onClick={() => navigate('/student/book')} style={{ width: '100%', minHeight: '40px', padding: '10px', borderRadius: '10px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>Book Now</button>
          </div>
          <div style={{ background: M.white, borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(123, 26, 42, 0.04)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🎫</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, marginBottom: '4px' }}>My Queue</div>
              <div style={{ fontSize: '11px', color: M.textMuted, marginBottom: '14px', lineHeight: 1.4 }}>Check ticket & line estimates</div>
            </div>
            <button onClick={() => navigate('/student/queue')} style={{ width: '100%', minHeight: '40px', padding: '10px', borderRadius: '10px', border: 'none', background: M.gold, color: M.white, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>View Ticket</button>
          </div>
        </div>

        {/* Live Queue Section */}
        {loading ? (
          <div style={{ background: M.surface, borderRadius: '16px', padding: '24px 20px', border: `1px solid ${M.border}`, textAlign: 'center', marginBottom: '24px' }}>
            <div className="animate-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px', margin: '0 auto 12px' }} />
            <div className="animate-shimmer" style={{ width: '80px', height: '64px', borderRadius: '8px', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', background: M.white, padding: '12px', borderRadius: '10px', margin: '0 auto 16px', width: '90%' }}>
              <div className="animate-shimmer" style={{ flex: 1, height: '32px', borderRadius: '4px' }} />
              <div style={{ width: '1px', background: M.border }} />
              <div className="animate-shimmer" style={{ flex: 1, height: '32px', borderRadius: '4px' }} />
            </div>
            <div className="animate-shimmer" style={{ width: '100%', height: '44px', borderRadius: '10px' }} />
          </div>
        ) : liveTicket ? (
          <div className="animate-fade-up" style={{ animationDelay: '0.2s', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>Live Queue</p>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Active Registrar Queue</h2>
              </div>
            </div>
            <div style={{ background: M.surface, borderRadius: '16px', padding: '24px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 0 0 1px rgba(123, 26, 42, 0.04)', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: M.textSub, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Your Queue Number</p>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(42px, 10vw, 56px)', fontWeight: 700, color: M.maroon, lineHeight: 1, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                {liveTicket.queue_number}
              </div>
              <div style={{ 
                display: 'flex', justifyContent: 'center', gap: '16px', 
                background: M.white, padding: '8px 12px', borderRadius: '10px',
                border: `1px solid rgba(123,26,42,0.03)`, margin: '0 auto 16px', width: '90%'
              }}>
                <div>
                  <span style={{ fontSize: '10px', color: M.textMuted, display: 'block' }}>Serving</span>
                  <strong style={{ fontSize: '13px', color: M.text }}>{liveTicket.currently_serving}</strong>
                </div>
                <div style={{ width: '1px', background: M.border }} />
                <div>
                  <span style={{ fontSize: '10px', color: M.textMuted, display: 'block' }}>Est. Wait</span>
                  <strong style={{ fontSize: '13px', color: M.text }}>{liveTicket.est_wait_mins} min</strong>
                </div>
              </div>
              <button style={{ 
                width: '100%', minHeight: '44px', padding: '10px', 
                borderRadius: '10px', border: `1px solid ${M.redBorder}`, 
                background: M.redLight, color: M.red, 
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" 
              }}>
                Cancel Queue Ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-up" style={{ animationDelay: '0.2s', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>Live Queue</p>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Active Registrar Queue</h2>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '40px 20px', color: M.textMuted, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: M.offWhite, borderRadius: '16px', border: `1px dashed ${M.border}` }}>
              <div style={{ fontSize: '42px', marginBottom: '14px' }}>🎫</div>
              <p style={{ fontSize: '15px', margin: 0, fontWeight: 700, color: M.textMuted }}>No Active Queue Ticket</p>
              <p style={{ fontSize: '13px', margin: '6px 0 0', color: '#A8A29E' }}>Get a ticket to start your transaction</p>
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="animate-fade-up" style={{ animationDelay: '0.3s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: M.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>Schedule</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Upcoming Appointments</h2>
            </div>
            <button onClick={() => navigate('/student/appointments')} style={{ fontSize: '13px', fontWeight: 600, color: M.maroon, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>View All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ background: M.white, borderRadius: '16px', padding: '16px', border: `1px solid ${M.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="animate-shimmer" style={{ width: '140px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="animate-shimmer" style={{ width: '100px', height: '12px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="animate-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
                    </div>
                    <div className="animate-shimmer" style={{ width: '70px', height: '24px', borderRadius: '100px' }} />
                  </div>
                ))}
              </div>
            ) : appointments.length > 0 ? (
              appointments.map(apt => (
                <div key={apt.id} style={{ background: M.white, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 0 0 1px rgba(123, 26, 42, 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>{apt.type}</div>
                    <div style={{ fontSize: '12px', color: M.textSub, margin: '0 0 6px' }}>{apt.step}</div>
                    <div style={{ fontSize: '12px', color: M.textMuted, display: 'flex', gap: '8px' }}>
                      <span>📅 {apt.date}</span><span>⏰ {apt.time}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', background: STATUS_STYLES[apt.status].bg, color: STATUS_STYLES[apt.status].color, border: `1.5px solid ${STATUS_STYLES[apt.status].border}` }}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: M.textMuted, background: M.white, borderRadius: '16px', border: `1px dashed ${M.border}` }}>
                No upcoming appointments.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Floating Button */}
      <button
        onClick={() => navigate('/student/ai-chat')}
        className="floating-ai-button"
        style={{ 
          position: 'fixed', bottom: '84px', right: '20px', width: '56px', height: '56px', 
          borderRadius: '50%', backgroundColor: M.maroon, color: M.white, border: 'none', 
          boxShadow: '0 4px 16px rgba(123,26,42,0.3)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', fontSize: '26px', cursor: 'pointer', zIndex: 90, 
        }}
      >🤖</button>

      <MobileProfileDrawer />

      <BottomNav active="home" />

      <style>{`
        @keyframes pulseLive {
          0% { box-shadow: 0 0 0 0 rgba(184, 144, 10, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(184, 144, 10, 0); }
          100% { box-shadow: 0 0 0 0 rgba(184, 144, 10, 0); }
        }
        @keyframes floatBubble {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.04); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .drawer-backdrop {
          animation: fadeInBackdrop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .drawer-content {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .floating-ai-button {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .floating-ai-button:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 8px 24px rgba(123,26,42,0.45);
        }
      `}</style>
    </div>
  );
}