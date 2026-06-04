import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray500: '#706B65', text: '#1C1917' }

const ACTIONS = [
  { icon: '📅', title: 'Book Appointment', desc: 'Schedule a registrar transaction', path: '/student/book', color: '#7B1A2A', btn: 'Book Now' },
  { icon: '🎫', title: 'My Queue', desc: 'Track your live transaction progress', path: '/student/queue', color: '#1D4ED8', btn: 'View Queue' },
  { icon: '📋', title: 'My Appointments', desc: 'View and manage all your bookings', path: '/student/appointments', color: '#6D28D9', btn: 'View All' },
  { icon: '🤖', title: 'AI Assistant', desc: 'Ask anything about transactions', path: '/student/ai-chat', color: '#0F766E', btn: 'Chat Now' },
]

const P_LABEL = { regular: 'Regular Student', graduating: 'Graduating Student', pwd: 'PWD', transferee: 'Transferee' }
const P_COLOR = { regular: '#1D4ED8', graduating: '#7B1A2A', pwd: '#7C3AED', transferee: '#B8900A' }

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const pc = user?.priority_class || 'regular'

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar user={user} subtitle="Student Portal" onLogout={() => { logout(); navigate('/login') }} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Welcome */}
        <div style={{ background: `linear-gradient(135deg, ${M.maroon} 0%, #9B2335 100%)`, borderRadius: '16px', padding: '1.75rem 2rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: 'white', margin: '0 0 8px' }}>
              Good day, {user?.first_name}! 👋
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {user?.student_id && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>ID: {user.student_id}</span>}
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#F0C040', background: 'rgba(240,192,64,0.15)', padding: '2px 10px', borderRadius: '100px', border: '1px solid rgba(240,192,64,0.25)' }}>
                {P_LABEL[pc]}
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem 1.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registrar Transactions</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#F0C040', fontFamily: "'Playfair Display', serif" }}>3 Types</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>TOR · COE · Diploma</div>
          </div>
        </div>

        {/* Actions grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '1.5rem' }}>
          {ACTIONS.map((a, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${a.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '14px', border: `1px solid ${a.color}20` }}>
                {a.icon}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>{a.title}</h3>
              <p style={{ fontSize: '12px', color: M.gray500, margin: '0 0 1.25rem', flex: 1, lineHeight: 1.55 }}>{a.desc}</p>
              <button onClick={() => navigate(a.path)} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: a.color, color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
                {a.btn} →
              </button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div style={{ padding: '1rem 1.25rem', background: M.goldLight, borderRadius: '10px', border: `1px solid ${M.gold}30`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span>ℹ️</span>
          <p style={{ fontSize: '12px', color: M.gold, margin: 0, lineHeight: 1.6 }}>
            <strong>Queue numbers are only available on your appointment day.</strong> Book first, then activate your queue number when you arrive at the Registrar's Office.
          </p>
        </div>
      </main>
    </div>
  )
}