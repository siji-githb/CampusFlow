import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { getTransactionTypes, getAvailableSlots, bookAppointment } from '../../services/appointmentService'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray400: '#9C9690', gray500: '#706B65', text: '#1C1917' }

export default function BookAppointment() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [types, setTypes] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsData, setSlotsData] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  useEffect(() => { getTransactionTypes().then(setTypes).catch(e => setError(e.message)) }, [])

  const handleDateChange = async (e) => {
    const date = e.target.value; setSelectedDate(date); setSelectedSlot(''); setSlotsData(null); setError('')
    if (!date) return
    const day = new Date(date + 'T00:00:00').getDay()
    if (day === 0 || day === 6) { setError('Please select a weekday (Monday–Friday)'); return }
    setLoading(true)
    try { setSlotsData(await getAvailableSlots(selectedType.id, date)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleBook = async () => {
    setLoading(true); setError('')
    try {
      await bookAppointment(token, { transaction_type_id: selectedType.id, appointment_date: selectedDate, time_slot: selectedSlot, notes: notes || null })
      setSuccess(true)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const STEPS = ['Transaction', 'Schedule', 'Confirm']

  if (success) return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar backTo="/student/dashboard" title="Book Appointment" />
      <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ background: 'white', borderRadius: '18px', border: `1px solid ${M.gray200}`, padding: '2.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '64px', height: '64px', background: `${M.maroon}12`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>✅</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: M.maroon, margin: '0 0 8px' }}>Appointment Confirmed!</h2>
          <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>{selectedType?.name}</p>
          <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.5rem' }}>📅 {selectedDate} at {selectedSlot}</p>
          <div style={{ background: M.goldLight, borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', border: `1px solid ${M.gold}30` }}>
            <p style={{ fontSize: '12px', color: M.gold, margin: 0 }}>Please bring all required documents on your appointment date.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => navigate('/student/appointments')} style={{ padding: '12px', borderRadius: '8px', border: 'none', background: M.maroon, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>View My Appointments</button>
            <button onClick={() => navigate('/student/dashboard')} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${M.gray200}`, background: 'white', color: M.text, fontSize: '14px', cursor: 'pointer' }}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar backTo="/student/dashboard" title="Book Appointment" />
      <main style={{ maxWidth: '580px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2rem' }}>
          {STEPS.map((s, i) => {
            const num = i + 1; const active = step === num; const done = step > num
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: done ? M.maroon : active ? M.maroon : M.gray200, color: done || active ? 'white' : M.gray400, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? M.maroon : done ? M.gray500 : M.gray400 }}>{s}</span>
                </div>
                {i < 2 && <div style={{ width: '24px', height: '2px', background: done ? M.maroon : M.gray200 }} />}
              </div>
            )
          })}
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, border: `1px solid ${M.maroon}30`, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Select Transaction Type</h2>
            <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.25rem' }}>What document do you need from the Registrar?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {types.map(t => (
                <button key={t.id} onClick={() => { setSelectedType(t); setStep(2) }} style={{ textAlign: 'left', background: 'white', border: `1.5px solid ${M.gray200}`, borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = M.maroon}
                  onMouseLeave={e => e.currentTarget.style.borderColor = M.gray200}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>{t.name}</h3>
                  <p style={{ fontSize: '12px', color: M.gray500, margin: '0 0 12px' }}>{t.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {t.required_documents?.map((doc, j) => (
                      <span key={j} style={{ fontSize: '11px', background: M.maroonLight, color: M.maroon, padding: '2px 8px', borderRadius: '100px', border: `1px solid ${M.maroon}20` }}>{doc}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedType && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 4px' }}>Choose Schedule</h2>
            <p style={{ fontSize: '13px', color: M.gold, margin: '0 0 1.5rem', fontWeight: 500 }}>{selectedType.name}</p>

            <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${M.gray200}`, padding: '1.25rem', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: M.gray500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select Date</label>
              <input type="date" value={selectedDate} onChange={handleDateChange} min={minDate} max={maxDateStr}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${M.gray200}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: M.text, fontFamily: "'DM Sans', sans-serif" }}
                onFocus={e => e.target.style.borderColor = M.maroon}
                onBlur={e => e.target.style.borderColor = M.gray200} />
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '1.5rem', color: M.gray400, fontSize: '13px' }}>Loading available slots...</div>}

            {slotsData && (
              <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${M.gray200}`, padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: M.gray500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Time Slots</span>
                  <span style={{ fontSize: '12px', color: M.gray400 }}>{slotsData.total_booked}/{slotsData.daily_cap} booked</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {slotsData.slots.map(s => (
                    <button key={s.time_slot} disabled={!s.available} onClick={() => setSelectedSlot(s.time_slot)}
                      style={{ padding: '9px 4px', borderRadius: '8px', border: `1.5px solid ${selectedSlot === s.time_slot ? M.maroon : s.available ? M.gray200 : M.gray200}`, background: selectedSlot === s.time_slot ? M.maroon : s.available ? 'white' : M.offWhite, color: selectedSlot === s.time_slot ? 'white' : s.available ? M.text : M.gray400, fontSize: '12px', fontWeight: 500, cursor: s.available ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>
                      {s.time_slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSlot && (
              <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${M.gray200}`, padding: '1.25rem', marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: M.gray500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any special instructions..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${M.gray200}`, fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: M.text }}
                  onFocus={e => e.target.style.borderColor = M.maroon}
                  onBlur={e => e.target.style.borderColor = M.gray200} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setStep(1); setSelectedType(null) }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${M.gray200}`, background: 'white', color: M.text, fontSize: '14px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!selectedSlot} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: selectedSlot ? M.maroon : M.gray200, color: selectedSlot ? 'white' : M.gray400, fontSize: '14px', fontWeight: 600, cursor: selectedSlot ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selectedType && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Confirm Appointment</h2>
            <p style={{ fontSize: '13px', color: M.gray500, margin: '0 0 1.5rem' }}>Review your details before confirming.</p>

            <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${M.gray200}`, padding: '1.25rem', marginBottom: '1rem' }}>
              {[
                ['Transaction', selectedType.name],
                ['Date', selectedDate],
                ['Time', selectedSlot],
                ['Student', `${user?.first_name} ${user?.last_name}`],
                ['Priority', (user?.priority_class || '').replace(/^\w/, c => c.toUpperCase())],
                ...(notes ? [['Notes', notes]] : []),
              ].map(([label, value], i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${M.gray200}` : 'none' }}>
                  <span style={{ fontSize: '13px', color: M.gray500 }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: M.text, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: M.goldLight, borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: `1px solid ${M.gold}30` }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: M.gold, margin: '0 0 8px' }}>📋 Required Documents</p>
              {selectedType.required_documents?.map((doc, i) => (
                <p key={i} style={{ fontSize: '12px', color: M.gold, margin: '4px 0' }}>• {doc}</p>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${M.gray200}`, background: 'white', color: M.text, fontSize: '14px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <button onClick={handleBook} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#B8667A' : M.maroon, color: 'white', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? 'Booking...' : 'Confirm Booking ✓'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}