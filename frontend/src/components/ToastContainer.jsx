import React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const TOAST_VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    cardBorder: 'border-emerald-200/90',
    glow: 'shadow-[0_12px_32px_rgba(0,0,0,0.08),0_0_16px_rgba(16,185,129,0.12)]',
    accentBar: 'bg-emerald-600',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50 text-rose-700 border border-rose-200',
    cardBorder: 'border-rose-200/90',
    glow: 'shadow-[0_12px_32px_rgba(0,0,0,0.08),0_0_16px_rgba(244,63,94,0.12)]',
    accentBar: 'bg-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 text-amber-700 border border-amber-200',
    cardBorder: 'border-amber-200/90',
    glow: 'shadow-[0_12px_32px_rgba(0,0,0,0.08),0_0_16px_rgba(245,158,11,0.12)]',
    accentBar: 'bg-amber-600',
  },
  info: {
    icon: Info,
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-50 text-sky-700 border border-sky-200',
    cardBorder: 'border-sky-200/90',
    glow: 'shadow-[0_12px_32px_rgba(0,0,0,0.08),0_0_16px_rgba(14,165,233,0.12)]',
    accentBar: 'bg-sky-600',
  },
}

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null

  return createPortal(
    <div 
      className="fixed top-15 sm:top-20.5 inset-x-0 z-999999 pointer-events-none transition-[padding] duration-300"
      style={{ paddingLeft: 'var(--cf-sidebar-width, 0px)' }}
      role="region"
      aria-label="Notifications"
    >
      <div className="w-full max-w-300 mx-auto px-4 md:px-10 flex justify-center sm:justify-end">
        <div className="w-full max-w-sm flex flex-col items-center sm:items-end gap-2.5">
          {toasts.map((toast) => {
        const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info
        const IconComponent = variant.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-85 sm:max-w-sm flex items-center gap-3 py-3 px-3.5 sm:py-3.5 sm:px-4 rounded-xl sm:rounded-2xl border bg-white/95 text-text-main backdrop-blur-xl transition-all relative overflow-hidden shadow-md ${
              variant.cardBorder
            } ${variant.glow} ${toast.isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            {/* Left Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.25 ${variant.accentBar}`} />

            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-2xs ml-1 ${variant.iconBg}`}>
              <IconComponent size={16} className="sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-fluid-12 sm:text-fluid-13 font-semibold text-text-main m-0 leading-snug tracking-normal">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="w-6 h-6 rounded-lg text-text-muted hover:text-text-main hover:bg-black/5 flex items-center justify-center cursor-pointer transition-colors shrink-0 p-0 border-none bg-transparent"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
          )
        })}
        </div>
      </div>
    </div>,
    document.body
  )
}
