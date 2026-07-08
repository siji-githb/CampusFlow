import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import crmcLogo from '../../assets/crmc-logo.webp';
import BottomNav from './BottomNav';
import { LogOut, ClipboardList, Ticket, Home, Calendar, Bot } from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';
import Navbar from './Navbar';

// eslint-disable-next-line react-refresh/only-export-components
export function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export const M = {
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
      fontFamily: "'Poppins', sans-serif",
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

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useWindowWidth() >= 768;
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <>
      {profileOpen && (
        <div 
          onClick={() => setProfileOpen(false)} 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 105, 
            background: isDesktop ? 'transparent' : 'rgba(123, 26, 42, 0.15)', 
            backdropFilter: isDesktop ? 'none' : 'blur(8px)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }} 
        />
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

        {profileOpen && (
          isDesktop ? (
            <>
              <div className="profile-dropdown-menu animate-fade-up" style={{
                position: 'absolute', top: '48px', right: 0,
                width: '260px', background: M.white, borderRadius: '16px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                padding: '20px', zIndex: 120, textAlign: 'left',
              }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: M.maroonLight, border: `1.5px solid ${M.maroonBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '18px', fontWeight: 700, color: M.maroon,
                  }}>
                    {user?.first_name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: M.text, lineHeight: 1.2, marginBottom: '2px' }}>
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div style={{ fontSize: '12px', color: M.textSub, wordBreak: 'break-all', marginBottom: '12px' }}>
                      {user?.email || 'student@crmc.edu.ph'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <div style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: M.maroon, background: M.maroonLight, border: `1px solid ${M.maroonBorder}`,
                        borderRadius: '6px', padding: '4px 8px',
                      }}>ID: {user?.student_id || 'Not set'}</div>
                      <div style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: M.gold, background: M.goldLight, border: `1px solid ${M.goldBorder}`,
                        borderRadius: '6px', padding: '4px 8px',
                      }}>{user?.priority_class || 'Standard'} Class</div>
                    </div>
                  </div>
                </div>
                <div style={{ height: '1px', background: M.border, margin: '16px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/student/appointments'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ClipboardList size={16} /> My Appointments
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/student/queue'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Ticket size={16} /> Active Queue Ticket
                  </button>
                </div>
                <div style={{ height: '1px', background: M.border, margin: '16px 0 12px' }} />
                <button
                  onClick={() => { setProfileOpen(false); logout(); navigate('/login'); }}
                  style={{
                    width: '100%', minHeight: '44px', padding: '10px 12px', borderRadius: '10px',
                    border: 'none', background: M.redLight, color: M.red,
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: "'Poppins', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </>
          ) : createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
              <div 
                onClick={() => setProfileOpen(false)} 
                style={{ 
                  position: 'absolute', inset: 0, 
                  background: 'rgba(123, 26, 42, 0.15)', 
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }} 
              />
              <div 
                className="profile-dropdown-mobile"
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  width: '100%', background: M.white, borderRadius: '24px 24px 0 0',
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                  padding: '32px 24px 40px', zIndex: 120, textAlign: 'left',
                  animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: M.maroonLight, border: `1.5px solid ${M.maroonBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '18px', fontWeight: 700, color: M.maroon,
                  }}>
                    {user?.first_name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: M.text, lineHeight: 1.2, marginBottom: '2px' }}>
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div style={{ fontSize: '12px', color: M.textSub, wordBreak: 'break-all', marginBottom: '12px' }}>
                      {user?.email || 'student@crmc.edu.ph'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <div style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: M.maroon, background: M.maroonLight, border: `1px solid ${M.maroonBorder}`,
                        borderRadius: '6px', padding: '4px 8px',
                      }}>ID: {user?.student_id || 'Not set'}</div>
                      <div style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: M.gold, background: M.goldLight, border: `1px solid ${M.goldBorder}`,
                        borderRadius: '6px', padding: '4px 8px',
                      }}>{user?.priority_class || 'Standard'} Class</div>
                    </div>
                  </div>
                </div>
                <div style={{ height: '1px', background: M.border, margin: '14px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/student/appointments'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: 'none',
                      background: M.offWhite, cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text
                    }}
                  >
                    <ClipboardList size={16} /> My Appointments
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/student/queue'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: 'none',
                      background: M.offWhite, cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text
                    }}
                  >
                    <Ticket size={16} /> Active Queue Ticket
                  </button>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); logout(); navigate('/login'); }}
                  style={{
                    width: '100%', minHeight: '52px', padding: '14px', borderRadius: '12px',
                    border: 'none', background: M.redLight, color: M.red,
                    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: "'Poppins', sans-serif", marginTop: '12px'
                  }}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </div>,
            document.body
          )
        )}
      </div>

    </>
  );
}

export default function StudentLayout({ children, activeTab, mobileTitle, backTo }) {
  const width = useWindowWidth();
  const isDesktop = width >= 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', background: M.offWhite, fontFamily: "'Poppins', sans-serif" }}>

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
                <div style={{ fontFamily: "'Lora', serif", fontSize: '17px', fontWeight: 700, color: M.maroon, letterSpacing: '-0.01em' }}>CampusFlow</div>
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
            <SideNavItem icon={<Home size={18} />} label="Dashboard" path="/student/dashboard" active={location.pathname === '/student/dashboard'} navigate={navigate} collapsed={sidebarCollapsed} />
            <SideNavItem icon={<Calendar size={18} />} label="Book Appointment" path="/student/book" active={location.pathname === '/student/book'} navigate={navigate} collapsed={sidebarCollapsed} />
            <SideNavItem icon={<ClipboardList size={18} />} label="My Appointments" path="/student/appointments" active={location.pathname === '/student/appointments'} navigate={navigate} collapsed={sidebarCollapsed} />
            <SideNavItem icon={<Ticket size={18} />} label="My Queue Status" path="/student/queue" active={location.pathname === '/student/queue'} navigate={navigate} collapsed={sidebarCollapsed} />
            <div style={{ height: '1px', background: M.border, margin: '16px 0' }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', padding: sidebarCollapsed ? '0' : '0 16px', textAlign: sidebarCollapsed ? 'center' : 'left', marginBottom: '8px' }}>{sidebarCollapsed ? '···' : 'Support'}</div>
            <SideNavItem icon={<Bot size={18} />} label="AI Assistant" path="/student/ai-chat" active={location.pathname === '/student/ai-chat'} navigate={navigate} collapsed={sidebarCollapsed} />
          </nav>

        </aside>

        {/* ── Main Content Area ── */}
        <div style={{ marginLeft: sidebarCollapsed ? '80px' : '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

          {/* Desktop Top Bar */}
          <header style={{
            background: M.white, borderBottom: `1px solid ${M.border}`,
            padding: '0 40px', height: '70px',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '24px',
            position: 'sticky', top: 0, zIndex: 40,
          }}>
            <NotificationDropdown />
            <ProfileDropdown />
          </header>

          {/* Body */}
          <main style={{ padding: '40px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {children}
          </main>
        </div>
      </div>
    );
  } else {
    // Mobile view fallback
    return (
      <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'Poppins', sans-serif" }}>
        {mobileTitle && <Navbar backTo={backTo} title={mobileTitle} />}
        {children}
        {activeTab && <BottomNav active={activeTab} />}
      </div>
    );
  }
}
