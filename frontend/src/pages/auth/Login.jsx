import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { loginUser } from '../../services/authService'
import { Eye, EyeOff } from 'lucide-react'
import crmcLogo from '../../assets/crmc-logo.webp'

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const width = useWindowWidth()
  const isMobile = width < 768
  const [form, setForm] = useState({ email: localStorage.getItem('rememberedEmail') || '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'))
  const successMessage = location.state?.message

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

  const inpClass = `w-full rounded-lg border-[1.5px] border-border bg-off-white text-text-main outline-none box-border font-sans transition-colors duration-150 focus:border-maroon focus:ring-0 ${isMobile ? 'py-[13px] px-[14px] text-[15px] min-h-[52px]' : 'py-[11px] px-[14px] text-[14px]'}`

  if (isMobile) {
    return (
      <div className="min-h-screen bg-off-white font-sans max-w-[480px] mx-auto pb-24">
        <div className="bg-linear-to-br from-maroon to-maroon-dark pt-9 px-5 pb-14 relative overflow-hidden text-center">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#F0C040_1px,transparent_1px)] bg-size-[24px_24px]" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(184,144,10,0.18)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[600px] h-24 rounded-full bg-off-white pointer-events-none" />

          <div className="relative">
            <div className="text-left mb-4">
              <Link to="/" className="inline-flex items-center gap-1 text-[12px] text-white/50 no-underline">
                ← Back to home
              </Link>
            </div>
            <img src={crmcLogo} alt="CRMC" className="w-16 h-16 rounded-full border-2 border-gold/45 shadow-[0_0_32px_rgba(184,144,10,0.18)] mb-3.5 mx-auto" />
            <div className="font-serif font-bold text-[13px] text-gold mb-1.5">CampusFlow</div>
            <h1 className="font-serif text-[clamp(26px,7vw,32px)] font-bold text-white m-0 mb-2 leading-[1.1]">
              Welcome back
            </h1>
            <p className="text-[13px] text-white/55 m-0 leading-relaxed">
              Sign in to manage your registrar appointments
            </p>
          </div>
        </div>

        <main className="px-4 max-w-[480px] mx-auto">
          <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] py-6 px-5 -mt-5 relative">
            {successMessage && (
              <div className="py-3 px-3.5 rounded-lg bg-success-light border border-success-border text-success text-[13px] mb-4 flex gap-2 items-start">
                <span>✓</span> {successMessage}
              </div>
            )}
            {error && (
              <div className="py-3 px-3.5 rounded-lg bg-danger-light border border-danger-border text-danger text-[13px] mb-4 flex gap-2 items-start">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-text-sub mb-1.5 tracking-[0.06em] uppercase">Email Address</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" className={inpClass} />
              </div>
              <div className="mb-6">
                <label className="block text-[11px] font-semibold text-text-sub mb-1.5 tracking-[0.06em] uppercase">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" className={`${inpClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex">
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-maroon w-3.5 h-3.5 cursor-pointer m-0" />
                    <span className="text-[12px] text-text-sub font-medium">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-[12px] text-maroon no-underline font-semibold">Forgot password?</Link>
                </div>
              </div>
              <button type="submit" disabled={loading} className={`w-full min-h-[52px] py-3.5 px-6 rounded-lg border-none text-[15px] font-bold font-sans shadow-[0_4px_20px_rgba(123,26,42,0.25)] transition-colors duration-150 ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
                {loading ? <span className="spinner" /> : 'Sign In →'}
              </button>
            </form>

            <p className="text-[13px] text-text-muted mt-5 text-center">
              Don't have an account?{' '}
              <Link to="/register" className="text-maroon no-underline font-semibold">Register here</Link>
            </p>
          </div>

          <div className="mt-5 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
            {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((perk, i, arr) => (
              <div key={i} className={`flex items-center gap-3 py-3.5 px-4 ${i < arr.length - 1 ? 'border-b border-border' : 'border-none'}`}>
                <div className="w-[22px] h-[22px] rounded-full shrink-0 bg-gold-light border border-gold-border flex items-center justify-center">
                  <span className="text-gold text-[10px] font-bold">✓</span>
                </div>
                <span className="text-[13px] text-text-sub">{perk}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-off-white flex font-sans">
      <div className="w-[400px] bg-maroon flex flex-col items-center justify-center py-12 px-10 relative overflow-hidden shrink-0">
        <div className="absolute -top-16 -right-16 w-[200px] h-[200px] rounded-full border border-[rgba(240,192,64,0.15)]" />
        <div className="absolute -bottom-20 -left-20 w-[260px] h-[260px] rounded-full border border-[rgba(240,192,64,0.1)]" />

        <img src={crmcLogo} alt="CRMC" className="w-20 h-20 rounded-full border-4 border-gold/40 shadow-[0_0_40px_rgba(240,192,64,0.15)] mb-6 relative" />
        <h2 className="font-serif text-xl font-bold text-white text-center m-0 mb-2">
          Cebu Roosevelt<br />Memorial Colleges
        </h2>
        <p className="text-[12px] text-white/45 text-center m-0 mb-10 leading-relaxed">
          College of Computer Studies<br />BSIT Capstone 2026
        </p>
        <div className="w-full border-t border-white/10 pt-6">
          {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((item, i) => (
            <div key={i} className={`flex items-center gap-2.5 py-2 ${i < 2 ? 'border-b border-white/5' : 'border-none'}`}>
              <div className="w-[18px] h-[18px] rounded-full bg-[rgba(240,192,64,0.15)] border border-[rgba(240,192,64,0.35)] flex items-center justify-center shrink-0">
                <span className="text-[#F0C040] text-[9px]">✓</span>
              </div>
              <span className="text-[12px] text-white/55">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] text-text-muted no-underline mb-8">
            ← Back to home
          </Link>
          <h1 className="font-serif text-[1.85rem] font-bold text-maroon m-0 mb-1.5">
            Welcome back
          </h1>
          <p className="text-[13px] text-text-muted m-0 mb-8">
            Sign in to manage your registrar appointments
          </p>

          {successMessage && (
            <div className="py-2.5 px-3.5 rounded-lg bg-success-light border border-success-border text-success text-[13px] mb-4">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="py-2.5 px-3.5 rounded-lg bg-danger-light border border-danger-border text-danger text-[13px] mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-text-sub mb-1.5 tracking-wider">Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" className={inpClass} />
            </div>
            <div className="mb-6">
              <label className="block text-[12px] font-semibold text-text-sub mb-1.5 tracking-wider">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" className={`${inpClass} pr-11`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex">
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div className="flex justify-between items-center mt-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-maroon w-3.5 h-3.5 cursor-pointer m-0" />
                  <span className="text-[12px] text-text-sub font-medium">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-[12px] text-maroon no-underline font-semibold">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg border-none text-[14px] font-bold font-sans shadow-[0_3px_14px_rgba(123,26,42,0.25)] transition-colors duration-150 ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
              {loading ? <span className="spinner" /> : 'Sign In →'}
            </button>
          </form>

          <p className="text-[13px] text-text-muted mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-maroon no-underline font-semibold">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
