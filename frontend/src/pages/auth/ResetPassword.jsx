import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ChevronLeft, Lock, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'
import { resetPassword } from '../../services/authService'
import campusFlowLogo from '../../assets/logo.webp'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [tokenError, setTokenError] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type = params.get('type')

    if (token && type === 'recovery') {
      setAccessToken(token)
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      setTokenError(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(accessToken, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Password strength indicator
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 6) score++
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' }
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-amber-500' }
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-blue-500' }
    return { level: 4, label: 'Strong', color: 'bg-emerald-500' }
  }
  const strength = getStrength(password)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-5 md:p-6 py-8 sm:py-12 font-sans relative">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-160 h-100 bg-maroon/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 w-120 h-80 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,#7B1A2A_1px,transparent_1px)] bg-size-[24px_24px]" />
      </div>

      <div className="w-full max-w-95 sm:max-w-105 md:max-w-115 relative z-10 animate-fade-up my-auto">
        
        {/* Back Link */}
        <div className="mb-3.5 sm:mb-5 pl-1">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-slate-500 hover:text-maroon transition-colors group"
          >
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> 
            Back to sign in
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] border border-slate-100 relative">
          
          {tokenError ? (
            /* ── Token Error State ── */
            <div className="text-center py-1 sm:py-2 animate-fade-up">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3.5 sm:mb-5 shadow-xs">
                <AlertCircle size={26} />
              </div>
              <h1 className="font-serif text-[20px] sm:text-[23px] md:text-[25px] font-bold text-slate-900 m-0 mb-1.5 sm:mb-2 leading-tight tracking-tight">
                Invalid or Expired Link
              </h1>
              <p className="text-[12.5px] sm:text-[13.5px] text-slate-500 m-0 mb-4 sm:mb-6 leading-relaxed">
                This password reset link is invalid or has already expired. Please request a fresh reset link to continue.
              </p>
              <Link
                to="/forgot-password"
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-maroon text-white text-[13px] sm:text-[14px] font-bold font-sans shadow-[0_4px_16px_rgba(123,26,42,0.22)] hover:bg-maroon-dark transition-all duration-200 flex items-center justify-center gap-2 no-underline hover:shadow-[0_6px_20px_rgba(123,26,42,0.30)] cursor-pointer"
              >
                Request New Link <ArrowRight size={14} />
              </Link>
            </div>
          ) : success ? (
            /* ── Success State ── */
            <div className="text-center py-1 sm:py-2 animate-fade-up">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 sm:mb-5 shadow-xs">
                <CheckCircle size={26} className="stroke-[2.5]" />
              </div>
              <h1 className="font-serif text-[20px] sm:text-[23px] md:text-[25px] font-bold text-slate-900 m-0 mb-1.5 sm:mb-2 leading-tight tracking-tight">
                Password Updated!
              </h1>
              <p className="text-[12.5px] sm:text-[13.5px] text-slate-500 m-0 mb-4 sm:mb-6 leading-relaxed">
                Your password has been successfully reset. You can now sign in with your new credentials.
              </p>
              <button
                onClick={() => navigate('/login', { state: { message: 'Password reset successful. Please sign in.' } })}
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-maroon text-white text-[13px] sm:text-[14px] font-bold font-sans shadow-[0_4px_16px_rgba(123,26,42,0.22)] hover:bg-maroon-dark transition-all duration-200 flex items-center justify-center gap-2 border-none hover:shadow-[0_6px_20px_rgba(123,26,42,0.30)] cursor-pointer"
              >
                Sign In Now <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            /* ── New Password Form ── */
            <div className="animate-fade-up">
              
              {/* Header Icon + Brand */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex relative mb-2 sm:mb-3">
                  <img 
                    src={campusFlowLogo} 
                    alt="CampusFlow Logo" 
                    className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-slate-200 shadow-sm p-0.5 bg-white object-contain" 
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-maroon-light border border-maroon-border/50 text-maroon flex items-center justify-center shadow-xs">
                    <Lock size={10} />
                  </div>
                </div>

                <h1 className="font-serif text-[19px] sm:text-[22px] md:text-[25px] font-bold text-slate-900 m-0 mb-1 sm:mb-2 leading-tight tracking-tight">
                  Set New Password
                </h1>
                
                <p className="text-[12px] sm:text-[13px] text-slate-500 m-0 leading-relaxed max-w-80 mx-auto">
                  Enter your new password below. Make sure it is secure and easy for you to remember.
                </p>
              </div>

              {error && (
                <div className="py-2.5 px-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] sm:text-[13px] font-medium mb-4 sm:mb-5 flex items-start gap-2 shadow-2xs animate-fade-up">
                  <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4">
                
                {/* New Password */}
                <div>
                  <label className="block text-[10.5px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">
                    New Password
                  </label>
                  <div className="relative flex items-center group">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-maroon transition-colors pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      required
                      placeholder="At least 6 characters"
                      minLength={6}
                      className="w-full py-2.5 sm:py-3 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-[13px] sm:text-[14px] text-slate-800 placeholder:text-slate-400 font-sans outline-none transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-3 focus:ring-maroon/10 shadow-2xs"
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 text-slate-400 hover:text-slate-700 cursor-pointer flex transition-colors"
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>

                  {/* Animated Strength meter */}
                  {password && (
                    <div className="mt-2 animate-fade-up">
                      <div className="flex gap-1.5 mb-1">
                        {[1, 2, 3, 4].map(i => (
                          <div 
                            key={i} 
                            className={`h-1 sm:h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              i <= strength.level ? strength.color : 'bg-slate-200'
                            }`} 
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[10.5px] sm:text-[11.5px]">
                        <span className="text-slate-500 font-medium">Strength:</span>
                        <span className="font-bold text-slate-700">{strength.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10.5px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center group">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-maroon transition-colors pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      required
                      placeholder="Re-enter your new password"
                      minLength={6}
                      className="w-full py-2.5 sm:py-3 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-[13px] sm:text-[14px] text-slate-800 placeholder:text-slate-400 font-sans outline-none transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-3 focus:ring-maroon/10 shadow-2xs"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirm(!showConfirm)} 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 text-slate-400 hover:text-slate-700 cursor-pointer flex transition-colors"
                    >
                      {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>

                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[11.5px] sm:text-[12px] text-red-600 font-medium mt-1 m-0 animate-fade-up">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                  className={`w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl border-none text-[13px] sm:text-[14px] font-bold font-sans transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(123,26,42,0.22)] ${
                    loading || !password || !confirmPassword || password !== confirmPassword
                      ? 'bg-maroon/60 text-white/80 cursor-not-allowed'
                      : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-[0_6px_22px_rgba(123,26,42,0.30)] active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating password...
                    </span>
                  ) : (
                    <>
                      Update Password <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-5 sm:mt-7 pt-4 sm:pt-5 border-t border-slate-100 text-center">
                <p className="text-[12px] sm:text-[13px] text-slate-500 m-0">
                  Know your password?{' '}
                  <Link to="/login" className="text-maroon font-bold hover:text-maroon-dark hover:underline transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}
