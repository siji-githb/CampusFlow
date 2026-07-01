import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getOfficeConfig, updateOfficeConfig } from '../../services/adminService'
import { Check, AlertTriangle } from 'lucide-react'

const SETTINGS_CATEGORIES = {
  general: ['office_open_time', 'office_close_time', 'lunch_break_start', 'lunch_break_end'],
  appointments: ['slot_duration_minutes', 'booking_cutoff_days'],
  staffing: ['staff_count', 'num_windows'],
}

const LABELS = {
  office_open_time:      { title: 'Office Open Time',      desc: 'When the registrar begins serving students' },
  office_close_time:     { title: 'Office Close Time',     desc: 'When the registrar stops accepting queue numbers' },
  lunch_break_start:     { title: 'Lunch Break Start',     desc: 'When the staff lunch break begins' },
  lunch_break_end:       { title: 'Lunch Break End',       desc: 'When the staff lunch break ends' },
  slot_duration_minutes: { title: 'Slot Duration',         desc: 'Length of each appointment block in minutes' },
  booking_cutoff_days:   { title: 'Booking Cutoff',        desc: 'Minimum days required for advance booking' },
  staff_count:           { title: 'Staff Count',           desc: 'Number of active registrar staff serving queues' },
  num_windows:           { title: 'Active Windows',         desc: 'Number of service windows open at the registrar (e.g. Window 1, Window 2...)' },
}

export default function AdminOfficeConfigPage() {
  const { token } = useAuth()
  const [config, setConfig]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [edited, setEdited]   = useState({})
  const [toast, setToast]     = useState(null)
  const [confirmSave, setConfirmSave] = useState(null)

  useEffect(() => {
    getOfficeConfig(token)
      .then(data => {
        setConfig(data)
        const init = {}; data.forEach(c => { init[c.key] = c.value })
        setEdited(init)
      })
      .catch(() => setToast({ type: 'error', msg: 'Failed to load configuration' }))
      .finally(() => setLoading(false))
  }, [token])

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = (key) => {
    setConfirmSave(key)
  }

  const executeSave = async () => {
    const key = confirmSave
    setConfirmSave(null)
    setSaving(key)
    try {
      await updateOfficeConfig(token, key, edited[key])
      const data = await getOfficeConfig(token)
      setConfig(data)
      showToast('success', `Updated "${LABELS[key]?.title || key}" successfully.`)
    } catch (e) {
      showToast('error', e.message || 'Failed to update setting.')
      setEdited(prev => ({ ...prev, [key]: config.find(c => c.key === key)?.value }))
    } finally {
      setSaving(null)
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
        <div key={key} className={`flex items-center justify-between p-[24px_28px] gap-6 flex-wrap transition-colors duration-200 ${i < keys.length - 1 ? 'border-b border-border' : 'border-none'} ${isChanged ? 'bg-maroon-light' : 'bg-transparent'}`}>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[15px] font-semibold text-text-main m-0 mb-1">{LABELS[key]?.title || key}</p>
            <p className="text-[13px] text-text-sub m-0 leading-snug">{LABELS[key]?.desc}</p>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type={isTimeField ? 'time' : 'number'}
              value={edited[key] ?? ''}
              onChange={e => setEdited({ ...edited, [key]: e.target.value })}
              className={`py-[11px] px-4 rounded-[10px] bg-white text-[14px] outline-none font-sans text-text-main transition-all duration-200 border-[1.5px] focus:border-maroon ${isTimeField ? 'w-[130px] text-left' : 'w-[100px] text-center'} ${isChanged ? 'border-maroon shadow-[0_0_0_3px_rgba(123,26,42,0.1)]' : 'border-border'}`}
            />
            <button
              onClick={() => handleSave(key)}
              disabled={saving === key || !isChanged}
              className={`py-[11px] px-6 rounded-[10px] border-none text-[14px] font-bold font-sans transition-all duration-200 ${saving === key ? 'bg-[#B8667A] text-white cursor-not-allowed' : isChanged ? 'bg-maroon text-white cursor-pointer shadow-[0_4px_12px_rgba(123,26,42,0.2)]' : 'bg-border text-text-muted cursor-not-allowed'}`}>
              {saving === key ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )
    })
  }

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-[30px] left-1/2 -translate-x-1/2 z-9999 text-white py-3.5 px-6 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] text-[14px] font-semibold flex items-center gap-2.5 animate-slide-down ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
          <span>{toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[32px] font-bold text-maroon m-0 mb-1.5">Office Configuration</h1>
        <p className="text-[15px] text-text-sub m-0">Manage operational hours, daily request caps, and appointment rules.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          {[1,2,3].map(section => (
            <section key={section}>
              <div className="w-[150px] h-3.5 rounded mb-3 ml-1 animate-pulse bg-border" />
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                {[1,2,3].map(i => (
                  <div key={i} className={`h-20 animate-pulse bg-surface ${i < 3 ? 'border-b border-border' : 'border-none'}`} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* General Office Settings */}
          <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-[12px] font-bold text-gold uppercase tracking-widest m-0 mb-3 ml-1">General Operations</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {renderGroup(SETTINGS_CATEGORIES.general)}
            </div>
          </section>

          {/* Appointment Settings */}
          <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-[12px] font-bold text-gold uppercase tracking-widest m-0 mb-3 ml-1">Appointments & Scheduling</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {renderGroup(SETTINGS_CATEGORIES.appointments)}
            </div>
          </section>

          {/* Staffing */}
          <section className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-[12px] font-bold text-gold uppercase tracking-widest m-0 mb-3 ml-1">Staffing & Capacity</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              {renderGroup(SETTINGS_CATEGORIES.staffing)}
            </div>
          </section>

        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSave && (
        <div className="fixed inset-0 bg-black/50 z-10000 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-[90%] max-w-[400px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] text-center animate-slide-up">
            <div className="text-[40px] mb-4">⚙️</div>
            <h3 className="m-0 mb-3 text-[20px] font-bold text-text-main">Confirm Changes</h3>
            <p className="m-0 mb-6 text-[15px] text-text-sub leading-relaxed">
              Are you sure you want to save changes to <br/>
              <strong className="text-maroon">{LABELS[confirmSave]?.title || confirmSave}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSave(null)}
                className="flex-1 p-3 rounded-[10px] bg-surface text-text-sub border-none text-[14px] font-semibold cursor-pointer transition-colors duration-200 hover:bg-border">
                Cancel
              </button>
              <button onClick={executeSave}
                className="flex-1 p-3 rounded-[10px] bg-maroon text-white border-none text-[14px] font-semibold cursor-pointer transition-colors duration-200 hover:bg-maroon-dark shadow-[0_4px_12px_rgba(123,26,42,0.2)]">
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
