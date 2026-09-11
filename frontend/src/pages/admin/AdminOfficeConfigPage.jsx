import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import { getOfficeConfig, updateOfficeConfig } from '../../services/adminService'
import { Check, AlertTriangle, Settings, CheckCircle2, X, Loader2 } from 'lucide-react'

const SETTINGS_CATEGORIES = {
  general: ['office_open_time', 'office_close_time', 'lunch_break_start', 'lunch_break_end'],
  appointments: ['slot_duration_minutes', 'booking_cutoff_days'],
  staffing: ['num_windows'],
}

const LABELS = {
  office_open_time:      { title: 'Office Open Time',      desc: 'When the registrar begins serving students' },
  office_close_time:     { title: 'Office Close Time',     desc: 'When the registrar stops accepting queue numbers' },
  lunch_break_start:     { title: 'Lunch Break Start',     desc: 'When the staff lunch break begins' },
  lunch_break_end:       { title: 'Lunch Break End',       desc: 'When the staff lunch break ends' },
  slot_duration_minutes: { title: 'Slot Duration',         desc: 'Length of each appointment block in minutes' },
  booking_cutoff_days:   { title: 'Booking Cutoff',        desc: 'Minimum days required for advance booking' },
  num_windows:           { title: 'Active Windows',         desc: 'Number of service windows open at the registrar (e.g. Window 1, Window 2...)' },
}

export default function AdminOfficeConfigPage() {
  const { token } = useAuth()
  const toast = useToast()
  const [config, setConfig]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [edited, setEdited]   = useState({})
  const [confirmSave, setConfirmSave] = useState(null)

  useEffect(() => {
    getOfficeConfig(token)
      .then(data => {
        setConfig(data)
        const init = {}
        data.forEach(c => { init[c.key] = c.value })
        setEdited(init)
      })
      .catch(() => toast.error('Failed to load configuration'))
      .finally(() => setLoading(false))
  }, [token, toast])

  const handleEdit = (key, value) => {
    setEdited(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (key) => {
    const val = edited[key]
    if (val === undefined) return
    setSaving(key)
    try {
      await updateOfficeConfig(token, key, String(val))
      setConfig(prev => prev.map(item => item.key === key ? { ...item, value: String(val) } : item))
      toast.success(`Updated "${LABELS[key]?.title || key}" successfully.`)
    } catch (e) {
      toast.error(e.message || 'Failed to update setting.')
    } finally {
      setSaving(null)
      setConfirmSave(null)
    }
  }

  const hasChanges = (key) => {
    const orig = config.find(c => c.key === key)?.value || ''
    return String(edited[key] || '') !== String(orig)
  }

  const renderGroup = (keys) => {
    return keys.map((key, i) => {
      const isChanged = hasChanges(key)
      const isTimeField = key.includes('time') || key.includes('lunch')

      return (
        <div key={key} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-[20px_28px] gap-3.5 sm:gap-6 transition-colors duration-200 ${i < keys.length - 1 ? 'border-b border-border' : 'border-none'} ${isChanged ? 'bg-maroon-light' : 'bg-transparent'}`}>
          <div className="flex-1 min-w-0">
            <p className="text-fluid-15 font-semibold text-text-main m-0 mb-1">{LABELS[key]?.title || key}</p>
            <p className="text-fluid-13 text-text-sub m-0 leading-snug">{LABELS[key]?.desc}</p>
          </div>
          <div className="flex gap-2.5 sm:gap-3 items-center w-full sm:w-auto justify-end">
            <input
              type={isTimeField ? 'time' : 'number'}
              value={edited[key] ?? ''}
              onChange={e => handleEdit(key, e.target.value)}
              className={`py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-xl bg-white text-fluid-13 sm:text-fluid-14 outline-none font-sans text-text-main transition-all duration-200 border-[1.5px] focus:border-maroon ${isTimeField ? 'w-32.5 text-left' : 'w-25 text-center'} ${isChanged ? 'border-maroon shadow-[0_0_0_3px_rgba(123,26,42,0.1)]' : 'border-border'}`}
            />
            <button
              onClick={() => setConfirmSave(key)}
              disabled={saving === key || !isChanged}
              className={`py-2 px-5 sm:py-2.5 sm:px-6 rounded-xl border-none text-fluid-13 sm:text-fluid-14 font-bold font-sans transition-all duration-200 flex items-center justify-center gap-2 min-w-22 ${saving === key ? 'bg-[#B8667A] text-white cursor-not-allowed' : isChanged ? 'bg-maroon text-white cursor-pointer shadow-[0_4px_12px_rgba(123,26,42,0.2)] hover:bg-maroon-dark active:scale-[0.98]' : 'bg-border text-text-muted cursor-not-allowed'}`}>
              {saving === key ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white shrink-0" />
                  <span>Saving</span>
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="animate-fade-up font-sans w-full pb-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">System Configuration</p>
        <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
          <Settings size={26} className="text-maroon shrink-0" /> Office Configuration
        </h1>
        <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
          Manage operational hours, daily request caps, holiday dates, and appointment rules.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          {[
            { titleWidth: 'w-40', count: 4 },
            { titleWidth: 'w-48', count: 2 },
            { titleWidth: 'w-36', count: 2 }
          ].map((sec, secIdx) => (
            <section key={secIdx}>
              <div className={`h-3.5 ${sec.titleWidth} rounded-md bg-gray-200 animate-pulse mb-3 ml-1`} />
              <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)] divide-y divide-border">
                {Array.from({ length: sec.count }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-[24px_28px] gap-6 flex-wrap">
                    <div className="flex-1 min-w-50">
                      <div className="h-4.5 w-44 rounded-md bg-gray-200 animate-pulse mb-2" />
                      <div className="h-3.5 w-72 max-w-full rounded bg-gray-100 animate-pulse" />
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="h-10.5 w-30 rounded-xl bg-gray-100 border border-border/80 animate-pulse" />
                      <div className="h-10.5 w-20 rounded-xl bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* General Office Settings */}
          <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-fluid-12 font-bold text-gold uppercase tracking-widest m-0 mb-3 ml-1">General Operations</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {renderGroup(SETTINGS_CATEGORIES.general)}
            </div>
          </section>

          {/* Appointment Settings */}
          <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-fluid-12 font-bold text-gold uppercase tracking-widest m-0 mb-3 ml-1">Appointments & Scheduling</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {renderGroup(SETTINGS_CATEGORIES.appointments)}
            </div>
          </section>

          {/* Staffing */}
          <section className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-fluid-12 font-bold text-gold uppercase tracking-widest m-0 mb-3 ml-1">Staffing & Capacity</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {renderGroup(SETTINGS_CATEGORIES.staffing)}
            </div>
          </section>

        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSave && createPortal((
        <div className="fixed inset-0 bg-black/50 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in" onClick={() => setConfirmSave(null)}>
          <div className="bg-white rounded-3xl w-full max-w-110 my-auto shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border/80 overflow-hidden text-center animate-fade-up relative flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Top decorative accent bar */}
            <div className="h-1.5 w-full bg-linear-to-r from-maroon via-maroon-dark to-gold shrink-0" />
            
            <div className="p-7 sm:p-8 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gold-light border border-gold-border/80 flex items-center justify-center mb-4 text-gold shrink-0 shadow-xs">
                <Settings size={26} />
              </div>
              
              <div className="text-fluid-10 font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold-light text-gold border border-gold-border/60 mb-2">
                Office Setting
              </div>

              <h3 className="m-0 mb-2 font-serif text-fluid-22 font-bold text-text-main">Confirm Changes</h3>
              <p className="m-0 mb-6 text-fluid-14 text-text-sub leading-relaxed max-w-85">
                Are you sure you want to save changes to <strong className="text-maroon font-semibold">{LABELS[confirmSave]?.title || confirmSave}</strong>?
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  type="button"
                  onClick={() => setConfirmSave(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-surface border border-border/80 text-text-main text-fluid-13 font-semibold cursor-pointer transition-colors duration-200 hover:bg-off-white"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => handleSave(confirmSave)}
                  disabled={saving === confirmSave}
                  className={`flex-1 py-3 px-4 rounded-xl bg-maroon text-white border-none text-fluid-13 font-bold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 ${saving === confirmSave ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:bg-maroon-dark'}`}
                >
                  {saving === confirmSave ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white shrink-0" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Yes, Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
