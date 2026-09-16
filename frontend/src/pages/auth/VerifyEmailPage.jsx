import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { verifyEmail, resendVerification } from '../../services/authService'
import { useAuth } from '../../context/useAuth'
import { CheckCircle2, AlertTriangle, ArrowRight, Mail, RefreshCw, Sparkles, ChevronLeft } from 'lucide-react'
import campusFlowLogo from '../../assets/logo.webp'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { login } = useAuth()

  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const [countdown, setCountdown] = useState(3)

  // Resend state for error view
  const [resendEmail, setResendEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState(null) // { type: 'success'|'error', message: '' }

  const verifyAttempted = useRef(false)

  useEffect(() => {
    if (verifyAttempted.current) return
    verifyAttempted.current = true

    if (!token) {
      setStatus('error')
      setErrorMessage('Missing verification token. Please click the exact link from the email you received.')
      return
    }

    const runVerification = async () => {
      try {
        const result = await verifyEmail(token)
        setStatus('success')
        setUserProfile(result.user)

        // Automatically log the user in if session tokens were generated
        if (result.already_logged_in && result.access_token && result.user) {
          login(result.access_token, result.user, result.refresh_token)
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage(err.message || 'Verification link has expired or is invalid.')
      }
    }

    runVerification()
  }, [token, login])

  // Countdown timer on success
  useEffect(() => {
    if (status !== 'success') return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          const target = userProfile?.role === 'student' ? '/student' : '/student'
          navigate(target, { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, navigate, userProfile])

  const handleResend = async (e) => {
    e.preventDefault()
    if (!resendEmail.trim()) return

    setIsResending(true)
    setResendStatus(null)

    try {
      const res = await resendVerification(resendEmail.trim())
      setResendStatus({ type: 'success', message: res.message || 'Verification email sent! Check your inbox.' })
    } catch (err) {
      setResendStatus({ type: 'error', message: err.message || 'Failed to resend verification email.' })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#7B1A2A_1px,transparent_1px)] bg-size-[24px_24px]" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-maroon/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      {/* Main Verification Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden relative z-10 animate-fade-up">
        {/* Top Accent Line */}
        <div className="h-1.5 bg-linear-to-r from-maroon via-maroon-dark to-gold" />

        <div className="p-6 sm:p-8 text-center">
          {/* Brand Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src={campusFlowLogo}
                alt="CampusFlow"
                className="w-16 h-16 rounded-full border border-slate-200 shadow-sm object-cover bg-white"
              />
              {status === 'success' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                  <Sparkles size={12} />
                </div>
              )}
            </div>
          </div>

          {/* 1. Verifying State */}
          {status === 'verifying' && (
            <div className="py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-maroon/5 border border-maroon/20 flex items-center justify-center mb-4">
                <RefreshCw size={24} className="text-maroon animate-spin" />
              </div>
              <h2 className="font-serif text-xl font-bold text-slate-800 mb-2">Verifying Your Email</h2>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Please wait while we confirm your email and activate your account...
              </p>
            </div>
          )}

          {/* 2. Success State */}
          {status === 'success' && (
            <div className="py-2 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle2 size={34} strokeWidth={2.5} />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/60">
                Email Verified
              </span>
              <h2 className="font-serif text-2xl font-bold text-slate-800 mb-2">Welcome to CampusFlow!</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                {userProfile ? (
                  <>
                    Hello <strong className="text-slate-800">{userProfile.first_name}</strong>! Your email has been validated and your student account is now fully active.
                  </>
                ) : (
                  'Your email has been validated and your student account is now fully active.'
                )}
              </p>

              {/* Countdown Banner */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 text-xs text-slate-600 flex items-center justify-between">
                <span>Redirecting to your dashboard...</span>
                <span className="font-mono font-bold text-maroon bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {countdown}s
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/student', { replace: true })}
                className="w-full py-3.5 px-6 rounded-xl bg-maroon text-white font-bold text-sm shadow-[0_4px_14px_rgba(123,26,42,0.25)] hover:bg-maroon-dark hover:shadow-[0_6px_18px_rgba(123,26,42,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                Go to Dashboard Now <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* 3. Error State */}
          {status === 'error' && (
            <div className="py-2 animate-fade-in text-left">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <AlertTriangle size={32} />
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="font-serif text-xl font-bold text-slate-800 mb-1.5">Verification Link Expired</h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  {errorMessage || 'This link has expired or is invalid. Links expire after 24 hours.'}
                </p>
              </div>

              {/* Resend Card */}
              <form onSubmit={handleResend} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Request a New Verification Link
                </label>
                <div className="relative mb-3">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 py-2.5 pl-10 pr-3 text-xs sm:text-sm outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 transition-colors"
                  />
                </div>

                {resendStatus && (
                  <div
                    className={`text-xs p-2.5 rounded-lg mb-3 font-medium ${
                      resendStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {resendStatus.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full py-2.5 px-4 rounded-xl bg-maroon text-white font-bold text-xs sm:text-sm shadow-xs hover:bg-maroon-dark transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isResending ? <RefreshCw size={14} className="animate-spin" /> : 'Send New Link'}
                </button>
              </form>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-maroon hover:underline"
                >
                  <ChevronLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
