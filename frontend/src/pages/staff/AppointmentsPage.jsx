import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getAllAppointments, getAppointmentStats, rescheduleAppointment } from '../../services/appointmentService'

const M = {
  maroon: '#7B1A2A',
  maroonDark: '#5C1320',
  maroonLight: '#F9F0F1',
  maroonMid: 'rgba(123,26,42,0.08)',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold: '#B8900A',
  goldLight: '#FDF6E3',
  goldBorder: 'rgba(184,144,10,0.3)',
  white: '#FFFFFF',
  offWhite: '#F9F7F4',
  surface: '#F2EDE8',
  border: '#EAE7E2',
  text: '#1C1917',
  textSub: '#57534E',
  textMuted: '#A8A29E',
  green: '#15803D',
  greenLight: '#F0FDF4',
  greenBorder: '#BBF7D0',
  blue: '#1D4ED8',
  blueLight: '#EFF6FF',
  blueBorder: '#BFDBFE',
}

export default function AppointmentsPage() {
  const { token } = useAuth()
  const [view, setView] = useState('list')
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(new Date())

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const [statsData, setStatsData] = useState(null)

  const loadStats = useCallback(async () => {
    try {
      const data = await getAppointmentStats(token)
      setStatsData(data)
    } catch (e) {
      console.error('Failed to load stats', e)
    }
  }, [token])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const stats = [
    { label: "TODAY'S APPOINTMENTS", value: statsData ? statsData.today_appointments : "-", sub: "Real-time updates", icon: "📅", delay: '0.1s' },
    { label: "COMPLETED TODAY", value: statsData ? statsData.completed_today : "-", sub: "Automated processing", icon: "🔄", delay: '0.2s' },
    { label: "TOTAL MONTHLY VOLUME", value: statsData ? statsData.total_monthly : "-", sub: "Total this month", icon: "📊", delay: '0.3s' }
  ]

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modals state
  const [viewDetailsModal, setViewDetailsModal] = useState(null)
  const [rescheduleModal, setRescheduleModal] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const handleReschedule = async () => {
    if (!newDate || !newTime) return
    setRescheduling(true)
    try {
      await rescheduleAppointment(token, rescheduleModal.id, newDate, newTime)
      setRescheduleModal(null)
      loadAppointments()
      loadStats()
    } catch (err) {
      alert(err.message)
    } finally {
      setRescheduling(false)
    }
  }

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Local time string YYYY-MM-DD
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      const data = await getAllAppointments(token, dateStr)
      setAppointments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, token])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const renderStep = (stepStr, idx) => {
    return (
      <div key={idx} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '100px',
        background: M.offWhite, border: `1px solid ${M.border}`,
        fontSize: '11px', fontWeight: 600, color: M.textMuted,
        whiteSpace: 'nowrap'
      }}>
        <span>○</span> {stepStr}
      </div>
    )
  }

  return (
    <div className="fade-in-section" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 700, color: M.maroon, margin: '0 0 4px' }}>
            Appointment Calendar
          </h1>
          <p style={{ fontSize: '13px', color: M.textSub, margin: 0 }}>
            Monitor automated student transactions and scheduled appointments.
          </p>
        </div>

      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {stats.map((s, i) => (
          <div key={i} className="animate-fade-up" style={{
            animationDelay: s.delay,
            background: M.white, borderRadius: '16px', padding: '20px',
            border: `1px solid ${M.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', position: 'relative'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              {s.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minHeight: '32px' }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '32px', fontWeight: 700, color: M.maroon, lineHeight: 1 }}>
                {!statsData ? <div className="animate-shimmer" style={{ width: '40px', height: '32px', background: M.border, borderRadius: '6px' }} /> : s.value}
              </span>
              <span style={{ fontSize: '11px', color: M.textMuted }}>{s.sub}</span>
            </div>
            <div style={{
              position: 'absolute', top: '20px', right: '20px',
              width: '28px', height: '28px', borderRadius: '8px',
              background: M.offWhite, border: `1px solid ${M.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
            }}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }}>
        
        {/* Left Col: Calendar & Filters */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: M.white, borderRadius: '16px', padding: '24px', border: `1px solid ${M.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Fraunces', serif", color: M.text }}>
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span onClick={handlePrevMonth} style={{ cursor: 'pointer', color: M.textMuted, fontSize: '12px', padding: '4px' }}>&lt;</span>
                <span onClick={handleNextMonth} style={{ cursor: 'pointer', color: M.textMuted, fontSize: '12px', padding: '4px' }}>&gt;</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontSize: '12px', color: M.textMuted, marginBottom: '12px', fontWeight: 600 }}>
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontSize: '13px', alignItems: 'center' }}>
              {getDaysInMonth().map((d, i) => {
                if (!d) return <span key={`empty-${i}`} />
                const isSelected = selectedDate.getFullYear() === d.getFullYear() && selectedDate.getMonth() === d.getMonth() && selectedDate.getDate() === d.getDate()
                const isToday = new Date().setHours(0,0,0,0) === d.getTime()
                return (
                  <span 
                    key={i} 
                    onClick={() => setSelectedDate(d)}
                    style={{
                      cursor: 'pointer', 
                      background: isSelected ? M.maroon : 'transparent', 
                      color: isSelected ? M.white : isToday ? M.gold : M.text, 
                      borderRadius: isSelected ? '50%' : '4px', 
                      width: '24px', height: '24px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      margin: '0 auto', 
                      fontWeight: isSelected || isToday ? 700 : 500,
                      transition: 'background 0.2s'
                    }}
                  >
                    {d.getDate()}
                  </span>
                )
              })}
            </div>
          </div>

          <div style={{ background: M.white, borderRadius: '16px', padding: '24px', border: `1px solid ${M.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Daily Filter
            </div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: M.maroon, cursor: 'pointer' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: M.text }}>Appointed</span>
              </div>
              <span style={{ fontSize: '11px', color: M.textMuted, background: M.offWhite, padding: '2px 6px', borderRadius: '6px' }}>
                {appointments.length}
              </span>
            </label>
          </div>

        </div>

        {/* Right Col: Appointment List */}
        <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>
              Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
            </h2>
            <span style={{ fontSize: '12px', color: M.textMuted }}>Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ 
                    background: M.white, borderRadius: '16px', padding: '24px', 
                    border: `1px solid ${M.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div className="animate-shimmer" style={{ width: '200px', height: '18px', borderRadius: '4px', marginBottom: '10px' }} />
                        <div className="animate-shimmer" style={{ width: '140px', height: '14px', borderRadius: '4px', marginBottom: '12px' }} />
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div className="animate-shimmer" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
                          <div className="animate-shimmer" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
                        </div>
                      </div>
                      <div className="animate-shimmer" style={{ width: '60px', height: '22px', borderRadius: '100px' }} />
                    </div>
                    <div style={{ margin: '20px 0' }}>
                      <div className="animate-shimmer" style={{ width: '100px', height: '10px', borderRadius: '4px', marginBottom: '10px' }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="animate-shimmer" style={{ width: '140px', height: '24px', borderRadius: '100px' }} />
                        <div className="animate-shimmer" style={{ width: '140px', height: '24px', borderRadius: '100px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <div style={{ padding: '20px', color: M.red }}>{error}</div>}
            {!loading && !error && appointments.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: M.textMuted }}>No appointments for this date.</div>
            )}
            
            {appointments.map(apt => {
              const typeName = apt.transaction_types?.name || 'Unknown Transaction'
              const studentName = apt.users ? `${apt.users.first_name} ${apt.users.last_name}` : 'Unknown Student'
              const studentId = apt.users?.student_id || 'N/A'
              const steps = apt.transaction_types?.processing_steps || []
              
              return (
              <div key={apt.id} style={{ 
                background: M.white, borderRadius: '16px', padding: '24px', 
                border: `1px solid ${M.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: M.maroon, margin: '0 0 6px', fontFamily: "'Fraunces', serif" }}>
                      {typeName}
                    </h3>
                    <div style={{ fontSize: '13px', color: M.textSub, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      👤 <span style={{ fontWeight: 500 }}>{studentName}</span> (ID: {studentId})
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: M.textMuted }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 {apt.time_slot}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🏷️ Priority: {apt.priority_class}</span>
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '11px', fontWeight: 600, color: M.green, 
                    background: M.greenLight, border: `1px solid ${M.greenBorder}`, 
                    padding: '4px 12px', borderRadius: '100px',
                    textTransform: 'capitalize'
                  }}>
                    {apt.status}
                  </span>
                </div>

                <div style={{ margin: '20px 0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Processing Steps
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {steps.map((step, idx) => renderStep(step, idx))}
                  </div>
                </div>

                <div style={{ height: '1px', background: M.border, margin: '20px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: M.textMuted }}></span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => {
                        setRescheduleModal(apt)
                        setNewDate(apt.appointment_date || '')
                        setNewTime(apt.time_slot || '')
                      }}
                      style={{ 
                      background: 'transparent', border: 'none', color: M.maroon, 
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer' 
                    }}>
                      Reschedule
                    </button>
                    <button 
                      onClick={() => setViewDetailsModal(apt)}
                      style={{ 
                      background: M.maroon, color: M.white, border: 'none', 
                      borderRadius: '8px', padding: '8px 20px', 
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'IBM Plex Sans', sans-serif"
                    }}>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

      </div>

      {/* Modals */}
      {viewDetailsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: M.white, padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <h2 style={{ margin: '0 0 16px', color: M.maroon, fontFamily: "'Fraunces', serif" }}>Appointment Details</h2>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Student:</strong> {viewDetailsModal.users?.first_name} {viewDetailsModal.users?.last_name} ({viewDetailsModal.users?.student_id})</div>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Type:</strong> {viewDetailsModal.transaction_types?.name}</div>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Date:</strong> {viewDetailsModal.appointment_date}</div>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Time:</strong> {viewDetailsModal.time_slot}</div>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Priority:</strong> {viewDetailsModal.priority_class}</div>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Status:</strong> <span style={{textTransform:'capitalize'}}>{viewDetailsModal.status}</span></div>
            {viewDetailsModal.notes && <div style={{ marginBottom: '8px', fontSize: '14px' }}><strong>Notes:</strong> {viewDetailsModal.notes}</div>}
            <button onClick={() => setViewDetailsModal(null)} style={{ marginTop: '24px', background: M.maroon, color: M.white, padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}

      {rescheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: M.white, padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <h2 style={{ margin: '0 0 16px', color: M.maroon, fontFamily: "'Fraunces', serif" }}>Reschedule Appointment</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: M.textSub, marginBottom: '6px' }}>New Date</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${M.border}`, fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: M.textSub, marginBottom: '6px' }}>New Time Slot</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${M.border}`, fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setRescheduleModal(null)} style={{ flex: 1, background: M.offWhite, color: M.text, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleReschedule} disabled={rescheduling} style={{ flex: 1, background: M.maroon, color: M.white, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {rescheduling ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
