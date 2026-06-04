import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import crmcLogo from '../assets/crmc-logo.webp'

const BRAND = {
  maroon: '#7B1A2A',
  maroonDark: '#5E1421',
  maroonLight: '#F9F0F1',
  gold: '#B8900A',
  goldLight: '#FDF6E3',
  white: '#FFFFFF',
  offWhite: '#F9F7F4',
  gray100: '#F4F2EF',
  gray500: '#706B65',
  gray800: '#2A2520',
  text: '#1C1917',
}

const FEATURES = [
  { icon: '📅', title: 'Online Appointment Booking', desc: 'Schedule TOR, COE, or Diploma requests anytime — no need to line up just to get a number.' },
  { icon: '🎫', title: 'Digital Queue Number', desc: 'Receive your queue number on your phone the moment you arrive on campus.' },
  { icon: '👣', title: 'Step-by-Step Guidance', desc: 'Know exactly which counter to go to next. No confusion, no unnecessary wandering.' },
  { icon: '🤖', title: 'AI Scheduling Assistant', desc: 'Ask anything about requirements, schedules, or procedures — conversationally.' },
  { icon: '⚡', title: 'Real-Time Step Tracking', desc: 'Your progress updates live as each registrar counter confirms your transaction.' },
  { icon: '📊', title: 'Smart Admin Reports', desc: 'Registrar staff see analytics, demand forecasts, and AI insights at a glance.' },
]

const STEPS = [
  { step: '01', title: 'Book Online', desc: 'Pick your transaction type, choose a date and time slot, and confirm — all from your phone.' },
  { step: '02', title: 'Get Your Number', desc: "On your appointment day, tap 'Get Queue Number' and receive your digital ticket instantly." },
  { step: '03', title: 'Track Your Progress', desc: 'Watch your steps update in real time as each counter confirms your transaction.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handlePrimary = () => {
    if (user) {
      if (user.role === 'student') navigate('/student/dashboard')
      else if (user.role === 'staff') navigate('/staff/dashboard')
      else navigate('/admin/dashboard')
    } else {
      navigate('/register')
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: BRAND.white, minHeight: '100vh', color: BRAND.text }}>

      {/* ── Navbar ── */}
      <nav style={{
        background: BRAND.maroon,
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(123,26,42,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={crmcLogo} alt="CRMC" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(196,154,14,0.5)' }} />
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '17px', color: '#F0C040', lineHeight: 1.1 }}>CampusFlow</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>CRMC Registrar System</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user ? (
            <button onClick={handlePrimary} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#F0C040', color: BRAND.maroon, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                Login
              </button>
              <button onClick={() => navigate('/register')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#F0C040', color: BRAND.maroon, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(135deg, ${BRAND.maroon} 0%, #9B2335 50%, #7B1A2A 100%)`,
        padding: '5rem 2rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, #F0C040 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Gold arc */}
        <div style={{
          position: 'absolute', bottom: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '240px', borderRadius: '50%',
          background: BRAND.white,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <img src={crmcLogo} alt="CRMC" style={{
              width: '88px', height: '88px', borderRadius: '50%',
              border: '3px solid rgba(240,192,64,0.5)',
              boxShadow: '0 0 48px rgba(240,192,64,0.2)',
            }} />
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 16px', borderRadius: '100px',
            border: '1px solid rgba(240,192,64,0.3)',
            background: 'rgba(240,192,64,0.1)',
            marginBottom: '1.5rem',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F0C040', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', color: '#F0C040', fontWeight: 500, letterSpacing: '0.05em' }}>
              College of Computer Studies · BSIT Capstone 2026
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)',
            fontWeight: 800, color: 'white',
            margin: '0 0 1.25rem', lineHeight: 1.1,
          }}>
            No More Long Lines<br />
            at the <span style={{ color: '#F0C040' }}>Registrar's Office</span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.1rem)', color: 'rgba(255,255,255,0.7)', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            CampusFlow is an AI-powered appointment and queue management system guiding CRMC students through every registrar transaction.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handlePrimary} style={{
              padding: '14px 34px', borderRadius: '10px', border: 'none',
              background: '#F0C040', color: BRAND.maroon,
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(240,192,64,0.3)',
            }}>
              {user ? 'Go to Dashboard →' : 'Book an Appointment →'}
            </button>
            {!user && (
              <button onClick={() => navigate('/login')} style={{
                padding: '14px 34px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent', color: 'white',
                fontSize: '15px', fontWeight: 500, cursor: 'pointer',
              }}>
                Sign in to your account
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '48px', marginTop: '4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { value: '3 Types', label: 'Registrar Transactions' },
              { value: 'AI-Powered', label: 'Scheduling Assistant' },
              { value: 'Real-Time', label: 'Queue Tracking' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: '#F0C040' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '5rem 2rem', background: BRAND.offWhite }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: BRAND.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              What CampusFlow Does
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, color: BRAND.maroon, margin: 0 }}>
              Everything You Need,<br />Built Into One System
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: '1.5rem', borderRadius: '14px',
                background: BRAND.white,
                border: `1px solid ${BRAND.gray100}`,
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: BRAND.maroonLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', marginBottom: '14px',
                }}>{f.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: BRAND.maroon, margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: BRAND.gray500, margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '5rem 2rem', background: BRAND.white }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: BRAND.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Simple Process
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, color: BRAND.maroon, margin: '0 0 3.5rem' }}>
            From Booking to Done<br />in Three Steps
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem' }}>
            {STEPS.map((s, i) => (
              <div key={i}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: BRAND.maroon,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700, fontSize: '16px', color: '#F0C040',
                  boxShadow: `0 4px 16px rgba(123,26,42,0.2)`,
                }}>{s.step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: BRAND.maroon, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: BRAND.gray500, margin: 0, lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '4.5rem 2rem', background: BRAND.goldLight, borderTop: `4px solid ${BRAND.gold}` }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800, color: BRAND.maroon, margin: '0 0 1rem' }}>
            Ready to Skip the Line?
          </h2>
          <p style={{ fontSize: '15px', color: BRAND.gray500, margin: '0 0 1.75rem', lineHeight: 1.65 }}>
            Create your CampusFlow account and book your next registrar appointment in under 2 minutes.
          </p>
          <button onClick={handlePrimary} style={{
            padding: '14px 36px', borderRadius: '10px', border: 'none',
            background: BRAND.maroon, color: 'white',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 20px rgba(123,26,42,0.25)`,
          }}>
            {user ? 'Go to Dashboard →' : 'Create Free Account →'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: BRAND.maroon,
        padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={crmcLogo} alt="CRMC" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Cebu Roosevelt Memorial Colleges</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>College of Computer Studies · BSIT Capstone 2026</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          SDG 4 · Quality Education &nbsp;·&nbsp; SDG 9 · Innovation
        </div>
      </footer>
    </div>
  )
}