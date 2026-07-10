import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import campusFlowLogo from '../../assets/logo.png';
import BottomNav from './BottomNav';
import { LogOut, ClipboardList, Ticket, Home, Calendar, BotMessageSquare, User, Settings, Search, ChevronLeft } from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';
import Navbar from './Navbar';
import AiChat from '../../pages/student/AiChat';
import GlobalSearch from '../GlobalSearch';

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
          {isDesktop ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 8px', borderRadius: '24px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = M.offWhite} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{
                width: '38px', height: '38px',
                borderRadius: '50%',
                background: M.maroonLight,
                border: `1.5px solid ${M.maroonBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                color: M.maroon,
                fontSize: '15px', fontWeight: 700
              }}>
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.first_name?.[0]?.toUpperCase() || 'M'
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: M.text, fontFamily: "'Poppins', sans-serif" }}>
                  {user?.first_name || 'Musharof'}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={M.textSub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s', transform: profileOpen ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          ) : (
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '50%',
              background: M.maroonLight,
              border: `1.5px solid ${M.maroonBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 700,
              color: M.maroon,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              {user?.first_name?.[0]?.toUpperCase() || 'S'}
            </div>
          )}
        </button>

        {profileOpen && (
          isDesktop ? (
            <>
              <div className="profile-dropdown-menu animate-fade-up" style={{
                position: 'absolute', top: '48px', right: 0,
                width: '320px', background: M.white, borderRadius: '16px',
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
                    onClick={() => { setProfileOpen(false); navigate('/student/profile'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={16} /> Edit Profile
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/student/settings'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Settings size={16} /> Account Settings
                  </button>
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
                    onClick={() => { setProfileOpen(false); navigate('/student/profile'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: 'none',
                      background: M.offWhite, cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text
                    }}
                  >
                    <User size={16} /> Edit Profile
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); navigate('/student/settings'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: 'none',
                      background: M.offWhite, cursor: 'pointer', textAlign: 'left', fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 600, color: M.text
                    }}
                  >
                    <Settings size={16} /> Account Settings
                  </button>
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();

  // Draggable and expanding widget logic
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(null);
  const hasDragged = useRef(false);
  const startPos = useRef({ x: 0, y: 0, btnX: 0, btnY: 0 });

  // Update bounds on resize
  useEffect(() => {
    if (position) {
      const handleResize = () => {
        setPosition(prev => {
          if (!prev) return prev;
          const w = isChatOpen ? 380 : 60;
          const h = isChatOpen ? 600 : 60;
          const x = Math.min(prev.x, window.innerWidth - w);
          const y = Math.min(prev.y, window.innerHeight - h);
          return { x: Math.max(0, x), y: Math.max(0, y) };
        });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [position, isChatOpen]);

  const onPointerDown = (e) => {
    // Don't drag if clicking a button (like close or clear)
    if (e.target.closest('button')) return;

    // Only drag by the drag-handle when open, or anywhere when closed
    if (isChatOpen && !e.target.closest('.drag-handle')) return;
    
    setIsDragging(true);
    hasDragged.current = false;
    
    let currentX = position?.x;
    let currentY = position?.y;
    if (currentX === undefined || currentX === null) {
      const rect = e.currentTarget.getBoundingClientRect();
      currentX = rect.left;
      currentY = rect.top;
    }
    startPos.current = { x: e.clientX, y: e.clientY, btnX: currentX, btnY: currentY };
    e.currentTarget.setPointerCapture(e.pointerId);
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
      
      // Determine max bounds based on mobile or desktop and open/closed state
      const w = isChatOpen ? (isDesktop ? 380 : window.innerWidth - 64) : 60;
      const h = isChatOpen ? 600 : 60;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - w));
      newY = Math.max(0, Math.min(newY, window.innerHeight - h));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const onPointerUp = (e) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const toggleChat = (e) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsChatOpen(prev => !prev);
  };

  // Chat Modal logic (transforming widget)
  const isMobileOpen = !isDesktop && isChatOpen;
  const chatWidth = isMobileOpen ? 'calc(100vw - 64px)' : '380px';
  const chatHeight = '600px';

  const chatModal = (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={!isChatOpen ? toggleChat : undefined}
      style={{
        position: 'fixed',
        zIndex: 1000,
        ...(position 
             ? { left: position.x, top: position.y } 
             : { bottom: isDesktop ? '32px' : '90px', right: isDesktop ? '32px' : '20px' }
        ),
        width: isChatOpen ? chatWidth : '60px',
        height: isChatOpen ? chatHeight : '60px',
        maxHeight: isChatOpen ? 'calc(100vh - 140px)' : '60px',
        borderRadius: isChatOpen ? '24px' : '50%',
        background: M.white,
        boxShadow: isChatOpen ? '0 12px 40px rgba(0,0,0,0.2)' : '0 8px 24px rgba(123,26,42,0.3)',
        border: isChatOpen ? `1px solid ${M.border}` : 'none',
        overflow: 'hidden',
        transition: isDragging ? 'none' : 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), height 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.35s ease, box-shadow 0.35s ease, left 0.35s cubic-bezier(0.16, 1, 0.3, 1), top 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none'
      }}
    >
      {/* Morphing Header / Button */}
      <div 
        style={{
          width: '100%',
          height: isChatOpen ? '64px' : '100%',
          background: isChatOpen ? 'transparent' : M.maroon,
          color: isChatOpen ? M.text : M.white,
          borderBottom: isChatOpen ? `1px solid ${M.border}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isChatOpen ? 'space-between' : 'center',
          padding: isChatOpen ? '0 16px' : '0',
          cursor: isDragging ? 'grabbing' : (isChatOpen ? 'default' : 'pointer'),
          flexShrink: 0,
          transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1), padding 0.35s, justify-content 0.3s, background-color 0.35s, color 0.35s, border-bottom 0.35s'
        }}
        onMouseEnter={e => !isDragging && !isChatOpen && (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => !isDragging && !isChatOpen && (e.currentTarget.style.opacity = '1')}
      >
        {isChatOpen ? (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.4s ease-out' }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full bg-maroon flex items-center justify-center drag-handle text-white shadow-sm" 
                style={{ cursor: isDragging ? 'grabbing' : 'move' }}
              >
                <BotMessageSquare size={18} />
              </div>
              <div>
                <span className="font-bold text-[15px] block leading-tight text-text-main">Aether</span>
                <span className="text-[10px] text-text-sub tracking-wider uppercase block leading-tight">AI Assistant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); toggleChat(e); }} className="text-text-sub hover:text-text-main hover:bg-black/5 p-1.5 rounded-lg bg-transparent border-none cursor-pointer flex items-center justify-center transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        ) : (
          <BotMessageSquare size={28} style={{ animation: 'fadeIn 0.3s ease-out' }} />
        )}
      </div>

      {/* AiChat Content */}
      <div 
        style={{
          flex: 1,
          opacity: isChatOpen ? 1 : 0,
          pointerEvents: isChatOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease-in-out',
          transitionDelay: isChatOpen ? '0.15s' : '0s',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onPointerDown={e => e.stopPropagation()} 
      >
        {isChatOpen && <AiChat asWidget headless onClose={() => {}} />}
      </div>
    </div>
  );

  const mlClass = sidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]';

  return (
    <div className="min-h-screen bg-off-white font-sans flex relative" style={{ minHeight: '100vh', display: 'flex', background: M.offWhite, fontFamily: "'Poppins', sans-serif" }}>
      
      {/* ── Left Sidebar (Desktop Only) ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-white border-r border-border transition-all" style={{ width: sidebarCollapsed ? '80px' : '260px', padding: sidebarCollapsed ? '32px 10px' : '32px 20px', background: M.white, borderRight: `1px solid ${M.border}`, position: 'fixed', zIndex: 50 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '12px', marginBottom: '40px', paddingLeft: sidebarCollapsed ? '0' : '8px' }}>
          <img src={campusFlowLogo} alt="CampusFlow Logo" style={{ width: '38px', height: '38px', borderRadius: '50%' }} className="bg-white object-contain border border-slate-200" />
          {!sidebarCollapsed && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '17px', fontWeight: 700, color: M.maroon, letterSpacing: '-0.01em' }}>CampusFlow</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: M.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>Student Portal</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowX: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', padding: sidebarCollapsed ? '0' : '0 16px', marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: sidebarCollapsed ? 'none' : 'block' }}>Main Menu</div>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle Sidebar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '6px', transition: 'all 0.2s', transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }} onMouseEnter={e => { e.currentTarget.style.background = M.border; e.currentTarget.style.color = M.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.textMuted; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          </div>
          <SideNavItem icon={<Home size={18} />} label="Dashboard" path="/student/dashboard" active={location.pathname === '/student/dashboard'} navigate={navigate} collapsed={sidebarCollapsed} />
          <SideNavItem icon={<Calendar size={18} />} label="Book Appointment" path="/student/book" active={location.pathname === '/student/book'} navigate={navigate} collapsed={sidebarCollapsed} />
          <SideNavItem icon={<ClipboardList size={18} />} label="My Appointments" path="/student/appointments" active={location.pathname === '/student/appointments'} navigate={navigate} collapsed={sidebarCollapsed} />
          <SideNavItem icon={<Ticket size={18} />} label="My Queue Status" path="/student/queue" active={location.pathname === '/student/queue'} navigate={navigate} collapsed={sidebarCollapsed} />
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all w-full ml-0 ${mlClass}`} style={{ transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex justify-between items-center px-4 py-3 sticky top-0 z-40 bg-off-white/90 backdrop-blur-md border-b border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5">
            {backTo ? (
              <button onClick={() => navigate(backTo)} className="bg-transparent border-none text-text-main cursor-pointer flex items-center justify-center p-1 -ml-1">
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
            ) : (
              <img src={campusFlowLogo} alt="CampusFlow Logo" className="w-8 h-8 rounded-full bg-white object-contain border border-slate-200 shadow-sm" />
            )}
            <div>
              <div className="font-serif text-[15px] font-bold text-maroon">{mobileTitle || 'CampusFlow'}</div>
              {!mobileTitle && (
                <div className="text-[10px] text-text-muted tracking-[0.04em] uppercase font-semibold mt-0.5">Student Portal</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch isMobile={true} />
            <NotificationDropdown isMobile={true} mobileRoute="/student/notifications" />
            <ProfileDropdown />
          </div>
        </header>

        {/* Desktop Top Bar (Hidden on Mobile) */}
        <header className="hidden md:flex items-center justify-end sticky top-0 z-40 bg-white border-b border-border h-[70px]" style={{ background: M.white, borderBottom: `1px solid ${M.border}`, height: '70px', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', height: '100%', padding: '0 40px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <GlobalSearch />
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto p-0 md:p-[40px] pb-[88px] md:pb-[40px]" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav (Hidden on Desktop) */}
        {activeTab && (
          <div className="md:hidden">
            <BottomNav active={activeTab} />
          </div>
        )}

        {chatModal}
      </div>
    </div>
  );
}
