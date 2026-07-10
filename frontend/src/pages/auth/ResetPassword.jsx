import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Lock, CheckCircle } from 'lucide-react'
import { resetPassword } from '../../services/authService'
import campusFlowLogo from '../../assets/logo.png'

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const width = useWindowWidth()
  const isMobile = width < 768
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [tokenError, setTokenError] = useState(false)

  // Extract access_token from URL hash fragment on mount.
  // Supabase redirects with: /reset-password#access_token=...&type=recovery&...
  useEffect(() => {
    const hash = window.location.hash.substring(1) // remove leading #
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type = params.get('type')

    if (token && type === 'recovery') {
      setAccessToken(token)
      // Clean the URL hash so the token isn't visible in the address bar
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

  const inpClass = `w-full rounded-lg border-[1.5px] border-border bg-off-white text-text-main outline-none box-border font-sans transition-colors duration-150 focus:border-maroon focus:ring-0 ${isMobile ? 'py-[13px] px-[14px] text-[15px] min-h-[52px]' : 'py-[11px] px-[14px] text-[14px]'}`

  // Password strength indicator
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 6) score++
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-400' }
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-amber-400' }
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-blue-400' }
    return { level: 4, label: 'Strong', color: 'bg-emerald-500' }
  }
  const strength = getStrength(password)

  let content

  if (tokenError) {
    content = (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-danger-light border border-danger-border flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚠</span>
        </div>
        <h2 className="font-serif text-xl font-bold text-text-main m-0 mb-2">Invalid Reset Link</h2>
        <p className="text-[13px] text-text-sub m-0 mb-6 leading-relaxed max-w-[280px] mx-auto">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-maroon text-white text-[14px] font-bold font-sans no-underline shadow-[0_3px_14px_rgba(123,26,42,0.25)] hover:bg-maroon-dark transition-colors"
        >
          Request New Link
        </Link>
        <p className="text-[13px] text-text-muted mt-4">
          <Link to="/login" className="text-maroon no-underline font-semibold">Back to Sign In</Link>
        </p>
      </div>
    )
  } else if (success) {
    content = (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-success-light border border-success-border flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-success" />
        </div>
        <h2 className="font-serif text-xl font-bold text-text-main m-0 mb-2">Password Updated!</h2>
        <p className="text-[13px] text-text-sub m-0 mb-6 leading-relaxed max-w-[280px] mx-auto">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <button
          onClick={() => navigate('/login', { state: { message: 'Password reset successful. Please sign in.' } })}
          className="w-full py-3 rounded-lg border-none bg-maroon text-white text-[14px] font-bold font-sans shadow-[0_3px_14px_rgba(123,26,42,0.25)] cursor-pointer hover:bg-maroon-dark transition-colors"
        >
          Sign In →
        </button>
      </div>
    )
  } else {
    content = (
      <>
        <div className="w-12 h-12 rounded-full bg-maroon/10 flex items-center justify-center mx-auto mb-5">
          <Lock size={22} className="text-maroon" />
        </div>
        <h2 className={`font-serif font-bold text-text-main m-0 mb-2 ${isMobile ? 'text-[22px]' : 'text-xl'} text-center`}>
          Set new password
        </h2>
        <p className="text-[13px] text-text-muted m-0 mb-6 text-center leading-relaxed">
          Choose a strong password for your account.
        </p>

        {error && (
          <div className="py-2.5 px-3.5 rounded-lg bg-danger-light border border-danger-border text-danger text-[13px] mb-4 flex gap-2 items-start">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-text-sub mb-1.5 tracking-[0.06em] uppercase">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                placeholder="Enter new password"
                className={`${inpClass} pr-12`}
                autoFocus
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex">
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {/* Password strength bar */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= strength.level ? strength.color : 'bg-gray-200'}`} />
                  ))}
                </div>
                <span className="text-[11px] text-text-muted">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-text-sub mb-1.5 tracking-[0.06em] uppercase">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                required
                placeholder="Confirm your new password"
                className={`${inpClass} pr-12`}
                minLength={6}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-text-muted cursor-pointer flex">
                {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-danger mt-1.5 m-0">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg border-none text-[14px] font-bold font-sans shadow-[0_3px_14px_rgba(123,26,42,0.25)] transition-colors duration-150 ${isMobile ? 'min-h-[52px] py-3.5 text-[15px]' : ''} ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}
          >
            {loading ? <span className="spinner" /> : 'Reset Password'}
          </button>
        </form>
      </>
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-off-white font-sans max-w-[480px] mx-auto pb-24">
        <div className="bg-linear-to-br from-maroon to-maroon-dark pt-9 px-5 pb-14 relative overflow-hidden text-center">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#F0C040_1px,transparent_1px)] bg-size-[24px_24px]" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(184,144,10,0.18)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[600px] h-24 rounded-full bg-off-white pointer-events-none" />

          <div className="relative">
            <div className="text-left mb-4">
              <Link to="/login" className="inline-flex items-center gap-1 text-[12px] text-white/50 no-underline">
                ← Back to sign in
              </Link>
            </div>
            <img src={campusFlowLogo} alt="CampusFlow" className="w-16 h-16 rounded-full border-2 border-gold/45 shadow-[0_0_32px_rgba(184,144,10,0.18)] mb-3.5 mx-auto bg-white object-contain" />
            <div className="font-serif font-bold text-[13px] text-gold mb-1.5">CampusFlow</div>
            <h1 className="font-serif text-[clamp(22px,6vw,28px)] font-bold text-white m-0 mb-2 leading-[1.1]">
              New Password
            </h1>
          </div>
        </div>

        <main className="px-4 max-w-[480px] mx-auto">
          <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] py-6 px-5 -mt-5 relative">
            {content}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center font-sans p-8">
      <div className="w-full max-w-[420px]">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-[12px] text-text-muted no-underline mb-8">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] py-8 px-7">
          {content}
        </div>
      </div>
    </div>
  )
}
