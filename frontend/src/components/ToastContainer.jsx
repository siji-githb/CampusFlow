import React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const TOAST_VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-success',
    iconBg: 'bg-success-light text-success border border-success-border/60',
    cardBorder: 'border-success-border/60',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-danger',
    iconBg: 'bg-danger-light text-danger border border-danger-border/60',
    cardBorder: 'border-danger-border/60',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-gold',
    iconBg: 'bg-gold-light text-gold border border-gold-border/60',
    cardBorder: 'border-gold-border/60',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue',
    iconBg: 'bg-blue-light text-blue border border-blue-border/60',
    cardBorder: 'border-blue-border/60',
  },
}

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null

  return createPortal(
    <div 
      className="fixed top-15 sm:top-20.5 left-0 right-0 sm:left-auto sm:right-6 px-3 sm:px-0 z-999999 flex flex-col items-center sm:items-end gap-2 max-w-sm sm:w-full pointer-events-none mx-auto sm:mx-0"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info
        const IconComponent = variant.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-85 sm:max-w-sm flex items-center gap-2.5 sm:gap-3 py-2.5 px-3 sm:py-3.5 sm:px-4 rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border bg-white/95 backdrop-blur-md transition-all ${
              variant.cardBorder
            } ${toast.isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            <div className={`w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${variant.iconBg}`}>
              <IconComponent size={14} className="sm:w-4 sm:h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] sm:text-[13px] font-semibold text-text-main m-0 leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="w-5 h-5 rounded-md text-text-muted hover:text-text-main hover:bg-off-white flex items-center justify-center cursor-pointer transition-colors shrink-0 p-0 border-none bg-transparent"
              aria-label="Close notification"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>,
    document.body
  )
}
