import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { loginUser } from '../../services/authService'
import crmcLogo from '../../assets/crmc-logo.webp'

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
  border:       '#E5E1DC',
  text:         '#1C1917',
  textSub:      '#504B46',
  textMuted:    '#9C9690',
  green:        '#166534',
  greenLight:   '#F0FDF4',
  greenBorder:  '#BBF7D0',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
}

export default function Login() {
  const navigate        = useNavigate()
  const location        = useLocation()
  const { login }       = useAuth()
  const width           = useWindowWidth()
  const isMobile        = width < 768
  const [form, setForm] = useState({ email: localStorage.getItem('rememberedEmail') || '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'))
  const successMessage        = location.state?.message

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      const result = await loginUser(form)
      login(result.access_token, result.user)
      const role = result.user.role
      if (role === 'student') navigate('/student/dashboard')
      else if (role === 'staff') navigate('/staff/dashboard')
      else navigate('/admin/dashboard')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inp = () => ({
    width: '100%',
    padding: isMobile ? '13px 14px' : '11px 14px',
    borderRadius: '8px',
    border: `1.5px solid ${M.border}`,
    background: M.offWhite,
    color: M.text,
    fontSize: isMobile ? '15px' : '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'IBM Plex Sans', sans-serif",
    transition: 'border-color .15s',
    minHeight: isMobile ? '52px' : 'auto',
  })

  /* ───────── Mobile layout ───────── */
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: M.offWhite,
        fontFamily: "'IBM Plex Sans', sans-serif",
        maxWidth: '480px',
        margin: '0 auto',
        paddingBottom: '96px',
      }}>

        {/* Hero banner */}
        <div style={{
          background: `linear-gradient(160deg, ${M.maroon} 0%, ${M.maroonDark} 100%)`,
          padding: '36px 20px 56px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}>
          {/* Dot grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'radial-gradient(circle, #F0C040 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          {/* Gold blob */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,144,10,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          {/* White arc */}
          <div style={{ position: 'absolute', bottom: '-48px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '96px', borderRadius: '50%', background: M.offWhite, pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                ← Back to home
              </Link>
            </div>
            <img src={crmcLogo} alt="CRMC" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid rgba(184,144,10,0.45)', boxShadow: '0 0 32px rgba(184,144,10,0.18)', marginBottom: '14px' }} />
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '13px', color: M.gold, marginBottom: '6px' }}>CampusFlow</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 700, color: M.white, margin: '0 0 8px', lineHeight: 1.1 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
              Sign in to manage your registrar appointments
            </p>
          </div>
        </div>

        {/* Form card */}
        <main style={{ padding: '0 16px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ background: M.white, borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)', padding: '24px 20px', marginTop: '-20px', position: 'relative' }}>

            {successMessage && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: M.greenLight, border: `1px solid ${M.greenBorder}`, color: M.green, fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span>✓</span> {successMessage}
              </div>
            )}
            {error && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: M.redLight, border: `1px solid ${M.redBorder}`, color: M.red, fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: M.textSub, marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" style={inp()}
                  onFocus={e => e.target.style.borderColor = M.maroon}
                  onBlur={e => e.target.style.borderColor = M.border} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: M.textSub, marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" style={{ ...inp(), paddingRight: '48px' }}
                    onFocus={e => e.target.style.borderColor = M.maroon}
                    onBlur={e => e.target.style.borderColor = M.border} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 0, color: M.textMuted, cursor: 'pointer', display: 'flex' }}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    )}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: M.maroon, width: '14px', height: '14px', cursor: 'pointer', margin: 0 }} />
                    <span style={{ fontSize: '12px', color: M.textSub, fontWeight: 500 }}>Remember me</span>
                  </label>
                  <Link to="/forgot-password" style={{ fontSize: '12px', color: M.maroon, textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', minHeight: '52px', padding: '14px 24px',
                borderRadius: '10px', border: 'none',
                background: loading ? '#B8667A' : M.maroon, color: M.white,
                fontSize: '15px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                boxShadow: '0 4px 20px rgba(123,26,42,0.25)',
                transition: 'background 0.15s',
              }}>
                {loading ? <span className="spinner" /> : 'Sign In →'}
              </button>
            </form>

            <p style={{ fontSize: '13px', color: M.textMuted, marginTop: '20px', textAlign: 'center' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: M.maroon, textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
            </p>
          </div>

          {/* Perks strip */}
          <div style={{ marginTop: '20px', background: M.white, borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((perk, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${M.border}` : 'none' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, background: M.goldLight, border: `1px solid ${M.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: M.gold, fontSize: '10px', fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ fontSize: '13px', color: M.textSub }}>{perk}</span>
              </div>
            ))}
          </div>
        </main>


      </div>
    )
  }

  /* ───────── Desktop layout ───────── */
  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, display: 'flex', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Left — maroon panel */}
      <div style={{
        width: '400px', background: M.maroon,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid rgba(240,192,64,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(240,192,64,0.1)' }} />

        <img src={crmcLogo} alt="CRMC" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid rgba(240,192,64,0.4)', boxShadow: '0 0 40px rgba(240,192,64,0.15)', marginBottom: '1.5rem', position: 'relative' }} />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.3rem', fontWeight: 700, color: 'white', textAlign: 'center', margin: '0 0 8px' }}>
          Cebu Roosevelt<br />Memorial Colleges
        </h2>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', margin: '0 0 2.5rem', lineHeight: 1.6 }}>
          College of Computer Studies<br />BSIT Capstone 2026
        </p>
        <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
          {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(240,192,64,0.15)', border: '1px solid rgba(240,192,64,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#F0C040', fontSize: '9px' }}>✓</span>
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: M.textMuted, textDecoration: 'none', marginBottom: '2rem' }}>
            ← Back to home
          </Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.85rem', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: M.textMuted, margin: '0 0 2rem' }}>
            Sign in to manage your registrar appointments
          </p>

          {successMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.greenLight, border: `1px solid ${M.greenBorder}`, color: M.green, fontSize: '13px', marginBottom: '1rem' }}>
              {successMessage}
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, border: '1px solid #FECACA', color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: M.textSub, marginBottom: '5px', letterSpacing: '0.03em' }}>Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" style={inp()}
                onFocus={e => e.target.style.borderColor = M.maroon}
                onBlur={e => e.target.style.borderColor = M.border} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: M.textSub, marginBottom: '5px', letterSpacing: '0.03em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" style={{ ...inp(), paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = M.maroon}
                  onBlur={e => e.target.style.borderColor = M.border} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 0, color: M.textMuted, cursor: 'pointer', display: 'flex' }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: M.maroon, width: '14px', height: '14px', cursor: 'pointer', margin: 0 }} />
                  <span style={{ fontSize: '12px', color: M.textSub, fontWeight: 500 }}>Remember me</span>
                </label>
                <Link to="/forgot-password" style={{ fontSize: '12px', color: M.maroon, textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
              background: loading ? '#B8667A' : M.maroon, color: 'white',
              fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
              boxShadow: '0 3px 14px rgba(123,26,42,0.25)',
            }}>
              {loading ? <span className="spinner" /> : 'Sign In →'}
            </button>
          </form>

          <p style={{ fontSize: '13px', color: M.textMuted, marginTop: '1.5rem', textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: M.maroon, textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}