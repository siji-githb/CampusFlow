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
  
  const fmt12h = (t) => {
    if (!t) return '—'
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }

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
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const aComp = a.status === 'completed'
        const bComp = b.status === 'completed'
        if (aComp && !bComp) return 1
        if (!aComp && bComp) return -1
        return (a.time_slot || '').localeCompare(b.time_slot || '')
      })
      setAppointments(sortedData)
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 {fmt12h(apt.time_slot)}</span>
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
      {viewDetailsModal && (() => {
        const student = viewDetailsModal.users
        const name = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
        const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
        const studentId = student?.student_id || 'N/A'
        
        // Parse Notes & Media URL
        let parsedNotes = viewDetailsModal.notes || ''
        let mediaUrl = null
        if (parsedNotes.includes('MEDIA_URL:')) {
          const parts = parsedNotes.split('MEDIA_URL:')
          parsedNotes = parts[0].trim()
          mediaUrl = parts[1] ? parts[1].trim() : null
        }

        const sColor = viewDetailsModal.status === 'completed' ? M.green : viewDetailsModal.status === 'cancelled' ? M.red : viewDetailsModal.status === 'pending' ? M.gold : M.blue
        const sBg = viewDetailsModal.status === 'completed' ? M.greenLight : viewDetailsModal.status === 'cancelled' ? M.redLight : viewDetailsModal.status === 'pending' ? M.goldLight : M.blueLight
        const sBorder = viewDetailsModal.status === 'completed' ? M.greenBorder : viewDetailsModal.status === 'cancelled' ? M.redBorder : viewDetailsModal.status === 'pending' ? M.goldBorder : M.blueBorder

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setViewDetailsModal(null)} />
            <div className="animate-fade-up" style={{ position: 'relative', background: M.white, borderRadius: '24px', width: '480px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              
              {/* Header */}
              <div style={{ padding: '24px 32px', borderBottom: `1px solid ${M.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 6px', color: M.text, fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 700 }}>Appointment Details</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: M.textMuted }}>ID: {viewDetailsModal.id.split('-')[0].toUpperCase()}</p>
                </div>
                <button onClick={() => setViewDetailsModal(null)} style={{ background: M.surface, border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', color: M.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = M.border} onMouseLeave={e => e.currentTarget.style.background = M.surface}>✕</button>
              </div>

              <div style={{ padding: '32px' }}>
                {/* Student Info Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', padding: '16px', background: M.offWhite, borderRadius: '16px', border: `1px solid ${M.border}` }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: M.maroonLight, color: M.maroon, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, border: `1px solid ${M.maroonBorder}` }}>
                    {initials}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: M.text }}>{name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: M.textMuted, fontFamily: 'monospace' }}>{studentId}</p>
                  </div>
                </div>

                {/* Grid Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Transaction Type</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: 0 }}>{viewDetailsModal.transaction_types?.name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Schedule</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: 0 }}>
                      {new Date(viewDetailsModal.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {fmt12h(viewDetailsModal.time_slot)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Priority Class</p>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: M.maroon, background: M.maroonLight, padding: '4px 12px', borderRadius: '100px', border: `1px solid ${M.maroonBorder}`, textTransform: 'capitalize' }}>
                      {viewDetailsModal.priority_class}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Status</p>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: sColor, background: sBg, padding: '4px 12px', borderRadius: '100px', border: `1px solid ${sBorder}`, textTransform: 'capitalize' }}>
                      {viewDetailsModal.status}
                    </span>
                  </div>
                </div>

                {/* Notes & Media */}
                {(parsedNotes || mediaUrl) && (
                  <div style={{ borderTop: `1px solid ${M.border}`, paddingTop: '24px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Notes & Attachments</p>
                    {parsedNotes && (
                      <div style={{ padding: '16px', background: M.surface, borderRadius: '12px', fontSize: '13px', color: M.textSub, lineHeight: 1.5, marginBottom: '16px' }}>
                        {parsedNotes}
                      </div>
                    )}
                    {mediaUrl && (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: M.text, margin: '0 0 8px' }}>Attached Media</p>
                        <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${M.border}` }}>
                          <img src={mediaUrl} alt="Attachment" style={{ width: '100%', display: 'block' }} />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
