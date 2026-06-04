import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../../services/authService'
import crmcLogo from '../../assets/crmc-logo.webp'

const BRAND = {
  maroon: '#7B1A2A', maroonLight: '#F9F0F1',
  gold: '#B8900A',
  gray400: '#9C9690', gray600: '#504B46', text: '#1C1917',
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', student_id: '', priority_class: 'regular' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await registerUser(form)
      navigate('/login', { state: { message: 'Account created! Please sign in.' } })
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inp = () => ({
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1.5px solid #E5E1DC', background: '#FAFAF8',
    color: BRAND.text, fontSize: '13px', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color .15s',
  })
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 600, color: BRAND.gray600, marginBottom: '5px', letterSpacing: '0.03em' }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>

        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: BRAND.gray400, textDecoration: 'none', marginBottom: '1.5rem' }}>
          ← Back to home
        </Link>

        {/* Card */}
        <div style={{ background: 'white', border: '1px solid #EAE7E2', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          {/* Card header */}
          <div style={{ background: BRAND.maroon, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={crmcLogo} alt="CRMC" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(240,192,64,0.4)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '17px', color: '#F0C040' }}>Create Your Account</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>CampusFlow · CRMC Registrar System</div>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '1.75rem 2rem' }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: BRAND.maroonLight, border: '1px solid #FECACA', color: BRAND.maroon, fontSize: '13px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Juan" style={inp()}
                    onFocus={e => e.target.style.borderColor = BRAND.maroon}
                    onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Dela Cruz" style={inp()}
                    onFocus={e => e.target.style.borderColor = BRAND.maroon}
                    onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Student ID</label>
                <input type="text" name="student_id" value={form.student_id} onChange={handleChange} placeholder="2021-00001" style={inp()}
                  onFocus={e => e.target.style.borderColor = BRAND.maroon}
                  onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Email Address</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" style={inp()}
                  onFocus={e => e.target.style.borderColor = BRAND.maroon}
                  onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="At least 6 characters" style={inp()}
                  onFocus={e => e.target.style.borderColor = BRAND.maroon}
                  onBlur={e => e.target.style.borderColor = '#E5E1DC'} />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={lbl}>Priority Classification</label>
                <select name="priority_class" value={form.priority_class} onChange={handleChange} style={{ ...inp(), appearance: 'none', background: '#FAFAF8' }}>
                  <option value="regular">Regular Student</option>
                  <option value="graduating">Graduating Student</option>
                  <option value="pwd">PWD</option>
                  <option value="transferee">Transferee</option>
                </select>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
                background: loading ? '#B8667A' : BRAND.maroon,
                color: 'white', fontSize: '14px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: `0 3px 14px rgba(123,26,42,0.2)`,
              }}>
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>

            <p style={{ fontSize: '13px', color: BRAND.gray400, marginTop: '1.25rem', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: BRAND.maroon, textDecoration: 'none', fontWeight: 600 }}>Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}