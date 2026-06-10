import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getTransactionTypes, getAvailableSlots, bookAppointment, uploadMedia } from '../../services/appointmentService'

const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonMid:    'rgba(123,26,42,0.06)',
  maroonBorder: 'rgba(123,26,42,0.15)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.25)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  surface:      '#F2EDE8',
  border:       '#EAE7E2',
  borderStrong: '#D4CEC8',
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

// ── Calendar Widget ──
function CalendarWidget({ selectedDate, onDateSelect, minDateStr, maxDateStr }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) return new Date(selectedDate + 'T00:00:00')
    const d = new Date(); d.setDate(d.getDate() + 1); return d
  })

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const minD = new Date(minDateStr + 'T00:00:00').getTime()
  const maxD = new Date(maxDateStr + 'T00:00:00').getTime()

  return (
    <div>
      {/* Month header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: M.text, margin: 0 }}>
          {MONTHS[month]} {year}
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[['‹', -1], ['›', 1]].map(([label, dir]) => (
            <button key={dir} type="button"
              onClick={() => setCurrentMonth(new Date(year, month + dir, 1))}
              style={{
                width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${M.border}`,
                background: M.white, cursor: 'pointer', fontSize: '18px', lineHeight: 1,
                color: M.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'serif',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ fontSize: '12px', fontWeight: 600, color: M.textMuted, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const t          = new Date(dateStr + 'T00:00:00').getTime()
          const dow        = new Date(dateStr + 'T00:00:00').getDay()
          const isDisabled = dow === 0 || t < minD || t > maxD
          const isSelected = selectedDate === dateStr
          return (
            <button key={i} type="button" disabled={isDisabled}
              title={isDisabled ? "Outside booking window or unavailable" : ""}
              onClick={() => !isDisabled && onDateSelect(dateStr)}
              style={{
                aspectRatio: '1', borderRadius: '50%', border: 'none',
                background: isSelected ? M.maroon : isDisabled ? '#F5F5F5' : 'transparent',
                color: isSelected ? M.white : isDisabled ? M.textSub : M.text,
                fontSize: '13px', fontWeight: isSelected ? 700 : 400,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                opacity: isDisabled ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected && !isDisabled) { e.currentTarget.style.background = M.maroonLight; e.currentTarget.style.color = M.maroon } }}
              onMouseLeave={e => { if (!isSelected && !isDisabled) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.text } }}
            >{d}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Stepper ──
function Stepper({ step }) {
  const STEPS = ['Transaction', 'Date & Time', 'Confirm']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '48px' }}>
      {STEPS.map((label, i) => {
        const num    = i + 1
        const active = step === num
        const done   = step > num
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: done || active ? M.maroon : M.offWhite,
                border: done || active ? 'none' : `1.5px solid ${M.borderStrong}`,
                color: done || active ? M.white : M.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
              }}>
                {done ? '✓' : num}
              </div>
              <span style={{
                fontSize: '11px', fontWeight: active ? 700 : 500,
                color: active ? M.maroon : done ? M.textSub : M.textMuted,
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{
                flex: 1, height: '1.5px',
                background: done ? M.maroon : M.borderStrong,
                margin: '0 8px', alignSelf: 'flex-start', marginTop: '13px',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── UPDATED: slot visual states ──
const isSlotPast = (slotTime, selectedDate) => {
  const today = new Date().toISOString().split('T')[0]
  if (selectedDate !== today) return false  // future date — never gray out by time

  const [slotHour, slotMin] = slotTime.split(':').map(Number)
  const now = new Date()
  const bufferMinutes = 0  // No advance buffer required

  const slotDate = new Date()
  slotDate.setHours(slotHour, slotMin, 0, 0)

  const cutoff = new Date(now.getTime() + bufferMinutes * 60000)
  return slotDate <= cutoff
}

function SlotBtn({ slot, selected, onSelect, selectedDate }) {
  const isPast = isSlotPast(slot.time_slot, selectedDate);
  const isFull = !slot.available;
  const isAvailable = !isPast && !isFull;

  let bg = M.white;
  let color = M.text;
  let border = M.border;
  let opacity = 1;
  let cursor = 'pointer';
  let text = slot.display || slot.time_slot;

  if (selected) {
    bg = M.maroon;
    color = M.white;
    border = M.maroon;
  } else if (isPast) {
    bg = M.offWhite;
    color = M.textMuted;
    border = M.border;
    opacity = 0.4;
    cursor = 'not-allowed';
  } else if (isFull) {
    bg = M.maroonLight; // #F9F0F1
    color = M.maroon;
    border = M.maroonLight;
    opacity = 1;
    cursor = 'not-allowed';
    text = 'Full';
  }

  return (
    <button
      type="button"
      onClick={() => isAvailable && onSelect(slot.time_slot)}
      style={{
        padding: '10px 6px', borderRadius: '8px', border: 'none',
        background: bg,
        color: color,
        fontSize: '12px', fontWeight: 600,
        cursor: cursor,
        fontFamily: "'IBM Plex Sans', sans-serif",
        opacity: opacity,
        border: `1.5px solid ${border}`,
        transition: 'all 0.15s', textAlign: 'center',
      }}
    >
      {text}
    </button>
  )
}

// ── Main Component ──
export default function BookAppointment() {
  const { token } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]               = useState(1)
  const [types, setTypes]             = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsData, setSlotsData]       = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading]           = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [confirmingBook, setConfirmingBook] = useState(false)
  
  const [notes, setNotes]               = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading]   = useState(false)

  const todayDate  = new Date()
  const minDate    = todayDate.toISOString().split('T')[0]
  const maxDateObj = new Date(); maxDateObj.setDate(maxDateObj.getDate() + 30)
  const maxDate    = maxDateObj.toISOString().split('T')[0]

  useEffect(() => {
    getTransactionTypes().then(setTypes).catch(e => setError(e.message))
  }, [])

  const handleDateSelect = async (dateStr) => {
    setSelectedDate(dateStr); setSelectedSlot(''); setSlotsData(null); setError('')
    setSlotsLoading(true)
    try { setSlotsData(await getAvailableSlots(selectedType?.id, dateStr)) }
    catch (e) { setError(e.message) }
    finally { setSlotsLoading(false) }
  }

  const handleConfirmClick = () => {
    setConfirmingBook(true)
  }

  const handleBook = async () => {
    setLoading(true); setError(''); setIsUploading(true);
    try {
      let finalNotes = notes
      if (selectedFile) {
        const uploadRes = await uploadMedia(token, selectedFile)
        finalNotes = finalNotes ? `${finalNotes}\n\nMEDIA_URL: ${uploadRes.url}` : `MEDIA_URL: ${uploadRes.url}`
      }
      
      await bookAppointment(token, {
        transaction_type_id: selectedType.id,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        notes: finalNotes || null,
      })
      setSuccess(true)
    } catch (e) { 
      setError(e.message); 
    } finally {
      setLoading(false); 
      setIsUploading(false);
      setConfirmingBook(false);
    }
  }

  // 24h format from backend e.g. '08:00', '13:30'
  // Split at noon
  const morningSlots   = slotsData?.slots.filter(s => {
    const h = parseInt(s.time_slot.split(':')[0], 10)
    return h < 12
  }) || []
  const afternoonSlots = slotsData?.slots.filter(s => {
    const h = parseInt(s.time_slot.split(':')[0], 10)
    return h >= 12
  }) || []

  // Format '08:00' → '8:00 AM', '13:00' → '1:00 PM'
  const fmt12h = (t) => {
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // ── Success Screen ──
  if (success) return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: M.white, borderRadius: '20px', border: `1px solid ${M.border}`, padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: M.greenLight, border: `2px solid ${M.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>✅</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 700, color: M.maroon, margin: '0 0 8px' }}>Appointment Confirmed!</h2>
        <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>{selectedType?.name}</p>
        <p style={{ fontSize: '14px', color: M.textSub, margin: '0 0 24px' }}>
          🗓️ {fmtDate(selectedDate)} at {selectedSlot}
        </p>
        <div style={{ background: M.goldLight, borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', border: `1px solid ${M.goldBorder}`, textAlign: 'left' }}>
          <p style={{ fontSize: '13px', color: M.gold, margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
            Please bring all required documents on your appointment date.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => navigate('/student/appointments')} style={{ padding: '14px', borderRadius: '10px', border: 'none', background: M.maroon, color: M.white, fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            View My Appointments
          </button>
          <button onClick={() => navigate('/student/dashboard')} style={{ padding: '14px', borderRadius: '10px', border: `1.5px solid ${M.border}`, background: M.white, color: M.text, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Top Nav Bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: M.maroon, borderBottom: 'none',
        height: '56px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px',
      }}>
        <button
          type="button"
          onClick={() => navigate('/student/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
            padding: '6px 12px', borderRadius: '8px',
            fontFamily: "'IBM Plex Sans', sans-serif",
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          ← Back
        </button>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.25)' }} />
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 700, color: M.white }}>Book Appointment</span>
      </header>

      {/* ── Content ── */}
      <main style={{ maxWidth: '660px', margin: '0 auto', padding: '48px 24px 80px', boxSizing: 'border-box' }}>

        <Stepper step={step} />

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, border: `1px solid ${M.redBorder}`, color: M.red, fontSize: '13px', marginBottom: '24px', fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        {/* ─── STEP 1: Select Transaction Type ─── */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 700, color: M.maroon, margin: '0 0 8px', lineHeight: 1.15 }}>
              Select Transaction Type
            </h1>
            <p style={{ fontSize: '14px', color: M.textSub, margin: '0 0 32px', lineHeight: 1.5 }}>
              What document do you need from the Registrar?
            </p>

            {types.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: M.white, border: `1.5px solid ${M.border}`, borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div className="animate-shimmer" style={{ width: '180px', height: '18px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="animate-shimmer" style={{ width: '100%', height: '12px', borderRadius: '4px', marginBottom: '6px' }} />
                      <div className="animate-shimmer" style={{ width: '80%', height: '12px', borderRadius: '4px', marginBottom: '16px' }} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div className="animate-shimmer" style={{ width: '64px', height: '18px', borderRadius: '100px' }} />
                        <div className="animate-shimmer" style={{ width: '80px', height: '18px', borderRadius: '100px' }} />
                      </div>
                    </div>
                    <div className="animate-shimmer" style={{ width: '20px', height: '20px', borderRadius: '4px', marginTop: '2px' }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {types.map(t => (
                <button key={t.id} type="button"
                  onClick={() => { setSelectedType(t); setStep(2) }}
                  style={{
                    textAlign: 'left', background: M.white, border: `1.5px solid ${M.border}`,
                    borderRadius: '12px', padding: '20px 24px', cursor: 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = M.maroon; e.currentTarget.style.boxShadow = '0 4px 16px rgba(123,26,42,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = M.border; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)' }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>{t.name}</h3>
                    <p style={{ fontSize: '13px', color: M.textSub, margin: '0 0 14px', lineHeight: 1.5 }}>{t.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {t.required_documents?.map((doc, j) => (
                        <span key={j} style={{ fontSize: '11px', color: M.textSub, background: M.offWhite, padding: '3px 10px', borderRadius: '100px', border: `1px solid ${M.border}`, fontWeight: 500 }}>{doc}</span>
                      ))}
                    </div>
                  </div>
                  <span style={{ color: M.borderStrong, fontSize: '20px', marginTop: '2px', flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Select Date & Time ─── */}
        {step === 2 && selectedType && (
          <div className="animate-fade-up">
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 700, color: M.maroon, margin: '0 0 8px', lineHeight: 1.15 }}>
              Select Date &amp; Time
            </h1>
            <p style={{ fontSize: '14px', color: M.textSub, margin: '0 0 32px', lineHeight: 1.5 }}>
              Choose an available slot for your visit to the Registrar's Office.
            </p>

            {/* Calendar card */}
            <div style={{ background: M.white, borderRadius: '14px', border: `1.5px solid ${M.border}`, padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <CalendarWidget selectedDate={selectedDate} onDateSelect={handleDateSelect} minDateStr={minDate} maxDateStr={maxDate} />
            </div>

            {/* Slots skeleton */}
            {slotsLoading && (
              <div style={{ background: M.white, borderRadius: '14px', border: `1.5px solid ${M.border}`, padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div className="animate-shimmer" style={{ height: '18px', width: '140px', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '14px', width: '100px', borderRadius: '4px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div className="animate-shimmer" style={{ height: '14px', width: '80px', borderRadius: '4px', marginBottom: '10px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="animate-shimmer" style={{ height: '40px', borderRadius: '8px', border: `1.5px solid ${M.border}` }} />)}
                  </div>
                </div>
                <div>
                  <div className="animate-shimmer" style={{ height: '14px', width: '90px', borderRadius: '4px', marginBottom: '10px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="animate-shimmer" style={{ height: '40px', borderRadius: '8px', border: `1.5px solid ${M.border}` }} />)}
                  </div>
                </div>
              </div>
            )}

            {/* Slots panel */}
            {slotsData && !slotsLoading && (
              <div style={{ background: M.white, borderRadius: '14px', border: `1.5px solid ${M.border}`, padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 700, color: M.text, margin: 0 }}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <span style={{ fontSize: '12px', color: M.textSub }}>
                    👥 {slotsData.daily_cap - slotsData.total_booked} of {slotsData.daily_cap} available
                  </span>
                </div>

                {morningSlots.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: M.textSub, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⛅ Morning
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {morningSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                    </div>
                  </div>
                )}

                {afternoonSlots.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: M.textSub, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ☀️ Afternoon
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {afternoonSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                    </div>
                  </div>
                )}

                {/* Notes & Media Upload */}
                <div style={{ borderTop: `1px solid ${M.border}`, paddingTop: '20px', marginTop: '10px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: M.text, margin: '0 0 12px' }}>Additional Notes & Media (Optional)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                    <textarea 
                      placeholder="Add any urgent requests here or upload... "
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{
                        width: '100%', minHeight: '80px', padding: '12px', borderRadius: '10px',
                        border: `1.5px solid ${M.border}`, background: M.offWhite,
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
                      <span style={{ fontSize: '20px', marginBottom: '4px' }}>🖼️</span>
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
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <button type="button"
                onClick={() => { setStep(1); setSelectedType(null); setSelectedDate(''); setSelectedSlot(''); setSlotsData(null) }}
                style={{
                  padding: '12px 28px', borderRadius: '10px', border: `1.5px solid ${M.maroonBorder}`,
                  background: M.white, color: M.maroon, fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                Back
              </button>
              <button type="button"
                onClick={() => setStep(3)}
                disabled={!selectedSlot}
                style={{
                  padding: '12px 28px', borderRadius: '10px', border: 'none',
                  background: selectedSlot ? M.maroon : M.borderStrong,
                  color: M.white, fontSize: '14px', fontWeight: 700,
                  cursor: selectedSlot ? 'pointer' : 'not-allowed',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  transition: 'all 0.2s',
                }}>
                Next: Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Review ─── */}
        {step === 3 && selectedType && (
          <div className="animate-fade-up">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 700, color: M.maroon, margin: '0 0 8px', lineHeight: 1.15 }}>
                Review Your Appointment
              </h1>
              <p style={{ fontSize: '14px', color: M.textSub, margin: 0 }}>
                Please verify your details before confirming your visit to the Registrar's Office.
              </p>
            </div>

            {/* Summary card */}
            <div style={{ background: M.white, borderRadius: '16px', border: `1.5px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
              {/* Maroon accent top bar */}
              <div style={{ height: '5px', background: M.maroon }} />

              <div style={{ padding: '28px' }}>
                {/* Transaction header */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${M.border}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>TRANSACTION</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: M.maroonMid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📄</div>
                    <div>
                      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: '0 0 6px' }}>{selectedType.name}</h3>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: M.gold, background: M.goldLight, padding: '3px 10px', borderRadius: '100px', border: `1px solid ${M.goldBorder}`, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ⚠ Requires physical documents
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schedule + Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${M.border}` }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>SCHEDULE</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: M.text, marginBottom: '6px' }}>
                      <span>🗓️</span> {fmtDate(selectedDate)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: M.text }}>
                      <span>🕐</span> {fmt12h(selectedSlot)}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>LOCATION</p>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: M.text }}>
                      <span style={{ marginTop: '1px' }}>📍</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          Registrar's Office – Window {(() => {
                            const slotObj = slotsData?.slots?.find(s => s.time_slot === selectedSlot)
                            const staffCount = slotsData && slotsData.slots?.length > 0 
                              ? Math.round(slotsData.daily_cap / slotsData.slots.length) 
                              : 2
                            return slotObj ? (staffCount - slotObj.remaining) + 1 : 1
                          })()}
                        </div>
                        <div style={{ fontSize: '12px', color: M.textSub, marginTop: '2px' }}>CRMC Elementary School</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes & Media */}
                {(notes || selectedFile) && (
                  <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${M.border}` }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>NOTES & MEDIA</p>
                    {notes && <div style={{ fontSize: '14px', color: M.text, marginBottom: selectedFile ? '8px' : '0', whiteSpace: 'pre-wrap' }}>{notes}</div>}
                    {selectedFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: M.textSub, background: M.offWhite, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${M.border}`, width: 'fit-content' }}>
                        <span>🖼️</span> {selectedFile.name}
                      </div>
                    )}
                  </div>
                )}

                {/* Requirements */}
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>REQUIREMENTS TO BRING</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedType.required_documents?.map((doc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: M.text }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: M.greenLight, border: `1px solid ${M.greenBorder}`, color: M.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>✓</div>
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Email notice */}
            <div style={{ fontSize: '12px', color: M.textMuted, marginBottom: '24px', textAlign: 'center' }}>
              ✉️ A confirmation email will be sent to your student email upon booking.
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                style={{
                  padding: '12px 28px', borderRadius: '10px', border: `1.5px solid ${M.maroonBorder}`,
                  background: M.white, color: M.maroon, fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                Back
              </button>
              <button type="button"
                onClick={handleConfirmClick}
                disabled={loading || isUploading}
                style={{
                  padding: '12px 28px', borderRadius: '10px', border: 'none',
                  background: (loading || isUploading) ? '#B8667A' : M.maroon,
                  color: M.white, fontSize: '14px', fontWeight: 700,
                  cursor: (loading || isUploading) ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: '8px',
                  minWidth: '140px', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(123,26,42,0.15)',
                }}>
                {isUploading ? 'Uploading Media...' : loading ? 'Booking...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        )}

        {confirmingBook && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => !loading && setConfirmingBook(false)} />
            <div className="animate-fade-up" style={{ position: 'relative', width: '90%', maxWidth: '320px', background: M.white, borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: M.greenLight, color: M.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
                ❓
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: '0 0 8px' }}>Confirm Booking?</h3>
              <p style={{ fontSize: '13px', color: M.textSub, margin: '0 0 24px', lineHeight: 1.4 }}>
                Are you ready to book your appointment for <strong>{fmtDate(selectedDate)}</strong> at <strong>{fmt12h(selectedSlot)}</strong>?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setConfirmingBook(false)}
                  disabled={loading}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.white, color: M.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", opacity: loading ? 0.5 : 1 }}
                >
                  Go Back
                </button>
                <button 
                  onClick={handleBook}
                  disabled={loading}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'Booking...' : 'Yes, Book'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}