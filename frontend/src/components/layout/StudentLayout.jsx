import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import campusFlowLogo from '../../assets/logo.png';
import BottomNav from './BottomNav';
import NotificationDropdown from '../NotificationDropdown';
import { LogOut, ClipboardList, Ticket, Home, Calendar, BotMessageSquare, User, Settings, Search, ChevronLeft, Eraser, ChevronRight } from 'lucide-react';
import Navbar from './Navbar';
import AiChat from '../../pages/student/AiChat';
import GlobalSearch from '../GlobalSearch';
import { clearChat } from '../../services/aiService';

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
  const { user, requestLogout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  useOutsideClick(profileRef, () => setProfileOpen(false));
  const isDesktop = useWindowWidth() >= 768;

  return (
    <div ref={profileRef} className="relative z-50">
      <button
        onClick={() => setProfileOpen(!profileOpen)}
        className="bg-transparent border-none p-0 cursor-pointer flex items-center outline-none transition-transform hover:scale-105"
        aria-label="Profile Menu"
        aria-expanded={profileOpen}
      >
        {isDesktop ? (
          <div className="flex items-center gap-2.5 py-1 px-2 rounded-full hover:bg-slate-100/80 transition-colors">
            <div className="w-9.5 h-9.5 rounded-full bg-maroon/10 border border-maroon/20 flex items-center justify-center overflow-hidden text-maroon text-[15px] font-bold">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0]?.toUpperCase() || 'M'
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-text-main font-sans">
                {user?.first_name || 'Student'}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-text-sub transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-maroon/10 border border-maroon/20 flex items-center justify-center overflow-hidden text-maroon text-[13px] sm:text-[14px] font-bold shadow-2xs shrink-0">
            {user?.profile_image ? (
              <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.first_name?.[0]?.toUpperCase() || 'S'
            )}
          </div>
        )}
      </button>

      {/* Hanging Dropdown Menu for BOTH Mobile & Desktop */}
      {profileOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(123,26,42,0.06)] border border-border p-4 z-50 text-left animate-fade-up"
        >
          {/* User Info Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-maroon/10 border border-maroon/20 flex items-center justify-center overflow-hidden shrink-0 text-maroon text-[16px] font-bold font-serif shadow-2xs">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0]?.toUpperCase() || 'S'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[15px] font-bold text-text-main leading-tight truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-[11.5px] text-text-sub truncate mb-1.5">
                {user?.email || 'student@crmc.edu.ph'}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9.5px] font-extrabold text-maroon bg-maroon/8 border border-maroon/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  ID: {user?.student_id || 'Not set'}
                </span>
                <span className="text-[9.5px] font-extrabold text-gold bg-gold/10 border border-gold/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  {user?.priority_class ? user.priority_class.toUpperCase() : 'REGULAR'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border my-2.5" />

          {/* Navigation Links */}
          <div className="flex flex-col gap-0.5">
            <button 
              onClick={() => { setProfileOpen(false); navigate('/student/profile'); }}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-semibold text-text-main hover:bg-off-white hover:text-maroon transition-all cursor-pointer border-none bg-transparent w-full text-left group"
            >
              <div className="flex items-center gap-2.5">
                <User size={15} className="text-text-main shrink-0 group-hover:text-maroon transition-colors" />
                <span>Manage Profile</span>
              </div>
              <ChevronRight size={14} className="text-text-muted group-hover:text-maroon group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => { setProfileOpen(false); navigate('/student/settings'); }}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-semibold text-text-main hover:bg-off-white hover:text-maroon transition-all cursor-pointer border-none bg-transparent w-full text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Settings size={15} className="text-text-main shrink-0 group-hover:text-maroon transition-colors" />
                <span>Account Settings</span>
              </div>
              <ChevronRight size={14} className="text-text-muted group-hover:text-maroon group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => { setProfileOpen(false); navigate('/student/appointments'); }}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-semibold text-text-main hover:bg-off-white hover:text-maroon transition-all cursor-pointer border-none bg-transparent w-full text-left group"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList size={15} className="text-text-main shrink-0 group-hover:text-maroon transition-colors" />
                <span>My Appointments</span>
              </div>
              <ChevronRight size={14} className="text-text-muted group-hover:text-maroon group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => { setProfileOpen(false); navigate('/student/queue'); }}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-semibold text-text-main hover:bg-off-white hover:text-maroon transition-all cursor-pointer border-none bg-transparent w-full text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Ticket size={15} className="text-text-main shrink-0 group-hover:text-maroon transition-colors" />
                <span>Active Queue Ticket</span>
              </div>
              <ChevronRight size={14} className="text-text-muted group-hover:text-maroon group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          <div className="h-px bg-border my-2" />

          {/* Log Out */}
          <button
            onClick={() => { setProfileOpen(false); requestLogout(); }}
            className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 text-danger text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <LogOut size={15} className="text-danger" /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function StudentLayout({ children, activeTab, mobileTitle, backTo }) {
  const location = useLocation();
  const isDesktop = useWindowWidth() >= 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [initialAiQuery, setInitialAiQuery] = useState('');
  const [chatKey, setChatKey] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();
  const hasDragged = useRef(false);
  const startPos = useRef({ x: 0, y: 0, btnX: 0, btnY: 0 });

  // Update bounds on resize or chat toggle
  useEffect(() => {
    const enforceBounds = () => {
      setPosition(prev => {
        if (!prev) return prev;
        const w = isChatOpen ? (isDesktop ? 380 : window.innerWidth - 64) : 60;
        const h = isChatOpen ? 600 : 60;
        const x = Math.max(0, Math.min(prev.x, window.innerWidth - w));
        const y = Math.max(0, Math.min(prev.y, window.innerHeight - h));
        if (x === prev.x && y === prev.y) return prev;
        return { x, y };
      });
    };

    enforceBounds();
    window.addEventListener('resize', enforceBounds);
    return () => window.removeEventListener('resize', enforceBounds);
  }, [isChatOpen, isDesktop]);

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
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
    if (e && e.type === 'click' && hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsChatOpen(prev => !prev);
  };

  const handleAiPrompt = (query) => {
    setInitialAiQuery(query);
    setIsChatOpen(true);
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
            <div className="flex items-center gap-2 relative">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowClearConfirm(!showClearConfirm);
                }} 
                title="Clear Chat"
                className="text-text-sub hover:text-text-main hover:bg-black/5 p-1.5 rounded-lg bg-transparent border-none cursor-pointer flex items-center justify-center transition-colors"
              >
                <Eraser size={16} />
              </button>
              {showClearConfirm && (
                <div className="absolute top-[120%] right-6 bg-white rounded-lg shadow-lg p-3 z-50 w-45 border border-border" onClick={e => e.stopPropagation()}>
                  <p className="m-0 mb-3 text-[12px] text-text-main font-medium text-left">Clear chat history?</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 rounded bg-black/5 hover:bg-black/10 text-text-sub text-[11px] border-none cursor-pointer">Cancel</button>
                    <button onClick={async () => {
                      try { await clearChat(token); setChatKey(prev => prev + 1); setShowClearConfirm(false); } 
                      catch(err) { console.error(err); }
                    }} className="px-3 py-1.5 rounded bg-maroon hover:bg-maroon-dark text-white text-[11px] border-none cursor-pointer font-medium">Clear</button>
                  </div>
                </div>
              )}
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
        <AiChat key={chatKey} asWidget headless onClose={() => setIsChatOpen(false)} initialQuery={initialAiQuery} />
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
        <header className="md:hidden flex justify-between items-center px-3 sm:px-4 py-2 sm:py-2.5 sticky top-0 z-40 bg-off-white border-b border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
            {backTo ? (
              <button onClick={() => navigate(backTo)} className="bg-transparent border-none text-text-main cursor-pointer flex items-center justify-center p-1 -ml-1 shrink-0">
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
            ) : (
              <img src={campusFlowLogo} alt="CampusFlow Logo" className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-white object-contain border border-slate-200 shadow-sm shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-serif text-[12.5px] sm:text-[14px] font-bold text-maroon leading-tight truncate">
                {mobileTitle || 'CampusFlow'}
              </div>
              {!mobileTitle && (
                <div className="text-[7.5px] sm:text-[8.5px] text-text-muted tracking-[0.06em] uppercase font-bold mt-0.5 whitespace-nowrap">
                  Student Portal
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
            {location.pathname === '/student/dashboard' && (
              <GlobalSearch isMobile={true} onAiPrompt={handleAiPrompt} />
            )}
            <NotificationDropdown isMobile={true} />
            <ProfileDropdown />
          </div>
        </header>

        {/* Desktop Top Bar (Hidden on Mobile) */}
        <header className="hidden md:flex items-center justify-end sticky top-0 z-40 bg-white border-b border-border h-17.5" style={{ background: M.white, borderBottom: `1px solid ${M.border}`, height: '70px', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', height: '100%', padding: '0 40px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <GlobalSearch onAiPrompt={handleAiPrompt} />
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 w-full max-w-300 mx-auto p-0 md:p-10 pb-22 md:pb-10" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
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
