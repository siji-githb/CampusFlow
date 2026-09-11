import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getTransactionTypes, getAvailableSlots, bookAppointment, getBookingConfig } from '../../services/appointmentService'
import { 
  CheckCircle, Check, Calendar, Users, CloudSun, Sun, Image as ImageIcon, FileText, 
  Clock, MapPin, HelpCircle, ChevronLeft, ChevronRight, Info, AlertTriangle, ChevronDown, Tag,
  Loader2, ClipboardList, Award, Bell
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
      {label && <label className="block text-[10.5px] sm:text-[11px] font-bold text-text-sub uppercase tracking-wider mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl border border-border sm:border-[1.5px] bg-white text-xs sm:text-[13px] font-sans text-left transition-all shadow-2xs cursor-pointer ${
          isOpen ? 'border-maroon ring-2 ring-maroon/10 shadow-xs' : 'border-border hover:border-maroon/40'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {icon && <span className="text-gold shrink-0">{icon}</span>}
          <span className={`truncate ${value ? 'font-semibold text-text-main' : 'text-text-muted'}`}>
            {displayLabel || placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`text-text-sub transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-maroon' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-xl border border-border shadow-lg p-1.5 z-50 animate-fade-up max-h-60 overflow-y-auto" style={{ animationDuration: '0.15s' }}>
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
                className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg cursor-pointer flex items-center justify-between text-xs sm:text-[13px] transition-colors ${
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
  const STEPS = [
    { label: 'Transaction', desc: 'Select documents' },
    { label: 'Date & Time', desc: 'Pick your slot' },
    { label: 'Confirm', desc: 'Review & appoint' },
  ]
  return (
    <>
      {/* Mobile Stepper Card */}
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-border/80 p-4 mb-5 md:hidden shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold tracking-widest text-gold uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Step {step} of 3
          </span>
          <span className="text-xs font-bold text-maroon font-serif">
            {STEPS[step - 1].label}
          </span>
        </div>
        {/* Segmented progress bar */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= num 
                  ? 'bg-linear-to-r from-maroon to-[#8B1E3F]' 
                  : 'bg-border/60'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-text-muted px-1">
          {STEPS.map((s, i) => {
            const num = i + 1
            const active = step === num
            const done = step > num
            return (
              <span 
                key={i} 
                className={`transition-colors flex items-center gap-1.5 ${
                  active ? 'text-maroon font-bold' : done ? 'text-text-main font-semibold' : 'text-text-muted'
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold transition-all ${
                  done 
                    ? 'bg-maroon text-white shadow-2xs' 
                    : active 
                      ? 'bg-maroon text-white shadow-[0_0_0_2px_rgba(123,26,42,0.2)]' 
                      : 'bg-off-white text-text-muted border border-border'
                }`}>
                  {done ? <Check size={10} strokeWidth={3} /> : num}
                </span>
                <span>{s.label}</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Desktop Vertical Stepper */}
      <div className="hidden md:block bg-linear-to-b from-white via-white to-off-white/40 rounded-2xl border border-border/80 p-4.5 sm:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
        {/* Ambient Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-maroon via-gold to-maroon opacity-85" />
        
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-border/60">
          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-maroon m-0">Current Progress</h3>
          <span className="shrink-0 whitespace-nowrap text-[9.5px] font-bold text-maroon bg-maroon-light py-0.5 px-2 rounded-full border border-maroon-border/40 shadow-2xs">
            Step {step} of 3
          </span>
        </div>

        <div className="flex flex-col gap-3.5 relative">
          {/* Background Track */}
          <div className="absolute left-3.5 top-3.5 bottom-3.5 w-0.5 bg-border/80 z-0" />
          {/* Active Track Overlay */}
          <div 
            className="absolute left-3.5 top-3.5 w-0.5 bg-linear-to-b from-maroon to-gold z-0 transition-all duration-500" 
            style={{ height: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />
          
          {STEPS.map((s, i) => {
            const num    = i + 1
            const active = step === num
            const done   = step > num
            return (
              <div key={i} className="flex items-center gap-3 relative z-10 group">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shrink-0 ${
                  done 
                    ? 'bg-maroon text-white shadow-xs ring-3 ring-maroon-light/60' 
                    : active 
                      ? 'bg-linear-to-br from-maroon to-[#5c0d18] text-white shadow-[0_2px_8px_rgba(123,26,42,0.3)] ring-3 ring-maroon/15 ring-offset-2 ring-offset-white' 
                      : 'bg-white border-2 border-border text-text-muted shadow-2xs'
                }`}>
                  {done ? <Check size={12} strokeWidth={3} className="text-white" /> : num}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[12.5px] block transition-colors leading-tight ${
                    active 
                      ? 'font-serif font-bold text-maroon' 
                      : done 
                        ? 'font-semibold text-text-main' 
                        : 'font-medium text-text-muted'
                  }`}>
                    {s.label}
                  </span>
                  <span className={`text-[10px] block mt-0.5 leading-tight ${
                    active 
                      ? 'text-gold-dark font-medium' 
                      : done 
                        ? 'text-emerald-600 font-semibold' 
                        : 'text-text-muted/70'
                  }`}>
                    {done ? 'Completed' : s.desc}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Main Component ──
export default function BookAppointment({ embedded = false }) {
  const { token, user } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]               = useState(1)
  const [types, setTypes]             = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
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

  // ── Dynamic booking info (semester/year, etc.) ──
  const [gwaSemester, setGwaSemester]     = useState('')
  const [gwaYearLevel, setGwaYearLevel]   = useState('')
  const [gwaSchoolYear, setGwaSchoolYear] = useState('')

  const [bookingConfig, setBookingConfig] = useState(null)
  const formTopRef = useRef(null)

  // Smoothly sync scroll to form top whenever step changes
  useEffect(() => {
    if (formTopRef.current) {
      const rect = formTopRef.current.getBoundingClientRect()
      if (rect.top < 60 || rect.top > 250) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [step])

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
  const needsSemester = selectedTypes.some(t => t?.config?.requires_semester);
  const needsYearLevel = selectedTypes.some(t => t?.config?.requires_year_level);
  const needsSchoolYear = selectedTypes.some(t => t?.config?.requires_school_year);
  const needsAcademicInfo = needsSemester || needsYearLevel || needsSchoolYear;
  
  const needsPurpose = selectedTypes.some(t => t?.config?.requires_purpose) || selectedTypes.length > 0;

  const allRequirements = useMemo(() => {
    const reqs = [];
    selectedTypes.forEach(t => {
      const docs = t.required_documents || t.config?.required_documents || [];
      docs.forEach(d => {
        if (d && !reqs.includes(d)) reqs.push(d);
      });
    });
    return reqs;
  }, [selectedTypes]);

  // Recent school years
  const currentCalYear = todayDate.getFullYear()
  const schoolYearBase  = todayDate.getMonth() >= 5 ? currentCalYear : currentCalYear - 1
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
          try { config = JSON.parse(parts[1]); } catch { /* ignore malformed JSON */ }
        }
        return {
          ...t,
          clean_description: parts[0],
          config
        };
      });

      // Position Completion Form - Request and Completion Form - Submission at the end/last
      const isCompletionForm = (name = '') => name.toLowerCase().includes('completion form');
      parsedTypes.sort((a, b) => {
        const isCompA = isCompletionForm(a.name);
        const isCompB = isCompletionForm(b.name);
        if (!isCompA && isCompB) return -1;
        if (isCompA && !isCompB) return 1;
        if (isCompA && isCompB) {
          const isSubA = a.name.toLowerCase().includes('submission');
          const isSubB = b.name.toLowerCase().includes('submission');
          if (!isSubA && isSubB) return -1;
          if (isSubA && !isSubB) return 1;
        }
        return 0;
      });

      setTypes(parsedTypes);
    }).catch(e => setError(e.message))
    getBookingConfig().then(setBookingConfig).catch(e => setError(e.message))
  }, [])

  const isStandaloneForm = (name = '') => {
    const n = name.toLowerCase()
    return n.includes('completion form')
  }

  const toggleTypeSelection = (t) => {
    setSelectedTypes(prev => {
      const exists = prev.some(item => item.id === t.id)
      if (exists) {
        return prev.filter(item => item.id !== t.id)
      } else {
        // Both Completion Form - Request and Submission cannot be appointed with other documents
        if (isStandaloneForm(t.name)) {
          return [t]
        }
        
        // If previous selection contained a Completion Form, replace it with the new document
        const hasStandalonePrev = prev.some(item => isStandaloneForm(item.name))
        if (hasStandalonePrev) {
          return [t]
        }

        return [...prev, t]
      }
    })
  }

  const handleDateSelect = async (dateStr) => {
    setSelectedDate(dateStr); setSelectedSlot(''); setSlotsData(null); setError('')
    setSlotsLoading(true)
    try { 
      const primaryId = selectedTypes[0]?.id || ''
      setSlotsData(await getAvailableSlots(primaryId, dateStr)) 
    }
    catch (e) { setError(e.message) }
    finally { setSlotsLoading(false) }
  }

  const handleConfirmClick = () => {
    setConfirmingBook(true)
  }

  const handleBook = async () => {
    if (selectedTypes.length === 0 || !selectedDate || !selectedSlot) return;
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
      
      if (purpose) {
        const purposeText = purpose === 'Other' ? purposeOther : purpose
        if (purposeText) {
          const purposeLine = `PURPOSE: ${purposeText}`
          finalNotes = finalNotes ? `${finalNotes}\n\n${purposeLine}` : purposeLine
        }
      }
      
      await bookAppointment(token, {
        transaction_type_ids: selectedTypes.map(t => t.id),
        transaction_type_id: selectedTypes[0]?.id,
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
    if (!t) return '';
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
  if (success) {
    const successView = (
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 text-center">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-border p-5 sm:p-8 md:p-10 max-w-md sm:max-w-lg w-full text-center shadow-lg animate-fade-up">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-success-light border-2 border-success-border flex items-center justify-center mx-auto mb-4 sm:mb-6 text-success shadow-2xs">
            <CheckCircle size={26} className="sm:w-7 sm:h-7" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-maroon m-0 mb-1.5">Appointment Confirmed!</h2>
          
          {/* Confirmed Schedule Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-light border border-gold-border/70 text-text-main text-xs sm:text-[13px] font-semibold my-3 sm:my-3.5">
            <Calendar size={13} className="text-gold shrink-0" />
            <span>{fmtDate(selectedDate)}</span>
            <span className="text-gold-dark font-bold">•</span>
            <span className="text-maroon font-bold">{fmt12h(selectedSlot)}</span>
          </div>

          {/* Requested Documents */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-off-white/80 border border-border text-left mb-3 sm:mb-3.5 shadow-2xs">
            <div className="mb-2 pb-2 border-b border-border/60">
              <span className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase flex items-center gap-1.5">
                <FileText size={12} className="text-maroon" />
                REQUESTED DOCUMENTS
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {selectedTypes.map((t, idx) => (
                <div key={t.id || idx} className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-white border border-border/70 text-xs sm:text-[13px] font-semibold text-text-main shadow-2xs">
                  <div className="w-5 h-5 rounded-md bg-maroon-light text-maroon flex items-center justify-center shrink-0">
                    <FileText size={11} />
                  </div>
                  <span className="leading-snug truncate">
                    {t.name ? t.name.replace(/([a-zA-Z])\(/g, '$1 (') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Requirements to Bring */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-off-white/80 border border-border text-left mb-5 sm:mb-6 shadow-2xs">
            <div className="mb-2 pb-2 border-b border-border/60">
              <span className="text-[10px] font-extrabold text-maroon tracking-widest uppercase flex items-center gap-1.5">
                <ClipboardList size={12} className="text-maroon" />
                REQUIREMENTS TO BRING
              </span>
            </div>

            {allRequirements.length > 0 ? (
              <div className="flex flex-col gap-2.5 mb-3">
                {allRequirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-text-main">
                    <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="font-medium text-text-main leading-snug">{req}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-start gap-2.5 text-xs sm:text-[13px] text-text-main">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    ✓
                  </div>
                  <span className="font-medium text-text-main leading-snug">Valid Student ID / Official School Registration Form</span>
                </div>
              </div>
            )}

            <div className="pt-2.5 border-t border-border/50 flex items-start gap-1.5 text-[11.5px] text-text-sub">
              <Info size={13} className="text-gold shrink-0 mt-0.5" />
              <span>Please bring these physical requirements and any payment receipts on your appointment date.</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:gap-2.5">
            <button 
              onClick={() => navigate('/student/appointments')} 
              className="p-2.5 sm:p-3.5 rounded-xl border-none bg-maroon text-white text-xs sm:text-sm font-bold cursor-pointer font-sans transition-all hover:bg-maroon-dark shadow-2xs"
            >
              View My Appointments
            </button>
            <button 
              onClick={() => navigate('/student/dashboard')} 
              className="p-2.5 sm:p-3.5 rounded-xl border border-border bg-white text-text-main text-xs sm:text-sm font-semibold cursor-pointer font-sans transition-colors hover:bg-off-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
    if (embedded) return successView;
    return <StudentLayout activeTab="book" mobileTitle="Appointment Booked" backTo="/student/dashboard">{successView}</StudentLayout>;
  }

  if (types.length === 0 && !error) {
    const skeleton = (
      <div className="flex-1 w-full max-w-2xl mx-auto md:max-w-none pt-5 sm:pt-6 md:pt-0 pb-36 sm:pb-28 md:pb-0 px-4.5 xs:px-5 sm:px-6 md:px-0 animate-pulse">
        <div className="hidden md:flex justify-between items-start mb-8">
          <div>
            <div className="h-3 w-24 bg-border/60 rounded mb-2" />
            <div className="h-7 w-48 bg-border/80 rounded mb-2" />
            <div className="h-3.5 w-64 bg-border/40 rounded" />
          </div>
          <div className="h-4 w-28 bg-border/40 rounded" />
        </div>
        <div className="md:flex md:gap-8 items-start">
          <div className="w-full md:w-64 lg:w-72 shrink-0 mb-6 md:mb-0">
            <div className="bg-white rounded-2xl border border-border p-6 h-64" />
          </div>
          <div className="flex-1 bg-white rounded-3xl border border-border p-6 md:p-8">
            <div className="h-5 w-44 bg-border/70 rounded mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-off-white h-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
    if (embedded) return skeleton;
    return <StudentLayout activeTab="book" mobileTitle="Book Appointment">{skeleton}</StudentLayout>;
  }

  const content = (
    <div className="flex-1 w-full max-w-2xl mx-auto md:max-w-none pt-5 sm:pt-6 md:pt-0 pb-36 sm:pb-28 md:pb-0 px-4.5 xs:px-5 sm:px-6 md:px-0 animate-fade-up">

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-start mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <div>
            <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">SCHEDULING</div>
            <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
              <Calendar className="text-maroon" size={24} /> Book Appointment
            </h1>
            <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
              Select one or multiple documents and schedule a single visit to the Registrar's Office.
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
          <div className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-24 md:self-start mb-4 md:mb-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <Stepper step={step} />
            
            <div className="hidden md:block mt-4 bg-linear-to-b from-white to-[#FAF9F6] rounded-2xl border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
              {/* Premium Top Ribbon */}
              <div className="h-1 w-full bg-linear-to-r from-maroon via-gold to-maroon" />

              {/* Card Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-white/70 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5.5 h-5.5 rounded-lg bg-gold/15 flex items-center justify-center text-gold-dark shrink-0 shadow-2xs">
                    <ClipboardList size={12} />
                  </div>
                  <p className="text-[10px] font-extrabold text-maroon tracking-widest uppercase m-0 truncate">Appointment Summary</p>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-3.5">
                {/* 1. Selected Documents section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${selectedTypes.length > 0 ? 'bg-maroon-light text-maroon' : 'bg-off-white text-text-muted'}`}>
                        <FileText size={11} />
                      </div>
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-sub">Selected Documents</span>
                    </div>
                  </div>

                  {selectedTypes.length > 0 ? (
                    <div className="flex flex-col gap-1 mt-1.5">
                      {selectedTypes.map((t, idx) => (
                        <div 
                          key={t.id || idx} 
                          className="flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-white border border-border/70 shadow-2xs hover:border-maroon/40 transition-all"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-maroon shrink-0 ring-2 ring-maroon/20" />
                          <span className="text-[11px] font-medium text-text-main truncate flex-1 leading-tight">
                            {t.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 py-2.5 px-3 rounded-lg bg-white/60 border border-dashed border-border text-center text-[10.5px] text-text-muted font-medium">
                      No documents selected yet
                    </div>
                  )}
                </div>

                {/* 2. Schedule Date & Time section */}
                <div className="pt-2.5 border-t border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${selectedSlot ? 'bg-maroon-light text-maroon' : 'bg-off-white text-text-muted'}`}>
                      <Calendar size={11} />
                    </div>
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-sub">Schedule Date &amp; Time</span>
                  </div>

                  {selectedSlot ? (
                    <div className="mt-1.5 p-2.5 rounded-xl bg-white border border-maroon/20 shadow-2xs flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold text-text-main m-0 flex items-center gap-1.5">
                            <span>{fmtDate(selectedDate)}</span>
                          </p>
                          <p className="text-[10.5px] font-bold text-maroon m-0 mt-0.5 flex items-center gap-1.5">
                            <Clock size={11} className="shrink-0 text-maroon/70" />
                            <span>{fmt12h(selectedSlot)}</span>
                          </p>
                        </div>
                        <span className="shrink-0 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Confirmed
                        </span>
                      </div>

                      {/* Purpose Display below time */}
                      {needsPurpose && (
                        <div className="pt-2 border-t border-border/60 flex items-center gap-1.5">
                          <Tag size={10.5} className="text-gold-dark shrink-0" />
                          <span className="text-[9.5px] font-bold text-text-muted uppercase tracking-wider shrink-0">Purpose:</span>
                          <span className={`text-[10.5px] truncate font-semibold ${purpose ? 'text-maroon' : 'text-text-muted italic'}`}>
                            {purpose === 'Other' ? (purposeOther || 'Other') : (purpose || 'Pending selection')}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 py-2.5 px-3 rounded-lg bg-white/60 border border-dashed border-border text-center text-[10.5px] text-text-muted font-medium flex items-center justify-center gap-1.5">
                      <Clock size={11} className="text-text-muted/60" />
                      <span>Pending slot selection</span>
                    </div>
                  )}
                </div>

                {/* 3. Priority lane badge if student has special priority */}
                {user?.priority_class && user.priority_class !== 'regular' && (
                  <div className="pt-1.5 border-t border-border/40">
                    <div className="py-1.5 px-2.5 rounded-lg bg-linear-to-r from-gold/15 to-amber-500/5 border border-gold/30 flex items-center gap-2 shadow-2xs">
                      <Award size={13} className="text-gold-dark shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-gold-dark m-0 leading-tight">Priority Lane Eligible</p>
                        <p className="text-[9px] text-text-sub m-0 capitalize truncate leading-tight mt-0.5">{user.priority_class} Priority</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Form Area ── */}
          <div ref={formTopRef} className="flex-1 md:min-w-0 md:bg-white md:p-8 md:rounded-3xl md:border md:border-border md:shadow-sm animate-fade-up scroll-mt-24" style={{ animationDelay: '0.15s' }}>

            {error && (
              <div className="py-2.5 px-3.5 rounded-xl bg-danger-light border border-danger-border text-danger text-xs sm:text-sm mb-4 font-medium flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ─── STEP 1: Select Documents ─── */}
            {step === 1 && (
              <div className="animate-fade-up pb-16 md:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                  <div>
                    <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-maroon m-0 mb-1 leading-snug">
                      Select Transaction Documents
                    </h1>
                    <p className="text-xs sm:text-sm text-text-sub m-0 leading-normal">
                      Select all the documents you need to request in this appointment.
                    </p>
                  </div>
                  {selectedTypes.length > 0 && (
                    <span className="self-start sm:self-auto text-xs font-bold text-maroon bg-maroon-light py-1 px-3 rounded-full border border-maroon-border/60">
                      {selectedTypes.length} Selected
                    </span>
                  )}
                </div>

                {types.length === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-full bg-white border border-border rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                        <div>
                          <div className="animate-pulse w-40 h-4.5 rounded bg-border mb-2.5" />
                          <div className="animate-pulse w-full h-3 rounded bg-border mb-1.5" />
                          <div className="animate-pulse w-4/5 h-3 rounded bg-border mb-3" />
                        </div>
                        <div className="pt-2.5 border-t border-border/40 flex gap-2">
                          <div className="animate-pulse w-20 h-5 rounded-lg bg-border" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  {types.map(t => {
                    const isSelected = selectedTypes.some(item => item.id === t.id);
                    const isStandalone = isStandaloneForm(t.name);
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => toggleTypeSelection(t)}
                        className={`group h-full text-left rounded-2xl p-4.5 sm:p-5.5 cursor-pointer transition-all duration-200 shadow-2xs flex flex-col justify-between select-none ${
                          isSelected 
                            ? 'bg-maroon-light/30 border-2 border-maroon ring-2 ring-maroon/20 shadow-md -translate-y-px' 
                            : 'bg-white border border-border sm:border-[1.5px] hover:border-maroon/60 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Top: Title, Checkbox & Description */}
                        <div className="flex-1 flex flex-col w-full">
                          <div className="flex items-start gap-3 sm:gap-3.5">
                            <div className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl flex items-center justify-center shrink-0 border transition-colors mt-0.5 ${
                              isSelected 
                                ? 'bg-maroon text-white border-maroon shadow-xs' 
                                : 'bg-maroon-light text-maroon border-maroon-border/40 group-hover:bg-maroon group-hover:text-white'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2.5">
                                <div>
                                  <h3 className={`font-serif text-sm sm:text-base font-bold m-0 leading-snug transition-colors ${
                                    isSelected ? 'text-maroon' : 'text-text-main group-hover:text-maroon'
                                  }`}>
                                    {t.name}
                                  </h3>
                                  {isStandalone && (
                                    <span className="text-[10px] sm:text-[10.5px] font-extrabold text-amber-800 bg-amber-50 py-1 px-2.5 rounded-md border border-amber-300/90 inline-flex items-center gap-1.5 mt-2 shadow-2xs">
                                      <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                      <span>Single document only</span>
                                    </span>
                                  )}
                                </div>
                                <div className={`w-5.5 h-5.5 rounded-full border-[1.75px] flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5 ${
                                  isSelected 
                                    ? 'bg-linear-to-br from-maroon via-maroon to-[#5C0D18] border-maroon text-white shadow-[0_2px_8px_rgba(123,26,42,0.35),0_0_0_2.5px_rgba(123,26,42,0.12)] scale-100' 
                                    : 'border-border-strong/70 bg-white group-hover:border-maroon/60 group-hover:bg-maroon-light/20 group-hover:scale-105 shadow-2xs'
                                }`}>
                                  {isSelected ? (
                                    <Check size={12} strokeWidth={3} className="text-white drop-shadow-xs animate-scale-in" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-maroon/30 transition-colors" />
                                  )}
                                </div>
                              </div>
                              <p className="text-xs sm:text-[13px] text-text-sub m-0 mt-2 leading-relaxed font-normal">
                                {t.clean_description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sticky/Bottom Bar for Step 1 */}
                {selectedTypes.length > 0 && (
                  <div className="mt-6 p-3.5 sm:p-4 rounded-2xl bg-maroon text-white flex items-center justify-between gap-3 sm:gap-4 shadow-lg animate-fade-up">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                        {selectedTypes.length}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold m-0 leading-tight">
                          {selectedTypes.length} {selectedTypes.length === 1 ? 'document' : 'documents'} selected
                        </p>
                        <p className="text-[11px] sm:text-xs text-white/80 m-0 leading-normal truncate block w-full mt-0.5" title={selectedTypes.map(t => t.name).join(', ')}>
                          {selectedTypes.map(t => t.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="shrink-0 whitespace-nowrap py-2.5 px-4 sm:px-6 rounded-xl bg-white text-maroon text-xs sm:text-sm font-bold cursor-pointer hover:bg-gold-light transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Proceed to Schedule</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── STEP 2: Select Date & Time ─── */}
            {step === 2 && selectedTypes.length > 0 && (
              <div className="animate-fade-up">
                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-maroon m-0 mb-1 leading-snug">
                  Select Date &amp; Time
                </h1>
                <p className="text-xs sm:text-sm text-text-sub m-0 mb-4 sm:mb-6 leading-normal">
                  Choose an available slot for your visit to the Registrar's Office.
                </p>

                {/* Selected Documents Multi-Pill Banner (Premium Executive Redesign) */}
                <div className="rounded-2xl border border-border/80 bg-linear-to-r from-white via-[#FCFAF8] to-white p-4 sm:p-4.5 mb-5 shadow-[0_4px_20px_-4px_rgba(123,26,42,0.06)] relative overflow-hidden">
                  {/* Subtle Top Accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-maroon via-gold to-maroon opacity-85" />
                  
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-maroon/10 flex items-center justify-center text-maroon shadow-2xs shrink-0">
                        <FileText size={12} strokeWidth={2.2} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-maroon">
                          Selected Documents
                        </span>
                        <span className="text-[9.5px] font-extrabold text-maroon bg-maroon-light py-0.5 px-2 rounded-full border border-maroon-border/40 shadow-2xs whitespace-nowrap">
                          {selectedTypes.length} {selectedTypes.length === 1 ? 'doc' : 'docs'}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => { setStep(1); setSelectedDate(''); setSelectedSlot(''); setSlotsData(null) }}
                      className="group flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-maroon text-maroon hover:text-white border border-maroon-border/60 hover:border-maroon shadow-2xs hover:shadow-xs transition-all duration-200 text-xs font-bold cursor-pointer shrink-0"
                    >
                      <span className="text-maroon group-hover:text-white transition-colors font-bold text-sm leading-none">+</span>
                      <span>Add / Change Documents</span>
                    </button>
                  </div>

                  {/* Document Chips */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/60">
                    {selectedTypes.map((t, idx) => (
                      <div 
                        key={t.id || idx} 
                        className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-white border border-border/80 shadow-2xs hover:border-maroon/40 hover:shadow-xs transition-all group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-maroon shrink-0 ring-2 ring-maroon/20 group-hover:scale-125 transition-transform" />
                        <span className="text-xs font-semibold text-text-main group-hover:text-maroon transition-colors leading-tight">
                          {t.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Academic Info selection */}
                {needsAcademicInfo && (
                  <div className="bg-white rounded-2xl border border-border sm:border-[1.5px] p-4 sm:p-6 mb-4 shadow-2xs">
                    <p className="text-xs font-bold text-text-main m-0 mb-0.5 uppercase tracking-wider">Required Academic Information</p>
                    <p className="text-[11px] sm:text-xs text-text-sub m-0 mb-3">Please provide academic details for your request.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
                <div className="bg-white rounded-2xl border border-border sm:border-[1.5px] p-3.5 sm:p-6 mb-4 shadow-2xs">
                  <CalendarWidget selectedDate={selectedDate} onDateSelect={handleDateSelect} minDateStr={minDate} maxDateStr={maxDate} dateOverrides={bookingConfig?.date_overrides || {}} />
                </div>

                {/* Slots skeleton */}
                {slotsLoading && (
                  <div className="bg-white rounded-2xl border border-border sm:border-[1.5px] p-4 sm:p-6 mb-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="animate-pulse h-4 w-32 rounded bg-border" />
                      <div className="animate-pulse h-3 w-20 rounded bg-border" />
                    </div>
                    <div className="mb-4">
                      <div className="animate-pulse h-3 w-16 rounded bg-border mb-2" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-10 rounded-xl bg-border/20" />)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Slots panel */}
                {slotsData && !slotsLoading && (
                  <div className="bg-white rounded-2xl border border-border sm:border-[1.5px] p-4 sm:p-6 mb-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h3 className="font-serif text-sm sm:text-base font-bold text-text-main m-0">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h3>
                      <span className="text-xs text-text-sub flex items-center gap-1">
                        {slotsData.daily_cap === 0 ? (
                          <span className="text-danger font-bold uppercase tracking-wider text-[10px] bg-danger-light py-0.5 px-2 rounded-full border border-danger-border">Date Blocked</span>
                        ) : (
                          <span className="bg-off-white py-0.5 px-2 rounded-full border border-border text-[11px] font-semibold flex items-center gap-1">
                            <Users size={12} className="text-gold" /> {slotsData.daily_cap - slotsData.total_booked} of {slotsData.daily_cap} available
                          </span>
                        )}
                      </span>
                    </div>

                    {slotsData.note && (
                      <div className={`p-3 sm:p-3.5 rounded-xl border mb-4 flex items-start gap-2.5 ${slotsData.daily_cap === 0 ? 'bg-danger-light border-danger-border text-danger' : 'bg-info-light border-info-border text-info'}`}>
                        {slotsData.daily_cap === 0 ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Info size={16} className="mt-0.5 shrink-0" />}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest m-0 mb-0.5">
                            {slotsData.daily_cap === 0 ? 'Date Blocked' : 'Important Notice'}
                          </p>
                          <p className="text-xs m-0 font-medium leading-relaxed">
                            {slotsData.note}
                          </p>
                        </div>
                      </div>
                    )}

                    {slotsData.slots.length === 0 && !slotsData.note && (
                      <div className="p-5 text-center text-text-sub text-xs sm:text-sm bg-off-white/50 rounded-xl border border-dashed border-border">
                        No available slots for this date.
                      </div>
                    )}

                    {morningSlots.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-text-sub m-0 mb-2 flex items-center gap-1.5">
                          <CloudSun size={14} className="text-gold" /> Morning Slots
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {morningSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                        </div>
                      </div>
                    )}

                    {afternoonSlots.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-text-sub m-0 mb-2 flex items-center gap-1.5">
                          <Sun size={14} className="text-gold" /> Afternoon Slots
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {afternoonSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                        </div>
                      </div>
                    )}

                    {/* Purpose of Request */}
                    {needsPurpose && (
                      <div className="border-t border-border pt-4 mt-2">
                        <p className="text-xs font-bold text-text-main m-0 mb-0.5">Purpose of Request</p>
                        <p className="text-[11px] text-text-sub m-0 mb-2.5">
                          Let us know what these documents will be used for.
                        </p>
                        <CustomSelect
                          value={purpose}
                          onChange={setPurpose}
                          placeholder="Select purpose of request…"
                          icon={<Tag size={13} />}
                          className="mb-2.5"
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
                            className="w-full py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl border border-border sm:border-[1.5px] bg-white text-xs sm:text-[13px] text-text-main font-sans focus:outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 shadow-2xs transition-all"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Nav buttons */}
                <div className="flex justify-between items-center gap-3 mt-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setStep(1); setSelectedDate(''); setSelectedSlot(''); setSlotsData(null); setGwaSemester(''); setGwaYearLevel(''); setGwaSchoolYear('') }}
                    className="py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl border border-maroon-border bg-white text-maroon text-xs sm:text-sm font-bold cursor-pointer font-sans hover:bg-maroon-light transition-colors shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!selectedSlot || (needsSemester && !gwaSemester) || (needsYearLevel && !gwaYearLevel) || (needsSchoolYear && !gwaSchoolYear) || (needsPurpose && (!purpose || (purpose === 'Other' && !purposeOther.trim())))}
                    className={`py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl border-none text-xs sm:text-sm font-bold font-sans transition-all shadow-2xs inline-flex items-center gap-1.5 ${
                      (selectedSlot && !(needsSemester && !gwaSemester) && !(needsYearLevel && !gwaYearLevel) && !(needsSchoolYear && !gwaSchoolYear) && !(needsPurpose && (!purpose || (purpose === 'Other' && !purposeOther.trim()))))
                        ? 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'
                        : 'bg-border text-text-muted cursor-not-allowed'
                    }`}
                  >
                    <span>Next: Review</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Review ─── */}
            {step === 3 && selectedTypes.length > 0 && (
              <div className="animate-fade-up">
                <div className="text-center mb-4 sm:mb-6">
                  <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-maroon m-0 mb-1 leading-snug">
                    Review Your Appointment
                  </h1>
                  <p className="text-xs sm:text-sm text-text-sub m-0">
                    Please verify your appointment details before appointing.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-border sm:border-[1.5px] overflow-hidden shadow-xs mb-4">
                  {/* Maroon accent top bar */}
                  <div className="h-1.25 bg-maroon" />

                  <div className="p-4 sm:p-6 md:p-7">
                    {/* 1. Transactions list */}
                    <div className="mb-4 pb-4 sm:mb-6 sm:pb-5 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase m-0">
                          REQUESTED DOCUMENTS ({selectedTypes.length})
                        </p>
                        <span className="text-[10.5px] sm:text-[11px] font-bold text-gold bg-gold-light py-0.5 px-2 rounded-full border border-gold-border inline-flex items-center gap-1">
                          ⚠ Make sure to bring requirements
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-3">
                        {selectedTypes.map((t, idx) => (
                          <div key={t.id || idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-off-white/60 border border-border">
                            <div className="w-8 h-8 rounded-lg bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border/40">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-serif text-sm sm:text-base font-bold text-text-main m-0 truncate">{t.name}</h4>
                              <p className="text-[11px] text-text-sub m-0 truncate">{t.clean_description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Requirements to Bring (Directly below Requested Documents) */}
                    <div className="mb-4 pb-4 sm:mb-6 sm:pb-5 border-b border-border">
                      <p className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase m-0 mb-2.5">
                        REQUIREMENTS TO BRING
                      </p>
                      {allRequirements.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {allRequirements.map((doc, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-text-main">
                              <div className="w-4 h-4 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                              <span>{doc}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-sub italic m-0">No physical requirements specified.</p>
                      )}
                    </div>

                    {/* 3. Schedule + Location */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 ${needsAcademicInfo || (needsPurpose && purpose) ? 'mb-4 pb-4 sm:mb-6 sm:pb-5 border-b border-border' : ''}`}>
                      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-border shadow-2xs">
                        <p className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase m-0 mb-2">SCHEDULE</p>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-text-main font-semibold mb-1">
                          <Calendar size={13} className="text-gold shrink-0" /> {fmtDate(selectedDate)}
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-maroon font-bold">
                          <Clock size={13} className="text-maroon shrink-0" /> {fmt12h(selectedSlot)}
                        </div>
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-border shadow-2xs">
                        <p className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase m-0 mb-2">LOCATION</p>
                        <div className="flex items-start gap-2 text-xs sm:text-sm text-text-main">
                          <MapPin size={15} className="text-gold mt-0.5 shrink-0" />
                          <div>
                            <div className="font-bold">Registrar's Office</div>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Academic request details */}
                    {needsAcademicInfo && (
                      <div className={`mb-4 pb-4 sm:mb-6 sm:pb-5 ${(needsPurpose && purpose) ? 'border-b border-border' : ''}`}>
                        <p className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase m-0 mb-2">ACADEMIC DETAILS</p>
                        <div className="flex flex-wrap gap-1.5">
                          {needsSemester && gwaSemester && <span className="text-xs font-semibold text-maroon bg-maroon-light py-0.5 px-2.5 rounded-full border border-maroon-border">{gwaSemester}</span>}
                          {needsYearLevel && gwaYearLevel && <span className="text-xs font-semibold text-maroon bg-maroon-light py-0.5 px-2.5 rounded-full border border-maroon-border">{gwaYearLevel}</span>}
                          {needsSchoolYear && gwaSchoolYear && <span className="text-xs font-semibold text-maroon bg-maroon-light py-0.5 px-2.5 rounded-full border border-maroon-border">S.Y. {gwaSchoolYear}</span>}
                        </div>
                      </div>
                    )}

                    {/* 5. Purpose of Request */}
                    {needsPurpose && purpose && (
                      <div>
                        <p className="text-[10px] font-extrabold text-text-muted tracking-widest uppercase m-0 mb-2">PURPOSE OF REQUEST</p>
                        <span className="text-xs sm:text-[13px] font-bold text-maroon bg-maroon-light py-0.5 px-2.5 rounded-full border border-maroon-border inline-block">
                          {purpose === 'Other' ? purposeOther : purpose}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email notice */}
                <div className="text-[11.5px] sm:text-xs text-text-muted mb-4 sm:mb-6 text-center flex items-center justify-center gap-1.5">
                  <Bell size={13} className="shrink-0" /> A confirmation notification will be sent to you shortly.
                </div>

                {/* Nav buttons */}
                <div className="flex justify-between items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className={`py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl border border-maroon-border bg-white text-maroon text-xs sm:text-sm font-bold font-sans shadow-2xs inline-flex items-center gap-1.5 ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-maroon-light'}`}
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button"
                    onClick={handleConfirmClick}
                    disabled={loading}
                    className={`py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl border-none text-xs sm:text-sm font-bold font-sans flex items-center gap-2 justify-center transition-all shadow-md ${
                      loading ? 'bg-maroon/70 text-white cursor-wait' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Appointing...</span>
                      </>
                    ) : (
                      'Confirm & Appoint'
                    )}
                  </button>
                </div>
              </div>
            )}

            {confirmingBook && createPortal((
              <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/60 transition-opacity duration-300 backdrop-blur-2xs" onClick={() => !loading && setConfirmingBook(false)} />
                <div className="animate-fade-up relative w-[92%] max-w-85 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl z-10">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gold-light text-gold flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                    <HelpCircle size={22} />
                  </div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-text-main m-0 mb-1.5">Confirm Appointment?</h3>
                  <p className="text-xs sm:text-[13px] text-text-sub m-0 mb-5 leading-relaxed">
                    Are you ready to confirm your appointment for <strong className="text-text-main">{selectedTypes.length} {selectedTypes.length === 1 ? 'document' : 'documents'}</strong> on <strong className="text-text-main">{fmtDate(selectedDate)}</strong> at <strong className="text-maroon">{fmt12h(selectedSlot)}</strong>?
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setConfirmingBook(false)}
                      disabled={loading}
                      className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl border border-border bg-white text-text-main text-xs sm:text-[13px] font-bold font-sans transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-off-white'}`}
                    >
                      Go Back
                    </button>
                    <button 
                      onClick={handleBook}
                      disabled={loading}
                      className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl border-none bg-maroon text-white text-xs sm:text-[13px] font-bold font-sans transition-all flex items-center justify-center gap-2 shadow-2xs ${loading ? 'opacity-85 cursor-wait' : 'hover:bg-maroon-dark cursor-pointer'}`}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Appointing...</span>
                        </>
                      ) : (
                        'Yes, Appoint'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ), document.body)}
          </div>
        </div>
      </div>
  );

  if (embedded) return content;
  return <StudentLayout activeTab="book" mobileTitle="Book Appointment">{content}</StudentLayout>;
}
