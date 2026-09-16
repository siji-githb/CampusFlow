import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react'

/**
 * Premium delete-account confirmation modal with blurred backdrop.
 *
 * Props:
 *  - isOpen        (bool)   — controls visibility
 *  - onClose       ()       — called when the user cancels
 *  - onConfirm     ()       — called after typing DELETE and clicking confirm
 *  - isDeleting    (bool)   — disables buttons & shows spinner while API runs
 *  - userEmail     (string) — shown inside the warning for context
 */
export default function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting = false, userEmail }) {
  const [confirmText, setConfirmText] = useState('')
  const inputRef = useRef(null)
  const isMatch = confirmText.trim().toUpperCase() === 'DELETE'

  // Reset input whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('')
      // Auto-focus the input after the entry animation
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape' && !isDeleting) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-3.5 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onClose() }}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />

      {/* Modal card */}
      <div
        className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-110 shadow-[0_25px_80px_rgba(0,0,0,0.25)] border border-red-100 overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top red accent bar */}
        <div className="h-1.5 bg-linear-to-r from-red-500 via-red-600 to-red-700" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed z-10"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Body */}
        <div className="p-5 sm:p-7 pt-6 sm:pt-8">
          {/* Warning icon */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
              <AlertTriangle size={28} className="sm:hidden" />
              <AlertTriangle size={32} className="hidden sm:block" />
            </div>
          </div>

          {/* Title */}
          <h2 className="font-serif text-[20px] sm:text-[23px] font-bold text-slate-900 text-center m-0 mb-2 leading-tight tracking-tight">
            Delete Your Account?
          </h2>

          {/* Description */}
          <p className="text-[13px] sm:text-[14px] text-slate-500 text-center m-0 mb-5 sm:mb-6 leading-relaxed max-w-85 mx-auto">
            This will <strong className="text-red-600 font-bold">permanently delete</strong> your account
            {userEmail && <> (<span className="font-semibold text-slate-700">{userEmail}</span>)</>} and
            all associated data. This action cannot be reversed.
          </p>

          {/* Warning box */}
          <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl bg-red-50/80 border border-red-200/80 text-[12px] sm:text-[12.5px] text-red-800 leading-relaxed mb-5 sm:mb-6">
            <AlertTriangle size={16} className="shrink-0 text-red-500 mt-0.5" />
            <span>
              All your account data will be deleted.
              You will be logged out immediately.
            </span>
          </div>

          {/* Confirmation input */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-[11.5px] sm:text-[12px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Type <span className="text-red-600 font-extrabold tracking-widest">DELETE</span> to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              placeholder="DELETE"
              spellCheck={false}
              autoComplete="off"
              className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[14px] sm:text-[15px] font-semibold text-slate-800 placeholder:text-slate-300 placeholder:font-normal outline-none transition-all duration-200 ${
                confirmText.length === 0
                  ? 'border-slate-200 focus:border-red-400 focus:ring-3 focus:ring-red-100'
                  : isMatch
                  ? 'border-red-500 ring-3 ring-red-100'
                  : 'border-amber-300 focus:border-amber-400 focus:ring-3 focus:ring-amber-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl border border-slate-200 text-[13px] sm:text-[14px] font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isMatch || isDeleting}
              className={`flex-1 py-2.5 sm:py-3 px-4 rounded-xl border-none text-[13px] sm:text-[14px] font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                isMatch && !isDeleting
                  ? 'bg-red-600 text-white cursor-pointer hover:bg-red-700 shadow-[0_4px_16px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)]'
                  : 'bg-red-200 text-red-400 cursor-not-allowed'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
