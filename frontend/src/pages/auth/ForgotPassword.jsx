import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ChevronLeft, CheckCircle, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'
import { forgotPassword } from '../../services/authService'
import campusFlowLogo from '../../assets/logo.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-5 md:p-6 py-8 sm:py-12 font-sans relative">
      
      {/* Subtle Ambient Background Gradients */}
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
          
          {sent ? (
            /* ── Success State ── */
            <div className="text-center py-1 sm:py-2 animate-fade-up">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 sm:mb-5 shadow-xs">
                <CheckCircle size={26} className="stroke-[2.5]" />
              </div>
              
              <h1 className="font-serif text-[20px] sm:text-[23px] md:text-[25px] font-bold text-slate-900 m-0 mb-1.5 sm:mb-2 leading-tight tracking-tight">
                Check your email
              </h1>
              
              <p className="text-[12.5px] sm:text-[13.5px] text-slate-500 m-0 mb-4 sm:mb-6 leading-relaxed">
                We've sent a password reset link to <strong className="text-slate-800 font-semibold">{email}</strong>. Please click the link in the email to set your new password.
              </p>

              <div className="bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 text-[11.5px] sm:text-[12.5px] text-slate-600 mb-4 sm:mb-6 text-left shadow-2xs">
                <p className="font-semibold text-slate-800 m-0 mb-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-maroon shrink-0" /> Didn't receive the email?
                </p>
                <p className="m-0 leading-relaxed text-slate-500 text-[11.5px] sm:text-[12px]">
                  Check your spam or junk folder. If it hasn't arrived in a few minutes,{' '}
                  <button 
                    onClick={() => { setSent(false); setError('') }} 
                    className="text-maroon font-bold bg-transparent border-none cursor-pointer p-0 underline hover:text-maroon-dark inline-flex items-center gap-1"
                  >
                    try again <RefreshCw size={10} />
                  </button>
                </p>
              </div>

              <Link 
                to="/login" 
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-maroon text-white text-[13px] sm:text-[14px] font-bold font-sans shadow-[0_4px_16px_rgba(123,26,42,0.22)] hover:bg-maroon-dark transition-all duration-200 flex items-center justify-center gap-2 no-underline hover:shadow-[0_6px_20px_rgba(123,26,42,0.30)] cursor-pointer"
              >
                Return to Sign In <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
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
                    <Mail size={10} />
                  </div>
                </div>

                <h1 className="font-serif text-[19px] sm:text-[22px] md:text-[25px] font-bold text-slate-900 m-0 mb-1 sm:mb-2 leading-tight tracking-tight">
                  Forgot your password?
                </h1>
                
                <p className="text-[12px] sm:text-[13px] text-slate-500 m-0 leading-relaxed max-w-80 mx-auto">
                  Enter your email address and we'll send you a secure link to reset your password.
                </p>
              </div>

              {error && (
                <div className="py-2.5 px-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] sm:text-[13px] font-medium mb-4 sm:mb-5 flex items-start gap-2 shadow-2xs animate-fade-up">
                  <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-[10.5px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">
                    Email Address
                  </label>
                  <div className="relative flex items-center group">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-maroon transition-colors pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      required
                      placeholder="your@gmail.com"
                      className="w-full py-2.5 sm:py-3 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-[13px] sm:text-[14px] text-slate-800 placeholder:text-slate-400 font-sans outline-none transition-all duration-200 focus:bg-white focus:border-maroon focus:ring-3 focus:ring-maroon/10 shadow-2xs"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className={`w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl border-none text-[13px] sm:text-[14px] font-bold font-sans transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(123,26,42,0.22)] ${
                    loading || !email.trim()
                      ? 'bg-maroon/60 text-white/80 cursor-not-allowed'
                      : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-[0_6px_22px_rgba(123,26,42,0.30)] active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending link...
                    </span>
                  ) : (
                    <>
                      Send Reset Link <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-5 sm:mt-7 pt-4 sm:pt-5 border-t border-slate-100 text-center">
                <p className="text-[12px] sm:text-[13px] text-slate-500 m-0">
                  Remember your password?{' '}
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
