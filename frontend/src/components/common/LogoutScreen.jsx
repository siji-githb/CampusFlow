import { useEffect, useState } from 'react'

export default function LogoutScreen({ isConfirming, onConfirm, onCancel }) {
  const [mounted, setMounted] = useState(false)
  const [dots, setDots] = useState('')

  useEffect(() => {
    // Smooth mount
    const t = setTimeout(() => setMounted(true), 30)
    
    // Animated dots for signing out state
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)

    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-9999 bg-black/50 flex items-center justify-center p-4 transition-opacity duration-300 ease-out">
      <div 
        className={`bg-white rounded-3xl w-full max-w-105 shadow-2xl border border-border relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* State 1: Confirmation */}
        {isConfirming ? (
          <div className="p-6 sm:p-7 flex flex-col animate-fade-up">
            {/* Heading with inline icon */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-maroon/8 border border-maroon/15 flex items-center justify-center shrink-0 text-maroon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7B1A2A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </div>
              <h3 className="text-[19px] sm:text-[20px] font-serif font-bold text-text-main m-0 tracking-tight leading-snug">
                Log out of CampusFlow?
              </h3>
            </div>
            
            <p className="text-[13.5px] text-text-sub m-0 mb-6 leading-relaxed">
              Are you sure you want to log out? You will need to sign in again to access your portal.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button 
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-border bg-white text-text-main font-bold text-[14px] hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl border-none bg-maroon text-white font-bold text-[14px] hover:bg-maroon-dark shadow-sm transition-all cursor-pointer active:scale-[0.98]"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Loading / Signing Out */
          <div className="p-8 flex flex-col items-center justify-center animate-fade-up">
            <div className="relative flex items-center justify-center w-14 h-14 mb-4">
              <div className="absolute inset-0 bg-maroon/5 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
              <svg className="absolute w-12 h-12 text-slate-100" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
              </svg>
              <svg className="absolute w-12 h-12 text-maroon animate-spin" viewBox="0 0 24 24" fill="none" style={{ animationDuration: '1s' }}>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-text-main text-[17px] font-serif font-bold tracking-tight m-0 mb-1 leading-tight">
              CampusFlow
            </h2>
            <div className="text-text-muted text-[11px] tracking-[0.2em] uppercase font-bold m-0 leading-tight w-25 text-center">
              <span>Logging out{dots}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
