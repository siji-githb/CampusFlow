import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getTransactionTypes, getAvailableSlots, bookAppointment, uploadMedia, getBookingConfig } from '../../services/appointmentService'
import { CheckCircle, Calendar, Users, CloudSun, Sun, Image as ImageIcon, FileText, Clock, MapPin, Mail, HelpCircle, ChevronLeft, Info, AlertTriangle } from 'lucide-react'

// ── Status Styles ──
const STATUS_STYLES = {
  confirmed:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  completed:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  cancelled:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  pending:     { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  in_progress: { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  no_show:     { bg: '#F9F9F9', color: '#A8A29E', border: '#EAE7E2' },
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
    <div className="max-w-90 mx-auto">
      {/* Month header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-serif text-[20px] font-bold text-text-main m-0">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex gap-1">
          {[['‹', -1], ['›', 1]].map(([label, dir]) => (
            <button key={dir} type="button"
              onClick={() => setCurrentMonth(new Date(year, month + dir, 1))}
              className="w-8 h-8 rounded-lg border border-border bg-white cursor-pointer text-[18px] leading-none text-text-sub flex items-center justify-center font-serif transition-colors hover:bg-off-white"
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-[12px] font-semibold text-text-muted py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const t          = new Date(dateStr + 'T00:00:00').getTime()
          const dow        = new Date(dateStr + 'T00:00:00').getDay()
          const isDisabled = dow === 0 || dow === 6 || t < minD || t > maxD
          const isSelected = selectedDate === dateStr
          return (
            <button key={i} type="button" disabled={isDisabled}
              title={isDisabled ? "Outside booking window or unavailable" : ""}
              onClick={() => !isDisabled && onDateSelect(dateStr)}
              className={`aspect-square rounded-full border-none text-[13px] font-sans flex items-center justify-center transition-all duration-150 ${
                isSelected ? 'bg-maroon text-white font-bold' : 
                isDisabled ? 'bg-[#F5F5F5] text-text-sub font-normal opacity-50 cursor-not-allowed' : 
                'bg-transparent text-text-main font-normal cursor-pointer hover:bg-maroon-light hover:text-maroon'
              }`}
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
    <>
      {/* Mobile Horizontal Stepper */}
      <div className="flex items-center gap-0 mb-10 md:hidden">
        {STEPS.map((label, i) => {
          const num    = i + 1
          const active = step === num
          const done   = step > num
          return (
            <div key={i} className={`flex items-center ${i < 2 ? 'flex-1' : 'flex-none'}`}>
              <div className="flex flex-col items-center gap-1.5 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold z-10 transition-all duration-300 ${
                  done || active ? 'bg-maroon text-white shadow-[0_2px_8px_rgba(123,26,42,0.25)]' : 'bg-off-white border-[1.5px] border-border-strong text-text-muted'
                }`}>
                  {done ? '✓' : num}
                </div>
                <span className={`text-[11px] whitespace-nowrap transition-colors duration-300 ${
                  active ? 'font-bold text-maroon' : done ? 'font-medium text-text-main' : 'font-medium text-text-muted'
                }`}>{label}</span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mx-2 self-start mt-3.25 transition-colors duration-300 ${done ? 'bg-maroon' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop Vertical Stepper */}
      <div className="hidden md:block bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-[12px] font-bold text-text-main m-0 mb-6 uppercase tracking-wider">Booking Progress</h3>
        <div className="flex flex-col gap-6 relative">
          <div className="absolute left-3.25 top-3.5 bottom-3.5 w-0.5 bg-border z-0" />
          
          {STEPS.map((label, i) => {
            const num    = i + 1
            const active = step === num
            const done   = step > num
            return (
              <div key={i} className="flex items-center gap-4 relative z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${
                  active ? 'bg-maroon text-white shadow-[0_0_0_4px_rgba(123,26,42,0.1)]' : done ? 'bg-maroon text-white' : 'bg-white border-2 border-border text-text-muted'
                }`}>
                  {done ? '✓' : num}
                </div>
                <span className={`text-[14px] transition-colors duration-300 ${
                  active ? 'font-bold text-maroon' : done ? 'font-semibold text-text-main' : 'font-medium text-text-muted'
                }`}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── UPDATED: slot visual states ──
const isSlotPast = (slotTime, selectedDate) => {
  const today = new Date().toISOString().split('T')[0]
  if (selectedDate !== today) return false

  const [slotHour, slotMin] = slotTime.split(':').map(Number)
  const now = new Date()
  const bufferMinutes = 0

  const slotDate = new Date()
  slotDate.setHours(slotHour, slotMin, 0, 0)

  const cutoff = new Date(now.getTime() + bufferMinutes * 60000)
  return slotDate <= cutoff
}

function SlotBtn({ slot, selected, onSelect, selectedDate }) {
  const isPast = isSlotPast(slot.time_slot, selectedDate);
  const isFull = !slot.available;
  const isAvailable = !isPast && !isFull;

  let bgClass = 'bg-white';
  let textClass = 'text-text-main';
  let borderClass = 'border-border';
  let cursorClass = 'cursor-pointer';
  let opacityClass = 'opacity-100';
  let text = slot.display || slot.time_slot;

  if (selected) {
    bgClass = 'bg-maroon';
    textClass = 'text-white';
    borderClass = 'border-maroon';
  } else if (isPast) {
    bgClass = 'bg-off-white';
    textClass = 'text-text-muted';
    borderClass = 'border-border';
    opacityClass = 'opacity-40';
    cursorClass = 'cursor-not-allowed';
  } else if (isFull) {
    bgClass = 'bg-maroon-light';
    textClass = 'text-maroon';
    borderClass = 'border-maroon-light';
    opacityClass = 'opacity-100';
    cursorClass = 'cursor-not-allowed';
    text = 'Full';
  }

  return (
    <button
      type="button"
      onClick={() => isAvailable && onSelect(slot.time_slot)}
      className={`py-2.5 px-1.5 rounded-lg text-[12px] font-semibold font-sans border-[1.5px] border-solid transition-all duration-150 text-center ${bgClass} ${textClass} ${borderClass} ${cursorClass} ${opacityClass}`}
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

  // ── GWA-specific booking info (semester/year, not a document) ──
  const [gwaSemester, setGwaSemester]     = useState('')
  const [gwaYearLevel, setGwaYearLevel]   = useState('')
  const [gwaSchoolYear, setGwaSchoolYear] = useState('')

  const [bookingConfig, setBookingConfig] = useState(null)

  const todayDate  = new Date()
  const cutoffDays = bookingConfig?.booking_cutoff_days ?? 1
  const minDateObj = new Date(todayDate)
  minDateObj.setDate(minDateObj.getDate() + cutoffDays)
  const minDate    = minDateObj.toISOString().split('T')[0]
  
  const windowDays = bookingConfig?.booking_window_days ?? 30
  const maxDateObj = new Date(todayDate)
  maxDateObj.setDate(maxDateObj.getDate() + windowDays)
  const maxDate    = maxDateObj.toISOString().split('T')[0]

  // ── GWA is booking metadata, not a document — check by name ──
  const isGWA = selectedType?.name?.toLowerCase().includes('gwa')
    || selectedType?.name?.toLowerCase().includes('general weighted average')

  // Recent school years (GWA is always for an already-completed semester)
  const currentCalYear = todayDate.getFullYear()
  const schoolYearBase  = todayDate.getMonth() >= 5 ? currentCalYear : currentCalYear - 1 // PH school year starts ~June
  const schoolYearOptions = [0, 1, 2].map(offset => {
    const start = schoolYearBase - offset
    return `${start}-${start + 1}`
  })

  useEffect(() => {
    getTransactionTypes().then(setTypes).catch(e => setError(e.message))
    getBookingConfig().then(setBookingConfig).catch(e => setError(e.message))
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
      if (isGWA && gwaSemester && gwaYearLevel && gwaSchoolYear) {
        const gwaLine = `GWA_REQUEST: ${gwaSemester} | ${gwaYearLevel} | S.Y. ${gwaSchoolYear}`
        finalNotes = finalNotes ? `${gwaLine}\n\n${finalNotes}` : gwaLine
      }
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
    <StudentLayout activeTab="book" mobileTitle="Appointment Booked" backTo="/student/dashboard">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-[20px] border border-border py-12 px-10 max-w-110 w-full text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="w-18 h-18 rounded-full bg-success-light border-2 border-success-border flex items-center justify-center mx-auto mb-6 text-success">
          <CheckCircle size={28} />
        </div>
        <h2 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2">Appointment Confirmed!</h2>
        <p className="text-[15px] font-semibold text-text-main m-0 mb-1">{selectedType?.name}</p>
        <p className="text-[14px] text-text-sub m-0 mb-6 flex items-center justify-center gap-1.5">
          <Calendar size={14} /> {fmtDate(selectedDate)} at {selectedSlot}
        </p>
        <div className="bg-gold-light rounded-[10px] py-3.5 px-4 mb-6 border border-gold-border text-left">
          <p className="text-[13px] text-gold m-0 font-medium leading-normal">
            Please bring all required documents on your appointment date.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <button onClick={() => navigate('/student/appointments')} className="p-3.5 rounded-[10px] border-none bg-maroon text-white text-[14px] font-bold cursor-pointer font-sans transition-opacity hover:opacity-90">
            View My Appointments
          </button>
          <button onClick={() => navigate('/student/dashboard')} className="p-3.5 rounded-[10px] border-[1.5px] border-border bg-white text-text-main text-[14px] font-semibold cursor-pointer font-sans transition-colors hover:bg-off-white">
            Back to Dashboard
          </button>
        </div>
      </div>
      </div>
    </StudentLayout>
  )

  return (
    <StudentLayout activeTab="book" mobileTitle="Book Appointment" backTo="/student/dashboard">

      {/* ── Content ── */}
      <div className="w-full max-w-165 mx-auto pt-12 px-6 pb-20 box-border md:max-w-262.5 md:mx-0 md:pt-0 md:px-0">

        <div className="hidden md:flex justify-between items-start mb-8">
          <div>
            <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">SCHEDULING</div>
            <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
              <Calendar className="text-maroon" size={24} /> Book Appointment
            </h1>
            <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
              Schedule a visit with campus offices for your registrar needs.
            </p>
          </div>
          <div className="text-[13px] text-text-sub font-medium flex items-center gap-2 mt-2">
            <Link to="/student/dashboard" className="text-maroon hover:underline cursor-pointer">Home</Link>
            <span className="text-border-strong">›</span>
            <span>Book Appointment</span>
          </div>
        </div>

        <div className="md:flex md:gap-8 md:items-start">
          
          {/* ── Left Column: Tracker & Summary ── */}
          <div className="md:w-70 shrink-0 md:sticky md:top-24 mb-10 md:mb-0">
            <Stepper step={step} />
            
            <div className="hidden md:block mt-6 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="h-1 bg-maroon" />
              <div className="p-5">
                <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-4">Appointment Summary</p>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3 items-start">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${selectedType ? 'bg-maroon-light text-maroon' : 'bg-off-white text-border-strong'}`}>
                      <FileText size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] text-text-muted m-0 mb-0.5">Transaction</p>
                      <p className={`text-[13px] m-0 font-semibold leading-[1.4] ${selectedType ? 'text-text-main' : 'text-text-muted'}`}>
                        {selectedType ? selectedType.name : 'Not selected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${selectedSlot ? 'bg-maroon-light text-maroon' : 'bg-off-white text-border-strong'}`}>
                      <Calendar size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] text-text-muted m-0 mb-0.5">Date & Time</p>
                      <div className={`text-[13px] m-0 font-semibold leading-[1.4] ${selectedSlot ? 'text-text-main' : 'text-text-muted'}`}>
                        {selectedSlot ? (
                          <>
                            <span className="block">{fmtDate(selectedDate)}</span>
                            <span className="block mt-0.5 text-maroon">{fmt12h(selectedSlot)}</span>
                          </>
                        ) : 'Not selected'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Form Area ── */}
          <div className="flex-1 md:min-w-0 md:bg-white md:p-8 md:rounded-3xl md:border md:border-border md:shadow-sm">

        {error && (
          <div className="py-3 px-4 rounded-[10px] bg-danger-light border border-danger-border text-danger text-[13px] mb-6 font-medium">
            ⚠ {error}
          </div>
        )}

        {/* ─── STEP 1: Select Transaction Type ─── */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h1 className="font-serif text-[clamp(26px,5vw,34px)] font-bold text-maroon m-0 mb-2 leading-[1.15]">
              Select Transaction Type
            </h1>
            <p className="text-[14px] text-text-sub m-0 mb-8 leading-normal">
              What document do you need from the Registrar?
            </p>

            {types.length === 0 && (
              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white border-[1.5px] border-border rounded-xl py-5 px-6 flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="animate-pulse w-45 h-4.5 rounded bg-border mb-2" />
                      <div className="animate-pulse w-full h-3 rounded bg-border mb-1.5" />
                      <div className="animate-pulse w-[80%] h-3 rounded bg-border mb-4" />
                      <div className="flex gap-1.5">
                        <div className="animate-pulse w-16 h-4.5 rounded-full bg-border" />
                        <div className="animate-pulse w-20 h-4.5 rounded-full bg-border" />
                      </div>
                    </div>
                    <div className="animate-pulse w-5 h-5 rounded bg-border mt-0.5 md:hidden" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
              {types.map(t => (
                <button key={t.id} type="button"
                  onClick={() => { setSelectedType(t); setStep(2) }}
                  className="text-left bg-white border-[1.5px] border-border rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between items-start gap-3 hover:border-maroon hover:shadow-[0_4px_16px_rgba(123,26,42,0.08)] hover:-translate-y-0.5"
                >
                  <div className="w-full">
                    <div className="flex justify-between items-start w-full mb-1.5">
                      <h3 className="font-serif text-[16px] font-bold text-maroon m-0 pr-2">{t.name}</h3>
                      <span className="text-border-strong text-[18px] leading-none shrink-0 md:hidden">›</span>
                    </div>
                    <p className="text-[13px] text-text-sub m-0 mb-3.5 leading-normal">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.required_documents?.map((doc, j) => (
                        <span key={j} className="text-[11px] text-text-sub bg-off-white py-0.75 px-2.5 rounded-full border border-border font-medium">{doc}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Select Date & Time ─── */}
        {step === 2 && selectedType && (
          <div className="animate-fade-up">
            <h1 className="font-serif text-[clamp(26px,5vw,34px)] font-bold text-maroon m-0 mb-2 leading-[1.15]">
              Select Date &amp; Time
            </h1>
            <p className="text-[14px] text-text-sub m-0 mb-8 leading-normal">
              Choose an available slot for your visit to the Registrar's Office.
            </p>

            {/* GWA-specific: semester/year selection — booking info, not a document */}
            {isGWA && (
              <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
                <p className="text-[12px] font-bold text-text-main m-0 mb-1 uppercase tracking-wider">Which grades do you need averaged?</p>
                <p className="text-[12px] text-text-sub m-0 mb-4">Select the semester, year level, and school year for this GWA request.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-sub mb-1.5">Semester</label>
                    <select
                      value={gwaSemester}
                      onChange={e => setGwaSemester(e.target.value)}
                      className="w-full p-2.5 rounded-lg border-[1.5px] border-border bg-off-white text-[13px] text-text-main font-sans focus:outline-none focus:border-maroon-border"
                    >
                      <option value="">Select…</option>
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-sub mb-1.5">Year Level</label>
                    <select
                      value={gwaYearLevel}
                      onChange={e => setGwaYearLevel(e.target.value)}
                      className="w-full p-2.5 rounded-lg border-[1.5px] border-border bg-off-white text-[13px] text-text-main font-sans focus:outline-none focus:border-maroon-border"
                    >
                      <option value="">Select…</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-sub mb-1.5">School Year</label>
                    <select
                      value={gwaSchoolYear}
                      onChange={e => setGwaSchoolYear(e.target.value)}
                      className="w-full p-2.5 rounded-lg border-[1.5px] border-border bg-off-white text-[13px] text-text-main font-sans focus:outline-none focus:border-maroon-border"
                    >
                      <option value="">Select…</option>
                      {schoolYearOptions.map(sy => (
                        <option key={sy} value={sy}>{sy}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar card */}
            <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
              <CalendarWidget selectedDate={selectedDate} onDateSelect={handleDateSelect} minDateStr={minDate} maxDateStr={maxDate} />
            </div>

            {/* Slots skeleton */}
            {slotsLoading && (
              <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="animate-pulse h-4.5 w-35 rounded bg-border" />
                  <div className="animate-pulse h-3.5 w-25 rounded bg-border" />
                </div>
                <div className="mb-5">
                  <div className="animate-pulse h-3.5 w-20 rounded bg-border mb-2.5" />
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-10 rounded-lg border-[1.5px] border-border bg-border/20" />)}
                  </div>
                </div>
                <div>
                  <div className="animate-pulse h-3.5 w-22.5 rounded bg-border mb-2.5" />
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-10 rounded-lg border-[1.5px] border-border bg-border/20" />)}
                  </div>
                </div>
              </div>
            )}

            {/* Slots panel */}
            {slotsData && !slotsLoading && (
              <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-serif text-[17px] font-bold text-text-main m-0">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className="text-[12px] text-text-sub flex items-center gap-1">
                    {slotsData.daily_cap === 0 ? (
                      <span className="text-danger font-bold uppercase tracking-wider text-[10px]">Date Blocked</span>
                    ) : (
                      <><Users size={14} /> {slotsData.daily_cap - slotsData.total_booked} of {slotsData.daily_cap} available</>
                    )}
                  </span>
                </div>

                {slotsData.note && (
                  <div className={`p-4 rounded-xl border mb-5 flex items-start gap-3 ${slotsData.daily_cap === 0 ? 'bg-danger-light border-danger-border text-danger' : 'bg-info-light border-info-border text-info'}`}>
                    {slotsData.daily_cap === 0 ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <Info size={18} className="mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-widest m-0 mb-1">
                        {slotsData.daily_cap === 0 ? 'Date Blocked' : 'Important Notice'}
                      </p>
                      <p className="text-[13px] m-0 font-medium leading-relaxed">
                        {slotsData.note}
                      </p>
                    </div>
                  </div>
                )}

                {slotsData.slots.length === 0 && !slotsData.note && (
                  <div className="p-6 text-center text-text-sub text-[14px]">
                    No available slots for this date.
                  </div>
                )}

                {morningSlots.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[12px] font-semibold text-text-sub m-0 mb-2.5 flex items-center gap-1.5">
                      <CloudSun size={14} className="text-gold" /> Morning
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {morningSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                    </div>
                  </div>
                )}

                {afternoonSlots.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[12px] font-semibold text-text-sub m-0 mb-2.5 flex items-center gap-1.5">
                      <Sun size={14} className="text-gold" /> Afternoon
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {afternoonSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                    </div>
                  </div>
                )}

                {/* Notes & Media Upload */}
                <div className="border-t border-border pt-5 mt-2.5">
                  <p className="text-[12px] font-bold text-text-main m-0 mb-3">Additional Notes & Media (Optional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
                    <textarea 
                      placeholder="Add any urgent requests here or upload... "
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full min-h-20 p-3 rounded-[10px] border-[1.5px] border-border bg-off-white text-[13px] text-text-main font-sans resize-y focus:outline-none focus:border-maroon-border"
                    />
                    <div className="border-[1.5px] border-dashed border-border-strong rounded-[10px] flex flex-col items-center justify-center p-4 text-center bg-white cursor-pointer relative hover:bg-off-white transition-colors">
                      <span className="text-text-muted mb-1"><ImageIcon size={24} /></span>
                      <span className="text-[11px] text-text-sub font-medium">
                        {selectedFile ? selectedFile.name : 'Upload PNG or JPG'}
                      </span>
                      <input 
                        type="file" 
                        accept=".png, .jpg, .jpeg"
                        onChange={e => {
                          if(e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0])
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between items-center mt-2">
              <button type="button"
                onClick={() => { setStep(1); setSelectedType(null); setSelectedDate(''); setSelectedSlot(''); setSlotsData(null); setGwaSemester(''); setGwaYearLevel(''); setGwaSchoolYear('') }}
                className="py-3 px-4 md:px-7 rounded-[10px] border-[1.5px] border-maroon-border bg-white text-maroon text-[14px] font-semibold cursor-pointer font-sans hover:bg-maroon-light transition-colors">
                Back
              </button>
              <button type="button"
                onClick={() => setStep(3)}
                disabled={!selectedSlot || (isGWA && (!gwaSemester || !gwaYearLevel || !gwaSchoolYear))}
                className={`py-3 px-4 md:px-7 rounded-[10px] border-none text-[14px] font-bold font-sans transition-all duration-200 ${
                  (selectedSlot && !(isGWA && (!gwaSemester || !gwaYearLevel || !gwaSchoolYear))) ? 'bg-maroon text-white cursor-pointer hover:opacity-90' : 'bg-border-strong text-white cursor-not-allowed'
                }`}>
                Next: Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Review ─── */}
        {step === 3 && selectedType && (
          <div className="animate-fade-up">
            <div className="text-center mb-8">
              <h1 className="font-serif text-[clamp(26px,5vw,34px)] font-bold text-maroon m-0 mb-2 leading-[1.15]">
                Review Your Appointment
              </h1>
              <p className="text-[14px] text-text-sub m-0">
                Please verify your details before confirming your visit to the Registrar's Office.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-2xl border-[1.5px] border-border overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] mb-4">
              {/* Maroon accent top bar */}
              <div className="h-1.25 bg-maroon" />

              <div className="p-7">
                {/* Transaction header */}
                <div className="mb-6 pb-5 border-b border-border">
                  <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2">TRANSACTION</p>
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-[10px] bg-maroon-mid text-maroon flex items-center justify-center shrink-0"><FileText size={20} /></div>
                    <div>
                      <h3 className="font-serif text-[18px] font-bold text-text-main m-0 mb-1.5">{selectedType.name}</h3>
                      <span className="text-[11px] font-semibold text-gold bg-gold-light py-0.75 px-2.5 rounded-full border border-gold-border inline-flex items-center gap-1">
                        ⚠ Requires physical documents
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schedule + Location */}
                <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 mb-6 pb-5 border-b border-border">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5">SCHEDULE</p>
                    <div className="flex items-center gap-2 text-[14px] text-text-main mb-1.5">
                      <Calendar size={14} className="text-gold" /> {fmtDate(selectedDate)}
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-text-main">
                      <Clock size={14} className="text-gold" /> {fmt12h(selectedSlot)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5">LOCATION</p>
                    <div className="flex items-start gap-2 text-[14px] text-text-main">
                      <MapPin size={16} className="text-gold mt-0.5" />
                      <div>
                        <div className="font-semibold">
                          Registrar's Office
                        </div>
                        <div className="text-[12px] text-text-sub mt-0.5">CRMC Upper Pandan Campus</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GWA request details */}
                {isGWA && gwaSemester && gwaYearLevel && gwaSchoolYear && (
                  <div className="mb-6 pb-5 border-b border-border">
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5">GWA REQUEST FOR</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[12px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border">{gwaSemester}</span>
                      <span className="text-[12px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border">{gwaYearLevel}</span>
                      <span className="text-[12px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border">S.Y. {gwaSchoolYear}</span>
                    </div>
                  </div>
                )}

                {/* Notes & Media */}
                {(notes || selectedFile) && (
                  <div className="mb-6 pb-5 border-b border-border">
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5">NOTES & MEDIA</p>
                    {notes && <div className={`text-[14px] text-text-main whitespace-pre-wrap ${selectedFile ? 'mb-2' : 'mb-0'}`}>{notes}</div>}
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-[13px] text-text-sub bg-off-white py-2 px-3 rounded-lg border border-border w-fit">
                        <ImageIcon size={14} /> {selectedFile.name}
                      </div>
                    )}
                  </div>
                )}

                {/* Requirements */}
                <div>
                  <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3">REQUIREMENTS TO BRING</p>
                  <div className="flex flex-col gap-2">
                    {selectedType.required_documents?.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-[14px] text-text-main">
                        <div className="w-4.5 h-4.5 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Email notice */}
            <div className="text-[12px] text-text-muted mb-6 text-center flex items-center justify-center gap-1.5">
              <Mail size={14} /> A confirmation email will be sent to your student email upon appointing.
            </div>

            {/* Nav buttons */}
            <div className="flex justify-between items-center">
              <button type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className={`py-3 px-4 md:px-7 rounded-[10px] border-[1.5px] border-maroon-border bg-white text-maroon text-[14px] font-semibold font-sans ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-maroon-light'}`}>
                Back
              </button>
              <button type="button"
                onClick={handleConfirmClick}
                disabled={loading || isUploading}
                className={`py-3 px-4 md:px-7 rounded-[10px] border-none text-[14px] font-bold font-sans flex items-center gap-2 min-w-0 md:min-w-35 justify-center transition-all duration-200 shadow-[0_4px_12px_rgba(123,26,42,0.15)] ${
                  (loading || isUploading) ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:opacity-90'
                }`}>
                {isUploading ? 'Uploading Media...' : loading ? 'Appointing...' : 'Confirm & Appoint'}
              </button>
            </div>
          </div>
        )}

        {confirmingBook && (
          <div className="fixed inset-0 z-1000 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setConfirmingBook(false)} />
            <div className="animate-fade-up relative w-[90%] max-w-[320px] bg-white rounded-[20px] p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
              <div className="w-12 h-12 rounded-full bg-gold-light text-gold flex items-center justify-center mx-auto mb-4">
                <HelpCircle size={24} />
              </div>
              <h3 className="font-serif text-[18px] font-bold text-text-main m-0 mb-2">Confirm Appointment?</h3>
              <p className="text-[13px] text-text-sub m-0 mb-6 leading-[1.4]">
                Are you ready to confirm your appointment for <strong className="text-text-main">{fmtDate(selectedDate)}</strong> at <strong className="text-text-main">{fmt12h(selectedSlot)}</strong>?
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmingBook(false)}
                  disabled={loading}
                  className={`flex-1 p-2.5 rounded-[10px] border border-border bg-white text-text-main text-[13px] font-semibold cursor-pointer font-sans transition-colors hover:bg-off-white ${loading ? 'opacity-50' : 'opacity-100'}`}
                >
                  Go Back
                </button>
                <button 
                  onClick={handleBook}
                  disabled={loading}
                  className={`flex-1 p-2.5 rounded-[10px] border-none bg-maroon text-white text-[13px] font-semibold cursor-pointer font-sans transition-colors hover:bg-maroon-dark ${loading ? 'opacity-50' : 'opacity-100'}`}
                >
                  {loading ? 'Appointing...' : 'Yes, Appoint'}
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}