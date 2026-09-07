import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  X, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Ticket, 
  Loader2, 
  Circle, 
  CircleDot, 
  Clock, 
  Calendar, 
  FileText, 
  ShieldCheck,
  ClipboardList,
  Info,
  ArrowRight
} from 'lucide-react'
import CustomDatePicker from './common/CustomDatePicker'

// ── Helper: Clean Document Description (strips JSON config suffix if present) ──
function getCleanDocDescription(rawDesc) {
  if (!rawDesc) return ''
  const parts = rawDesc.split('|||')
  return parts[0]?.trim() || ''
}

// ── Helper: Resolve Step Description ──────────────────────────────────────────
function getStepDescription(step, index, totalSteps) {
  if (step.description && typeof step.description === 'string' && step.description.trim()) {
    return step.description.trim()
  }

  const name = (step.step_name || '').toLowerCase()

  if (name.includes('receipt') || name.includes('payment') || name.includes('checking of receipt')) {
    return 'Verify the official payment receipt issued by the Cashier\'s Office.'
  }
  if (name.includes('form issuance') || name.includes('issuance of form')) {
    return 'Present the official blank completion form to the student.'
  }
  if (name.includes('form submission') || name.includes('submission of form')) {
    return 'Receive and review the submitted completion form with its grades.'
  }
  if (name.includes('filing') || name.includes('verification') || name.includes('evaluat') || name.includes('checking of records') || name.includes('records')) {
    return 'Verify student grades and academic records to prepare the document.'
  }
  if (name.includes('preparation') || name.includes('printing') || name.includes('signing') || name.includes('dry seal')) {
    return 'Process, print, sign, and dry-seal the requested official document.'
  }
  if (name.includes('document prepared') || name.includes('document ready')) {
    return 'Verify the printed document, sign, and dry-seal for release.'
  }
  if (name.includes('release') || name.includes('issuance') || name.includes('collection') || name.includes('pickup')) {
    return 'Release and hand over the requested document to the student.'
  }
  if (name.includes('assessment') || name.includes('interview')) {
    return 'Evaluate student eligibility and assess document request requirements.'
  }

  if (index === 0) {
    return 'Initial verification of student credentials and request prerequisites.'
  } else if (index === totalSteps - 1) {
    return 'Release and hand over the requested document to the student.'
  }
  return 'Administrative verification and data processing for this workflow stage.'
}

// ── Helper: 12-hour time formatter ──────────────────────────────────────────
function fmt12hTime(t) {
  if (!t) return ''
  const parts = t.split(':')
  if (parts.length < 2) return t
  const h = parseInt(parts[0], 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${parts[1]} ${ampm}`
}

// ── Helper: Format date for display ──────────────────────────────────────────
function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ── Queue Details Modal ───────────────────────────────────────────────────────
export default function QueueDetailsModal({ ticketData, onClose, onConfirm, confirming, onSetReleaseDate, onNavigate }) {
  const navigate = useNavigate()
  const [localTicket, setLocalTicket] = useState(ticketData.ticket)
  const [localSteps, setLocalSteps] = useState(ticketData.steps)

  React.useEffect(() => {
    setLocalTicket(ticketData.ticket)
    setLocalSteps(ticketData.steps)
  }, [ticketData])

  const ticket = localTicket
  const steps = localSteps
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  const txType  = appt?.transaction_types
  
  const priority = ticket.priority_class || appt?.priority_class || student?.priority_class || 'regular'
  
  const docList = React.useMemo(() => {
    return appt?.selected_documents && appt.selected_documents.length > 0 
      ? appt.selected_documents 
      : (txType ? [txType] : []);
  }, [appt?.selected_documents, txType]);

  const isMultiDoc = (docList && docList.length > 1) || (ticket?.queue_number && ticket.queue_number.startsWith('MULTI'))
  const txDisplayName = isMultiDoc
    ? 'Multiple Documents'
    : (txType?.name || 'Document Service')
  const toastDocName = isMultiDoc
    ? (docList.length > 1 ? `${docList.length} Documents` : 'Multiple Documents')
    : (txType?.name || 'Document Service')

  const mergedRequiredDocs = React.useMemo(() => {
    const reqs = [];
    docList.forEach(d => {
      (d.required_documents || []).forEach(r => {
        if (r && !reqs.includes(r)) reqs.push(r);
      });
    });
    return reqs;
  }, [docList]);

  const docDescription = getCleanDocDescription(txType?.description)
  const requiredDocs = mergedRequiredDocs.length > 0 ? mergedRequiredDocs : (txType?.required_documents || [])
  
  const getTodayStr = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  // Pre-fill release date if exists on appointment or step
  const [releaseDate, setReleaseDate] = useState(
    appt?.release_date || ''
  )
  const [documentVerified, setDocumentVerified] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const toastTimerRef = React.useRef(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: typeof msg === 'string' ? msg : JSON.stringify(msg), type })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3500)
  }

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])


  return createPortal((
    <div 
      className="fixed inset-0 z-99999 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />

      {/* Modal Dialog */}
      <div 
        className="animate-fade-up relative my-auto w-full max-w-4xl bg-white text-text-main rounded-3xl p-5 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 font-sans overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top decorative accent bar - signature MasterListPage styling */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-maroon via-maroon-dark to-gold z-20" />

        {/* Header */}
        <div className="flex justify-between items-start mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-border gap-4 pt-1 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold uppercase tracking-wider border border-maroon-border">
                <Ticket size={13} className="shrink-0" /> Live Queue Ticket
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-off-white text-text-sub text-fluid-11 font-mono font-bold border border-border">
                TICKET: <strong className="text-maroon font-bold">{ticket.queue_number}</strong>
              </span>
              {priority && priority !== 'regular' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold-light text-gold-dark text-fluid-11 font-extrabold uppercase tracking-wider border border-gold-border">
                  <ShieldCheck size={12} className="shrink-0" /> {priority} Priority
                </span>
              )}
              <span className={`text-fluid-11 font-extrabold px-3 py-1 rounded-full border ${
                ticket.status === 'in_progress' 
                  ? 'bg-maroon-light text-maroon border-maroon-border' 
                  : ticket.status === 'completed'
                  ? 'bg-success-light text-success border-success-border'
                  : 'bg-gold-light text-gold-dark border-gold-border'
              }`}>
                {ticket.status === 'in_progress' ? '● In Progress' : ticket.status === 'completed' ? '✓ Completed' : 'Waiting in Queue'}
              </span>
            </div>
            
            <h2 className="font-serif text-fluid-24 sm:text-fluid-28 font-extrabold text-maroon m-0 leading-tight tracking-tight">
              {ticket.queue_number}{' '}
              <span className="text-text-main font-bold font-sans text-fluid-18 sm:text-fluid-22">
                — {txDisplayName}
              </span>
            </h2>
            <p className="text-fluid-12 text-text-muted mt-1 mb-0 font-medium">
              Live queue processing roadmap, student details, and verification checklist.
            </p>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 -mr-1 space-y-5 sm:space-y-6">
          {/* Info Cards Grid (Student Info + Requested Document Details) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Details Card */}
            <div className="p-4 sm:p-5 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex items-start gap-3.5 sm:gap-4">
              <div className="w-11 h-11 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border shadow-xs">
                <Users size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider block mb-1">
                  Student Information
                </span>
                <div className="text-fluid-15 sm:text-fluid-16 font-bold text-text-main leading-snug truncate mb-2">
                  {name}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-fluid-11 text-text-main font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-border shadow-2xs">
                    ID: <strong className="text-maroon font-bold">{student?.student_id || '—'}</strong>
                  </span>
                  <span className={`text-fluid-11 font-bold capitalize px-2.5 py-1 rounded-lg border ${
                    priority !== 'regular' 
                      ? 'bg-maroon-light text-maroon border-maroon-border font-extrabold' 
                      : 'bg-white text-text-sub border-border shadow-2xs'
                  }`}>
                    Priority: <span className="uppercase">{priority}</span>
                  </span>
                  {student?.email && (
                    <span className="text-fluid-11 text-text-sub truncate max-w-full font-medium block w-full mt-1">
                      Email: <span className="text-text-main font-medium">{student.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Requested Document Details Card */}
            <div className="p-4 sm:p-5 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex items-start gap-3.5 sm:gap-4">
              <div className="w-11 h-11 rounded-xl bg-gold-light text-gold-dark flex items-center justify-center shrink-0 border border-gold-border shadow-xs">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider block mb-1">
                  {docList.length > 1 ? `Requested Documents (${docList.length})` : 'Requested Document'}
                </span>
                {docList.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2 mt-0.5">
                    {docList.map((d, idx) => (
                      <span key={d.id || idx} className="text-fluid-11 font-bold text-maroon bg-maroon-light py-0.5 px-2.5 rounded-lg border border-maroon-border">
                        {d.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-fluid-15 sm:text-fluid-16 font-bold text-text-main leading-snug mb-1.5">
                    {txType?.name || 'Standard Service'}
                  </div>
                )}
                <div className="text-fluid-12 text-text-sub flex items-center gap-1.5 font-medium mb-1.5">
                  <Calendar size={13} className="text-gold shrink-0" />
                  <span>
                    {appt?.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Walk-in Ticket'}
                    {appt?.time_slot && ` • ${fmt12hTime(appt.time_slot)}`}
                  </span>
                </div>
                {docDescription && docList.length <= 1 && (
                  <p className="text-fluid-12 text-text-sub font-normal m-0 leading-relaxed">
                    {docDescription}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Document Requirements & Student Remarks Banner (If Present) */}
          {(requiredDocs.length > 0 || appt?.notes) && (
            <div className="p-4 sm:p-5 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-3.5">
              {requiredDocs.length > 0 && (
                <div>
                  <span className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ClipboardList size={13} className="text-gold" /> Required Document Clearances & Attachments
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {requiredDocs.map((doc, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border text-fluid-11-5 font-semibold text-text-main shadow-2xs"
                      >
                        <CheckCircle2 size={13} className="text-success shrink-0" />
                        <span>{doc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {appt?.notes && (
                <div className={requiredDocs.length > 0 ? "pt-3 border-t border-border/70" : ""}>
                  <span className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Info size={13} className="text-maroon" /> Student Remarks / Purpose
                  </span>
                  <p className="text-fluid-12-5 sm:text-fluid-13 text-text-main font-medium m-0 whitespace-pre-wrap leading-relaxed">
                    {appt.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Steps or Extra Info depending on status */}
          {ticket.status !== 'pending' && ticket.status !== 'waiting' ? (
            <div>
              {(() => {
                const isReleaseStep = (s) => {
                  if (!s) return false
                  const n = (s?.step_name || '').toLowerCase()
                  const loc = (s?.location || '').toLowerCase()
                  return n.includes('release') || n.includes('claim') || n.includes('pickup') || n.includes('collection') || n.includes('issuance') || loc.includes('release')
                }

                // Show all steps in the roadmap
                const displaySteps = steps || []

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5 m-0">
                        <Clock size={13} className="text-maroon" /> Workflow Processing Steps
                      </h3>
                      <span className="text-fluid-11 font-bold text-text-sub px-2.5 py-1 rounded-full bg-off-white border border-border">
                        {`${displaySteps.filter(s => s.status === 'completed').length} of ${displaySteps.length} completed`}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0">
                      {displaySteps.map((step, idx) => {
                        const isLast = idx === displaySteps.length - 1
                        const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
                        const isCompleted = step.status === 'completed'
                        const isRelease = isReleaseStep(step)
                        const isPrevCompleted = idx === 0 || displaySteps.slice(0, idx).every(s => s.status === 'completed')
                        
                        const effectiveReleaseDate = appt?.release_date || releaseDate
                        const isFutureScheduled = Boolean(effectiveReleaseDate && effectiveReleaseDate !== getTodayStr())
                        
                        const confirmKey = `${ticket.id}-${step.step_number}`
                        const isConfirming = confirming === confirmKey
                        
                        const stepNameLower = (step.step_name || '').toLowerCase()
                        const isDocPrepared = stepNameLower.includes('document prepared') || stepNameLower.includes('document ready')
                        const isPrepDoc = !isDocPrepared && (stepNameLower.includes('preparation') || stepNameLower.includes('verification') || stepNameLower.includes('checking of records') || stepNameLower.includes('records') || step.requires_presence === false)
                        const isReceiptSub = stepNameLower.includes('receipt') || stepNameLower.includes('payment')
                        const isFormSub = stepNameLower.includes('form submission') || stepNameLower.includes('submission of form')
                        const isFilingVerif = stepNameLower.includes('filing & verification') || stepNameLower.includes('filing')
                        const isFormIssuance = stepNameLower.includes('form issuance') || stepNameLower.includes('issuance of form')
                        
                        let confirmLabel = 'Confirm Step'
                        let instructionText = step.requires_presence !== false ? 'Verify requirements and mark step as done' : 'Click when records are verified and document is ready'
                        
                        if (isDocPrepared) {
                          confirmLabel = 'Ready for Release'
                          instructionText = 'Confirm document is prepared and move to Document Releases'
                        } else if (isPrepDoc) {
                          if (releaseDate && releaseDate !== getTodayStr()) {
                            confirmLabel = 'Set Release Date'
                            instructionText = 'Set scheduled release date'
                          } else {
                            confirmLabel = 'Ready for Pickup'
                            instructionText = 'Confirm document is prepared and move directly to Document Releases'
                          }
                        } else if (isReceiptSub) {
                          confirmLabel = 'Payment Checked'
                          instructionText = 'Click once student official receipt is verified'
                        } else if (isFormSub) {
                          confirmLabel = 'Form Received'
                          instructionText = 'Click once the submitted completion form is received'
                        } else if (isFilingVerif) {
                          confirmLabel = 'Document Prepared'
                          instructionText = 'Click once records are verified and document is prepared'
                        } else if (isFormIssuance) {
                          confirmLabel = 'Form Issued'
                          instructionText = 'Click once completion form is given to student'
                        }

                        const stepDesc = getStepDescription(step, idx, displaySteps.length)
                        
                        return (
                          <div key={step.id} className="flex gap-3 sm:gap-5">
                            {/* Step Indicator & Spine */}
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center text-xs sm:text-fluid-13-5 font-extrabold transition-all duration-300 ${
                                isCompleted 
                                  ? 'bg-success text-white ring-2 sm:ring-4 ring-success-light shadow-xs' 
                                  : isCurrent && !isRelease
                                  ? 'bg-maroon text-white ring-2 sm:ring-4 ring-maroon-light shadow-sm' 
                                  : isRelease && isPrevCompleted
                                  ? 'bg-emerald-600 text-white ring-2 sm:ring-4 ring-emerald-100 shadow-xs'
                                  : 'bg-white border-2 border-border text-text-muted'
                              }`}>
                                {isCompleted ? (
                                  <Check size={15} strokeWidth={3} />
                                ) : isRelease && isPrevCompleted ? (
                                  <Check size={15} strokeWidth={3} />
                                ) : (
                                  step.step_number
                                )}
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 flex-1 min-h-10 sm:min-h-14 my-1.5 sm:my-2 transition-colors duration-500 ${
                                  isCompleted ? 'bg-success/50' : 'bg-border'
                                }`} />
                              )}
                            </div>

                            {/* Step Card Content */}
                            <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4 sm:pb-6'}`}>
                              <div className={`flex flex-col gap-3 rounded-2xl transition-all duration-300 ${
                                isCurrent && !isRelease
                                  ? 'bg-white p-4 sm:p-5 border-2 border-maroon/20 shadow-sm ring-4 ring-maroon/5 -mt-1' 
                                  : isCompleted
                                  ? 'bg-off-white/50 p-3.5 sm:p-4 rounded-2xl border border-border/80'
                                  : isRelease && isPrevCompleted
                                  ? 'bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-300/80 shadow-xs'
                                  : 'bg-off-white/30 p-3.5 sm:p-4 rounded-2xl border border-border/50 opacity-65'
                              }`}>
                                
                                {/* Step Header Row */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                                      <span className={`text-fluid-14 sm:text-fluid-15 font-bold leading-snug ${
                                        isCompleted ? 'text-success' : isCurrent && !isRelease ? 'text-text-main' : isRelease && isPrevCompleted ? 'text-emerald-950 font-extrabold' : 'text-text-sub'
                                      }`}>
                                        {isRelease ? 'Document Release & Claiming' : step.step_name}
                                      </span>

                                      {/* Current Action badge only on active processing intake steps */}
                                      {isCurrent && !isRelease && (
                                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border">
                                          Current Action
                                        </span>
                                      )}

                                      {/* Primary Status Badge for Release step */}
                                      {isRelease && isPrevCompleted && !isCompleted && (
                                        isFutureScheduled ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-light text-gold-dark border border-gold-border shadow-2xs">
                                            <Calendar size={11} /> Scheduled for {formatDisplayDate(effectiveReleaseDate)}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                                            <CheckCircle2 size={11} className="text-emerald-700" /> Ready to Claim
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* Step Description */}
                                    <p className="text-fluid-12 sm:text-fluid-12-5 text-text-sub font-normal m-0 leading-relaxed mt-1">
                                      {isRelease && isPrevCompleted && !isCompleted
                                        ? (isFutureScheduled 
                                            ? `Document preparation is complete. Scheduled for student pickup on ${formatDisplayDate(effectiveReleaseDate)} in Document Releases.` 
                                            : `Document preparation is complete, signed, and dry-sealed. Ready for student claiming at the Releasing Counter.`)
                                        : stepDesc}
                                    </p>
                                    
                                    {isCompleted && step.confirmed_at && (
                                      <div className="text-fluid-11 sm:text-fluid-12 font-medium text-text-muted mt-1.5 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-success" />
                                        Completed on {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </div>
                                    )}

                                    {/* Active Instruction Text only for active processing steps */}
                                    {isCurrent && !isRelease && (
                                      <div className="text-fluid-11-5 sm:text-fluid-12-5 text-maroon font-semibold mt-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-maroon animate-ping inline-block shrink-0" />
                                        <span>{instructionText}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Action Button for Release step when Ready */}
                                  {isRelease && isPrevCompleted && !isCompleted && (
                                    <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onClose()
                                          if (onNavigate) {
                                            onNavigate('document-releases')
                                          } else {
                                            navigate('/staff/releases')
                                          }
                                        }}
                                        className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl text-fluid-12-5 sm:text-fluid-13 font-bold bg-maroon hover:bg-maroon-dark text-white shadow-[0_6px_20px_rgba(123,26,42,0.2)] hover:shadow-[0_8px_25px_rgba(123,26,42,0.28)] inline-flex items-center gap-2 transition-all cursor-pointer border-none active:scale-[0.98]"
                                      >
                                        <span>Go to Document Releases</span>
                                        <ArrowRight size={14} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Action Button for Current Step */}
                                  {isCurrent && !isRelease && (
                                    <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (isReleasing || isConfirming) return
                                          const finalDate = releaseDate || getTodayStr()

                                          if (isPrepDoc) {
                                            if (releaseDate === getTodayStr()) {
                                              if (!documentVerified) {
                                                showToast('Please check the confirmation box before moving to release.', 'error')
                                                return
                                              }
                                              setIsReleasing(true)
                                              try {
                                                const apptId = ticket.appointment_id || ticket.appointments?.id
                                                if (onSetReleaseDate && apptId) {
                                                  await onSetReleaseDate(apptId, finalDate)
                                                }
                                                
                                                // Confirm Step 2
                                                await onConfirm(ticket.id, step.step_number, toastDocName, name, confirmLabel, finalDate, '', true)
                                                
                                                // If there is an intermediate "Document Prepared" step before the final release, confirm it too so it lands directly at Release
                                                const nextStepObj = steps.find(s => s.step_number === step.step_number + 1)
                                                if (nextStepObj && !isReleaseStep(nextStepObj)) {
                                                  await onConfirm(ticket.id, nextStepObj.step_number, toastDocName, name, 'Ready for Release', finalDate, '', true)
                                                }
                                                
                                                showToast('Document verified and moved to Document Releases (Uncollected)!')
                                                onClose()
                                                if (onNavigate) {
                                                  onNavigate('document-releases')
                                                }
                                              } catch (err) {
                                                showToast(err?.message || 'Failed to move to release.', 'error')
                                              } finally {
                                                setIsReleasing(false)
                                              }
                                            } else {
                                              // Schedule Date chosen: Save date and advance to Step 3 (Document Prepared)
                                              if (!releaseDate) {
                                                showToast('Please select a scheduled release date.', 'error')
                                                return
                                              }
                                              setIsReleasing(true)
                                              try {
                                                const apptId = ticket.appointment_id || ticket.appointments?.id
                                                if (onSetReleaseDate && apptId && finalDate) {
                                                  await onSetReleaseDate(apptId, finalDate)
                                                }
                                                await onConfirm(ticket.id, step.step_number, toastDocName, name, 'Set Release Date', finalDate, '', false)
                                                
                                                showToast(`Release date scheduled for ${finalDate}! Advanced to Step 3.`)
                                                
                                                // Advance local steps in modal seamlessly
                                                setLocalSteps(prev => (prev || []).map(s => {
                                                  if (s.step_number === step.step_number) return { ...s, status: 'completed', confirmed_at: new Date().toISOString() }
                                                  if (s.step_number === step.step_number + 1) return { ...s, status: 'in_progress' }
                                                  return s
                                                }))
                                                setLocalTicket(prev => ({ ...prev, current_step: step.step_number + 1 }))
                                                setDocumentVerified(false)
                                              } catch (err) {
                                                showToast(err?.message || 'Failed to save scheduled release date.', 'error')
                                              } finally {
                                                setIsReleasing(false)
                                              }
                                            }
                                          } else if (isDocPrepared) {
                                            if (!documentVerified) {
                                              showToast('Please check the confirmation box before moving to release.', 'error')
                                              return
                                            }
                                            setIsReleasing(true)
                                            try {
                                              await onConfirm(ticket.id, step.step_number, toastDocName, name, 'Ready for Release', null, '', true)
                                              showToast('Document verified and moved to Document Releases (Uncollected)!')
                                              onClose()
                                              if (onNavigate) {
                                                onNavigate('document-releases')
                                              }
                                            } catch (err) {
                                              showToast(err?.message || 'Failed to confirm document preparation.', 'error')
                                            } finally {
                                              setIsReleasing(false)
                                            }
                                          } else {
                                            try {
                                              await onConfirm(ticket.id, step.step_number, toastDocName, name, confirmLabel, null, '', false)
                                              showToast(`Step ${step.step_number} (${confirmLabel}) confirmed!`)
                                              onClose()
                                            } catch (err) {
                                              showToast(err?.message || 'Failed to confirm step.', 'error')
                                            }
                                          }
                                        }}
                                        disabled={
                                          isConfirming || 
                                          isReleasing || 
                                          (isPrepDoc && releaseDate === getTodayStr() && !documentVerified) || 
                                          (isPrepDoc && releaseDate !== getTodayStr() && !releaseDate) || 
                                          (isDocPrepared && !documentVerified)
                                        }
                                        className={`w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl text-fluid-12-5 sm:text-fluid-13 font-bold font-sans transition-all inline-flex items-center gap-2 ${
                                          isConfirming || isReleasing || (isPrepDoc && releaseDate === getTodayStr() && !documentVerified) || (isPrepDoc && releaseDate !== getTodayStr() && !releaseDate) || (isDocPrepared && !documentVerified)
                                            ? 'bg-border text-text-muted cursor-not-allowed shadow-none' 
                                            : 'bg-maroon hover:bg-maroon-dark text-white cursor-pointer shadow-[0_6px_20px_rgba(123,26,42,0.2)] hover:shadow-[0_8px_25px_rgba(123,26,42,0.28)] active:scale-[0.98]'
                                        }`}
                                      >
                                        {isReleasing || isConfirming ? (
                                          <>
                                            <Loader2 size={14} className="animate-spin" />
                                            {isReleasing ? (isPrepDoc ? 'Saving Release Date…' : 'Processing…') : 'Confirming…'}
                                          </>
                                        ) : (
                                          <>
                                            <Check size={15} />
                                            {confirmLabel}
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Release Date Form (when current step is Verification & Preparation) */}
                                {isCurrent && isPrepDoc && (
                                  <div className="mt-2.5 pt-3.5 sm:pt-4 border-t border-border flex flex-col gap-3">
                                    <div className="flex flex-col gap-2.5">
                                      <label className="block text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-0.5">
                                        Select Document Release Date:
                                      </label>
                                      
                                      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
                                        <div className="grid grid-cols-2 sm:flex bg-surface p-1 rounded-xl border border-border shadow-xs">
                                          <button 
                                            type="button"
                                            onClick={() => setReleaseDate(getTodayStr())}
                                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-fluid-11-5 sm:text-fluid-12-5 font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                                              releaseDate === getTodayStr() 
                                                ? 'bg-maroon text-white shadow-xs' 
                                                : 'bg-transparent text-text-sub hover:text-text-main'
                                            }`}
                                          >
                                            {releaseDate === getTodayStr() ? <CircleDot size={14} /> : <Circle size={14} />}
                                            Ready Today
                                          </button>

                                          <button 
                                            type="button"
                                            onClick={() => setReleaseDate('')}
                                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-fluid-11-5 sm:text-fluid-12-5 font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                                              releaseDate !== getTodayStr() 
                                                ? 'bg-maroon text-white shadow-xs' 
                                                : 'bg-transparent text-text-sub hover:text-text-main'
                                            }`}
                                          >
                                            {releaseDate !== getTodayStr() ? <CircleDot size={14} /> : <Circle size={14} />}
                                            Schedule Date
                                          </button>
                                        </div>

                                        {releaseDate !== getTodayStr() && (
                                          <div className="animate-fade-in w-full sm:w-auto">
                                            <CustomDatePicker
                                              value={releaseDate}
                                              onChange={setReleaseDate}
                                              minDate={getTodayStr()}
                                              placeholder="MM/DD/YYYY"
                                              position="top"
                                              className="w-full sm:w-64"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* If Ready Today, show verification confirmation checkbox */}
                                    {releaseDate === getTodayStr() && (
                                      <div className="p-3.5 sm:p-4 rounded-xl bg-off-white/60 border border-border flex items-start gap-3 animate-fade-in shadow-2xs">
                                        <input 
                                          type="checkbox" 
                                          id="verifyReadyTodayDoc" 
                                          checked={documentVerified}
                                          onChange={e => setDocumentVerified(e.target.checked)}
                                          className="mt-0.5 w-4.5 h-4.5 accent-maroon rounded cursor-pointer shrink-0"
                                        />
                                        <label htmlFor="verifyReadyTodayDoc" className="text-fluid-12 sm:text-fluid-13 text-text-main font-semibold leading-snug cursor-pointer select-none">
                                          I confirm that the requested document is verified, printed, and prepared for release.
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Step 3: Document Prepared Form */}
                                {isCurrent && isDocPrepared && (
                                  <div className="mt-2.5 pt-3.5 sm:pt-4 border-t border-border flex flex-col gap-2.5 sm:gap-3 animate-fade-in">
                                    <div className="p-3 sm:p-3.5 rounded-xl bg-gold-light border border-gold-border flex items-center gap-2 text-xs text-gold font-medium">
                                      <CheckCircle2 size={15} className="text-gold shrink-0" />
                                      <span>
                                        {appt?.release_date ? `Scheduled Release Date: ${new Date(appt.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Verify before moving to release.` : 'Verify the document before moving to release.'}
                                      </span>
                                    </div>

                                    {/* Verification confirmation checkbox for Step 3 */}
                                    <div className="p-3.5 sm:p-4 rounded-xl bg-off-white/60 border border-border flex items-start gap-3 shadow-2xs">
                                      <input 
                                        type="checkbox" 
                                        id="verifyDocPrepared" 
                                        checked={documentVerified}
                                        onChange={e => setDocumentVerified(e.target.checked)}
                                        className="mt-0.5 w-4.5 h-4.5 accent-maroon rounded cursor-pointer shrink-0"
                                      />
                                      <label htmlFor="verifyDocPrepared" className="text-fluid-12 sm:text-fluid-13 text-text-main font-semibold leading-snug cursor-pointer select-none">
                                        I confirm that the requested document is verified, printed, and prepared for release.
                                      </label>
                                    </div>
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            /* Additional Details for Pending / Waiting Tickets */
            <div>
              <h3 className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-1.5">
                <Calendar size={13} className="text-maroon" /> Additional Ticket Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3.5 sm:p-4 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-1">
                  <label className="text-fluid-10 text-text-muted uppercase font-extrabold tracking-wider">Appointment Date</label>
                  <div className="text-fluid-13-5 sm:text-fluid-14 font-bold text-text-main">
                    {appt?.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Walk-in'}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-1">
                  <label className="text-fluid-10 text-text-muted uppercase font-extrabold tracking-wider">Time Slot</label>
                  <div className="text-fluid-13-5 sm:text-fluid-14 font-bold text-text-main">
                    {appt?.time_slot ? fmt12hTime(appt.time_slot) : 'Any time'}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-1">
                  <label className="text-fluid-10 text-text-muted uppercase font-extrabold tracking-wider">Priority Category</label>
                  <div className="text-fluid-13-5 sm:text-fluid-14 font-bold text-text-main capitalize">
                    {priority || 'Regular'}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-1">
                  <label className="text-fluid-10 text-text-muted uppercase font-extrabold tracking-wider">Ticket Issued At</label>
                  <div className="text-fluid-13-5 sm:text-fluid-14 font-bold text-text-main">
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                  </div>
                </div>
              </div>
              
              {(appt?.notes || requiredDocs.length > 0) && (
                <div className="space-y-3">
                  {appt?.notes && (
                    <div className="p-4 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-1.5">
                      <label className="text-fluid-10 text-text-muted uppercase font-extrabold tracking-wider">Purpose / Remarks</label>
                      <div className="text-fluid-13 font-medium text-text-main whitespace-pre-wrap leading-relaxed">
                        {appt.notes}
                      </div>
                    </div>
                  )}
                  
                  {requiredDocs.length > 0 && (
                    <div className="p-4 bg-off-white/60 rounded-2xl border border-border/80 shadow-2xs flex flex-col gap-2">
                      <label className="text-fluid-10 text-text-muted uppercase font-extrabold tracking-wider">Required Documents</label>
                      <div className="flex flex-wrap gap-2">
                        {requiredDocs.map((doc, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border text-fluid-11-5 font-semibold text-text-main shadow-2xs"
                          >
                            <CheckCircle2 size={13} className="text-success shrink-0" />
                            <span>{doc}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (MasterListPage signature style) */}
        <div className="flex items-center justify-end gap-3 pt-4 sm:pt-5 border-t border-border mt-4 shrink-0 bg-white">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 sm:py-3 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-fluid-13 font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Toast Notification (Adhering to strict #006600 rule) */}
      {toastMsg && (
        <div className={`fixed bottom-10 right-8 z-10000 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border text-fluid-13-5 font-bold animate-fade-up ${
          toastMsg.type === 'error'
            ? 'bg-danger text-white border-danger-border'
            : 'bg-[#006600] text-white border-[#005200]'
        }`}>
          {toastMsg.type === 'error' ? (
            <AlertTriangle size={17} className="shrink-0 text-white" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Check size={13} className="text-white stroke-3" />
            </div>
          )}
          <span className="text-white">{toastMsg.text}</span>
          <button 
            onClick={() => setToastMsg(null)} 
            className="ml-2.5 bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-0 flex items-center shrink-0 transition-opacity"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  ), document.body)
}
