import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, verifyStudent } from '../../services/authService'
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

export default function Register() {
  const navigate = useNavigate()
  const width = useWindowWidth()
  const isMobile = width < 768
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '', student_id: '', priority_class: 'regular', course: '',
  })
  const [error, setError] = useState('')
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

  const inpClass = `w-full rounded-lg border-[1.5px] border-border bg-off-white text-text-main outline-none box-border font-sans transition-colors duration-150 focus:border-maroon focus:ring-0 ${isMobile ? 'py-[13px] px-[14px] text-[15px] min-h-[52px]' : 'py-[11px] px-[14px] text-[13px]'}`
  const lblClass = `block font-semibold text-text-sub ${isMobile ? 'text-[11px] mb-1.5 tracking-[0.06em] uppercase' : 'text-[11px] mb-[5px] tracking-wider'}`

  const errorBanner = error && (
    <div className="py-3 px-3.5 rounded-[10px] bg-danger-light border border-danger-border text-danger text-[13px] mb-4 flex gap-2 items-start">
      <span>⚠</span> {error}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-off-white font-sans max-w-[480px] mx-auto pb-[100px]">
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
            <h1 className="font-serif text-[clamp(24px,7vw,30px)] font-bold text-white m-0 mb-2 leading-[1.1]">
              Create Your Account
            </h1>
            <p className="text-[13px] text-white/55 m-0 leading-relaxed">
              Join CampusFlow to manage your registrar appointments
            </p>
          </div>
        </div>

        <main className="px-4 max-w-[480px] mx-auto">
          <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] py-6 px-5 -mt-5 relative">
            {errorBanner}

            {step === 1 ? (
              <form onSubmit={handleVerify}>
                <div className="mb-6">
                  <label className={lblClass}>Student ID</label>
                  <input type="text" name="student_id" value={form.student_id} onChange={handleChange} required placeholder="202400001" pattern="^\d{9,13}$" title="Format: 9 to 13 numbers" className={inpClass} />
                  <p className="text-[11px] text-text-sub mt-2">We need to verify your ID against the school records before creating an account.</p>
                </div>

                <button type="submit" disabled={loading} className={`w-full min-h-[52px] py-3.5 px-6 rounded-[10px] border-none text-[15px] font-bold font-sans shadow-[0_4px_20px_rgba(123,26,42,0.25)] transition-colors duration-150 ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
                  {loading ? <span className="spinner" /> : 'Verify ID →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4 p-3 bg-gold-light rounded-[10px] border border-gold-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-gold uppercase tracking-widest">Verified Student</span>
                    <button type="button" onClick={() => setStep(1)} className="bg-transparent border-none text-maroon text-[11px] cursor-pointer font-semibold underline">Change ID</button>
                  </div>
                  <div className="text-[14px] font-semibold text-text-main mb-0.5">{form.first_name} {form.last_name}</div>
                  <div className="text-[12px] text-text-sub">{form.student_id} • {form.course}</div>
                </div>

                <div className="mb-3">
                  <label className={lblClass}>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" className={inpClass} />
                </div>

                <div className="mb-3">
                  <label className={lblClass}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" className={`${inpClass} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex" title={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className={lblClass}>Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={8} placeholder="Confirm your password" className={`${inpClass} pr-10`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex" title={showConfirm ? "Hide password" : "Show password"}>
                      {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className={lblClass}>Priority Classification</label>
                  <select name="priority_class" value={form.priority_class} onChange={handleChange} className={`${inpClass} appearance-none bg-off-white`}>
                    <option value="regular">Regular Student</option>
                    <option value="graduating">Graduating Student</option>
                    <option value="pwd">PWD</option>
                    <option value="transferee">Transferee</option>
                  </select>
                </div>

                <button type="submit" disabled={loading} className={`w-full min-h-[52px] py-3.5 px-6 rounded-[10px] border-none text-[15px] font-bold font-sans shadow-[0_4px_20px_rgba(123,26,42,0.25)] transition-colors duration-150 ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
                  {loading ? <span className="spinner" /> : 'Create Account →'}
                </button>
              </form>
            )}

            <p className="text-[13px] text-text-muted mt-5 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-maroon no-underline font-semibold">Sign in here</Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-[460px]">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] text-text-muted no-underline mb-6">
          ← Back to home
        </Link>

        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="bg-maroon py-6 px-8 flex items-center gap-3">
            <img src={crmcLogo} alt="CRMC" className="w-10 h-10 rounded-full border-2 border-[rgba(240,192,64,0.4)] shrink-0" />
            <div>
              <div className="font-serif font-bold text-[17px] text-[#F0C040]">Create Your Account</div>
              <div className="text-[11px] text-white/50 mt-px">CampusFlow · CRMC Registrar System</div>
            </div>
          </div>

          <div className="py-7 px-8">
            {errorBanner}

            {step === 1 ? (
              <form onSubmit={handleVerify}>
                <div className="mb-6">
                  <label className={lblClass}>Student ID</label>
                  <input type="text" name="student_id" value={form.student_id} onChange={handleChange} required placeholder="202400001" pattern="^\d{9,13}$" title="Format: 9 to 13 numbers" className={inpClass} />
                  <p className="text-[11px] text-text-sub mt-2">We need to verify your ID against the school records before creating an account.</p>
                </div>

                <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg border-none text-[14px] font-bold font-sans shadow-[0_3px_14px_rgba(123,26,42,0.2)] transition-colors duration-150 ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
                  {loading ? <span className="spinner" /> : 'Verify ID →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4 p-3 bg-gold-light rounded-[10px] border border-gold-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-gold uppercase tracking-widest">Verified Student</span>
                    <button type="button" onClick={() => setStep(1)} className="bg-transparent border-none text-maroon text-[11px] cursor-pointer font-semibold underline">Change ID</button>
                  </div>
                  <div className="text-[14px] font-semibold text-text-main mb-0.5">{form.first_name} {form.last_name}</div>
                  <div className="text-[12px] text-text-sub">{form.student_id} • {form.course}</div>
                </div>

                <div className="mb-3">
                  <label className={lblClass}>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@email.com" className={inpClass} />
                </div>

                <div className="mb-3">
                  <label className={lblClass}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" className={`${inpClass} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex" title={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className={lblClass}>Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={8} placeholder="Confirm your password" className={`${inpClass} pr-10`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex" title={showConfirm ? "Hide password" : "Show password"}>
                      {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className={lblClass}>Priority Classification</label>
                  <select name="priority_class" value={form.priority_class} onChange={handleChange} className={`${inpClass} appearance-none bg-off-white`}>
                    <option value="regular">Regular Student</option>
                    <option value="graduating">Graduating Student</option>
                    <option value="pwd">PWD</option>
                    <option value="transferee">Transferee</option>
                  </select>
                </div>

                <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg border-none text-[14px] font-bold font-sans shadow-[0_3px_14px_rgba(123,26,42,0.2)] transition-colors duration-150 ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
                  {loading ? <span className="spinner" /> : 'Create Account →'}
                </button>
              </form>
            )}

            <p className="text-[13px] text-text-muted mt-5 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-maroon no-underline font-semibold">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
