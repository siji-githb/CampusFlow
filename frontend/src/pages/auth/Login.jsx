import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { loginUser } from '../../services/authService'
import crmcLogo from '../../assets/crmc-logo.webp'

const BRAND = {
  maroon: '#7B1A2A', maroonLight: '#F9F0F1',
  gold: '#B8900A', goldLight: '#FDF6E3',
  gray400: '#9C9690', gray600: '#504B46', text: '#1C1917',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const successMessage = location.state?.message

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const result = await loginUser(form)
      login(result.access_token, result.user)
      const role = result.user.role
      if (role === 'student') navigate('/student/dashboard')
      else if (role === 'staff') navigate('/staff/dashboard')
      else navigate('/admin/dashboard')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inp = (extra = {}) => ({
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1.5px solid #E5E1DC', background: '#FAFAF8',
    color: BRAND.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color .15s', ...extra,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Left — maroon panel */}
      <div style={{
        width: '400px', background: BRAND.maroon,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid rgba(240,192,64,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(240,192,64,0.1)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(240,192,64,0.12)' }} />

        <img src={crmcLogo} alt="CRMC" style={{
          width: '80px', height: '80px', borderRadius: '50%',
          border: '3px solid rgba(240,192,64,0.4)',
          boxShadow: '0 0 40px rgba(240,192,64,0.15)',
          marginBottom: '1.5rem', position: 'relative',
        }} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: 'white', textAlign: 'center', margin: '0 0 8px' }}>
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
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: BRAND.gray400, textDecoration: 'none', marginBottom: '2rem' }}>
            ← Back to home
          </Link>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.85rem', fontWeight: 700, color: BRAND.maroon, margin: '0 0 6px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: BRAND.gray400, margin: '0 0 2rem' }}>
            Sign in to manage your registrar appointments
          </p>

          {successMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '13px', marginBottom: '1rem' }}>
              {successMessage}
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: BRAND.maroonLight, border: '1px solid #FECACA', color: BRAND.maroon, fontSize: '13px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: BRAND.gray600, marginBottom: '5px', letterSpacing: '0.03em' }}>
                Email Address
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" style={inp()}
                onFocus={e => e.target.style.borderColor = BRAND.maroon}
                onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: BRAND.gray600, marginBottom: '5px', letterSpacing: '0.03em' }}>
                Password
              </label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" style={inp()}
                onFocus={e => e.target.style.borderColor = BRAND.maroon}
                onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
              background: loading ? '#B8667A' : BRAND.maroon,
              color: 'white', fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: `0 3px 14px rgba(123,26,42,0.25)`,
            }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ fontSize: '13px', color: BRAND.gray400, marginTop: '1.5rem', textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: BRAND.maroon, textDecoration: 'none', fontWeight: 600 }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}