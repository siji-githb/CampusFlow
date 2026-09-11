import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, verifyStudent, requestStudentId } from '../../services/authService'
import { Eye, EyeOff, ChevronLeft, ChevronRight, ChevronDown, Check, AlertTriangle, IdCard, User, Mail, Lock, GraduationCap } from 'lucide-react'
import campusFlowLogo from '../../assets/logo.webp'
import loginImage from '../../assets/login.webp'
import TermsModal from '../../components/TermsModal'

const COURSES = [
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Financial Management',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Tourism Management',
  'Bachelor of Science in Accountancy'
]

function CourseDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl border bg-slate-50/50 text-left outline-none box-border font-sans transition-all duration-200 py-2.5 sm:py-3 pl-10 pr-9 text-[13px] sm:text-sm shadow-sm font-medium flex items-center justify-between cursor-pointer ${
          isOpen
            ? 'border-maroon bg-white ring-[3px] ring-maroon/10 shadow-md'
            : 'border-slate-200 hover:border-slate-300 hover:bg-white'
        } ${!value ? 'text-slate-400' : 'text-slate-800 font-semibold'}`}
      >
        <GraduationCap
          size={16}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
            isOpen ? 'text-maroon' : 'text-slate-400'
          }`}
        />
        <span className="truncate pr-2">{value || 'Select your course / program'}</span>
        <ChevronDown
          size={15}
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-transform duration-200 shrink-0 pointer-events-none ${
            isOpen ? 'rotate-180 text-maroon' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.14)] p-1.5 z-50 animate-fade-up max-h-60 overflow-y-auto custom-scrollbar"
            style={{ animationDuration: '0.15s' }}
          >
            <div className="px-2.5 py-1.5 mb-1 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
              <span>Academic Programs</span>
              <span className="font-mono text-slate-500">{COURSES.length} Available</span>
            </div>
            {COURSES.map((course, idx) => {
              const isSelected = value === course
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(course)
                    setIsOpen(false)
                  }}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between text-[12.5px] sm:text-[13px] transition-all mb-0.5 ${
                    isSelected
                      ? 'bg-maroon text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-maroon font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-white' : 'bg-slate-300'
                      }`}
                    />
                    <span className="truncate">{course}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-white shrink-0 ml-2" />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '', student_id: '', course: '', priority_class: '',
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [reqSuccess, setReqSuccess] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

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
        course: studentData.course,
        priority_class: studentData.priority_class || 'regular'
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
      if (!form.course) throw new Error('Please select your Course / Program')
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

  const inpClass = "w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 outline-none box-border font-sans transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-[3px] focus:ring-maroon/10 py-2.5 sm:py-3 pl-10 pr-3.5 sm:pr-4 text-[13.5px] sm:text-sm shadow-sm placeholder:text-slate-400 font-medium"
  const lblClass = "block text-[11.5px] sm:text-[12.5px] font-bold text-slate-700 mb-1.5 sm:mb-2"
  const btnClass = "w-full py-2.5 sm:py-3.5 px-5 sm:px-6 rounded-xl border-none text-[13.5px] sm:text-[14.5px] font-bold font-sans shadow-[0_4px_12px_rgba(123,26,42,0.15)] transition-all duration-200 flex items-center justify-center gap-2 bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-[0_6px_16px_rgba(123,26,42,0.25)] hover:-translate-y-[1px] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-slate-200 disabled:hover:translate-y-0"

  const errorBanner = error && (
    <div className="py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[12px] sm:text-[13px] font-medium mb-4 sm:mb-6 flex gap-2.5 items-center shadow-sm">
      <AlertTriangle size={17} className="text-red-500 shrink-0" /> 
      <span>{error.replace(/^(Auth error|Error):\s*/i, '')}</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-5 md:p-8 py-8 sm:py-12 font-sans relative overflow-y-auto">
      
      {/* ── Main Elevated Card ── */}
      <div className="w-full max-w-260 bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col md:flex-row overflow-hidden relative my-auto">
        
        {/* ── Branding Panel (Left side on desktop, Top on mobile) ── */}
        <div className="w-full md:w-[45%] bg-slate-50/50 pt-7 pb-6 px-4 sm:p-8 md:p-12 flex flex-col items-center justify-center md:justify-center relative border-b md:border-b-0 md:border-r border-slate-100 z-10 shrink-0">
          
          {/* Subtle Background Texture */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#7B1A2A_1px,transparent_1px)] bg-size-[24px_24px]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-maroon/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          {/* Mobile "Back to Home" */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:hidden z-20">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft size={14} /> Back to home
            </Link>
          </div>

          <div className="relative w-full max-w-[320px] text-center z-10 flex flex-col items-center">
            
            <img 
              src={campusFlowLogo} 
              alt="CampusFlow Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border border-slate-200 shadow-sm mb-2 sm:mb-4 md:mb-6 object-cover bg-white" 
            />
            
            <div className="font-serif font-bold text-[11.5px] sm:text-[13px] text-maroon mb-1 md:hidden tracking-wide uppercase">CampusFlow</div>
            
            <h2 className="hidden md:block font-serif text-[32px] font-bold text-slate-800 m-0 mb-1 leading-tight tracking-tight">
              CampusFlow
            </h2>
            <p className="hidden md:block text-[13px] text-slate-500 m-0 mb-8 leading-relaxed">
              Smart queueing and seamless registrar appointments for the modern campus.
            </p>

            <img 
              src={loginImage} 
              alt="CampusFlow Illustration" 
              className="w-full max-w-44 sm:max-w-56 md:max-w-70 h-auto mb-3 sm:mb-6 md:mb-8 object-contain drop-shadow-xl hover:scale-[1.02] transition-transform duration-500" 
            />

            <h1 className="font-serif text-[20px] sm:text-[24px] md:text-[32px] font-bold text-slate-800 m-0 mb-1 sm:mb-2 leading-[1.1] md:hidden tracking-tight">
              Join Us Today
            </h1>
            <p className="text-[12px] sm:text-[13px] text-slate-500 m-0 leading-relaxed md:hidden">
              Create your account to manage your appointments
            </p>

            <div className="hidden md:block w-full border-t border-slate-200 pt-6 mt-4">
              {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-emerald-500 text-[10px] font-bold">✓</span>
                  </div>
                  <span className="text-[12.5px] font-medium text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form Panel (Right side) ── */}
        <div className="flex-1 p-5 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center relative bg-white z-20">
          <div className="w-full max-w-85 sm:max-w-95 mx-auto">
            
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
                <div className="mb-5 sm:mb-7">
                  <label className={lblClass}>Student ID</label>
                  <div className="relative flex items-center">
                    <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      type="text" 
                      name="student_id" 
                      value={form.student_id} 
                      onChange={handleChange} 
                      required 
                      placeholder="2024-00001 or 202400001" 
                      pattern="[-0-9]{8,15}" 
                      title="Format: 8 to 15 numbers or hyphens" 
                      className={inpClass} 
                    />
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-slate-500 mt-2">We need to verify your ID against the school records before creating an account.</p>
                </div>

                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? <span className="spinner" /> : <>Verify ID <ChevronRight size={15} strokeWidth={2.5} /></>}
                </button>
                
                <div className="mt-4 sm:mt-5 text-center">
                  <button type="button" onClick={() => {setStep('request'); setError(''); setReqSuccess(false);}} className="bg-transparent border-none text-[12px] sm:text-[13px] cursor-pointer transition-colors p-0">
                    <span className="text-slate-500 font-medium">Forgot your Student ID? </span>
                    <span className="text-maroon font-bold hover:text-maroon-dark">Request it here</span>
                  </button>
                </div>
              </form>
            )}

            {/* Step: Request ID */}
            {step === 'request' && (
              <form onSubmit={handleRequestId}>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-[16px] sm:text-[18px] font-bold text-slate-800 mb-1 sm:mb-2">Request Student ID</h2>
                  <p className="text-[12px] sm:text-[13px] text-slate-500 m-0">Enter your details so the registrar can find your ID and email it to you.</p>
                </div>
                
                {reqSuccess && (
                  <div className="py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[12px] sm:text-[13px] font-medium mb-4 sm:mb-6 flex gap-2.5 items-center shadow-sm">
                    <span className="bg-emerald-100 text-emerald-600 rounded-full w-4.5 h-4.5 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span> 
                    Your request has been sent to the registrar. They will email your Student ID shortly.
                  </div>
                )}

                <div className="mb-3 sm:mb-4">
                  <label className={lblClass}>First Name</label>
                  <div className="relative flex items-center">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Juan" className={inpClass} />
                  </div>
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className={lblClass}>Last Name</label>
                  <div className="relative flex items-center">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Dela Cruz" className={inpClass} />
                  </div>
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className={lblClass}>Course / Program</label>
                  <CourseDropdown 
                    value={form.course} 
                    onChange={(selectedCourse) => {
                      setForm(prev => ({ ...prev, course: selectedCourse }))
                      setError('')
                    }} 
                  />
                </div>
                <div className="mb-5 sm:mb-7">
                  <label className={lblClass}>Email Address</label>
                  <div className="relative flex items-center">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="your@gmail.com" className={inpClass} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? <span className="spinner" /> : <>Submit Request <ChevronRight size={15} strokeWidth={2.5} /></>}
                </button>
                <div className="mt-4 sm:mt-5 text-center">
                  <button type="button" onClick={() => {setStep(1); setError('');}} className="bg-transparent border-none text-slate-500 text-[12px] sm:text-[13px] cursor-pointer font-bold hover:text-slate-800 transition-colors">
                    Back to Verification
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Final Registration */}
            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-widest">Verified Student</span>
                    <button type="button" onClick={() => { setStep(1); setError(''); }} className="bg-transparent border-none text-maroon text-[11.5px] sm:text-[12px] cursor-pointer font-bold hover:text-maroon-dark transition-colors">Change ID</button>
                  </div>
                  <div className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-800 mb-0.5">{form.first_name} {form.last_name}</div>
                  <div className="text-[12px] sm:text-[13px] font-medium text-slate-600">{form.student_id} • {form.priority_class ? form.priority_class.charAt(0).toUpperCase() + form.priority_class.slice(1) : 'Regular'} • {form.course}</div>
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className={lblClass}>Email Address</label>
                  <div className="relative flex items-center">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="your@gmail.com" className={inpClass} />
                  </div>
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className={lblClass}>Password</label>
                  <div className="relative flex items-center">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" className={`${inpClass} pr-11`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-400 hover:text-slate-600 cursor-pointer flex transition-colors">
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className={lblClass}>Confirm Password</label>
                  <div className="relative flex items-center">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type={showConfirm ? "text" : "password"} name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={8} placeholder="Confirm your password" className={`${inpClass} pr-11`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-400 hover:text-slate-600 cursor-pointer flex transition-colors">
                      {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mb-5 sm:mb-6 flex items-start gap-2.5 sm:gap-3">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={termsAccepted} 
                    onChange={(e) => setTermsAccepted(e.target.checked)} 
                    className="mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer accent-maroon"
                  />
                  <label htmlFor="terms" className="text-[12px] sm:text-[13px] text-slate-600 leading-snug cursor-pointer select-none">
                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="bg-transparent border-none text-maroon font-bold cursor-pointer hover:underline p-0 inline">Terms and Conditions</button> and Data Privacy Agreement.
                  </label>
                </div>

                <button type="submit" disabled={loading || !termsAccepted} className={btnClass}>
                  {loading ? <span className="spinner" /> : <>Complete Registration <ChevronRight size={15} strokeWidth={2.5} /></>}
                </button>
              </form>
            )}

            <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 text-center">
              <p className="text-[12.5px] sm:text-[13.5px] text-slate-500 font-medium m-0">
                Already have an account?{' '}
                <Link to="/login" className="text-maroon no-underline font-bold hover:text-maroon-dark transition-colors">Sign in here</Link>
              </p>
            </div>

            {/* Mobile Perks */}
            <div className="mt-5 sm:mt-8 bg-slate-50 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden md:hidden">
              {['Book appointments online', 'Real-time queue tracking', 'AI-guided step-by-step'].map((perk, i, arr) => (
                <div key={i} className={`flex items-center gap-2.5 py-2.5 px-3.5 sm:py-3 sm:px-4 ${i < arr.length - 1 ? 'border-b border-slate-100' : 'border-none'}`}>
                  <div className="w-4.5 h-4.5 rounded-full shrink-0 bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-500 text-[9px] font-bold">✓</span>
                  </div>
                  <span className="text-[12px] sm:text-[13px] font-medium text-slate-600">{perk}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  )
}
