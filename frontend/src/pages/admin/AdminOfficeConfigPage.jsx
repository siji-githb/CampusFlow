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
  general: ['office_open_time', 'office_close_time'],
  appointments: ['slot_duration_minutes', 'booking_cutoff_days'],
  caps: ['daily_cap_tor', 'daily_cap_coe', 'daily_cap_diploma'],
}

const LABELS = {
  office_open_time:      { title: 'Office Open Time',      desc: 'When the registrar begins serving students' },
  office_close_time:     { title: 'Office Close Time',     desc: 'When the registrar stops accepting queue numbers' },
  slot_duration_minutes: { title: 'Slot Duration',         desc: 'Length of each appointment block in minutes' },
  booking_cutoff_days:   { title: 'Booking Cutoff',        desc: 'Minimum days required for advance booking' },
  daily_cap_tor:         { title: 'Daily Cap: TOR',        desc: 'Maximum TOR requests processed per day' },
  daily_cap_coe:         { title: 'Daily Cap: COE',        desc: 'Maximum COE requests processed per day' },
  daily_cap_diploma:     { title: 'Daily Cap: Diploma',    desc: 'Maximum Diploma requests processed per day' },
}

export default function AdminOfficeConfigPage() {
  const { token } = useAuth()
  const [config, setConfig]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [edited, setEdited]   = useState({})
  const [toast, setToast]     = useState(null)

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

  const handleSave = async (key) => {
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
    const orig = config.find(c => c.key === key)?.value
    return String(edited[key]) !== String(orig)
  }

  const renderGroup = (keys) => {
    return keys.map((key, i) => {
      const origItem = config.find(c => c.key === key)
      if (!origItem) return null
      const isChanged = hasChanges(key)

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
              type={key.includes('time') ? 'time' : 'number'}
              value={edited[key] ?? ''}
              onChange={e => setEdited({ ...edited, [key]: e.target.value })}
              style={{
                width: key.includes('time') ? '130px' : '100px',
                padding: '11px 16px', borderRadius: '10px',
                border: `1.5px solid ${isChanged ? M.maroon : M.border}`,
                background: M.white, fontSize: '14px', outline: 'none',
                fontFamily: "'IBM Plex Sans', sans-serif", color: M.text,
                textAlign: key.includes('time') ? 'left' : 'center',
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

          {/* Daily Caps */}
          <section className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px 4px' }}>Daily Processing Caps</h2>
            <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              {renderGroup(SETTINGS_CATEGORIES.caps)}
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
