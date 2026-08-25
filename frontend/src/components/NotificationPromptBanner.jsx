import React, { useState, useEffect } from 'react'
import { AlertTriangle, Bell, BellOff, X } from 'lucide-react'
import { 
  getPushStatus, 
  requestNotificationPermission, 
  setPushEnabled, 
  sendBrowserNotification,
  isNotificationSupported 
} from '../utils/browserNotifications'
import { useToast } from '../context/ToastContext'

export default function NotificationPromptBanner() {
  const [pushStatus, setPushStatus] = useState(() => getPushStatus())
  const [dismissed, setDismissed] = useState(() => {
    // Clean up any legacy localStorage key
    if (typeof window !== 'undefined' && localStorage.getItem('campusflow_notif_banner_dismissed')) {
      localStorage.removeItem('campusflow_notif_banner_dismissed')
    }
    return sessionStorage.getItem('campusflow_notif_banner_dismissed') === 'true'
  })
  const [showHelpModal, setShowHelpModal] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const checkStatus = () => {
      setPushStatus(getPushStatus())
    }
    
    // Check initially and on custom event toggle
    window.addEventListener('campusflow-push-toggle', checkStatus)
    window.addEventListener('focus', checkStatus)
    
    return () => {
      window.removeEventListener('campusflow-push-toggle', checkStatus)
      window.removeEventListener('focus', checkStatus)
    }
  }, [])

  // Don't show if notifications are active, unsupported, or user dismissed for this session
  if (pushStatus === 'active' || pushStatus === 'unsupported' || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('campusflow_notif_banner_dismissed', 'true')
  }

  const handleEnable = async () => {
    if (!isNotificationSupported()) {
      toast.error('Browser notifications are not supported on this browser.')
      return
    }

    if (pushStatus === 'denied') {
      setShowHelpModal(true)
      return
    }

    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      setPushEnabled(true)
      setPushStatus('active')
      toast.success('Push notifications activated! You will receive real-time queue alerts.')
      sendBrowserNotification('Notifications Activated 🔔', 'CampusFlow alerts are now active on this device!')
    } else if (permission === 'denied') {
      setPushStatus('denied')
      setShowHelpModal(true)
    }
  }

  return (
    <>
      <div className="pointer-events-auto w-full animate-fade-up" role="alert">
        <div className="bg-white/95 border border-border sm:border-[1.5px] rounded-2xl p-3.5 sm:p-4 shadow-[0_12px_32px_rgba(123,26,42,0.10)] backdrop-blur-md flex items-start gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-maroon-light border border-maroon-border/40 text-maroon flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <AlertTriangle size={17} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-serif text-xs sm:text-[13.5px] font-bold text-maroon m-0 leading-tight">
                Notifications are off.
              </h4>
            </div>

            <p className="text-[11px] sm:text-xs text-text-sub m-0 mt-1 leading-relaxed font-normal">
              {pushStatus === 'denied' 
                ? 'Enable them in your browser settings to receive real-time queue & claiming updates.'
                : 'Turn on alerts to receive instant notifications when your number is called or documents are ready.'}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              {pushStatus === 'denied' ? (
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="py-1.5 px-3 rounded-xl bg-gold hover:bg-gold-dark text-white text-[11px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer border-none"
                >
                  How to Enable
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnable}
                  className="py-1.5 px-3.5 rounded-xl bg-gold hover:bg-gold-dark text-white text-[11px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Bell size={13} />
                  <span>Turn On Notifications</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg text-text-muted hover:text-text-main hover:bg-off-white flex items-center justify-center cursor-pointer transition-colors shrink-0 -mt-1 -mr-1 p-0 border-none bg-transparent"
            aria-label="Dismiss notification alert"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Browser Permission Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-2xs transition-opacity" 
            onClick={() => setShowHelpModal(false)} 
          />
          <div className="animate-fade-up relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl border border-border z-10">
            <div className="w-12 h-12 rounded-full bg-maroon-light text-maroon flex items-center justify-center mx-auto mb-3.5 shadow-2xs border border-maroon-border/40">
              <BellOff size={22} />
            </div>
            
            <h3 className="font-serif text-base sm:text-lg font-bold text-maroon m-0 mb-1.5">
              Allow Notifications
            </h3>
            
            <p className="text-xs text-text-sub m-0 mb-4 leading-relaxed">
              Notifications are currently blocked in your browser settings. To receive real-time queue calls:
            </p>

            <div className="bg-off-white rounded-xl p-3.5 text-left border border-border mb-5 text-xs text-text-sub space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-maroon text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Tap the <strong>lock 🔒</strong> or <strong>settings 🎛️ icon</strong> in your browser address bar.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-maroon text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Select <strong>Permissions</strong> or <strong>Notifications</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-maroon text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Change setting to <strong>Allow</strong>, then refresh this page.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 px-4 rounded-xl border-none bg-gold hover:bg-gold-dark text-white text-xs sm:text-[13px] font-bold cursor-pointer transition-colors shadow-2xs"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  )
}
