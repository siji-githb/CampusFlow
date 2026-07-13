import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Calendar, Ticket, Route, Bot, Zap, BarChart3, ChevronRight, Menu, X } from 'lucide-react'
import campusFlowLogo from '../assets/logo.png'
import loginImage from '../assets/landing_page.png'

const FEATURES = [
  { icon: <Calendar size={20} strokeWidth={2.5} className="text-maroon" />, title: 'Online Appointment Booking', desc: 'Schedule TOR, COE, or Diploma requests anytime — no need to line up just to get a number.' },
  { icon: <Ticket size={20} strokeWidth={2.5} className="text-maroon" />, title: 'Digital Queue Number',       desc: 'Receive your queue number on your phone the moment you arrive on campus.' },
  { icon: <Route size={20} strokeWidth={2.5} className="text-maroon" />, title: 'Step-by-Step Guidance',      desc: 'Know exactly which counter to go to next. No confusion, no unnecessary wandering.' },
  { icon: <Bot size={20} strokeWidth={2.5} className="text-maroon" />, title: 'AI Scheduling Assistant',    desc: 'Ask anything about requirements, schedules, or procedures — conversationally.' },
  { icon: <Zap size={20} strokeWidth={2.5} className="text-maroon" />, title: 'Real-Time Step Tracking',    desc: 'Your progress updates live as each registrar counter confirms your transaction.' },
  { icon: <BarChart3 size={20} strokeWidth={2.5} className="text-maroon" />, title: 'Smart Admin Reports',        desc: 'Registrar staff see analytics, demand forecasts, and AI insights at a glance.' },
]

const STEPS = [
  { step: '01', title: 'Book Online',         desc: 'Pick your transaction type, choose a date and time slot, and confirm — all from your phone.' },
  { step: '02', title: 'Get Your Number',     desc: "On your appointment day, tap 'Get Queue Number' and receive your digital ticket instantly." },
  { step: '03', title: 'Track Progress',      desc: 'Watch your steps update in real time as each counter confirms your transaction.' },
]

export default function Landing() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (user) {
      if (user.role === 'student') navigate('/student/dashboard', { replace: true })
      else if (user.role === 'staff') navigate('/staff/dashboard', { replace: true })
      else navigate('/admin/dashboard', { replace: true })
    }
  }, [user, navigate])

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
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800">

      {/* ── Header (Z-Pattern Top) ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Top Left: Branding */}
          <Link to="/" className="flex items-center gap-3 no-underline group" aria-label="CampusFlow Home">
            <img src={campusFlowLogo} alt="CampusFlow Logo" className="w-10 h-10 rounded-full bg-white object-contain border border-slate-200 shadow-sm group-hover:scale-105 transition-transform" />
            <div>
              <div className="font-serif font-bold text-slate-900 text-xl leading-tight tracking-tight">CampusFlow</div>
              <div className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">Registrar System</div>
            </div>
          </Link>

          {/* Top Right: Navigation & CTA */}
          <nav aria-label="Main Navigation" className="flex items-center gap-4 md:gap-6">
            
            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-6 text-[14px] font-medium text-slate-500">
              <a href="#hero" className="hover:text-maroon transition-colors no-underline">Home</a>
              <a href="#features" className="hover:text-maroon transition-colors no-underline">Features</a>
              <a href="#process" className="hover:text-maroon transition-colors no-underline">How it works</a>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 md:border-l md:border-slate-200 md:pl-6">
              {user ? (
                <button onClick={handlePrimary} className="rounded-xl border-none bg-maroon text-white text-[14px] font-bold cursor-pointer py-2.5 px-6 shadow-[0_4px_12px_rgba(123,26,42,0.15)] hover:bg-maroon-dark hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(123,26,42,0.25)] transition-all flex items-center gap-1.5">
                  Dashboard <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="hidden sm:block rounded-xl border border-slate-200 bg-white text-slate-700 text-[14px] font-bold cursor-pointer py-2.5 px-6 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                    Sign In
                  </button>
                  <button onClick={() => navigate('/register')} className="hidden md:block rounded-xl border-none bg-maroon text-white text-[14px] font-bold cursor-pointer py-2.5 px-6 shadow-[0_4px_12px_rgba(123,26,42,0.15)] hover:bg-maroon-dark hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(123,26,42,0.25)] transition-all">
                    Register
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="relative md:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
              </button>

              {/* Smooth Dropdown Animation */}
              <nav 
                className={`absolute right-0 top-full mt-3 w-48 bg-white rounded-2xl border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.08)] flex flex-col p-2 transform origin-top-right transition-all duration-300 ${isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
              >
                <a href="#hero" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-maroon transition-colors no-underline">Home</a>
                <a href="#features" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-maroon transition-colors no-underline">Features</a>
                <a href="#process" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-maroon transition-colors no-underline">How it works</a>
                {!user && (
                  <>
                    <div className="mt-1 pt-1 border-t border-slate-100 sm:hidden">
                      <a onClick={() => { setIsMenuOpen(false); navigate('/login'); }} className="block w-full px-4 py-3 rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-maroon transition-colors no-underline cursor-pointer">Sign In</a>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-100">
                      <a onClick={() => { setIsMenuOpen(false); navigate('/register'); }} className="block w-full px-4 py-3 rounded-xl text-[14px] font-bold text-maroon hover:bg-maroon/5 transition-colors no-underline cursor-pointer">Register</a>
                    </div>
                  </>
                )}
              </nav>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero Section (Z-Pattern Bottom) ── */}
        <section id="hero" className="relative pt-8 pb-24 md:pt-12 md:pb-32 px-6 overflow-hidden bg-white">
          {/* Subtle Enterprise Background Texture */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle,#7B1A2A_1px,transparent_1px)] bg-size-[24px_24px]" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-maroon/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            
            {/* Bottom Left: Headline & Primary CTA */}
            <div className="flex-1 max-w-[640px] text-center md:text-left">


              <h1 className="font-serif font-extrabold text-slate-900 text-[clamp(28px,3.5vw,52px)] leading-[1.1] tracking-tight m-0 mb-12">
                No More Long Lines<br />
                at the <span className="text-maroon">Registrar's Office</span>
              </h1>

              <p className="text-slate-500 text-[clamp(0.95rem,1.1vw,1rem)] leading-relaxed m-0 mb-8 max-w-[500px] mx-auto md:mx-0 font-medium">
                CampusFlow is an AI-powered appointment and queue management system guiding CRMC students through every registrar transaction seamlessly.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button onClick={handlePrimary} className="rounded-xl border-none bg-maroon text-white font-bold cursor-pointer font-sans shadow-[0_4px_16px_rgba(123,26,42,0.2)] py-3 px-6 text-[14.5px] hover:bg-maroon-dark hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(123,26,42,0.3)] transition-all flex items-center justify-center gap-2">
                  {user ? 'Go to Dashboard' : 'Book an Appointment'} <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                {!user && (
                  <button onClick={() => navigate('/login')} className="rounded-xl border border-slate-200 bg-white text-slate-700 font-bold cursor-pointer font-sans py-3 px-6 text-[14.5px] shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    Sign in to account
                  </button>
                )}
              </div>

              {/* Trust/Stats Mini-footer (Desktop) */}
              <div className="hidden md:flex items-center justify-start gap-8 mt-12 pt-8 border-t border-slate-100">
                {[
                  { value: '3+', label: 'Transaction Types' },
                  { value: 'AI', label: 'Powered Assistant' },
                  { value: 'Live', label: 'Queue Tracking' },
                ].map((s, i) => (
                  <div key={i} className="text-left">
                    <div className="font-serif font-bold text-slate-900 text-xl">{s.value}</div>
                    <div className="text-slate-500 text-[11px] font-bold tracking-wider uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Right: Hero Image & Mobile Stats */}
            <div className="flex-1 w-full max-w-[500px] md:max-w-none flex flex-col items-center md:items-end justify-center">
              <div className="relative w-full max-w-[600px] aspect-square md:aspect-auto md:h-[600px] rounded-[40px] bg-slate-50 border border-slate-100 shadow-2xl flex items-center justify-center p-8 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-white/40 to-transparent z-10 pointer-events-none" />
                <img 
                  src={loginImage} 
                  alt="Student using CampusFlow application" 
                  className="w-full h-auto object-contain drop-shadow-2xl relative z-20 hover:scale-[1.02] transition-transform duration-700" 
                />
              </div>

              {/* Trust/Stats Mini-footer (Mobile) */}
              <div className="flex md:hidden items-center justify-center gap-6 sm:gap-8 mt-12 pt-8 border-t border-slate-100 w-full">
                {[
                  { value: '3+', label: 'Transaction Types' },
                  { value: 'AI', label: 'Powered Assistant' },
                  { value: 'Live', label: 'Queue Tracking' },
                ].map((s, i) => (
                  <div key={i} className="text-left">
                    <div className="font-serif font-bold text-slate-900 text-xl">{s.value}</div>
                    <div className="text-slate-500 text-[11px] font-bold tracking-wider uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── Features Section (Enterprise Cards) ── */}
        <section id="features" className="py-24 px-6 bg-slate-50 border-t border-slate-200">
          <div className="max-w-[1280px] mx-auto">
            <header className="text-center mb-16 max-w-[600px] mx-auto">
              <h2 className="text-[13px] font-bold text-maroon tracking-[0.15em] uppercase m-0 mb-3">
                System Capabilities
              </h2>
              <h3 className="font-serif font-extrabold text-slate-900 text-[clamp(1.5rem,3vw,2.2rem)] m-0 leading-[1.15] tracking-tight">
                Everything You <span className="text-[#F0C040]">Need</span>, Built Into <span className="text-[#F0C040]">One</span> Platform
              </h3>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {FEATURES.map((f, i) => (
                <article key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-maroon/5 border border-maroon/10 flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h4 className="text-[15px] font-bold text-slate-900 m-0 mb-1.5 tracking-tight">{f.title}</h4>
                  <p className="text-[13.5px] text-slate-500 m-0 leading-relaxed font-medium">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Process Section ── */}
        <section id="process" className="py-24 px-6 bg-white border-t border-slate-200">
          <div className="max-w-[1280px] mx-auto">
            <header className="text-center mb-16 max-w-[600px] mx-auto">
              <h2 className="text-[13px] font-bold text-maroon tracking-[0.15em] uppercase m-0 mb-3">
                Simple Workflow
              </h2>
              <h3 className="font-serif font-extrabold text-slate-900 text-[clamp(1.5rem,3vw,2.2rem)] m-0 leading-[1.15] tracking-tight">
                From Booking to <span className="text-[#F0C040]">Done</span> in Three Steps
              </h3>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-[40px] left-[16%] right-[16%] h-px bg-slate-200" />
              
              {STEPS.map((s, i) => (
                <article key={i} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl border-2 border-maroon flex items-center justify-center font-serif font-bold text-lg text-maroon shadow-[0_8px_20px_rgba(123,26,42,0.15)] mb-5 bg-white">
                    {s.step}
                  </div>
                  <h4 className="text-[16px] font-bold text-slate-900 m-0 mb-2 tracking-tight">{s.title}</h4>
                  <p className="text-[13.5px] text-slate-500 m-0 leading-relaxed font-medium max-w-[260px]">{s.desc}</p>
                </article>
              ))}
            </div>

            <div className="mt-20 text-center">
              <button onClick={handlePrimary} className="rounded-xl border-none bg-maroon text-white font-bold cursor-pointer font-sans shadow-[0_4px_16px_rgba(123,26,42,0.2)] py-4 px-10 text-[16px] hover:bg-maroon-dark hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(123,26,42,0.3)] transition-all">
                {user ? 'View Your Appointments' : 'Get Started Now'}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer & Sitemap (SEO Optimized) ── */}
      <footer className="bg-slate-900 pt-20 pb-10 px-6 border-t border-slate-800 text-slate-400 font-medium">
        <div className="max-w-[1280px] mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
            
            {/* Branding & Info */}
            <div className="lg:col-span-5">
              <Link to="/" className="flex items-center gap-3 no-underline mb-6" aria-label="CampusFlow Home">
                <img src={campusFlowLogo} alt="CampusFlow Logo" className="w-10 h-10 rounded-full bg-white object-contain" />
                <div>
                  <div className="font-serif font-bold text-white text-xl leading-tight tracking-tight">CampusFlow</div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Registrar System</div>
                </div>
              </Link>
              <p className="text-[14px] leading-relaxed mb-6 max-w-[400px]">
                An intelligent queueing and appointment system built to streamline registrar operations and improve the student experience at CRMC.
              </p>
              <div className="text-[13px] border-l-2 border-maroon pl-4">
                <div className="font-bold text-white mb-1">Cebu Roosevelt Memorial Colleges</div>
                <div>College of Computer Studies · BSIT Capstone 2026</div>
              </div>
            </div>

            {/* Sitemap Column 1 */}
            <nav aria-label="Product Sitemap" className="lg:col-span-2 lg:col-start-7">
              <h4 className="text-white font-bold text-[15px] mb-5 tracking-tight">Quick Links</h4>
              <ul className="list-none p-0 m-0 space-y-3 text-[14px]">
                <li><a href="#hero" className="hover:text-white transition-colors no-underline">Home</a></li>
                <li><a href="#features" className="hover:text-white transition-colors no-underline">Features</a></li>
                <li><a href="#process" className="hover:text-white transition-colors no-underline">How it Works</a></li>
              </ul>
            </nav>

            {/* Sitemap Column 2 */}
            <nav aria-label="Portals Sitemap" className="lg:col-span-2">
              <h4 className="text-white font-bold text-[15px] mb-5 tracking-tight">Portals</h4>
              <ul className="list-none p-0 m-0 space-y-3 text-[14px]">
                <li><Link to="/login" className="hover:text-white transition-colors no-underline">Student Login</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors no-underline">Staff Login</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors no-underline">Admin Dashboard</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors no-underline">Create Account</Link></li>
              </ul>
            </nav>



          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800 text-[13px] gap-4">
            <div>&copy; {new Date().getFullYear()} CampusFlow. All rights reserved.</div>
            <div className="flex gap-4">
              <span className="hidden sm:inline">SDG 4 Quality Education &bull; SDG 9 Innovation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
