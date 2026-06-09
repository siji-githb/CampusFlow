import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import crmcLogo from '../assets/crmc-logo.webp'

// ── Responsive hook ──
function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

// ── Tokens ──
const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.3)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  border:       '#EAE7E2',
  text:         '#1C1917',
  textSub:      '#57534E',
  textMuted:    '#A8A29E',
}

const FEATURES = [
  { icon: '📅', title: 'Online Appointment Booking', desc: 'Schedule TOR, COE, or Diploma requests anytime — no need to line up just to get a number.' },
  { icon: '🎫', title: 'Digital Queue Number',       desc: 'Receive your queue number on your phone the moment you arrive on campus.' },
  { icon: '👣', title: 'Step-by-Step Guidance',      desc: 'Know exactly which counter to go to next. No confusion, no unnecessary wandering.' },
  { icon: '🤖', title: 'AI Scheduling Assistant',    desc: 'Ask anything about requirements, schedules, or procedures — conversationally.' },
  { icon: '⚡', title: 'Real-Time Step Tracking',    desc: 'Your progress updates live as each registrar counter confirms your transaction.' },
  { icon: '📊', title: 'Smart Admin Reports',        desc: 'Registrar staff see analytics, demand forecasts, and AI insights at a glance.' },
]

const STEPS = [
  { step: '01', title: 'Book Online',         desc: 'Pick your transaction type, choose a date and time slot, and confirm — all from your phone.' },
  { step: '02', title: 'Get Your Number',     desc: "On your appointment day, tap 'Get Queue Number' and receive your digital ticket instantly." },
  { step: '03', title: 'Track Your Progress', desc: 'Watch your steps update in real time as each counter confirms your transaction.' },
]

export default function Landing() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const width     = useWindowWidth()
  const isMobile  = width < 768

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
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: M.white, minHeight: '100vh', color: M.text }}>

      {/* ── Navbar ── */}
      <nav style={{
        background: M.maroon,
        padding: isMobile ? '0 16px' : '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: isMobile ? '56px' : '64px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(123,26,42,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={crmcLogo} alt="CRMC" style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', borderRadius: '50%', border: '2px solid rgba(184,144,10,0.5)', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: isMobile ? '15px' : '17px', color: '#F0C040', lineHeight: 1.1 }}>CampusFlow</div>
            {!isMobile && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>CRMC Registrar System</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user ? (
            <button onClick={handlePrimary} style={{ padding: isMobile ? '7px 14px' : '8px 20px', borderRadius: '8px', border: 'none', background: '#F0C040', color: M.maroon, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              Dashboard →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{ padding: isMobile ? '7px 12px' : '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                Login
              </button>
              <button onClick={() => navigate('/register')} style={{ padding: isMobile ? '7px 14px' : '8px 20px', borderRadius: '8px', border: 'none', background: '#F0C040', color: M.maroon, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(135deg, ${M.maroon} 0%, #9B2335 50%, ${M.maroon} 100%)`,
        padding: isMobile ? '40px 20px 64px' : '5rem 2rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06, backgroundImage: 'radial-gradient(circle, #F0C040 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        {/* White arc */}
        <div style={{ position: 'absolute', bottom: isMobile ? '-48px' : '-120px', left: '50%', transform: 'translateX(-50%)', width: isMobile ? '600px' : '900px', height: isMobile ? '100px' : '240px', borderRadius: '50%', background: M.white, pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ marginBottom: isMobile ? '16px' : '1.5rem' }}>
            <img src={crmcLogo} alt="CRMC" style={{
              width: isMobile ? '72px' : '88px',
              height: isMobile ? '72px' : '88px',
              borderRadius: '50%',
              border: '3px solid rgba(240,192,64,0.5)',
              boxShadow: '0 0 48px rgba(240,192,64,0.2)',
            }} />
          </div>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: isMobile ? '4px 14px' : '5px 16px', borderRadius: '100px', border: '1px solid rgba(240,192,64,0.3)', background: 'rgba(240,192,64,0.1)', marginBottom: isMobile ? '16px' : '1.5rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F0C040', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: isMobile ? '10px' : '11px', color: '#F0C040', fontWeight: 500, letterSpacing: '0.05em' }}>
              {isMobile ? 'BSIT Capstone 2026 · CRMC' : 'College of Computer Studies · BSIT Capstone 2026'}
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: isMobile ? 'clamp(26px, 8vw, 36px)' : 'clamp(2.2rem, 5.5vw, 3.8rem)',
            fontWeight: 800, color: 'white',
            margin: isMobile ? '0 0 16px' : '0 0 1.25rem', lineHeight: 1.1,
          }}>
            No More Long Lines<br />
            at the <span style={{ color: '#F0C040' }}>Registrar's Office</span>
          </h1>

          <p style={{ fontSize: isMobile ? '14px' : 'clamp(1rem, 2vw, 1.1rem)', color: 'rgba(255,255,255,0.7)', maxWidth: '520px', margin: isMobile ? '0 auto 24px' : '0 auto 2.5rem', lineHeight: 1.75 }}>
            CampusFlow is an AI-powered appointment and queue management system guiding CRMC students through every registrar transaction.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
            <button onClick={handlePrimary} style={{
              padding: isMobile ? '14px 24px' : '14px 34px', borderRadius: '10px', border: 'none',
              background: '#F0C040', color: M.maroon,
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
              minHeight: isMobile ? '52px' : 'auto',
              boxShadow: '0 4px 24px rgba(240,192,64,0.3)',
            }}>
              {user ? 'Go to Dashboard →' : 'Book an Appointment →'}
            </button>
            {!user && (
              <button onClick={() => navigate('/login')} style={{
                padding: isMobile ? '14px 24px' : '14px 34px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent', color: 'white',
                fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                minHeight: isMobile ? '52px' : 'auto',
              }}>
                Sign in to your account
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: isMobile ? '0' : '48px', marginTop: isMobile ? '32px' : '4rem', justifyContent: 'space-around', flexWrap: 'wrap', paddingTop: isMobile ? '24px' : '0', borderTop: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
            {[
              { value: '3 Types', label: 'Transactions' },
              { value: 'AI', label: 'Powered' },
              { value: 'Live', label: 'Queue' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? '18px' : '1.2rem', fontWeight: 700, color: '#F0C040' }}>{s.value}</div>
                <div style={{ fontSize: isMobile ? '10px' : '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: isMobile ? '40px 16px' : '5rem 2rem', background: M.offWhite }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '3rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px', margin: '0 0 8px' }}>
              What CampusFlow Does
            </p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? '22px' : 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, color: M.maroon, margin: 0, lineHeight: 1.2 }}>
              Everything You Need,<br />Built Into One System
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(290px, 1fr))', gap: isMobile ? '12px' : '16px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: isMobile ? '16px' : '1.5rem',
                borderRadius: '14px',
                background: M.white,
                border: `1px solid ${M.border}`,
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                display: isMobile ? 'flex' : 'block',
                gap: isMobile ? '14px' : '0',
                alignItems: isMobile ? 'flex-start' : 'initial',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: isMobile ? '12px' : '10px',
                  background: M.maroonLight, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', marginBottom: isMobile ? '0' : '14px',
                }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.maroon, margin: isMobile ? '0 0 4px' : '0 0 8px' }}>{f.title}</h3>
                  <p style={{ fontSize: '13px', color: M.textSub, margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section style={{ padding: isMobile ? '40px 16px' : '5rem 2rem', background: M.white }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Simple Process
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? '22px' : 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, color: M.maroon, margin: isMobile ? '0 0 32px' : '0 0 3.5rem', lineHeight: 1.2 }}>
            From Booking to Done<br />in Three Steps
          </h2>

          {isMobile ? (
            /* Mobile: vertical timeline */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', textAlign: 'left' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: M.maroon,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 700, fontSize: '14px', color: '#F0C040',
                      boxShadow: '0 4px 16px rgba(123,26,42,0.2)',
                      flexShrink: 0,
                    }}>{s.step}</div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: '1px', flex: 1, minHeight: '32px', background: `linear-gradient(${M.maroonBorder}, transparent)`, margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < STEPS.length - 1 ? '32px' : '0', paddingTop: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.maroon, margin: '0 0 6px' }}>{s.title}</h3>
                    <p style={{ fontSize: '13px', color: M.textSub, margin: 0, lineHeight: 1.65 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: horizontal grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem' }}>
              {STEPS.map((s, i) => (
                <div key={i}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: M.maroon,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 700, fontSize: '16px', color: '#F0C040',
                    boxShadow: '0 4px 16px rgba(123,26,42,0.2)',
                  }}>{s.step}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: M.maroon, margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ fontSize: '13px', color: M.textSub, margin: 0, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: isMobile ? '36px 20px' : '4.5rem 2rem', background: M.goldLight, borderTop: `${isMobile ? '3px' : '4px'} solid ${M.gold}`, textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? '22px' : 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800, color: M.maroon, margin: isMobile ? '0 0 12px' : '0 0 1rem', lineHeight: 1.2 }}>
            Ready to Skip the Line?
          </h2>
          <p style={{ fontSize: isMobile ? '14px' : '15px', color: M.textSub, margin: isMobile ? '0 0 24px' : '0 0 1.75rem', lineHeight: 1.65 }}>
            Create your CampusFlow account and book your next registrar appointment in under 2 minutes.
          </p>
          <button onClick={handlePrimary} style={{
            padding: isMobile ? '14px 24px' : '14px 36px', borderRadius: '10px', border: 'none',
            background: M.maroon, color: 'white',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            minHeight: isMobile ? '52px' : 'auto',
            width: isMobile ? '100%' : 'auto',
            boxShadow: '0 4px 20px rgba(123,26,42,0.25)',
          }}>
            {user ? 'Go to Dashboard →' : 'Create Free Account →'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: M.maroon,
        padding: isMobile ? '20px 16px' : '1.5rem 2rem',
        display: 'flex',
        alignItems: isMobile ? 'center' : 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: isMobile ? '10px' : '1rem',
        textAlign: isMobile ? 'center' : 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={crmcLogo} alt="CRMC" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Cebu Roosevelt Memorial Colleges</div>
            <div style={{ fontSize: isMobile ? '10px' : '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>College of Computer Studies · BSIT Capstone 2026</div>
          </div>
        </div>
        <div style={{ fontSize: isMobile ? '10px' : '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
          SDG 4 · Quality Education &nbsp;·&nbsp; SDG 9 · Innovation
        </div>
      </footer>
    </div>
  )
}