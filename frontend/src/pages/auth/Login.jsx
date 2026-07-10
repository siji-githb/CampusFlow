import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { loginUser } from '../../services/authService'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import campusFlowLogo from '../../assets/logo.png'
import loginImage from '../../assets/login.png'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
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
      login(result.access_token, result.user, result.refresh_token)
      const role = result.user.role
      if (role === 'student') navigate('/student/dashboard')
      else if (role === 'staff') navigate('/staff/dashboard')
      else navigate('/admin/dashboard')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      
      {/* ── Main Elevated Card ── */}
      <div className="w-full max-w-[1040px] bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ── Branding Panel (Left side on desktop, Top on mobile) ── */}
        <div className="w-full md:w-[45%] bg-slate-50/50 pt-14 pb-10 px-6 md:p-12 flex flex-col items-center justify-center md:justify-center relative border-b md:border-b-0 md:border-r border-slate-100 z-10 shrink-0">
          
          {/* Subtle Background Texture */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#7B1A2A_1px,transparent_1px)] bg-size-[24px_24px]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-maroon/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          {/* Mobile "Back to Home" */}
          <div className="absolute top-6 left-6 md:hidden z-20">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft size={14} /> Back to home
            </Link>
          </div>

          <div className="relative w-full max-w-[320px] text-center z-10 flex flex-col items-center">

            <img 
              src={campusFlowLogo} 
              alt="CampusFlow Logo" 
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-slate-200 shadow-sm mb-4 md:mb-6 object-cover bg-white" 
            />
            
            <div className="font-serif font-bold text-[13px] text-maroon mb-1 md:hidden tracking-wide uppercase">CampusFlow</div>
            
            <h2 className="hidden md:block font-serif text-[32px] font-bold text-slate-800 m-0 mb-1 leading-tight tracking-tight">
              CampusFlow
            </h2>
            <p className="hidden md:block text-[13px] text-slate-500 m-0 mb-8 leading-relaxed">
              Smart queueing and seamless registrar appointments for the modern campus.
            </p>

            <img 
              src={loginImage} 
              alt="CampusFlow Illustration" 
              className="w-full max-w-[240px] md:max-w-[280px] h-auto mb-8 object-contain drop-shadow-xl hover:scale-[1.02] transition-transform duration-500" 
            />

            <h1 className="font-serif text-[clamp(26px,7vw,32px)] font-bold text-slate-800 m-0 mb-2 leading-[1.1] md:hidden tracking-tight">
              Welcome back
            </h1>
            <p className="text-[13px] text-slate-500 m-0 leading-relaxed md:hidden">
              Sign in to manage your registrar appointments
            </p>

            <div className="hidden md:block w-full border-t border-slate-200 pt-6 mt-4">
              {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="w-[20px] h-[20px] rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-emerald-500 text-[10px] font-bold">✓</span>
                  </div>
                  <span className="text-[12.5px] font-medium text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form Panel (Right side) ── */}
        <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative bg-white z-20">
          <div className="w-full max-w-[380px] mx-auto">
            
            <Link to="/" className="hidden md:inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors mb-10">
              <ChevronLeft size={14} /> Back to home
            </Link>
            
            <div className="hidden md:block mb-10">
              <h1 className="font-serif text-[2rem] font-bold text-slate-800 m-0 mb-2 tracking-tight leading-none">
                Welcome back
              </h1>
              <p className="text-[14px] text-slate-500 m-0">
                Sign in to manage your registrar appointments
              </p>
            </div>

            {successMessage && (
              <div className="py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-medium mb-6 flex gap-2.5 items-center shadow-sm">
                <span className="bg-emerald-100 text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span> 
                {successMessage}
              </div>
            )}
            {error && (
              <div className="py-3 px-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium mb-6 flex gap-2.5 items-center shadow-sm">
                <span className="bg-red-100 text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">!</span> 
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-[12.5px] font-bold text-slate-700 mb-2">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  required 
                  placeholder="example@gmail.com" 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 outline-none box-border font-sans transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-[3px] focus:ring-maroon/10 py-[12px] px-[16px] text-[14.5px] shadow-sm placeholder:text-slate-400 font-medium" 
                />
              </div>
              
              <div className="mb-8">
                <label className="block text-[12.5px] font-bold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    value={form.password} 
                    onChange={handleChange} 
                    required 
                    placeholder="Enter your password" 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 outline-none box-border font-sans transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-[3px] focus:ring-maroon/10 py-[12px] px-[16px] text-[14.5px] shadow-sm placeholder:text-slate-400 pr-12 font-medium" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-400 hover:text-slate-600 cursor-pointer flex transition-colors">
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-maroon w-4 h-4 cursor-pointer m-0 rounded-sm border-slate-300" />
                    <span className="text-[13px] text-slate-600 font-medium group-hover:text-slate-800 transition-colors">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-[13px] text-maroon no-underline font-bold hover:text-maroon-dark transition-colors">Forgot password?</Link>
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full py-3.5 px-6 rounded-xl border-none text-[14.5px] font-bold font-sans shadow-[0_4px_12px_rgba(123,26,42,0.15)] transition-all duration-200 flex items-center justify-center gap-2 ${loading ? 'bg-maroon/70 text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-[0_6px_16px_rgba(123,26,42,0.25)] hover:-translate-y-px'}`}>
                {loading ? <span className="spinner" /> : (
                  <>Sign In <ChevronRight size={16} strokeWidth={2.5} /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-[13.5px] text-slate-500 font-medium">
                Don't have an account?{' '}
                <Link to="/register" className="text-maroon no-underline font-bold hover:text-maroon-dark transition-colors">Register here</Link>
              </p>
            </div>

            {/* Mobile Perks */}
            <div className="mt-8 bg-slate-50 rounded-2xl shadow-sm border border-slate-100 overflow-hidden md:hidden">
              {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((perk, i, arr) => (
                <div key={i} className={`flex items-center gap-3 py-3.5 px-4 ${i < arr.length - 1 ? 'border-b border-slate-100' : 'border-none'}`}>
                  <div className="w-[20px] h-[20px] rounded-full shrink-0 bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-500 text-[10px] font-bold">✓</span>
                  </div>
                  <span className="text-[13px] font-medium text-slate-600">{perk}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
