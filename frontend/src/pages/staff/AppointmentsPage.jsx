import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { getAllAppointments, getAppointmentStats, rescheduleAppointment } from '../../services/appointmentService'
import { Calendar, RefreshCw, BarChart2, Circle, User, Tag, X, FileText, Activity } from 'lucide-react'

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
    { label: "TODAY'S APPOINTMENTS", value: statsData ? statsData.today_appointments : "-", sub: "Real-time updates", icon: <Calendar size={20} className="text-gold" />, delay: '0.1s' },
    { label: "COMPLETED TODAY", value: statsData ? statsData.completed_today : "-", sub: "Automated processing", icon: <RefreshCw size={20} className="text-gold" />, delay: '0.2s' },
    { label: "TOTAL MONTHLY VOLUME", value: statsData ? statsData.total_monthly : "-", sub: "Total this month", icon: <BarChart2 size={20} className="text-gold" />, delay: '0.3s' }
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

  const loadAppointments = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true)
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
      if (showSkeleton) setLoading(false)
    }
  }, [selectedDate, token])

  useEffect(() => {
    loadAppointments(true)
    const t = setInterval(() => loadAppointments(false), 5000)
    return () => clearInterval(t)
  }, [loadAppointments])

  const renderStep = (stepStr, idx) => {
    return (
      <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-off-white border border-border text-[11px] font-semibold text-text-muted whitespace-nowrap">
        <span className="flex items-center"><Circle size={10} className="text-gold" /></span> {stepStr}
      </div>
    )
  }

  return (
    <div className="animate-fade-up font-sans">
      
      {/* ── Header ── */}
      <div className="mb-6">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Scheduling</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <Calendar size={24} className="text-maroon" /> Appointment Calendar
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Monitor automated student transactions and scheduled appointments.
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="animate-fade-up bg-white rounded-2xl p-5 border border-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col relative" style={{ animationDelay: s.delay }}>
            <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2">
              {s.label}
            </div>
            <div className="flex items-baseline gap-2 min-h-[32px]">
              <span className="font-serif text-[32px] font-bold text-maroon leading-none">
                {!statsData ? <div className="animate-pulse w-10 h-8 bg-border rounded-md" /> : s.value}
              </span>
              <span className="text-[11px] text-text-muted">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-[280px_1fr] gap-8">
        
        {/* Left Col: Calendar & Filters */}
        <div className="animate-fade-up flex flex-col gap-5" style={{ animationDelay: '0.4s' }}>
          
          <div className="bg-white rounded-2xl p-6 border border-border shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[15px] font-bold font-serif text-text-main">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-2">
                <span onClick={handlePrevMonth} className="cursor-pointer text-text-muted text-xs p-1 hover:text-text-main transition-colors">&lt;</span>
                <span onClick={handleNextMonth} className="cursor-pointer text-text-muted text-xs p-1 hover:text-text-main transition-colors">&gt;</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-text-muted mb-3 font-semibold">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[13px] items-center">
              {getDaysInMonth().map((d, i) => {
                if (!d) return <span key={`empty-${i}`} />
                const isSelected = selectedDate.getFullYear() === d.getFullYear() && selectedDate.getMonth() === d.getMonth() && selectedDate.getDate() === d.getDate()
                const isToday = new Date().setHours(0,0,0,0) === d.getTime()
                return (
                  <span 
                    key={i} 
                    onClick={() => setSelectedDate(d)}
                    className={`cursor-pointer w-6 h-6 flex items-center justify-center mx-auto transition-colors duration-200 
                      ${isSelected ? 'bg-maroon text-white rounded-full font-bold' : isToday ? 'text-gold font-bold rounded' : 'text-text-main font-medium rounded hover:bg-surface'}
                    `}
                  >
                    {d.getDate()}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-border shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4">
              Daily Filter
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <input type="checkbox" defaultChecked className="accent-maroon cursor-pointer" />
                <span className="text-[13px] font-medium text-text-main">Appointed</span>
              </div>
              <span className="text-[11px] text-text-muted bg-off-white px-1.5 py-0.5 rounded-md">
                {appointments.length}
              </span>
            </label>
          </div>

        </div>

        {/* Right Col: Appointment List */}
        <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-serif text-[18px] font-bold text-text-main m-0">
              Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
            </h2>
            <span className="text-xs text-text-muted">Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex flex-col gap-5">
            {loading && (
              <div className="flex flex-col gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between mb-3">
                      <div>
                        <div className="animate-pulse w-[200px] h-4.5 rounded bg-border mb-2.5" />
                        <div className="animate-pulse w-[140px] h-3.5 rounded bg-border mb-3" />
                        <div className="flex gap-4">
                          <div className="animate-pulse w-20 h-3.5 rounded bg-border" />
                          <div className="animate-pulse w-20 h-3.5 rounded bg-border" />
                        </div>
                      </div>
                      <div className="animate-pulse w-[60px] h-5.5 rounded-full bg-border" />
                    </div>
                    <div className="my-5">
                      <div className="animate-pulse w-[100px] h-2.5 rounded bg-border mb-2.5" />
                      <div className="flex gap-2">
                        <div className="animate-pulse w-[140px] h-6 rounded-full bg-border" />
                        <div className="animate-pulse w-[140px] h-6 rounded-full bg-border" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <div className="p-5 text-danger">{error}</div>}
            {!loading && !error && appointments.length === 0 && (
              <div className="p-10 text-center text-text-muted">No appointments for this date.</div>
            )}
            
            {appointments.map(apt => {
              const typeName = apt.transaction_types?.name || 'Unknown Transaction'
              const studentName = apt.users ? `${apt.users.first_name} ${apt.users.last_name}` : 'Unknown Student'
              const studentId = apt.users?.student_id || 'N/A'
              const steps = apt.transaction_types?.processing_steps || []
              
              return (
              <div key={apt.id} className="bg-white rounded-2xl p-6 border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-colors hover:border-maroon-border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-maroon m-0 mb-1.5 font-serif">
                      {typeName}
                    </h3>
                    <div className="text-[13px] text-text-sub flex items-center gap-1.5 mb-2.5">
                      <User size={14} className="text-gold" /> <span className="font-medium">{studentName}</span> (ID: {studentId})
                    </div>
                    <div className="flex gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Calendar size={12} className="text-gold" /> {fmt12h(apt.time_slot)}</span>
                      <span className="flex items-center gap-1"><Tag size={12} className="text-gold" /> Priority: {apt.priority_class}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-3 py-1 rounded-full capitalize border 
                    ${apt.status === 'completed' ? 'text-success bg-success-light border-success-border' : 
                      apt.status === 'pending' ? 'text-gold bg-gold-light border-gold-border' : 
                      apt.status === 'cancelled' ? 'text-danger bg-danger-light border-danger-border' : 
                      'text-blue bg-blue-light border-blue-border'}`}>
                    {apt.status}
                  </span>
                </div>

                {!['completed', 'cancelled'].includes(apt.status) && (
                  <div className="my-5">
                    <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2.5">
                      Processing Steps
                    </div>
                    {steps.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {steps.map((step, idx) => renderStep(step, idx))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-text-muted italic">No processing steps configured.</div>
                    )}
                  </div>
                )}

                <div className="h-px bg-border my-5" />
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted"></span>
                  <div className="flex gap-3">
                    {!['completed', 'cancelled'].includes(apt.status) && (
                      <button 
                        onClick={() => {
                          setRescheduleModal(apt)
                          setNewDate(apt.appointment_date || '')
                          setNewTime(apt.time_slot || '')
                        }}
                        className="bg-transparent border-none text-maroon text-[13px] font-semibold cursor-pointer hover:text-maroon-dark transition-colors">
                        Reschedule
                      </button>
                    )}
                    <button 
                      onClick={() => setViewDetailsModal(apt)}
                      className="bg-maroon text-white border-none rounded-lg px-5 py-2 text-[13px] font-semibold cursor-pointer font-sans hover:bg-maroon-dark transition-colors">
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
      {viewDetailsModal && createPortal((() => {
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

        const sColor = viewDetailsModal.status === 'completed' ? 'text-success' : viewDetailsModal.status === 'cancelled' ? 'text-danger' : viewDetailsModal.status === 'pending' ? 'text-gold' : 'text-blue'
        const sBg = viewDetailsModal.status === 'completed' ? 'bg-success-light' : viewDetailsModal.status === 'cancelled' ? 'bg-danger-light' : viewDetailsModal.status === 'pending' ? 'bg-gold-light' : 'bg-blue-light'
        const sBorder = viewDetailsModal.status === 'completed' ? 'border-success-border' : viewDetailsModal.status === 'cancelled' ? 'border-danger-border' : viewDetailsModal.status === 'pending' ? 'border-gold-border' : 'border-blue-border'

        return (
          <div className="fixed inset-0 z-1000 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setViewDetailsModal(null)} />
            <div className="animate-fade-up relative bg-white rounded-[24px] w-[480px] max-w-[90%] max-h-[90vh] overflow-y-auto shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
              
              {/* Header */}
              <div className="px-8 py-6 border-b border-border flex justify-between items-start">
                <div>
                  <h2 className="m-0 mb-1.5 text-text-main font-serif text-[22px] font-bold">Appointment Details</h2>
                  <p className="m-0 text-[13px] text-text-muted">ID: {viewDetailsModal.id.split('-')[0].toUpperCase()}</p>
                </div>
                <button onClick={() => setViewDetailsModal(null)} className="bg-surface border-none w-8 h-8 rounded-full cursor-pointer text-text-sub flex items-center justify-center transition-colors hover:bg-border"><X size={16} /></button>
              </div>

              <div className="p-8">
                {/* Student Info Profile */}
                <div className="flex items-center gap-4 mb-8 p-4 bg-off-white rounded-2xl border border-border">
                  <div className="w-14 h-14 rounded-full bg-maroon-light text-maroon flex items-center justify-center text-[20px] font-bold border border-maroon-border shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h3 className="m-0 mb-1 text-[16px] font-bold text-text-main">{name}</h3>
                    <p className="m-0 text-[13px] text-text-muted font-mono">{studentId}</p>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-2 flex items-center gap-1.5">
                      <FileText size={14} className="text-gold" /> Transaction Type
                    </p>
                    <p className="text-[14px] font-semibold text-text-main m-0">{viewDetailsModal.transaction_types?.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-2 flex items-center gap-1.5">
                      <Calendar size={14} className="text-gold" /> Schedule
                    </p>
                    <p className="text-[14px] font-semibold text-text-main m-0">
                      {new Date(viewDetailsModal.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {fmt12h(viewDetailsModal.time_slot)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-2 flex items-center gap-1.5">
                      <Tag size={14} className="text-gold" /> Priority Class
                    </p>
                    <span className="text-[12px] font-semibold text-maroon bg-maroon-light px-3 py-1 rounded-full border border-maroon-border capitalize inline-block">
                      {viewDetailsModal.priority_class}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-2 flex items-center gap-1.5">
                      <Activity size={14} className="text-gold" /> Status
                    </p>
                    <span className={`text-[12px] font-semibold px-3 py-1 rounded-full border capitalize inline-block ${sColor} ${sBg} ${sBorder}`}>
                      {viewDetailsModal.status}
                    </span>
                  </div>
                </div>

                {/* Processing Steps */}
                {!['completed', 'cancelled'].includes(viewDetailsModal.status) && (
                  <div className="border-t border-border pt-6 mb-6">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-3">Processing Steps</p>
                    {viewDetailsModal.transaction_types?.processing_steps && viewDetailsModal.transaction_types.processing_steps.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewDetailsModal.transaction_types.processing_steps.map((step, idx) => renderStep(step, idx))}
                      </div>
                    ) : (
                      <div className="text-[13px] text-text-muted italic bg-off-white p-4 rounded-xl border border-border">No processing steps configured for this transaction.</div>
                    )}
                  </div>
                )}

                {/* Notes & Media */}
                {(parsedNotes || mediaUrl) && (
                  <div className="border-t border-border pt-6">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-3">Notes & Attachments</p>
                    {parsedNotes && (
                      <div className="p-4 bg-surface rounded-xl text-[13px] text-text-sub leading-relaxed mb-4">
                        {parsedNotes}
                      </div>
                    )}
                    {mediaUrl && (
                      <div>
                        <p className="text-[12px] font-semibold text-text-main m-0 mb-2">Attached Media</p>
                        <a href={mediaUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-border transition-opacity hover:opacity-90">
                          <img src={mediaUrl} alt="Attachment" className="w-full block" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })(), document.body)}

      {rescheduleModal && createPortal((
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-1000">
          <div className="bg-white p-8 rounded-2xl w-[400px] max-w-[90%] font-sans shadow-xl animate-fade-up">
            <h2 className="m-0 mb-4 text-maroon font-serif text-[22px] font-bold">Reschedule Appointment</h2>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-text-sub mb-1.5">New Date</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-border text-sm outline-none font-sans focus:border-maroon transition-colors" />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-text-sub mb-1.5">New Time Slot</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-2.5 rounded-lg border border-border text-sm outline-none font-sans focus:border-maroon transition-colors" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRescheduleModal(null)} className="flex-1 bg-off-white text-text-main p-2.5 rounded-lg border border-border cursor-pointer font-semibold font-sans hover:bg-border transition-colors">Cancel</button>
              <button onClick={handleReschedule} disabled={rescheduling} className={`flex-1 p-2.5 rounded-lg border-none font-semibold font-sans transition-colors ${rescheduling ? 'bg-maroon-border text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
                {rescheduling ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

    </div>
  )
}
