import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, verifyStudent, requestStudentId } from '../../services/authService'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import campusFlowLogo from '../../assets/logo.png'
import loginImage from '../../assets/login.png'

export default function Register() {
  const navigate = useNavigate()
  
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '', student_id: '', priority_class: 'regular', course: '',
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [reqSuccess, setReqSuccess] = useState(false)

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
  
  const handleRequestId = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setReqSuccess(false);
    try {
      await requestStudentId({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        course: form.course
      })
      setReqSuccess(true)
      setForm({ ...form, first_name: '', last_name: '', email: '', course: '' })
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inpClass = "w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 outline-none box-border font-sans transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-[3px] focus:ring-maroon/10 py-[12px] px-[16px] text-[14.5px] shadow-sm placeholder:text-slate-400 font-medium"
  const lblClass = "block text-[12.5px] font-bold text-slate-700 mb-2"
  const btnClass = `w-full py-3.5 px-6 rounded-xl border-none text-[14.5px] font-bold font-sans shadow-[0_4px_12px_rgba(123,26,42,0.15)] transition-all duration-200 flex items-center justify-center gap-2 ${loading ? 'bg-maroon/70 text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-[0_6px_16px_rgba(123,26,42,0.25)] hover:-translate-y-[1px]'}`

  const errorBanner = error && (
    <div className="py-3 px-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium mb-6 flex gap-2.5 items-center shadow-sm">
      <span className="bg-red-100 text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">!</span> 
      {error}
    </div>
  )

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
              Join Us Today
            </h1>
            <p className="text-[13px] text-slate-500 m-0 leading-relaxed md:hidden">
              Create your account to manage your appointments
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
                Create Account
              </h1>
              <p className="text-[14px] text-slate-500 m-0">
                Verify your identity to get started
              </p>
            </div>

            {errorBanner}

            {/* Step 1: Verification */}
            {step === 1 && (
              <form onSubmit={handleVerify}>
                <div className="mb-8">
                  <label className={lblClass}>Student ID</label>
                  <input 
                    type="text" 
                    name="student_id" 
                    value={form.student_id} 
                    onChange={handleChange} 
                    required 
                    placeholder="202400001" 
                    pattern="^\d{9,13}$" 
                    title="Format: 9 to 13 numbers" 
                    className={inpClass} 
                  />
                  <p className="text-[12px] text-slate-500 mt-3">We need to verify your ID against the school records before creating an account.</p>
                </div>

                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? <span className="spinner" /> : <>Verify ID <ChevronRight size={16} strokeWidth={2.5} /></>}
                </button>
                
                <div className="mt-5 text-center">
                  <button type="button" onClick={() => {setStep('request'); setError(''); setReqSuccess(false);}} className="bg-transparent border-none text-maroon text-[13px] cursor-pointer font-bold hover:text-maroon-dark transition-colors">
                    Forgot your Student ID? Request it here
                  </button>
                </div>
              </form>
            )}

            {/* Step: Request ID */}
            {step === 'request' && (
              <form onSubmit={handleRequestId}>
                <div className="mb-6">
                  <h2 className="text-[18px] font-bold text-slate-800 mb-2">Request Student ID</h2>
                  <p className="text-[13px] text-slate-500">Enter your details so the registrar can find your ID and email it to you.</p>
                </div>
                
                {reqSuccess && (
                  <div className="py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-medium mb-6 flex gap-2.5 items-center shadow-sm">
                    <span className="bg-emerald-100 text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span> 
                    Your request has been sent to the registrar. They will email your Student ID shortly.
                  </div>
                )}

                <div className="mb-4">
                  <label className={lblClass}>First Name</label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Juan" className={inpClass} />
                </div>
                <div className="mb-4">
                  <label className={lblClass}>Last Name</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Dela Cruz" className={inpClass} />
                </div>
                <div className="mb-4">
                  <label className={lblClass}>Course / Program</label>
                  <input type="text" name="course" value={form.course} onChange={handleChange} required placeholder="BSIT, BSED, etc." className={inpClass} />
                </div>
                <div className="mb-8">
                  <label className={lblClass}>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="example@gmail.com" className={inpClass} />
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? <span className="spinner" /> : <>Submit Request <ChevronRight size={16} strokeWidth={2.5} /></>}
                </button>
                <div className="mt-5 text-center">
                  <button type="button" onClick={() => {setStep(1); setError('');}} className="bg-transparent border-none text-slate-500 text-[13px] cursor-pointer font-bold hover:text-slate-800 transition-colors">
                    Back to Verification
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Final Registration */}
            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Verified Student</span>
                    <button type="button" onClick={() => setStep(1)} className="bg-transparent border-none text-maroon text-[12px] cursor-pointer font-bold hover:text-maroon-dark transition-colors">Change ID</button>
                  </div>
                  <div className="text-[14.5px] font-bold text-slate-800 mb-0.5">{form.first_name} {form.last_name}</div>
                  <div className="text-[13px] font-medium text-slate-600">{form.student_id} • {form.course}</div>
                </div>

                <div className="mb-4">
                  <label className={lblClass}>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="example@gmail.com" className={inpClass} />
                </div>

                <div className="mb-4">
                  <label className={lblClass}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" className={`${inpClass} pr-12`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-400 hover:text-slate-600 cursor-pointer flex transition-colors">
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className={lblClass}>Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={8} placeholder="Confirm your password" className={`${inpClass} pr-12`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-400 hover:text-slate-600 cursor-pointer flex transition-colors">
                      {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-8">
                  <label className={lblClass}>Priority Classification</label>
                  <select name="priority_class" value={form.priority_class} onChange={handleChange} className={`${inpClass} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5l5%205%205-5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-size-[20px] bg-position-[right_12px_center] bg-no-repeat`}>
                    <option value="regular">Regular Student</option>
                    <option value="graduating">Graduating Student</option>
                    <option value="pwd">PWD</option>
                    <option value="transferee">Transferee</option>
                  </select>
                </div>

                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? <span className="spinner" /> : <>Complete Registration <ChevronRight size={16} strokeWidth={2.5} /></>}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-[13.5px] text-slate-500 font-medium">
                Already have an account?{' '}
                <Link to="/login" className="text-maroon no-underline font-bold hover:text-maroon-dark transition-colors">Sign in here</Link>
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
