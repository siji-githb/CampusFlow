import React, { useState } from 'react'
import { createPortal } from 'react-dom'
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
  Sparkles, 
  ShieldCheck,
  DoorOpen,
  ClipboardList,
  Info
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
    return 'Present and verify the official payment receipt issued by the Cashier\'s Office.'
  }
  if (name.includes('form issuance') || name.includes('issuance of form')) {
    return 'Issue the official blank clearance or application request form to the student.'
  }
  if (name.includes('form submission') || name.includes('submission of form')) {
    return 'Receive and review the completed, signed application form together with attached requirements.'
  }
  if (name.includes('filing') || name.includes('verification') || name.includes('evaluat') || name.includes('checking of records')) {
    return 'Verify scholastic records, grades, and academic eligibility against official university archives.'
  }
  if (name.includes('preparation') || name.includes('printing') || name.includes('signing') || name.includes('dry seal')) {
    return 'Process, print, sign, and dry-seal the requested official document..'
  }
  if (name.includes('release') || name.includes('issuance') || name.includes('collection') || name.includes('pickup')) {
    return 'Hand over the verified document to the student and log the official release timestamp.'
  }
  if (name.includes('assessment') || name.includes('interview')) {
    return 'Evaluate student eligibility and assess document request requirements.'
  }

  if (index === 0) {
    return 'Initial verification of student credentials and request prerequisites.'
  } else if (index === totalSteps - 1) {
    return 'Final review and official releasing of the processed document.'
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

// ── Queue Details Modal ───────────────────────────────────────────────────────
export default function QueueDetailsModal({ ticketData, onClose, onConfirm, confirming, onSetReleaseDate }) {
  const { ticket, steps } = ticketData
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  const txType  = appt?.transaction_types
  
  const priority = ticket.priority_class || appt?.priority_class || student?.priority_class || 'regular'
  
  const docDescription = getCleanDocDescription(txType?.description)
  const requiredDocs = txType?.required_documents || []
  
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const [releaseDate, setReleaseDate] = useState(appt?.release_date || getTodayStr())
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: typeof msg === 'string' ? msg : JSON.stringify(msg), type })
    setTimeout(() => setToastMsg(null), 3000)
  }
  
  const [documentVerified, setDocumentVerified] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)

  return createPortal((
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="animate-fade-up relative w-full max-w-4xl bg-white text-text-main rounded-3xl p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-5 border-b border-border gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-light text-gold text-[11px] font-extrabold uppercase tracking-wider border border-gold-border">
                <Ticket size={13} /> Queue Ticket Details
              </span>
              {priority && priority !== 'regular' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-maroon-light text-maroon text-[11px] font-extrabold uppercase tracking-wider border border-maroon-border">
                  <ShieldCheck size={13} /> {priority} Priority
                </span>
              )}
            </div>
            
            <div className="flex items-baseline gap-4 flex-wrap">
              <h2 className="font-serif text-[36px] sm:text-[42px] font-extrabold text-maroon m-0 leading-none tracking-tight">
                {ticket.queue_number}
              </h2>
              <span className={`text-[12px] font-extrabold px-3 py-1 rounded-full border ${
                ticket.status === 'in_progress' 
                  ? 'bg-maroon-light text-maroon border-maroon-border' 
                  : ticket.status === 'completed'
                  ? 'bg-success-light text-success border-success-border'
                  : 'bg-gold-light text-gold border-gold-border'
              }`}>
                {ticket.status === 'in_progress' ? '● In Progress' : ticket.status === 'completed' ? '✓ Completed' : 'Waiting in Queue'}
              </span>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Cards Grid (Student Info + Requested Document Details) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
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
                  ID: {student?.student_id || '—'}
                </span>
                <span className={`text-[11.5px] font-bold capitalize px-2.5 py-1 rounded-lg border ${
                  priority !== 'regular' 
                    ? 'bg-maroon-light text-maroon border-maroon-border font-extrabold' 
                    : 'bg-surface text-text-sub border-border'
                }`}>
                  Priority: <span className="uppercase">{priority}</span>
                </span>
                {student?.email && (
                  <span className="text-[12px] text-text-sub truncate max-w-64 font-medium">
                    Email: <span className="text-text-main">{student.email}</span>
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
                {txType?.name || 'Standard Service'}
              </div>
              <div className="text-[12px] text-text-sub flex items-center gap-1.5 font-medium mb-2">
                <Calendar size={13} className="text-gold shrink-0" />
                <span>
                  {appt?.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Walk-in Ticket'}
                  {appt?.time_slot && ` • ${fmt12hTime(appt.time_slot)}`}
                </span>
              </div>
              {docDescription && (
                <p className="text-[12.5px] text-text-sub font-normal m-0 leading-relaxed">
                  {docDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Document Requirements & Student Remarks Banner (If Present) */}
        {(requiredDocs.length > 0 || appt?.notes) && (
          <div className="mb-7 p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-4">
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
                      <span>{doc}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {appt?.notes && (
              <div className={requiredDocs.length > 0 ? "pt-3.5 border-t border-border" : ""}>
                <span className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Info size={14} className="text-maroon" /> Student Remarks / Purpose
                </span>
                <p className="text-[13px] text-text-main font-medium m-0 whitespace-pre-wrap leading-relaxed">
                  {appt.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Steps or Extra Info depending on status */}
        {ticket.status !== 'pending' && ticket.status !== 'waiting' ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] flex items-center gap-1.5 m-0">
                <Clock size={14} className="text-maroon" /> Workflow Processing Steps
              </h3>
              <span className="text-[12px] font-bold text-text-sub">
                {steps.filter(s => s.status === 'completed').length} of {steps.length} completed
              </span>
            </div>
            
            <div className="flex flex-col gap-0">
              {steps.map((step, idx, filteredArr) => {
                const isLast = idx === filteredArr.length - 1
                const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
                const isCompleted = step.status === 'completed'
                const confirmKey = `${ticket.id}-${step.step_number}`
                const isConfirming = confirming === confirmKey
                
                const isReceiptSub = step.step_name.includes('Checking') || step.step_name.includes('Receipt Submission')
                const isFormSub = step.step_name.includes('Form Submission')
                const isFilingVerif = step.step_name.includes('Filing & Verification')
                const isFormIssuance = step.step_name.includes('Form Issuance')
                const isPrepDoc = step.step_name.includes('Preparation of Document')
                const isRelease = step.step_name.includes('Release')
                
                let confirmLabel = 'Confirm Step'
                let instructionText = step.requires_presence !== false ? 'Please verify requirements and confirm this step' : 'Active background step (processing document)'
                
                if (isPrepDoc) {
                  confirmLabel = 'Document Prepared'
                  instructionText = 'Click when document printing/processing is completed'
                } else if (isRelease) {
                  confirmLabel = 'Release Document'
                  instructionText = 'Set availability date and move ticket to Document Releases'
                } else if (isReceiptSub) {
                  confirmLabel = 'Payment Checked'
                  instructionText = 'Click once student official receipt is verified'
                } else if (isFormSub) {
                  confirmLabel = 'Form Received'
                  instructionText = 'Click once clearance/completion form is submitted'
                } else if (isFilingVerif) {
                  confirmLabel = 'Mark as Verified'
                  instructionText = 'Click once records are verified and filed'
                } else if (isFormIssuance) {
                  confirmLabel = 'Form Issued'
                  instructionText = 'Click once blank form is issued to student'
                } else if (step.requires_presence !== false) {
                  instructionText = 'Verify and mark step as done'
                }

                const stepDesc = getStepDescription(step, idx, filteredArr.length)
                
                return (
                  <div key={step.id} className="flex gap-4 sm:gap-6">
                    {/* Step Indicator & Spine */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[13.5px] font-extrabold transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-success text-white ring-4 ring-success-light shadow-xs' 
                          : isCurrent 
                          ? 'bg-maroon text-white ring-4 ring-maroon-light shadow-sm' 
                          : 'bg-white border-2 border-border text-text-muted'
                      }`}>
                        {isCompleted ? <Check size={18} strokeWidth={3} /> : step.step_number}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 min-h-14 my-2 transition-colors duration-500 ${
                          isCompleted ? 'bg-success/50' : 'bg-border'
                        }`} />
                      )}
                    </div>

                    {/* Step Card Content */}
                    <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                      <div className={`flex flex-col gap-3 rounded-2xl transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-white p-5 sm:p-6 border-2 border-maroon/20 shadow-md ring-4 ring-maroon/5 -mt-1' 
                          : isCompleted
                          ? 'bg-surface/50 p-4.5 rounded-2xl border border-border/80'
                          : 'bg-surface/30 p-4.5 rounded-2xl border border-border/50 opacity-65'
                      }`}>
                        
                        {/* Step Header Row */}
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[15.5px] font-bold ${
                                isCompleted ? 'text-success' : isCurrent ? 'text-text-main' : 'text-text-sub'
                              }`}>
                                {step.step_name}
                              </span>

                              {isCurrent && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border">
                                  Current Action
                                </span>
                              )}

                              {/* Presence Badge */}
                              {step.requires_presence === false ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-light text-gold border border-gold-border">
                                  <Sparkles size={11} /> Back-Office Processing
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                                  <Users size={11} /> Student Presence Required
                                </span>
                              )}

                              {step.location && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                                  <DoorOpen size={11} /> {step.location}
                                </span>
                              )}
                            </div>

                            {/* Step Description */}
                            <p className="text-[12.5px] text-text-sub font-normal m-0 leading-relaxed mt-1">
                              {stepDesc}
                            </p>
                            
                            {isCompleted && step.confirmed_at && (
                              <div className="text-[12px] font-medium text-text-muted mt-2 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-success" />
                                Completed on {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            )}

                            {isCurrent && (
                              <div className="text-[12.5px] text-maroon font-semibold mt-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-maroon animate-ping inline-block" />
                                {instructionText}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Button for Current Step */}
                          {isCurrent && (
                            <div className="shrink-0">
                              <button
                                onClick={async () => {
                                  if (isReleasing || isConfirming) return
                                  const finalDate = releaseDate || getTodayStr()

                                  if (isRelease) {
                                    if (!documentVerified) {
                                      showToast('Please confirm the document is complete, correct, and verified.', 'error')
                                      return
                                    }
                                    const apptId = ticket.appointment_id || ticket.appointments?.id
                                    if (!apptId) {
                                      showToast('Error: Appointment ID is missing.', 'error')
                                      return
                                    }
                                    setIsReleasing(true)
                                    try {
                                      await onSetReleaseDate(apptId, finalDate)
                                      showToast('Document moved to Document Releases successfully!')
                                      onClose()
                                    } catch (err) {
                                      showToast(err?.message || 'Failed to set release date. Please try again.', 'error')
                                    } finally {
                                      setIsReleasing(false)
                                    }
                                  } else {
                                    try {
                                      await onConfirm(ticket.id, step.step_number, txType?.name, name, confirmLabel, null, '', false)
                                      showToast(`Step ${step.step_number} (${confirmLabel}) confirmed!`)
                                      onClose()
                                    } catch (err) {
                                      showToast(err?.message || 'Failed to confirm step.', 'error')
                                    }
                                  }
                                }}
                                disabled={isConfirming || isReleasing || (isRelease && (!releaseDate || !documentVerified))}
                                className={`px-5 py-2.5 rounded-xl text-[13px] font-extrabold font-sans transition-all shadow-xs inline-flex items-center gap-2 ${
                                  isConfirming || isReleasing || (isRelease && (!releaseDate || !documentVerified)) 
                                    ? 'bg-border text-text-muted cursor-not-allowed shadow-none' 
                                    : 'bg-maroon hover:bg-maroon-dark text-white cursor-pointer hover:shadow-sm active:scale-98'
                                }`}
                              >
                                {isReleasing || isConfirming ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {isReleasing ? 'Processing Release…' : 'Confirming…'}
                                  </>
                                ) : (
                                  <>
                                    <Check size={14} className="stroke-3" />
                                    {confirmLabel}
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Release Form (when current step is Release) */}
                        {isCurrent && isRelease && (
                          <div className="mt-3 pt-4 border-t border-border">
                            <div className="flex flex-col gap-4">
                              <div>
                                <label className="block text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-2.5">
                                  Select Document Release Date:
                                </label>
                                
                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                  <div className="flex bg-surface p-1 rounded-xl border border-border shadow-xs">
                                    <button 
                                      type="button"
                                      onClick={() => setReleaseDate(getTodayStr())}
                                      className={`px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                        releaseDate === getTodayStr() 
                                          ? 'bg-maroon text-white shadow-xs' 
                                          : 'bg-transparent text-text-sub hover:text-text-main'
                                      }`}
                                    >
                                      {releaseDate === getTodayStr() ? <CircleDot size={15} /> : <Circle size={15} />}
                                      Ready Today
                                    </button>

                                    <button 
                                      type="button"
                                      onClick={() => setReleaseDate('')}
                                      className={`px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                        releaseDate !== getTodayStr() 
                                          ? 'bg-maroon text-white shadow-xs' 
                                          : 'bg-transparent text-text-sub hover:text-text-main'
                                      }`}
                                    >
                                      {releaseDate !== getTodayStr() ? <CircleDot size={15} /> : <Circle size={15} />}
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
                              
                              {/* Verification confirmation checkbox */}
                              <div className="p-4 rounded-xl bg-surface border border-border flex items-start gap-3.5">
                                <input 
                                  type="checkbox" 
                                  id="verifyDoc" 
                                  checked={documentVerified}
                                  onChange={e => setDocumentVerified(e.target.checked)}
                                  className="mt-0.5 w-5 h-5 accent-maroon rounded cursor-pointer shrink-0"
                                />
                                <label htmlFor="verifyDoc" className="text-[13.5px] text-text-main font-semibold leading-snug cursor-pointer select-none">
                                  I confirm that the requested document is verified, signed, and ready for release to the student.
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Additional Details for Pending / Waiting Tickets */
          <div>
            <h3 className="text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em] mb-4 flex items-center gap-1.5">
              <Calendar size={14} className="text-maroon" /> Additional Ticket Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
              <div className="p-4 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">Appointment Date</label>
                <div className="text-[14px] font-bold text-text-main">
                  {appt?.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Walk-in'}
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">Time Slot</label>
                <div className="text-[14px] font-bold text-text-main">
                  {appt?.time_slot ? fmt12hTime(appt.time_slot) : 'Any time'}
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">Priority Category</label>
                <div className="text-[14px] font-bold text-text-main capitalize">
                  {priority || 'Regular'}
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">Ticket Issued At</label>
                <div className="text-[14px] font-bold text-text-main">
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                </div>
              </div>
            </div>
            
            {(appt?.notes || requiredDocs.length > 0) && (
              <div className="space-y-3.5">
                {appt?.notes && (
                  <div className="p-4.5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">Purpose / Remarks</label>
                    <div className="text-[13.5px] font-medium text-text-main whitespace-pre-wrap leading-relaxed">
                      {appt.notes}
                    </div>
                  </div>
                )}
                
                {requiredDocs.length > 0 && (
                  <div className="p-4.5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-2">
                    <label className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">Required Documents</label>
                    <div className="flex flex-wrap gap-2">
                      {requiredDocs.map((doc, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/60 border border-border text-[12px] font-semibold text-text-main shadow-2xs"
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
      
      {/* Toast Notification (Adhering to strict #006600 rule) */}
      {toastMsg && (
        <div className={`fixed bottom-10 right-8 z-10000 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border text-[13.5px] font-bold animate-fade-up ${
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
