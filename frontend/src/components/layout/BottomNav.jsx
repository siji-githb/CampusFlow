import { useNavigate } from 'react-router-dom';
import { Home, Calendar, ClipboardList, Ticket } from 'lucide-react';

const M = {
  maroon:        '#7B1A2A',
  white:         '#FFFFFF',
  border:        '#EAE7E2',
  textMuted:     '#A8A29E',
};

export default function BottomNav({ active }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'home',         label: 'Home',    icon: <Home size={20} />, path: '/student/dashboard' },
    { id: 'book',         label: 'Book',    icon: <Calendar size={20} />, path: '/student/book' },
    { id: 'appointments', label: 'Appointments', icon: <ClipboardList size={20} />, path: '/student/appointments' },
    { id: 'queue',        label: 'Queue',   icon: <Ticket size={20} />, path: '/student/queue' },
  ];
  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '64px',
        background: M.white,
        borderTop: `1px solid ${M.border}`,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'stretch',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => navigate(tab.path)} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '3px',
          border: 'none', background: 'none', cursor: 'pointer',
          borderTop: `2px solid ${active === tab.id ? M.maroon : 'transparent'}`,
          color: active === tab.id ? M.maroon : M.textMuted,
          transition: 'color 0.15s',
          minHeight: '52px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>{tab.icon}</span>
          <span style={{ fontSize: '10px', fontWeight: active === tab.id ? 600 : 400,
            fontFamily: "'Poppins', sans-serif" }}>{tab.label}</span>
        </button>
      ))}
      </nav>
    </>
  );
}
