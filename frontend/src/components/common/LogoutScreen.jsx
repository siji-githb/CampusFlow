import { useEffect, useState } from 'react'

export default function LogoutScreen({ isConfirming, onConfirm, onCancel }) {
  const [mounted, setMounted] = useState(false)
  const [dots, setDots] = useState('')

  useEffect(() => {
    // Smooth, slightly delayed mount for transition
    const t = setTimeout(() => setMounted(true), 50)
    
    // Sleek animated dots
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)

    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-9999 bg-[#050505]/40 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-500 ease-out">
      <div 
        className={`bg-white/95 backdrop-blur-xl rounded-[32px] w-full max-w-[400px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.3)] border border-white/50 relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
        } ${isConfirming ? 'h-[360px] sm:h-[320px]' : 'h-[240px]'}`}
      >
        {/* State 1: Confirmation */}
        <div 
          className={`absolute inset-0 p-8 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isConfirming ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12 pointer-events-none'
          }`}
        >
          <div className="w-14 h-14 rounded-[18px] bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center mb-6 border border-slate-200 shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_4px_12px_rgba(0,0,0,0.03)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7B1A2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
          <h3 className="text-[22px] font-serif font-bold text-slate-900 m-0 mb-2 tracking-tight leading-tight">Log out of CampusFlow?</h3>
          <p className="text-[14px] text-slate-500 m-0 mb-8 leading-relaxed font-medium">
            Are you sure you want to log out? You will need to sign in again to access your portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-auto">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-[14px] hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 px-4 rounded-xl border-none bg-maroon text-white font-bold text-[14px] hover:bg-maroon-dark shadow-[0_4px_16px_rgba(123,26,42,0.25)] hover:shadow-[0_6px_20px_rgba(123,26,42,0.35)] hover:-translate-y-px transition-all cursor-pointer active:scale-[0.98]"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* State 2: Loading / Signing Out */}
        <div 
          className={`absolute inset-0 p-8 flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] delay-50 ${
            !isConfirming ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'
          }`}
        >
          <div className="relative flex items-center justify-center w-16 h-16 mb-5">
            <div className="absolute inset-0 bg-maroon/5 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
            <svg className="absolute w-14 h-14 text-slate-100" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
            </svg>
            <svg className="absolute w-14 h-14 text-maroon animate-spin" viewBox="0 0 24 24" fill="none" style={{ animationDuration: '1s' }}>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-slate-900 text-[18px] font-serif font-bold tracking-tight m-0 mb-1.5 leading-tight">
            CampusFlow
          </h2>
          <div className="text-slate-400 text-[11px] tracking-[0.2em] uppercase font-bold m-0 leading-tight w-[100px] text-center">
            <span>Logging out{dots}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
