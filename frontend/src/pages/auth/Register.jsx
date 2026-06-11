import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, verifyStudent } from '../../services/authService'
import { Eye, EyeOff } from 'lucide-react'
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
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
}

export default function Register() {
  const navigate   = useNavigate()
  const width      = useWindowWidth()
  const isMobile   = width < 768
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '', student_id: '', priority_class: 'regular', course: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  const handleVerify = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      if (!form.student_id.trim()) throw new Error('Please enter a Student ID')
      const studentData = await verifyStudent(form.student_id.trim())
      setForm(prev => ({
        ...prev,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        course: studentData.course
      }))
      setStep(2)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }
    try {
      await registerUser(form)
      navigate('/login', { state: { message: 'Account created! Please sign in.' } })
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
    fontSize: isMobile ? '15px' : '13px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'IBM Plex Sans', sans-serif",
    transition: 'border-color .15s',
    minHeight: isMobile ? '52px' : 'auto',
  })

  const lbl = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: M.textSub,
    marginBottom: isMobile ? '6px' : '5px',
    letterSpacing: isMobile ? '0.06em' : '0.03em',
    textTransform: isMobile ? 'uppercase' : 'none',
  }

  const errorBanner = error && (
    <div style={{
      padding: '12px 14px', borderRadius: '10px',
      background: M.redLight, border: `1px solid ${M.redBorder}`,
      color: M.red, fontSize: '13px', marginBottom: '16px',
      display: 'flex', gap: '8px', alignItems: 'flex-start',
    }}>
      <span>⚠</span> {error}
    </div>
  )

  /* ───────── Mobile layout ───────── */
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: M.offWhite,
        fontFamily: "'IBM Plex Sans', sans-serif",
        maxWidth: '480px',
        margin: '0 auto',
        paddingBottom: '100px',
      }}>

        {/* Hero banner */}
        <div style={{
          background: `linear-gradient(160deg, ${M.maroon} 0%, ${M.maroonDark} 100%)`,
          padding: '36px 20px 56px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'radial-gradient(circle, #F0C040 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,144,10,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-48px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '96px', borderRadius: '50%', background: M.offWhite, pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                ← Back to home
              </Link>
            </div>
            <img src={crmcLogo} alt="CRMC" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid rgba(184,144,10,0.45)', boxShadow: '0 0 32px rgba(184,144,10,0.18)', marginBottom: '14px' }} />
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '13px', color: M.gold, marginBottom: '6px' }}>CampusFlow</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(24px, 7vw, 30px)', fontWeight: 700, color: M.white, margin: '0 0 8px', lineHeight: 1.1 }}>
              Create Your Account
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
              Join CampusFlow to manage your registrar appointments
            </p>
          </div>
        </div>

        {/* Form card */}
        <main style={{ padding: '0 16px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ background: M.white, borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)', padding: '24px 20px', marginTop: '-20px', position: 'relative' }}>

            {errorBanner}

            {step === 1 ? (
              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={lbl}>Student ID</label>
                  <input type="text" name="student_id" value={form.student_id} onChange={handleChange} required placeholder="202400001" pattern="^\d{9,13}$" title="Format: 9 to 13 numbers" style={inp()}
                    onFocus={e => e.target.style.borderColor = M.maroon}
                    onBlur={e => e.target.style.borderColor = M.border} />
                  <p style={{ fontSize: '11px', color: M.textSub, marginTop: '8px' }}>We need to verify your ID against the school records before creating an account.</p>
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
                  {loading ? <span className="spinner" /> : 'Verify ID →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px', padding: '12px', background: M.goldLight, borderRadius: '10px', border: `1px solid ${M.goldBorder}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified Student</span>
                    <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: M.maroon, fontSize: '11px', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Change ID</button>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, marginBottom: '2px' }}>{form.first_name} {form.last_name}</div>
                  <div style={{ fontSize: '12px', color: M.textSub }}>{form.student_id} • {form.course}</div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" style={inp()}
                    onFocus={e => e.target.style.borderColor = M.maroon}
                    onBlur={e => e.target.style.borderColor = M.border} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" style={{...inp(), paddingRight: '40px'}}
                      onFocus={e => e.target.style.borderColor = M.maroon}
                      onBlur={e => e.target.style.borderColor = M.border} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 0, color: M.textMuted, cursor: 'pointer', display: 'flex' }} title={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={8} placeholder="Confirm your password" style={{...inp(), paddingRight: '40px'}}
                      onFocus={e => e.target.style.borderColor = M.maroon}
                      onBlur={e => e.target.style.borderColor = M.border} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 0, color: M.textMuted, cursor: 'pointer', display: 'flex' }} title={showConfirm ? "Hide password" : "Show password"}>
                      {showConfirm ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={lbl}>Priority Classification</label>
                  <select name="priority_class" value={form.priority_class} onChange={handleChange} style={{ ...inp(), appearance: 'none', background: M.offWhite }}>
                    <option value="regular">Regular Student</option>
                    <option value="graduating">Graduating Student</option>
                    <option value="pwd">PWD</option>
                    <option value="transferee">Transferee</option>
                  </select>
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
                  {loading ? <span className="spinner" /> : 'Create Account →'}
                </button>
              </form>
            )}

            <p style={{ fontSize: '13px', color: M.textMuted, marginTop: '20px', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: M.maroon, textDecoration: 'none', fontWeight: 600 }}>Sign in here</Link>
            </p>
          </div>
        </main>


      </div>
    )
  }

  /* ───────── Desktop layout ───────── */
  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>

        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: M.textMuted, textDecoration: 'none', marginBottom: '1.5rem' }}>
          ← Back to home
        </Link>

        <div style={{ background: 'white', border: `1px solid ${M.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          {/* Card header */}
          <div style={{ background: M.maroon, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={crmcLogo} alt="CRMC" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(240,192,64,0.4)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '17px', color: '#F0C040' }}>Create Your Account</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>CampusFlow · CRMC Registrar System</div>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '1.75rem 2rem' }}>
            {errorBanner}

            {step === 1 ? (
              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={lbl}>Student ID</label>
                  <input type="text" name="student_id" value={form.student_id} onChange={handleChange} required placeholder="202400001" pattern="^\d{9,13}$" title="Format: 9 to 13 numbers" style={inp()}
                    onFocus={e => e.target.style.borderColor = M.maroon}
                    onBlur={e => e.target.style.borderColor = M.border} />
                  <p style={{ fontSize: '11px', color: M.textSub, marginTop: '8px' }}>We need to verify your ID against the school records before creating an account.</p>
                </div>

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
                  background: loading ? '#B8667A' : M.maroon, color: 'white',
                  fontSize: '14px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  boxShadow: '0 3px 14px rgba(123,26,42,0.2)',
                }}>
                  {loading ? <span className="spinner" /> : 'Verify ID →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px', padding: '12px', background: M.goldLight, borderRadius: '10px', border: `1px solid ${M.goldBorder}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified Student</span>
                    <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: M.maroon, fontSize: '11px', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Change ID</button>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, marginBottom: '2px' }}>{form.first_name} {form.last_name}</div>
                  <div style={{ fontSize: '12px', color: M.textSub }}>{form.student_id} • {form.course}</div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" style={inp()}
                    onFocus={e => e.target.style.borderColor = M.maroon}
                    onBlur={e => e.target.style.borderColor = M.border} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" style={{...inp(), paddingRight: '40px'}}
                      onFocus={e => e.target.style.borderColor = M.maroon}
                      onBlur={e => e.target.style.borderColor = M.border} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 0, color: M.textMuted, cursor: 'pointer', display: 'flex' }} title={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={8} placeholder="Confirm your password" style={{...inp(), paddingRight: '40px'}}
                      onFocus={e => e.target.style.borderColor = M.maroon}
                      onBlur={e => e.target.style.borderColor = M.border} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 0, color: M.textMuted, cursor: 'pointer', display: 'flex' }} title={showConfirm ? "Hide password" : "Show password"}>
                      {showConfirm ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={lbl}>Priority Classification</label>
                  <select name="priority_class" value={form.priority_class} onChange={handleChange} style={{ ...inp(), appearance: 'none', background: M.offWhite }}>
                    <option value="regular">Regular Student</option>
                    <option value="graduating">Graduating Student</option>
                    <option value="pwd">PWD</option>
                    <option value="transferee">Transferee</option>
                  </select>
                </div>

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
                  background: loading ? '#B8667A' : M.maroon, color: 'white',
                  fontSize: '14px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  boxShadow: '0 3px 14px rgba(123,26,42,0.2)',
                }}>
                  {loading ? <span className="spinner" /> : 'Create Account →'}
                </button>
              </form>
            )}

            <p style={{ fontSize: '13px', color: M.textMuted, marginTop: '1.25rem', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: M.maroon, textDecoration: 'none', fontWeight: 600 }}>Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}