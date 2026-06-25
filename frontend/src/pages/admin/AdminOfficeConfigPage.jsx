import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getOfficeConfig, updateOfficeConfig } from '../../services/adminService'

const M = {
  maroon:       '#7B1A2A',
  maroonLight:  '#F9F0F1',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.3)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  surface:      '#F2EDE8',
  border:       '#EAE7E2',
  text:         '#1C1917',
  textSub:      '#57534E',
  textMuted:    '#A8A29E',
  green:        '#15803D',
  greenLight:   '#F0FDF4',
  greenBorder:  '#BBF7D0',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
}

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
        <div key={key} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px', borderBottom: i < keys.length - 1 ? `1px solid ${M.border}` : 'none',
          gap: '24px', flexWrap: 'wrap', transition: 'background 0.2s',
          background: isChanged ? M.maroonLight : 'transparent'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>{LABELS[key]?.title || key}</p>
            <p style={{ fontSize: '13px', color: M.textSub, margin: 0, lineHeight: 1.4 }}>{LABELS[key]?.desc}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type={isTimeField ? 'time' : 'number'}
              value={edited[key] ?? ''}
              onChange={e => setEdited({ ...edited, [key]: e.target.value })}
              style={{
                width: isTimeField ? '130px' : '100px',
                padding: '11px 16px', borderRadius: '10px',
                border: `1.5px solid ${isChanged ? M.maroon : M.border}`,
                background: M.white, fontSize: '14px', outline: 'none',
                fontFamily: "'IBM Plex Sans', sans-serif", color: M.text,
                textAlign: isTimeField ? 'left' : 'center',
                boxShadow: isChanged ? '0 0 0 3px rgba(123,26,42,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = M.maroon}
              onBlur={e => { if (!isChanged) e.target.style.borderColor = M.border }}
            />
            <button
              onClick={() => handleSave(key)}
              disabled={saving === key || !isChanged}
              style={{
                padding: '11px 24px', borderRadius: '10px', border: 'none',
                background: saving === key ? '#B8667A' : isChanged ? M.maroon : M.border,
                color: isChanged ? M.white : M.textMuted,
                fontSize: '14px', fontWeight: 700,
                cursor: (saving === key || !isChanged) ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                transition: 'all 0.2s',
                boxShadow: isChanged ? '0 4px 12px rgba(123,26,42,0.2)' : 'none'
              }}>
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
        <div style={{
          position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.type === 'success' ? M.green : M.red,
          color: M.white, padding: '14px 24px', borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '32px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Office Configuration</h1>
        <p style={{ fontSize: '15px', color: M.textSub, margin: 0 }}>Manage operational hours, daily request caps, and appointment rules.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[1,2,3].map(section => (
            <section key={section}>
              <div style={{ width: '150px', height: '14px', borderRadius: '4px', marginBottom: '12px', marginLeft: '4px' }} className="animate-shimmer" />
              <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: '80px', borderBottom: i < 3 ? `1px solid ${M.border}` : 'none' }} className="animate-shimmer" />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* General Office Settings */}
          <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px 4px' }}>General Operations</h2>
            <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              {renderGroup(SETTINGS_CATEGORIES.general)}
            </div>
          </section>

          {/* Appointment Settings */}
          <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px 4px' }}>Appointments & Scheduling</h2>
            <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              {renderGroup(SETTINGS_CATEGORIES.appointments)}
            </div>
          </section>

          {/* Staffing */}
          <section className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px 4px' }}>Staffing & Capacity</h2>
            <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              {renderGroup(SETTINGS_CATEGORIES.staffing)}
            </div>
          </section>

        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSave && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: M.white, borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚙️</div>
            <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: M.text }}>Confirm Changes</h3>
            <p style={{ margin: '0 0 24px', fontSize: '15px', color: M.textSub, lineHeight: 1.5 }}>
              Are you sure you want to save changes to <br/>
              <strong style={{ color: M.maroon }}>{LABELS[confirmSave]?.title || confirmSave}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmSave(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: M.surface, color: M.textSub, border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.target.style.background = M.border}
                onMouseLeave={e => e.target.style.background = M.surface}
              >
                Cancel
              </button>
              <button onClick={executeSave}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: M.maroon, color: M.white, border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(123,26,42,0.2)' }}
                onMouseEnter={e => e.target.style.background = M.maroonDark}
                onMouseLeave={e => e.target.style.background = M.maroon}
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
