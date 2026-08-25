import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Tag, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export default function PriorityPromptBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [closed, setClosed] = useState(() => {
    const isClosedSession = sessionStorage.getItem('campusflow_priority_banner_closed') === 'true'
    const isDismissedPermanent = localStorage.getItem('campusflow_priority_banner_dismissed') === 'true'
    return isClosedSession || isDismissedPermanent
  })

  // Only show if user is regular student and hasn't dismissed or closed the banner
  const isRegular = !user?.priority_class || user?.priority_class.toLowerCase() === 'regular'
  
  if (closed || !isRegular || location.pathname === '/student/profile') {
    return null
  }

  // X button: Close for the current session
  const handleClose = () => {
    setClosed(true)
    sessionStorage.setItem('campusflow_priority_banner_closed', 'true')
  }

  // "Never show again" button: Permanent dismissal across all sessions
  const handleNeverShowAgain = () => {
    setClosed(true)
    localStorage.setItem('campusflow_priority_banner_dismissed', 'true')
  }

  const handleInquire = () => {
    navigate('/student/profile')
  }

  return (
    <div className="pointer-events-auto w-full animate-fade-up" role="alert">
      <div className="bg-white/95 border border-border sm:border-[1.5px] rounded-2xl p-3.5 sm:p-4 shadow-[0_12px_32px_rgba(123,26,42,0.10)] backdrop-blur-md flex items-start gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-maroon-light border border-maroon-border/40 text-maroon flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
          <Tag size={17} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-serif text-xs sm:text-[13.5px] font-bold text-maroon m-0 leading-tight">
              Priority Lane Access
            </h4>
          </div>

          <p className="text-[11px] sm:text-xs text-text-sub m-0 mt-1 leading-relaxed font-normal">
            PWD and pregnant students can apply for priority lane access.
          </p>

          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleInquire}
              className="py-1.5 px-3.5 rounded-xl bg-gold hover:bg-gold-dark text-white text-[11px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer border-none flex items-center gap-1"
            >
              <span>Inquire</span>
              <ChevronRight size={13} />
            </button>

            <button
              type="button"
              onClick={handleNeverShowAgain}
              className="py-1.5 px-2 rounded-xl bg-transparent hover:bg-off-white text-text-muted hover:text-text-main text-[10.5px] sm:text-[11px] font-medium transition-colors cursor-pointer border-none"
            >
              Never show again
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-6 h-6 rounded-lg text-text-muted hover:text-text-main hover:bg-off-white flex items-center justify-center cursor-pointer transition-colors shrink-0 -mt-1 -mr-1 p-0 border-none bg-transparent"
          title="Close for now"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
