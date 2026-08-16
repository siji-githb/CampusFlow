import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getTransactionTypes, getAvailableSlots, bookAppointment, getBookingConfig } from '../../services/appointmentService'
import { 
  CheckCircle, Calendar, Users, CloudSun, Sun, Image as ImageIcon, FileText, 
  Clock, MapPin, Mail, HelpCircle, ChevronLeft, Info, AlertTriangle, ChevronDown, Tag, GraduationCap 
} from 'lucide-react'

// ── Custom Dropdown Component ──
const CustomSelect = ({ label, value, onChange, options, placeholder = 'Select…', icon, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedOption = options.find(o => (typeof o === 'object' ? o.value === value : o === value))
  const displayLabel = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) : ''

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-[11px] font-bold text-text-sub uppercase tracking-wider mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl border-[1.5px] bg-white text-[13px] font-sans text-left transition-all shadow-[0_2px_8px_rgba(0,0,0,0.03)] cursor-pointer ${
          isOpen ? 'border-maroon ring-2 ring-maroon/10 shadow-[0_4px_12px_rgba(123,26,42,0.08)]' : 'border-border hover:border-maroon/40'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {icon && <span className="text-gold shrink-0">{icon}</span>}
          <span className={`truncate ${value ? 'font-semibold text-text-main' : 'text-text-muted'}`}>
            {displayLabel || placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-text-sub transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-maroon' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-xl border border-border shadow-[0_10px_30px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-fade-up max-h-60 overflow-y-auto" style={{ animationDuration: '0.15s' }}>
          {options.map((opt, i) => {
            const optVal = typeof opt === 'object' ? opt.value : opt
            const optLabel = typeof opt === 'object' ? opt.label : opt
            const isSelected = value === optVal

            return (
              <div
                key={i}
                onClick={() => {
                  onChange(optVal)
                  setIsOpen(false)
                }}
                className={`py-2 px-3 rounded-lg cursor-pointer flex items-center justify-between text-[13px] transition-colors ${
                  isSelected ? 'bg-maroon-light text-maroon font-bold' : 'text-text-main hover:bg-off-white font-medium'
                }`}
              >
                <span>{optLabel}</span>
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-maroon shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Status Styles ──
const STATUS_STYLES = {
  confirmed:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  completed:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  cancelled:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  pending:     { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  in_progress: { bg: '#FDF6E3', color: '#B8900A', border: '#FDE68A' },
  no_show:     { bg: '#F9F9F9', color: '#A8A29E', border: '#EAE7E2' },
}

import { CalendarWidget, SlotBtn } from '../../components/CalendarWidget'

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
  
  const [purpose, setPurpose]           = useState('')
  const [purposeOther, setPurposeOther] = useState('')

  // ── GWA-specific booking info (semester/year, not a document) ──
  const [gwaSemester, setGwaSemester]     = useState('')
  const [gwaYearLevel, setGwaYearLevel]   = useState('')
  const [gwaSchoolYear, setGwaSchoolYear] = useState('')

  const [bookingConfig, setBookingConfig] = useState(null)

  const todayDate  = new Date()
  
  const fmtLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const cutoffDays = bookingConfig?.booking_cutoff_days ?? 1
  const minDateObj = new Date(todayDate)
  minDateObj.setDate(minDateObj.getDate() + cutoffDays)
  const minDate    = fmtLocal(minDateObj)
  
  const windowDays = bookingConfig?.booking_window_days ?? 30
  const maxDateObj = new Date(todayDate)
  maxDateObj.setDate(maxDateObj.getDate() + windowDays)
  const maxDate    = fmtLocal(maxDateObj)

  // ── Dynamic Configuration Checks ──
  const needsSemester = selectedType?.config?.requires_semester;
  const needsYearLevel = selectedType?.config?.requires_year_level;
  const needsSchoolYear = selectedType?.config?.requires_school_year;
  const needsAcademicInfo = needsSemester || needsYearLevel || needsSchoolYear;
  
  const needsPurpose = selectedType?.config?.requires_purpose;

  // Recent school years (GWA is always for an already-completed semester)
  const currentCalYear = todayDate.getFullYear()
  const schoolYearBase  = todayDate.getMonth() >= 5 ? currentCalYear : currentCalYear - 1 // PH school year starts ~June
  const schoolYearOptions = [0, 1, 2].map(offset => {
    const start = schoolYearBase - offset
    return `${start}-${start + 1}`
  })

  useEffect(() => {
    getTransactionTypes().then(data => {
      const parsedTypes = data.map(t => {
        const parts = (t.description || '').split('|||');
        let config = {};
        if (parts.length > 1) {
          try { config = JSON.parse(parts[1]); } catch (e) {}
        }
        return {
          ...t,
          clean_description: parts[0],
          config
        };
      });
      setTypes(parsedTypes);
    }).catch(e => setError(e.message))
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
    setLoading(true); setError('');
    try {
      let finalNotes = ''
      const parts = []
      
      if (needsSemester && gwaSemester) parts.push(`Sem: ${gwaSemester}`)
      if (needsYearLevel && gwaYearLevel) parts.push(`Yr: ${gwaYearLevel}`)
      if (needsSchoolYear && gwaSchoolYear) parts.push(`S.Y.: ${gwaSchoolYear}`)
      
      if (parts.length > 0) {
        finalNotes = `ACADEMIC INFO: ${parts.join(' | ')}`
      }
      
      if (needsPurpose && purpose) {
        const purposeText = purpose === 'Other' ? purposeOther : purpose
        const purposeLine = `PURPOSE: ${purposeText}`
        finalNotes = finalNotes ? `${finalNotes}\n\n${purposeLine}` : purposeLine
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
      setConfirmingBook(false);
    }
  }

  // 24h format from backend e.g. '08:00', '13:30'
  const morningSlots = useMemo(() => {
    return slotsData?.slots.filter(s => {
      const h = parseInt(s.time_slot.split(':')[0], 10)
      return h < 12
    }) || []
  }, [slotsData])

  const afternoonSlots = useMemo(() => {
    return slotsData?.slots.filter(s => {
      const h = parseInt(s.time_slot.split(':')[0], 10)
      return h >= 12
    }) || []
  }, [slotsData])

  // Format '08:00' → '8:00 AM', '13:00' → '1:00 PM'
  const fmt12h = (t) => {
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }

  const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

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
          <Calendar size={14} /> {fmtDate(selectedDate)} at {fmt12h(selectedSlot)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-full bg-white border-[1.5px] border-border rounded-2xl p-5.5 flex flex-col justify-between">
                    <div>
                      <div className="animate-pulse w-48 h-5 rounded bg-border mb-3" />
                      <div className="animate-pulse w-full h-3.5 rounded bg-border mb-2" />
                      <div className="animate-pulse w-4/5 h-3.5 rounded bg-border mb-4" />
                    </div>
                    <div className="pt-3 border-t border-border/40 flex gap-2">
                      <div className="animate-pulse w-24 h-5.5 rounded-lg bg-border" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {types.map(t => {
                const reqDocs = t.required_documents || t.config?.required_documents || [];
                return (
                  <button 
                    key={t.id} 
                    type="button"
                    onClick={() => { setSelectedType(t); setStep(2) }}
                    className="group h-full text-left bg-white border-[1.5px] border-border rounded-2xl p-5.5 cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-maroon hover:shadow-[0_8px_24px_rgba(123,26,42,0.09)] hover:-translate-y-0.5"
                  >
                    {/* Top: Title & Description */}
                    <div className="flex-1 flex flex-col w-full mb-4">
                      <div className="flex justify-between items-start w-full gap-2 mb-2">
                        <h3 className="font-serif text-[16px] font-bold text-maroon m-0 leading-snug group-hover:text-maroon-dark transition-colors">
                          {t.name}
                        </h3>
                        <span className="text-text-muted text-[16px] leading-none shrink-0 group-hover:text-maroon group-hover:translate-x-0.5 transition-all">›</span>
                      </div>
                      <p className="text-[13px] text-text-sub m-0 leading-relaxed">
                        {t.clean_description}
                      </p>
                    </div>

                    {/* Bottom: Requirements Badges (Pinned to bottom baseline) */}
                    <div className="w-full pt-3.5 border-t border-border/40 mt-auto flex flex-wrap gap-1.5 items-center">
                      {reqDocs.length > 0 ? (
                        reqDocs.map((doc, j) => (
                          <span key={j} className="text-[11px] text-text-sub bg-off-white py-1 px-2.5 rounded-lg border border-border font-medium">
                            {doc}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-text-muted italic py-0.5">
                          No physical requirements
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
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

            {/* Dynamic Academic Info selection */}
            {needsAcademicInfo && (
              <div className="bg-white rounded-2xl border-[1.5px] border-border p-6 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <p className="text-[12px] font-bold text-text-main m-0 mb-1 uppercase tracking-wider">Required Academic Information</p>
                <p className="text-[12px] text-text-sub m-0 mb-4">Please provide the following academic details for your request.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {needsSemester && (
                    <CustomSelect
                      label="Semester"
                      value={gwaSemester}
                      onChange={setGwaSemester}
                      placeholder="Select Semester…"
                      options={['1st Semester', '2nd Semester', 'Summer']}
                    />
                  )}
                  {needsYearLevel && (
                    <CustomSelect
                      label="Year Level"
                      value={gwaYearLevel}
                      onChange={setGwaYearLevel}
                      placeholder="Select Year Level…"
                      options={['1st Year', '2nd Year', '3rd Year', '4th Year']}
                    />
                  )}
                  {needsSchoolYear && (
                    <CustomSelect
                      label="School Year"
                      value={gwaSchoolYear}
                      onChange={setGwaSchoolYear}
                      placeholder="Select S.Y.…"
                      options={schoolYearOptions}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Calendar card */}
            <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
              <CalendarWidget selectedDate={selectedDate} onDateSelect={handleDateSelect} minDateStr={minDate} maxDateStr={maxDate} dateOverrides={bookingConfig?.date_overrides || {}} />
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

                {/* Purpose of Request */}
                {needsPurpose && (
                  <div className="border-t border-border pt-5 mt-2.5">
                    <p className="text-[12px] font-bold text-text-main m-0 mb-1">Purpose of Request</p>
                    <p className="text-[11px] text-text-sub m-0 mb-3">
                      Let us know what this document will be used for.
                    </p>
                    <CustomSelect
                      value={purpose}
                      onChange={setPurpose}
                      placeholder="Select purpose of request…"
                      icon={<Tag size={14} />}
                      className="mb-3"
                      options={[
                        { value: 'Employment', label: 'Employment' },
                        { value: 'Scholarship', label: 'Scholarship' },
                        { value: 'Board Exam Application', label: 'Board Exam Application' },
                        { value: 'Other', label: 'Other' },
                      ]}
                    />
                    {purpose === 'Other' && (
                      <input
                        type="text"
                        value={purposeOther}
                        onChange={e => setPurposeOther(e.target.value)}
                        placeholder="Please specify your purpose…"
                        className="w-full py-2.5 px-3.5 rounded-xl border-[1.5px] border-border bg-white text-[13px] text-text-main font-sans focus:outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all"
                      />
                    )}
                  </div>
                )}
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
                disabled={!selectedSlot || (needsSemester && !gwaSemester) || (needsYearLevel && !gwaYearLevel) || (needsSchoolYear && !gwaSchoolYear) || (needsPurpose && (!purpose || (purpose === 'Other' && !purposeOther.trim())))}
                className={`py-3 px-4 md:px-7 rounded-[10px] border-none text-[14px] font-bold font-sans transition-all duration-200 ${
                  (selectedSlot && !(needsSemester && !gwaSemester) && !(needsYearLevel && !gwaYearLevel) && !(needsSchoolYear && !gwaSchoolYear) && !(needsPurpose && (!purpose || (purpose === 'Other' && !purposeOther.trim())))) ? 'bg-maroon text-white cursor-pointer hover:opacity-90' : 'bg-border text-text-muted cursor-not-allowed'
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

                {/* Academic request details */}
                {needsAcademicInfo && (
                  <div className="mb-6 pb-5 border-b border-border">
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5">ACADEMIC DETAILS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {needsSemester && gwaSemester && <span className="text-[12px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border">{gwaSemester}</span>}
                      {needsYearLevel && gwaYearLevel && <span className="text-[12px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border">{gwaYearLevel}</span>}
                      {needsSchoolYear && gwaSchoolYear && <span className="text-[12px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border">S.Y. {gwaSchoolYear}</span>}
                    </div>
                  </div>
                )}

                {/* Purpose of Request */}
                {needsPurpose && purpose && (
                  <div className="mb-6 pb-5 border-b border-border">
                    <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5">PURPOSE OF REQUEST</p>
                    <span className="text-[13px] font-semibold text-maroon bg-maroon-light py-1 px-2.5 rounded-full border border-maroon-border inline-block">
                      {purpose === 'Other' ? purposeOther : purpose}
                    </span>
                  </div>
                )}

                {/* Requirements */}
                <div>
                  <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3">REQUIREMENTS TO BRING</p>
                  <div className="flex flex-col gap-2">
                    {(selectedType.config?.required_documents || selectedType.required_documents || []).map((doc, i) => (
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
                disabled={loading}
                className={`py-3 px-4 md:px-7 rounded-[10px] border-none text-[14px] font-bold font-sans flex items-center gap-2 min-w-0 md:min-w-35 justify-center transition-all duration-200 shadow-[0_4px_12px_rgba(123,26,42,0.15)] ${
                  loading ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:opacity-90'
                }`}>
                {loading ? 'Appointing...' : 'Confirm & Appoint'}
              </button>
            </div>
          </div>
        )}

        {confirmingBook && (
          <div className="fixed inset-0 z-1000 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" onClick={() => !loading && setConfirmingBook(false)} />
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