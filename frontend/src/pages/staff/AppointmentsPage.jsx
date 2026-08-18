import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { getAllAppointments, getAppointmentStats, rescheduleAppointment, getBookingConfig } from '../../services/appointmentService'
import { 
  Calendar, RefreshCw, BarChart2, Circle, User, Users, Tag, X, FileText, Activity, 
  Clock, CheckCircle, CheckCircle2, AlertCircle, Mail, GraduationCap, MapPin, Ticket, 
  ExternalLink, Paperclip, ChevronRight, CalendarCheck, ShieldCheck, 
  Sparkles, DollarSign, Layers, ArrowRight, FolderOpen, ClipboardList, Info
} from 'lucide-react'
import CustomDatePicker from '../../components/common/CustomDatePicker'

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

  const [dateOverrides, setDateOverrides] = useState({})

  useEffect(() => {
    loadStats()
    getBookingConfig().then(cfg => {
      if (cfg.date_overrides) setDateOverrides(cfg.date_overrides)
    }).catch(console.error)
  }, [loadStats])

  const stats = [
    { label: "TODAY'S APPOINTMENTS", value: statsData ? statsData.today_appointments : "-", sub: "Real-time updates", icon: <Calendar size={20} />, colorClass: 'text-maroon', bgClass: 'bg-maroon-light', delay: '0.1s' },
    { label: "COMPLETED TODAY", value: statsData ? statsData.completed_today : "-", sub: "Automated processing", icon: <RefreshCw size={20} />, colorClass: 'text-gold', bgClass: 'bg-gold-light', delay: '0.2s' },
    { label: "TOTAL MONTHLY VOLUME", value: statsData ? statsData.total_monthly : "-", sub: "Total this month", icon: <BarChart2 size={20} />, colorClass: 'text-maroon', bgClass: 'bg-maroon-light', delay: '0.3s' }
  ]

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [selectedDate])

  const ITEMS_PER_PAGE = 10
  const totalItems = appointments.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const currentAppointments = appointments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Modals state
  const [viewDetailsModal, setViewDetailsModal] = useState(null)

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
    const t = setInterval(() => loadAppointments(false), 15000)
    return () => clearInterval(t)
  }, [loadAppointments])

  const renderStep = (stepData, idx) => {
    const stepName = typeof stepData === 'object' ? stepData.name : stepData
    return (
      <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-off-white border border-border text-[11px] font-semibold text-text-muted whitespace-nowrap">
        <span className="flex items-center"><Circle size={10} className="text-gold" /></span> {stepName}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="animate-fade-up bg-white rounded-[14px] px-5 py-4.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-3 flex-1" style={{ animationDelay: s.delay }}>
            <div className="flex items-start justify-between">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.06em] mt-1.5">{s.label}</div>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${s.bgClass} ${s.colorClass}`}>
                {s.icon}
              </div>
            </div>
            <div>
              <div className="font-serif text-[28px] font-extrabold text-text-main leading-none m-0 min-h-7">
                {!statsData ? <div className="animate-pulse w-15 h-7 rounded-md bg-border" /> : s.value}
              </div>
              {s.sub && <div className="text-[11px] font-semibold text-text-muted mt-1.5">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
        
        {/* Left Col: Calendar & Filters */}
        <div className="animate-fade-up flex flex-col gap-5" style={{ animationDelay: '0.4s' }}>
          
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-border shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
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
                
                // Format YYYY-MM-DD for override lookup
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                const override = dateOverrides[dateStr]

                return (
                  <span 
                    key={i} 
                    onClick={() => setSelectedDate(d)}
                    className={`cursor-pointer w-7 h-7 flex flex-col items-center justify-center mx-auto transition-colors duration-200 gap-0.5
                      ${isSelected ? 'bg-maroon text-white rounded-full font-bold' : isToday ? 'text-gold font-bold rounded hover:bg-surface' : 'text-text-main font-medium rounded hover:bg-surface'}
                    `}
                  >
                    <span className="leading-none">{d.getDate()}</span>
                    <div className="flex justify-center w-full h-1 -mt-0.5">
                      {override && (
                        <div className={`w-1 h-1 rounded-full ${override.is_blocked ? (isSelected ? 'bg-white' : 'bg-danger') : (isSelected ? 'bg-white' : 'bg-info')}`} />
                      )}
                    </div>
                  </span>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right Col: Appointment List */}
        <div className="animate-fade-up min-w-0" style={{ animationDelay: '0.5s' }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-5">
            <h2 className="font-serif text-[18px] font-bold text-text-main m-0">
              Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
            </h2>
            <span className="text-xs text-text-muted">Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex flex-col gap-0 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-[14px] overflow-hidden border border-border">
            <div className="overflow-x-auto scrollbar-thin">
              <div className="min-w-160">
                {/* Column headers */}
                <div className="grid grid-cols-[100px_1fr_220px_120px_120px] gap-4 px-6 py-3.5 bg-surface border-b border-border">
                  {['TIME', 'STUDENT DETAILS', 'TRANSACTION', 'STATUS', 'ACTION'].map(col => (
                    <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
                  ))}
                </div>

                {/* Rows */}
                <div className="bg-white flex flex-col">
                  {loading ? (
                    [1, 2, 3].map(i => (
                      <div key={i} className={`grid grid-cols-[100px_1fr_220px_120px_120px] gap-4 px-6 py-4 items-center ${i < 3 ? 'border-b border-border' : ''}`}>
                        <div className="animate-pulse w-16 h-4 rounded bg-border" />
                        <div>
                          <div className="animate-pulse w-35 h-4 rounded bg-border mb-2" />
                          <div className="animate-pulse w-20 h-3 rounded bg-border" />
                        </div>
                        <div>
                          <div className="animate-pulse w-40 h-4 rounded bg-border mb-2" />
                          <div className="animate-pulse w-16 h-3 rounded bg-border" />
                        </div>
                        <div className="animate-pulse w-20 h-6 rounded-full bg-border" />
                        <div>
                          <div className="animate-pulse w-24 h-8 rounded-lg bg-border" />
                        </div>
                      </div>
                    ))
                  ) : error ? (
                    <div className="p-8 text-danger bg-danger-light/20 text-[13px] font-medium">{error}</div>
                  ) : appointments.length === 0 ? (
                    <div className="p-12 text-center text-text-muted text-[14px] font-medium">No appointments for this date.</div>
                  ) : (
                    currentAppointments.map((apt, idx) => {
                      const typeName = apt.transaction_types?.name || 'Unknown Transaction'
                      const studentName = apt.users ? `${apt.users.first_name} ${apt.users.last_name}` : 'Unknown Student'
                      const studentId = apt.users?.student_id || 'N/A'
                      const sColor = apt.status === 'completed' ? 'text-success bg-success-light border-success-border' : apt.status === 'cancelled' ? 'text-danger bg-danger-light border-danger-border' : apt.status === 'pending' ? 'text-gold bg-gold-light border-gold-border' : 'text-blue bg-blue-light border-blue-border'

                      return (
                        <div key={apt.id} className={`grid grid-cols-[100px_1fr_220px_120px_120px] gap-4 px-6 py-4 items-center transition-colors hover:bg-slate-50 ${idx < currentAppointments.length - 1 ? 'border-b border-border' : ''}`}>
                          <div className="text-[13px] font-bold text-text-main font-serif">
                            {fmt12h(apt.time_slot)}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-text-main mb-1 truncate">{studentName}</div>
                            <div className="text-[11px] text-text-muted font-mono">{studentId}</div>
                          </div>
                          <div className="pr-4">
                            <div className="text-[13px] font-semibold text-maroon mb-1.5 leading-snug truncate">{typeName}</div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize bg-surface border border-border text-text-sub">
                              {apt.priority_class}
                            </span>
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border tracking-wide inline-block ${sColor}`}>
                              {apt.status}
                            </span>
                          </div>
                          <div>
                            <button 
                              onClick={() => setViewDetailsModal(apt)}
                              className="bg-white border border-border rounded-lg px-3.5 py-1.5 text-[12px] font-bold cursor-pointer font-sans text-text-main hover:border-maroon-border hover:text-maroon transition-colors shadow-2xs">
                              View Details
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
              
              {/* Pagination Controls */}
              {appointments.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-border">
                  <div className="text-[12px] text-text-sub font-medium">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, totalItems)} of {totalItems} appointments
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3.5 py-1.5 rounded-lg border border-border bg-white text-[12px] font-bold text-text-main cursor-pointer hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3.5 py-1.5 rounded-lg border border-border bg-white text-[12px] font-bold text-text-main cursor-pointer hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Redesigned Informative & Clean View Details Modal */}
      {viewDetailsModal && createPortal((() => {
        const student = viewDetailsModal.users
        const name = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
        const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
        const studentId = student?.student_id || 'N/A'
        const email = student?.email || 'No email registered'
        const program = student?.course || student?.program || ''
        const yearLevel = student?.year_level ? `${student.year_level} Year` : ''
        const academicInfo = [program, yearLevel].filter(Boolean).join(' • ')
        const avatarUrl = student?.profile_image || student?.profile_picture_url || null

        // Parse Notes & Media URL
        let parsedNotes = viewDetailsModal.notes || ''
        let mediaUrl = null
        if (parsedNotes.includes('MEDIA_URL:')) {
          const parts = parsedNotes.split('MEDIA_URL:')
          parsedNotes = parts[0].trim()
          mediaUrl = parts[1] ? parts[1].trim() : null
        }

        // Clean purpose / request note
        let purposeText = parsedNotes
        if (purposeText.startsWith('PURPOSE:')) {
          purposeText = purposeText.replace('PURPOSE:', '').trim()
        }

        const isCompleted = viewDetailsModal.status === 'completed'
        const isCancelled = viewDetailsModal.status === 'cancelled'
        const isPending = viewDetailsModal.status === 'pending'

        const sColor = isCompleted ? 'text-success' : isCancelled ? 'text-danger' : isPending ? 'text-gold' : 'text-blue'
        const sBg = isCompleted ? 'bg-success-light' : isCancelled ? 'bg-danger-light' : isPending ? 'bg-gold-light' : 'bg-blue-light'
        const sBorder = isCompleted ? 'border-success-border' : isCancelled ? 'border-danger-border' : isPending ? 'border-gold-border' : 'border-blue-border'
        const sDot = isCompleted ? 'bg-success' : isCancelled ? 'bg-danger' : isPending ? 'bg-gold' : 'bg-blue'

        const isPriority = viewDetailsModal.priority_class && viewDetailsModal.priority_class !== 'regular'
        const pClassLabel = viewDetailsModal.priority_class?.toUpperCase() || 'REGULAR'

        const queueTicket = viewDetailsModal.queue_tickets?.[0] || viewDetailsModal.queue_tickets || null
        const txType = viewDetailsModal.transaction_types
        const processingSteps = txType?.processing_steps || []
        const requiredDocs = txType?.required_documents || []

        const formattedDate = new Date(viewDetailsModal.appointment_date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        const timeFormatted = fmt12h(viewDetailsModal.time_slot)
        const refId = `APPT-${viewDetailsModal.id.split('-')[0].toUpperCase()}`

        return (
          <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="fixed inset-0 bg-black/60 transition-opacity animate-fade-in" onClick={() => setViewDetailsModal(null)} />
            
            <div className="animate-fade-up relative w-full max-w-4xl bg-white text-text-main rounded-3xl p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 custom-scrollbar font-sans">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-5 border-b border-border gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-light text-gold text-[11px] font-extrabold uppercase tracking-wider border border-gold-border">
                      <CalendarCheck size={13} /> Appointment Details
                    </span>
                    {isPriority && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-maroon-light text-maroon text-[11px] font-extrabold uppercase tracking-wider border border-maroon-border">
                        <ShieldCheck size={13} /> {pClassLabel} Priority
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h2 className="font-serif text-[28px] sm:text-[36px] font-extrabold text-maroon m-0 leading-none tracking-tight">
                      {refId}
                    </h2>
                    <span className={`text-[12px] font-extrabold px-3 py-1 rounded-full border ${
                      isCompleted 
                        ? 'bg-success-light text-success border-success-border' 
                        : isCancelled
                        ? 'bg-danger-light text-danger border-danger-border'
                        : isPending
                        ? 'bg-gold-light text-gold border-gold-border'
                        : 'bg-blue-light text-blue border-blue-border'
                    }`}>
                      {isCompleted ? '✓ Completed' : isCancelled ? '✕ Cancelled' : isPending ? 'Waiting for Confirmation' : '● Confirmed'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setViewDetailsModal(null)} 
                  className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info Cards Grid (Student Info + Requested Document Details) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Student Details Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border">
                    <Users size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Student Information
                    </span>
                    <div className="text-[16px] font-bold text-text-main leading-snug truncate mb-2">
                      {name}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] text-text-main font-mono font-bold bg-surface px-2.5 py-1 rounded-lg border border-border">
                        ID: {studentId}
                      </span>
                      <span className={`text-[11.5px] font-bold capitalize px-2.5 py-1 rounded-lg border ${
                        isPriority 
                          ? 'bg-maroon-light text-maroon border-maroon-border font-extrabold' 
                          : 'bg-surface text-text-sub border-border'
                      }`}>
                        Priority: <span className="uppercase">{pClassLabel}</span>
                      </span>
                      {email && (
                        <span className="text-[12px] text-text-sub truncate max-w-64 font-medium flex items-center gap-1">
                          <Mail size={12} className="text-text-muted shrink-0" />
                          <span className="text-text-main truncate">{email}</span>
                        </span>
                      )}
                      {academicInfo && (
                        <span className="text-[12px] text-text-muted font-medium">
                          • {academicInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Requested Document Details Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-light text-gold flex items-center justify-center shrink-0 border border-gold-border">
                    <FileText size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Requested Document
                    </span>
                    <div className="text-[16px] font-bold text-text-main leading-snug mb-1.5">
                      {txType?.name || 'Document Transaction'}
                    </div>
                    <div className="text-[12px] text-text-sub flex items-center gap-1.5 font-medium mb-1">
                      <Calendar size={13} className="text-gold shrink-0" />
                      <span>
                        {formattedDate} • {timeFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue & Release Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Live Queue Ticket Status Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border">
                    <Ticket size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Live Queue Status
                    </span>
                    {queueTicket ? (
                      <>
                        <div className="text-[18px] font-extrabold text-maroon leading-tight">
                          {queueTicket.queue_number}
                        </div>
                        <span className="text-[12px] text-text-sub font-medium mt-1 inline-block capitalize">
                          Status: <strong className="text-text-main">{queueTicket.status === 'in_progress' ? 'Serving Now' : (queueTicket.status || 'Active').replace(/_/g, ' ')}</strong>
                          {queueTicket.current_step ? ` (Step ${queueTicket.current_step}/${queueTicket.total_steps || 3})` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-[15px] font-bold text-text-muted leading-tight">
                          Not Yet Activated
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Queue ticket activates upon student arrival
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Release Schedule Card */}
                <div className="p-5 sm:p-6 bg-white rounded-2xl border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-light text-blue flex items-center justify-center shrink-0 border border-blue-border">
                    <FolderOpen size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10.5px] text-text-muted uppercase font-extrabold tracking-wider block mb-1">
                      Release Schedule
                    </span>
                    {viewDetailsModal.release_date ? (
                      <>
                        <div className="text-[16px] font-bold text-blue leading-snug">
                          {new Date(viewDetailsModal.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Scheduled for student pickup
                        </span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <div className="text-[15px] font-bold text-success leading-snug">
                          Document Released
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Transaction fully completed
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-[15px] font-bold text-text-main leading-snug">
                          To Be Scheduled
                        </div>
                        <span className="text-[12px] text-text-muted font-medium mt-1 inline-block">
                          Set by staff upon document preparation
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Document Requirements & Student Remarks Banner */}
              {(requiredDocs.length > 0 || purposeText || mediaUrl) && (
                <div className="mb-5 p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-4">
                  {requiredDocs.length > 0 && (
                    <div>
                      <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList size={14} className="text-gold" /> Required Document Attachments
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {requiredDocs.map((doc, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/60 border border-border text-[12px] font-semibold text-text-main shadow-2xs"
                          >
                            <CheckCircle2 size={13} className="text-success shrink-0" />
                            <span>{typeof doc === 'string' ? doc : doc.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {purposeText && (
                    <div className={requiredDocs.length > 0 ? "pt-3.5 border-t border-border" : ""}>
                      <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Info size={14} className="text-maroon" /> Student Remarks / Purpose
                      </span>
                      <p className="text-[13px] text-text-main font-medium m-0 whitespace-pre-wrap leading-relaxed">
                        {purposeText}
                      </p>
                    </div>
                  )}

                  {mediaUrl && (
                    <div className={(requiredDocs.length > 0 || purposeText) ? "pt-3.5 border-t border-border" : ""}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-maroon" /> Attached Document Media
                        </span>
                        <a 
                          href={mediaUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] font-bold text-maroon hover:underline flex items-center gap-1"
                        >
                          Open Full Size <ExternalLink size={11} />
                        </a>
                      </div>
                      <a href={mediaUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-border max-h-56 bg-white shadow-2xs hover:opacity-95 transition-opacity">
                        <img src={mediaUrl} alt="Supporting Attachment" className="w-full h-full object-contain block max-h-56 bg-white" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Workflow Processing Steps Roadmap */}
              {processingSteps && processingSteps.length > 0 && (
                <div className="mb-5 p-5 bg-white rounded-2xl border border-border shadow-sm">
                  <h3 className="text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] flex items-center gap-1.5 m-0 mb-3">
                    <Clock size={14} className="text-maroon" /> Workflow Processing Steps
                  </h3>
                  <div className="space-y-2.5">
                    {processingSteps.map((step, idx) => {
                      const stepNumber = idx + 1
                      const stepName = typeof step === 'string' ? step : step.name || step.step_name || `Step ${stepNumber}`
                      const location = typeof step === 'object' ? step.location : null
                      const estMins = typeof step === 'object' && step.estimated_minutes ? `~${step.estimated_minutes} min` : null

                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-border hover:border-maroon-border transition-colors shadow-2xs gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-maroon text-white flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-2xs">
                              {stepNumber}
                            </div>
                            <span className="text-[13px] font-bold text-text-main truncate">
                              {stepName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {estMins && (
                              <span className="text-[11px] font-medium text-text-muted px-2 py-0.5 rounded-md bg-white border border-border">
                                {estMins}
                              </span>
                            )}
                            {location && (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border/40">
                                {location}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end">
                <button 
                  onClick={() => setViewDetailsModal(null)} 
                  className="px-6 py-2.5 rounded-xl bg-maroon text-white text-[13px] font-bold cursor-pointer hover:bg-maroon-dark transition-colors shadow-sm active:scale-98"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )
      })(), document.body)}

    </div>
  )
}
