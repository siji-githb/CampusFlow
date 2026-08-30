import React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const TOAST_VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35',
    cardBorder: 'border-emerald-500/40',
    glow: 'shadow-[0_16px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(16,185,129,0.18)]',
    accentBar: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/35',
    cardBorder: 'border-rose-500/40',
    glow: 'shadow-[0_16px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(244,63,94,0.18)]',
    accentBar: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/35',
    cardBorder: 'border-amber-500/40',
    glow: 'shadow-[0_16px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(245,158,11,0.18)]',
    accentBar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/20 text-sky-400 border border-sky-500/35',
    cardBorder: 'border-sky-500/40',
    glow: 'shadow-[0_16px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(14,165,233,0.18)]',
    accentBar: 'bg-sky-500',
  },
}

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null

  return createPortal(
    <div 
      className="fixed top-15 sm:top-20.5 left-0 right-0 sm:left-auto sm:right-6 px-3 sm:px-0 z-999999 flex flex-col items-center sm:items-end gap-2.5 max-w-sm sm:w-full pointer-events-none mx-auto sm:mx-0"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info
        const IconComponent = variant.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-85 sm:max-w-sm flex items-center gap-3 py-3 px-3.5 sm:py-3.5 sm:px-4 rounded-xl sm:rounded-2xl border bg-slate-900/95 text-white backdrop-blur-xl transition-all relative overflow-hidden ${
              variant.cardBorder
            } ${variant.glow} ${toast.isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            {/* Left Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${variant.accentBar}`} />

            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-xs ml-1 ${variant.iconBg}`}>
              <IconComponent size={16} className="sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-[12px] sm:text-[13px] font-semibold text-slate-100 m-0 leading-snug tracking-normal">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors shrink-0 p-0 border-none bg-transparent"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>,
    document.body
  )
}
