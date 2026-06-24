import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import crmcLogo from '../../assets/crmc-logo.webp'

export default function Navbar({ user, onLogout, backTo, title, subtitle, children }) {
  const navigate = useNavigate()
  return (
    <nav style={{
      background: '#7B1A2A', padding: '0 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '60px', position: 'sticky', top: 0, zIndex: 40,
      boxShadow: '0 2px 8px rgba(123,26,42,0.2)',
      fontFamily: "'IBM Plex Sans', sans-serif", flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {backTo ? (
          <>
            <button onClick={() => navigate(backTo)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: '-4px' }}>
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{title}</span>
          </>
        ) : (
          <>
            <img src={crmcLogo} alt="CRMC" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(240,192,64,0.4)' }} />
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '15px', color: '#F0C040', lineHeight: 1.1 }}>CampusFlow</div>
              {subtitle && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {children}
        {user && <>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{user.first_name} {user.last_name}</span>
          <button onClick={onLogout} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
            Logout
          </button>
        </>}
      </div>
    </nav>
  )
}