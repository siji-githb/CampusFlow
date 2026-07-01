import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Calendar, Ticket, Route, Bot, Zap, BarChart3 } from 'lucide-react'

import crmcLogo from '../assets/crmc-logo.webp'

// ── Responsive hook ──
function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

const FEATURES = [
  { icon: <Calendar size={22} strokeWidth={2} className="text-maroon" />, title: 'Online Appointment Booking', desc: 'Schedule TOR, COE, or Diploma requests anytime — no need to line up just to get a number.' },
  { icon: <Ticket size={22} strokeWidth={2} className="text-maroon" />, title: 'Digital Queue Number',       desc: 'Receive your queue number on your phone the moment you arrive on campus.' },
  { icon: <Route size={22} strokeWidth={2} className="text-maroon" />, title: 'Step-by-Step Guidance',      desc: 'Know exactly which counter to go to next. No confusion, no unnecessary wandering.' },
  { icon: <Bot size={22} strokeWidth={2} className="text-maroon" />, title: 'AI Scheduling Assistant',    desc: 'Ask anything about requirements, schedules, or procedures — conversationally.' },
  { icon: <Zap size={22} strokeWidth={2} className="text-maroon" />, title: 'Real-Time Step Tracking',    desc: 'Your progress updates live as each registrar counter confirms your transaction.' },
  { icon: <BarChart3 size={22} strokeWidth={2} className="text-maroon" />, title: 'Smart Admin Reports',        desc: 'Registrar staff see analytics, demand forecasts, and AI insights at a glance.' },
]

const STEPS = [
  { step: '01', title: 'Book Online',         desc: 'Pick your transaction type, choose a date and time slot, and confirm — all from your phone.' },
  { step: '02', title: 'Get Your Number',     desc: "On your appointment day, tap 'Get Queue Number' and receive your digital ticket instantly." },
  { step: '03', title: 'Track Your Progress', desc: 'Watch your steps update in real time as each counter confirms your transaction.' },
]

export default function Landing() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const width     = useWindowWidth()
  const isMobile  = width < 768

  const handlePrimary = () => {
    if (user) {
      if (user.role === 'student') navigate('/student/dashboard')
      else if (user.role === 'staff') navigate('/staff/dashboard')
      else navigate('/admin/dashboard')
    } else {
      navigate('/register')
    }
  }

  return (
    <div className="font-sans bg-white min-h-screen text-text-main">

      {/* ── Navbar ── */}
      <nav className={`bg-maroon flex items-center justify-between sticky top-0 z-50 shadow-[0_2px_12px_rgba(123,26,42,0.25)] ${isMobile ? 'px-4 h-14' : 'px-8 h-16'}`}>
        <div className="flex items-center gap-2.5">
          <img src={crmcLogo} alt="CRMC" className={`rounded-full border-2 border-gold/50 shrink-0 ${isMobile ? 'w-[30px] h-[30px]' : 'w-[36px] h-[36px]'}`} />
          <div>
            <div className={`font-serif font-bold text-[#F0C040] leading-[1.1] ${isMobile ? 'text-[15px]' : 'text-[17px]'}`}>CampusFlow</div>
            {!isMobile && <div className="text-[10px] text-white/50 tracking-wider">CRMC Registrar System</div>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {user ? (
            <button onClick={handlePrimary} className={`rounded-lg border-none bg-[#F0C040] text-maroon text-[13px] font-bold cursor-pointer ${isMobile ? 'py-[7px] px-3.5' : 'py-2 px-5'}`}>
              Dashboard →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className={`rounded-lg border border-white/25 bg-transparent text-white text-[13px] font-medium cursor-pointer ${isMobile ? 'py-[7px] px-3' : 'py-2 px-5'}`}>
                Login
              </button>
              <button onClick={() => navigate('/register')} className={`rounded-lg border-none bg-[#F0C040] text-maroon text-[13px] font-bold cursor-pointer ${isMobile ? 'py-[7px] px-3.5' : 'py-2 px-5'}`}>
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={`bg-linear-to-br from-maroon via-[#9B2335] to-maroon text-center relative overflow-hidden ${isMobile ? 'pt-10 px-5 pb-16' : 'pt-20 px-8 pb-24'}`}>
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#F0C040_1px,transparent_1px)] bg-size-[32px_32px]" />
        {/* White arc */}
        <div className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-white pointer-events-none ${isMobile ? '-bottom-12 w-[600px] h-[100px]' : 'bottom-[-120px] w-[900px] h-[240px]'}`} />

        <div className="relative">
          {/* Logo */}
          <div className={isMobile ? 'mb-4' : 'mb-6'}>
            <img src={crmcLogo} alt="CRMC" className={`rounded-full border-3 border-gold/50 shadow-[0_0_48px_rgba(240,192,64,0.2)] ${isMobile ? 'w-[72px] h-[72px]' : 'w-[88px] h-[88px]'}`} />
          </div>

          {/* Badge */}
          <div className={`inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 ${isMobile ? 'py-1 px-3.5 mb-4' : 'py-1.5 px-4 mb-6'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0C040] inline-block shrink-0" />
            <span className={`text-[#F0C040] font-medium tracking-wider ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>
              {isMobile ? 'BSIT Capstone 2026 · CRMC' : 'College of Computer Studies · BSIT Capstone 2026'}
            </span>
          </div>

          <h1 className={`font-serif font-extrabold text-white leading-[1.1] ${isMobile ? 'text-[clamp(26px,8vw,36px)] m-0 mb-4' : 'text-[clamp(2.2rem,5.5vw,3.8rem)] m-0 mb-5'}`}>
            No More Long Lines<br />
            at the <span className="text-[#F0C040]">Registrar's Office</span>
          </h1>

          <p className={`text-white/70 max-w-[520px] leading-relaxed ${isMobile ? 'text-[14px] m-0 mx-auto mb-6' : 'text-[clamp(1rem,2vw,1.1rem)] m-0 mx-auto mb-10'}`}>
            CampusFlow is an AI-powered appointment and queue management system guiding CRMC students through every registrar transaction.
          </p>

          <div className={`flex gap-2.5 justify-center items-stretch ${isMobile ? 'flex-col' : 'flex-row flex-wrap'}`}>
            <button onClick={handlePrimary} className={`rounded-[10px] border-none bg-[#F0C040] text-maroon font-bold cursor-pointer font-sans shadow-[0_4px_24px_rgba(240,192,64,0.3)] ${isMobile ? 'py-3.5 px-6 text-[15px] min-h-[52px]' : 'py-3.5 px-8 text-[15px]'}`}>
              {user ? 'Go to Dashboard →' : 'Book an Appointment →'}
            </button>
            {!user && (
              <button onClick={() => navigate('/login')} className={`rounded-[10px] border border-white/25 bg-transparent text-white font-medium cursor-pointer font-sans ${isMobile ? 'py-3.5 px-6 text-[15px] min-h-[52px]' : 'py-3.5 px-8 text-[15px]'}`}>
                Sign in to your account
              </button>
            )}
          </div>

          {/* Stats */}
          <div className={`flex flex-wrap justify-around ${isMobile ? 'gap-0 mt-8 pt-6 border-t border-white/10' : 'gap-12 mt-16 pt-0 border-none'}`}>
            {[
              { value: '3 Types', label: 'Transactions' },
              { value: 'AI', label: 'Powered' },
              { value: 'Live', label: 'Queue' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className={`font-serif font-bold text-[#F0C040] ${isMobile ? 'text-[18px]' : 'text-[1.2rem]'}`}>{s.value}</div>
                <div className={`text-white/45 mt-0.5 tracking-wider uppercase ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={`bg-off-white ${isMobile ? 'py-10 px-4' : 'py-20 px-8'}`}>
        <div className="max-w-[1040px] mx-auto">
          <div className={`text-center ${isMobile ? 'mb-6' : 'mb-12'}`}>
            <p className="text-[11px] font-bold text-gold tracking-[0.12em] uppercase m-0 mb-2">
              What CampusFlow Does
            </p>
            <h2 className={`font-serif font-bold text-maroon m-0 leading-[1.2] ${isMobile ? 'text-[22px]' : 'text-[clamp(1.8rem,4vw,2.4rem)]'}`}>
              Everything You Need,<br />Built Into One System
            </h2>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-4'}`}>
            {FEATURES.map((f, i) => (
              <div key={i} className={`rounded-[14px] bg-white border border-border shadow-[0_1px_6px_rgba(0,0,0,0.04)] ${isMobile ? 'p-4 flex gap-3.5 items-start' : 'p-6 block items-initial gap-0'}`}>
                <div className={`bg-maroon-light shrink-0 flex items-center justify-center text-[1.3rem] ${isMobile ? 'w-[44px] h-[44px] rounded-xl mb-0' : 'w-[44px] h-[44px] rounded-[10px] mb-3.5'}`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className={`text-[15px] font-semibold text-maroon ${isMobile ? 'm-0 mb-1' : 'm-0 mb-2'}`}>{f.title}</h3>
                  <p className="text-[13px] text-text-sub m-0 leading-[1.65]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className={`bg-white ${isMobile ? 'py-10 px-4' : 'py-20 px-8'}`}>
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-[11px] font-bold text-gold tracking-[0.12em] uppercase m-0 mb-2">
            Simple Process
          </p>
          <h2 className={`font-serif font-bold text-maroon leading-[1.2] ${isMobile ? 'text-[22px] m-0 mb-8' : 'text-[clamp(1.8rem,4vw,2.4rem)] m-0 mb-14'}`}>
            From Booking to Done<br />in Three Steps
          </h2>

          {isMobile ? (
            /* Mobile: vertical timeline */
            <div className="flex flex-col gap-0 text-left">
              {STEPS.map((s, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-[44px] h-[44px] rounded-full bg-maroon flex items-center justify-center font-serif font-bold text-[14px] text-[#F0C040] shadow-[0_4px_16px_rgba(123,26,42,0.2)] shrink-0">
                      {s.step}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-px flex-1 min-h-[32px] bg-linear-to-b from-maroon-border to-transparent my-1" />
                    )}
                  </div>
                  <div className={`pt-2 ${i < STEPS.length - 1 ? 'pb-8' : 'pb-0'}`}>
                    <h3 className="text-[15px] font-semibold text-maroon m-0 mb-1.5">{s.title}</h3>
                    <p className="text-[13px] text-text-sub m-0 leading-[1.65]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: horizontal grid */
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10">
              {STEPS.map((s, i) => (
                <div key={i}>
                  <div className="w-[52px] h-[52px] rounded-full bg-maroon flex items-center justify-center mx-auto mb-5 font-serif font-bold text-[16px] text-[#F0C040] shadow-[0_4px_16px_rgba(123,26,42,0.2)]">
                    {s.step}
                  </div>
                  <h3 className="text-[16px] font-semibold text-maroon m-0 mb-2.5">{s.title}</h3>
                  <p className="text-[13px] text-text-sub m-0 leading-[1.65]">{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={`bg-gold-light text-center border-gold ${isMobile ? 'py-9 px-5 border-t-[3px]' : 'py-18 px-8 border-t-4'}`}>
        <div className="max-w-[560px] mx-auto">
          <h2 className={`font-serif font-extrabold text-maroon leading-[1.2] ${isMobile ? 'text-[22px] m-0 mb-3' : 'text-[clamp(1.5rem,3vw,2.1rem)] m-0 mb-4'}`}>
            Ready to Skip the Line?
          </h2>
          <p className={`text-text-sub leading-[1.65] ${isMobile ? 'text-[14px] m-0 mb-6' : 'text-[15px] m-0 mb-7'}`}>
            Create your CampusFlow account and book your next registrar appointment in under 2 minutes.
          </p>
          <button onClick={handlePrimary} className={`rounded-[10px] border-none bg-maroon text-white font-bold cursor-pointer font-sans shadow-[0_4px_20px_rgba(123,26,42,0.25)] ${isMobile ? 'py-3.5 px-6 text-[15px] min-h-[52px] w-full' : 'py-3.5 px-9 text-[15px] w-auto'}`}>
            {user ? 'Go to Dashboard →' : 'Create Free Account →'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`bg-maroon flex flex-wrap ${isMobile ? 'py-5 px-4 items-center justify-center flex-col gap-2.5 text-center' : 'py-6 px-8 items-center justify-between flex-row gap-4 text-left'}`}>
        <div className="flex items-center gap-2.5">
          <img src={crmcLogo} alt="CRMC" className="w-[26px] h-[26px] rounded-full" />
          <div className="text-left">
            <div className={`font-semibold text-white/85 ${isMobile ? 'text-[12px]' : 'text-[13px]'}`}>Cebu Roosevelt Memorial Colleges</div>
            <div className={`text-white/40 mt-px ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>College of Computer Studies · BSIT Capstone 2026</div>
          </div>
        </div>
        <div className={`text-white/35 tracking-wider ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>
          SDG 4 · Quality Education &nbsp;·&nbsp; SDG 9 · Innovation
        </div>
      </footer>
    </div>
  )
}
