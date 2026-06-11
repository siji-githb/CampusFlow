import React, { useState, useEffect } from 'react'
import { getAvailableSlots, rescheduleAppointment, uploadMedia } from '../services/appointmentService'
import { Image as ImageIcon, HelpCircle } from 'lucide-react'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', white: '#FFFFFF', border: '#EAE7E2', borderStrong: '#D4CEC8', text: '#1C1917', textSub: '#57534E', textMuted: '#A8A29E', gray200: '#EAE7E2' }

const isSlotPast = (slotTime, selectedDate) => {
  const today = new Date().toISOString().split('T')[0]
  if (selectedDate !== today) return false
  const [slotHour, slotMin] = slotTime.split(':').map(Number)
  const now = new Date()
  const slotDate = new Date()
  slotDate.setHours(slotHour, slotMin, 0, 0)
  return slotDate <= now
}

function SlotBtn({ slot, selected, onSelect, selectedDate }) {
  const isPast = isSlotPast(slot.time_slot, selectedDate);
  const isFull = !slot.available;
  const isAvailable = !isPast && !isFull;
  const fmt12h = (t) => {
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }

  let bg = M.white; let color = M.text; let border = M.border; let opacity = 1; let cursor = 'pointer'; let text = slot.display || fmt12h(slot.time_slot);
  if (selected) { bg = M.maroon; color = M.white; border = M.maroon; }
  else if (isPast) { bg = M.gray200; color = M.textMuted; border = M.borderStrong; opacity = 0.5; cursor = 'not-allowed'; text = 'Past'; }
  else if (isFull) { bg = M.maroonLight; color = M.maroon; border = M.maroonLight; opacity = 1; cursor = 'not-allowed'; text = 'Full'; }
  return (
    <button type="button" onClick={() => isAvailable && onSelect(slot.time_slot)}
      style={{ padding: '10px 6px', borderRadius: '8px', background: bg, color, fontSize: '12px', fontWeight: 600, cursor, fontFamily: "'IBM Plex Sans', sans-serif", opacity, border: `1.5px solid ${border}`, transition: 'all 0.15s', textAlign: 'center' }}
    >{text}</button>
  )
}

export default function RescheduleModal({ token, appointment, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsData, setSlotsData] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmingReschedule, setConfirmingReschedule] = useState(false)
  
  const [notes, setNotes] = useState(appointment.notes || '')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const todayDate = new Date()
  const minDate = todayDate.toISOString().split('T')[0]
  const maxDateObj = new Date(); maxDateObj.setDate(maxDateObj.getDate() + 30)
  const maxDate = maxDateObj.toISOString().split('T')[0]

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d
  })
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const minD = new Date(minDate + 'T00:00:00').getTime()
  const maxD = new Date(maxDate + 'T00:00:00').getTime()

  useEffect(() => {
    if (!selectedDate) return
    const fetchSlots = async () => {
      setLoading(true); setError(''); setSlotsData(null); setSelectedSlot('')
      try { setSlotsData(await getAvailableSlots(appointment.transaction_type_id, selectedDate)) }
      catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    fetchSlots()
  }, [selectedDate, appointment.transaction_type_id])

  const handleConfirmClick = () => {
    if (!selectedDate || !selectedSlot) return
    setConfirmingReschedule(true)
  }

  const handleConfirmExecute = async () => {
    setLoading(true); setError(''); setIsUploading(true);
    try {
      let finalNotes = notes
      if (selectedFile) {
        const uploadRes = await uploadMedia(token, selectedFile)
        finalNotes = finalNotes ? `${finalNotes}\n\nMEDIA_URL: ${uploadRes.url}` : `MEDIA_URL: ${uploadRes.url}`
      }
      
      await rescheduleAppointment(token, appointment.id, selectedDate, selectedSlot, finalNotes || null)
      onSuccess()
    } catch (e) { setError(e.message); setLoading(false); setConfirmingReschedule(false); setIsUploading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="animate-fade-up" style={{ position: 'relative', width: '100%', maxWidth: '480px', background: M.white, borderRadius: '24px 24px 0 0', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, margin: 0, color: M.maroon }}>Reschedule Appointment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: M.textSub }}>×</button>
        </div>

        {error && <div style={{ padding: '12px', background: M.maroonLight, color: M.maroon, borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, margin: 0 }}>{MONTHS[month]} {year}</h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.white, cursor: 'pointer' }}>‹</button>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.white, cursor: 'pointer' }}>›</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
          {DAY_NAMES.map(d => <div key={d} style={{ fontSize: '12px', fontWeight: 600, color: M.textMuted }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '24px' }}>
          {days.map((d, i) => {
            if (!d) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const t = new Date(dateStr + 'T00:00:00').getTime()
            const dow = new Date(dateStr + 'T00:00:00').getDay()
            const isDisabled = dow === 0 || t < minD || t > maxD
            const isSelected = selectedDate === dateStr
            return (
              <button key={i} type="button" disabled={isDisabled} onClick={() => !isDisabled && setSelectedDate(dateStr)}
                style={{ aspectRatio: '1', borderRadius: '50%', border: 'none', background: isSelected ? M.maroon : isDisabled ? '#F5F5F5' : 'transparent', color: isSelected ? M.white : isDisabled ? M.textSub : M.text, fontSize: '13px', fontWeight: isSelected ? 700 : 400, cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1, transition: 'all 0.15s' }}
              >{d}</button>
            )
          })}
        </div>

        {selectedDate && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Available Slots</h4>
            {loading && !slotsData ? <p style={{ fontSize: '13px', color: M.textMuted }}>Loading slots...</p> : 
             !slotsData?.slots?.length ? <p style={{ fontSize: '13px', color: M.textMuted }}>No slots available on this date.</p> :
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
               {slotsData.slots.map(s => <SlotBtn key={s.time_slot} slot={s} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
             </div>
            }
          </div>
        )}

        {selectedDate && selectedSlot && (
          <div style={{ marginBottom: '24px', borderTop: `1px solid ${M.border}`, paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: M.text, margin: '0 0 12px' }}>Additional Notes & Media (Optional)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
              <textarea 
                placeholder="Add any special requests or notes here..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{
                  width: '100%', minHeight: '80px', padding: '12px', borderRadius: '10px',
                  border: `1.5px solid ${M.border}`, background: M.white,
                  fontSize: '13px', color: M.text, fontFamily: "'IBM Plex Sans', sans-serif",
                  resize: 'vertical'
                }}
              />
              <div style={{ 
                border: `1.5px dashed ${M.borderStrong}`, borderRadius: '10px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px', textAlign: 'center', background: M.white, cursor: 'pointer',
                position: 'relative'
              }}>
                <span style={{ color: M.textMuted, marginBottom: '4px' }}><ImageIcon size={24} /></span>
                <span style={{ fontSize: '11px', color: M.textSub, fontWeight: 500 }}>
                  {selectedFile ? selectedFile.name : 'Upload PNG or JPG'}
                </span>
                <input 
                  type="file" 
                  accept=".png, .jpg, .jpeg"
                  onChange={e => {
                    if(e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0])
                  }}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        <button onClick={handleConfirmClick} disabled={!selectedSlot || loading}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: selectedSlot ? M.gold : M.gray200, color: selectedSlot ? M.maroon : M.textMuted, fontSize: '15px', fontWeight: 700, cursor: selectedSlot && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.2s', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Confirm Reschedule
        </button>
      </div>

      {confirmingReschedule && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => !loading && setConfirmingReschedule(false)} />
          <div className="animate-fade-up" style={{ position: 'relative', width: '90%', maxWidth: '320px', background: M.white, borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: M.goldLight, color: M.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <HelpCircle size={24} />
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: '0 0 8px' }}>Confirm Reschedule?</h3>
            <p style={{ fontSize: '13px', color: M.textSub, margin: '0 0 24px', lineHeight: 1.4 }}>
              Are you sure you want to change your appointment to <strong>{selectedDate}</strong> at <strong>{selectedSlot ? (() => {
                  const [hStr, mStr] = selectedSlot.split(':')
                  const h = parseInt(hStr, 10)
                  return `${h % 12 || 12}:${mStr} ${h < 12 ? 'AM' : 'PM'}`
                })() : ''}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setConfirmingReschedule(false)}
                disabled={loading}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.white, color: M.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", opacity: loading ? 0.5 : 1 }}
              >
                Go Back
              </button>
              <button 
                onClick={handleConfirmExecute}
                disabled={loading || isUploading}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: M.gold, color: M.maroon, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", opacity: loading || isUploading ? 0.5 : 1 }}
              >
                {isUploading ? 'Uploading...' : loading ? 'Saving...' : 'Yes, Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
