import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { forgotPassword } from '../../services/authService'
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

export default function ForgotPassword() {
  const width = useWindowWidth()
  const isMobile = width < 768
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

  const inpClass = `w-full rounded-lg border-[1.5px] border-border bg-off-white text-text-main outline-none box-border font-sans transition-colors duration-150 focus:border-maroon focus:ring-0 ${isMobile ? 'py-[13px] px-[14px] text-[15px] min-h-[52px]' : 'py-[11px] px-[14px] text-[14px]'}`

  const content = sent ? (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-success-light border border-success-border flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={28} className="text-success" />
      </div>
      <h2 className="font-serif text-xl font-bold text-text-main m-0 mb-2">Check your email</h2>
      <p className="text-[13px] text-text-sub m-0 mb-6 leading-relaxed max-w-[280px] mx-auto">
        We've sent a password reset link to <strong className="text-text-main">{email}</strong>. Click the link in the email to set a new password.
      </p>
      <div className="bg-off-white rounded-lg py-3 px-4 text-[12px] text-text-muted mb-6">
        <p className="m-0 mb-1">Didn't receive it?</p>
        <p className="m-0">Check your spam folder or <button onClick={() => { setSent(false); setEmail('') }} className="text-maroon font-semibold bg-transparent border-none cursor-pointer p-0 underline">try again</button></p>
      </div>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-[13px] text-maroon no-underline font-semibold">
        <ArrowLeft size={14} /> Back to Sign In
      </Link>
    </div>
  ) : (
    <>
      <div className="w-12 h-12 rounded-full bg-maroon/10 flex items-center justify-center mx-auto mb-5">
        <Mail size={22} className="text-maroon" />
      </div>
      <h2 className={`font-serif font-bold text-text-main m-0 mb-2 ${isMobile ? 'text-[22px]' : 'text-xl'} text-center`}>
        Forgot your password?
      </h2>
      <p className="text-[13px] text-text-muted m-0 mb-6 text-center leading-relaxed">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {error && (
        <div className="py-2.5 px-3.5 rounded-lg bg-danger-light border border-danger-border text-danger text-[13px] mb-4 flex gap-2 items-start">
          <span>⚠</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-text-sub mb-1.5 tracking-[0.06em] uppercase">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            required
            placeholder="example@gmail.com"
            className={inpClass}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg border-none text-[14px] font-bold font-sans shadow-[0_3px_14px_rgba(123,26,42,0.25)] transition-colors duration-150 ${isMobile ? 'min-h-[52px] py-3.5 text-[15px]' : ''} ${loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}
        >
          {loading ? <span className="spinner" /> : 'Send Reset Link'}
        </button>
      </form>

      <p className="text-[13px] text-text-muted mt-5 text-center">
        Remember your password?{' '}
        <Link to="/login" className="text-maroon no-underline font-semibold">Sign in</Link>
      </p>
    </>
  )

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
            <img src={crmcLogo} alt="CRMC" className="w-16 h-16 rounded-full border-2 border-gold/45 shadow-[0_0_32px_rgba(184,144,10,0.18)] mb-3.5 mx-auto" />
            <div className="font-serif font-bold text-[13px] text-gold mb-1.5">CampusFlow</div>
            <h1 className="font-serif text-[clamp(22px,6vw,28px)] font-bold text-white m-0 mb-2 leading-[1.1]">
              Reset Password
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
