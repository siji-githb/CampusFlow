import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, DoorOpen, Cog, Users, Ticket, Loader2, Circle, CircleDot } from 'lucide-react'

// ── Queue Details Modal ──

export default function QueueDetailsModal({ ticketData, onClose, onConfirm, confirming, onSetReleaseDate }) {
  const { ticket, steps } = ticketData
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const [releaseDate, setReleaseDate] = useState(appt?.release_date || getTodayStr())
  const [loadingSetNotify, setLoadingSetNotify] = useState(false)
  const [loadingReadyNow, setLoadingReadyNow] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }
  
  const [releasedTo, setReleasedTo] = useState('')
  const [documentVerified, setDocumentVerified] = useState(false)

  return createPortal((
    <div className="fixed inset-0 z-1000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-200 bg-white rounded-4xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5"><Ticket size={14}/> Queue Details</div>
            <h2 className="font-serif text-[32px] font-extrabold text-maroon m-0 leading-none">{ticket.queue_number}</h2>
          </div>
          <button onClick={onClose} className="bg-surface/50 border-none cursor-pointer text-text-muted flex items-center justify-center hover:bg-border hover:text-text-main transition-colors p-2 rounded-full"><X size={20} /></button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-5 mb-10">
          <div className="p-6 bg-linear-to-br from-surface to-off-white rounded-[20px] border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gold"></div>
            <div className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 flex items-center gap-1.5"><Users size={14} /> Student Details</div>
            <div className="text-[18px] font-extrabold text-text-main mb-1">{name}</div>
            <div className="text-[14px] text-text-sub font-mono font-medium">{student?.student_id || '—'}</div>
          </div>
          <div className="p-6 bg-linear-to-br from-surface to-off-white rounded-[20px] border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-maroon"></div>
            <div className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 flex items-center gap-1.5"><Ticket size={14} /> Transaction</div>
            <div className="text-[16px] font-bold text-text-main leading-snug">{appt?.transaction_types?.name}</div>
          </div>
        </div>



        {/* Steps or Extra Info depending on status */}
        {ticket.status !== 'pending' && ticket.status !== 'waiting' ? (
        <div>
          <h3 className="text-sm font-bold text-text-main uppercase tracking-[0.06em] mb-5">Processing Steps</h3>
          <div className="flex flex-col gap-0">
            {steps.map((step, idx, filteredArr) => {
              const isLast = idx === filteredArr.length - 1
              const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
              const confirmKey = `${ticket.id}-${step.step_number}`
              const isConfirming = confirming === confirmKey
              
              const isReceiptSub = step.step_name.includes('Checking') || step.step_name.includes('Receipt Submission')
              const isFormSub = step.step_name.includes('Form Submission')
              const isFilingVerif = step.step_name.includes('Filing & Verification')
              const isFormIssuance = step.step_name.includes('Form Issuance')
              
              const isPrepDoc = step.step_name.includes('Preparation of Document')
              const isRelease = step.step_name.includes('Release')
              
              let confirmLabel = 'Confirm Step';
              let instructionText = step.requires_presence !== false ? 'Please confirm to proceed' : 'Active Step — processing, no line';
              
              if (isPrepDoc) {
                confirmLabel = 'Document Prepared';
                instructionText = 'Click Document Prepared once ready';
              } else if (isRelease) {
                confirmLabel = 'Release';
                instructionText = 'Click Released to move it to the Document Release';
              } else if (isReceiptSub) {
                confirmLabel = 'Payment Checked';
                instructionText = 'Click Payment Checked once receipt is verified';
              } else if (isFormSub) {
                confirmLabel = 'Form Received';
                instructionText = 'Click Form Received once document is submitted';
              } else if (isFilingVerif) {
                confirmLabel = 'Mark as Verified';
                instructionText = 'Click Mark as Verified once filed';
              } else if (isFormIssuance) {
                confirmLabel = 'Form Issued';
                instructionText = 'Click Form Issued once given to student';
              } else if (step.requires_presence !== false) {
                instructionText = 'Click Mark as done once ready';
              }
              
              return (
                <div key={step.id} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[14px] font-black shadow-md transition-all duration-300
                      ${step.status === 'completed' ? 'bg-success text-white ring-4 ring-success-light/30' : 
                        step.status === 'in_progress' ? 'bg-maroon text-white ring-4 ring-maroon-light' : 
                        'bg-surface border-2 border-border text-text-muted'}`}
                    >
                      {step.status === 'completed' ? <Check size={18} strokeWidth={3} /> : step.step_number}
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 min-h-12 my-2 transition-colors duration-500 ${step.status === 'completed' ? 'bg-success/50' : 'bg-border/60'}`} />}
                  </div>
                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-8'}`}>
                    <div className={`flex flex-col gap-4 rounded-2xl transition-all duration-300 ${isCurrent ? 'bg-white p-6 border border-maroon-border shadow-[0_4px_24px_rgba(123,26,42,0.06)] -mt-3 relative z-10' : 'bg-transparent py-2 border-none mt-0 opacity-60 hover:opacity-100'}`}>
                      
                      {/* Step Header Row */}
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <div className={`text-[17px] font-extrabold ${step.status === 'completed' ? 'text-success' : 'text-text-main'}`}>{step.step_name}</div>
                          {step.status === 'completed' && step.confirmed_at && (
                            <div className="text-[12.5px] font-medium text-text-muted mt-1">Confirmed at {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                          )}
                          {isCurrent && (
                            <div className="text-[13px] text-gold mt-1.5 font-bold tracking-wide">
                              {instructionText}
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        {isCurrent && (
                          <div className="flex items-center gap-3 shrink-0">

                            <button
                              onClick={async () => {
                                const finalDate = releaseDate || getTodayStr()
                                if (isRelease) {
                                  const apptId = ticket.appointment_id || ticket.appointments?.id;
                                  if (apptId) {
                                    await onSetReleaseDate(apptId, finalDate);
                                    showToast('Release date updated successfully');
                                  } else {
                                    alert('Error: Appointment ID is missing.');
                                    return; // stop if there's an error
                                  }
                                } else {
                                  await onConfirm(ticket.id, step.step_number, appt?.transaction_types?.name, name, confirmLabel, finalDate, releasedTo, documentVerified)
                                }
                                onClose()
                              }}
                              disabled={isConfirming || (isRelease && !releaseDate)}
                              className={`px-5 py-2.5 rounded-xl border border-maroon text-[13px] font-bold font-sans transition-all shadow-sm hover:-translate-y-0.5
                                ${isConfirming || (isRelease && !releaseDate) ? 'bg-white text-maroon/40 border-maroon/40 cursor-not-allowed shadow-none' : 'bg-white text-maroon cursor-pointer hover:bg-maroon hover:text-white'}
                              `}
                            >
                              {isConfirming ? 'Confirming...' : confirmLabel}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Release Form Below Title */}
                      {isCurrent && isRelease && (
                        <div className="mt-2 pt-5 border-t border-border/80">
                          <div className="flex flex-col gap-5">
                            <div>
                              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] mb-3">
                                Choose released date to notify student:
                              </label>
                              <div className="flex flex-col gap-3">
                                <div className="flex gap-4 items-center">
                                  <label 
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 border ${releaseDate === getTodayStr() ? 'bg-maroon/5 border-maroon/20 text-maroon shadow-[0_2px_8px_rgba(123,26,42,0.05)]' : 'bg-transparent border-transparent text-text-sub hover:text-text-main hover:bg-black/5'}`}
                                    onClick={() => setReleaseDate(getTodayStr())}
                                  >
                                    {releaseDate === getTodayStr() ? <CircleDot size={18} className="text-maroon" /> : <Circle size={18} className="text-text-muted" />}
                                    <span className="font-bold text-[14px]">Ready Now</span>
                                  </label>

                                  <label 
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 border ${releaseDate !== getTodayStr() ? 'bg-maroon/5 border-maroon/20 text-maroon shadow-[0_2px_8px_rgba(123,26,42,0.05)]' : 'bg-transparent border-transparent text-text-sub hover:text-text-main hover:bg-black/5'}`}
                                    onClick={() => setReleaseDate('')}
                                  >
                                    {releaseDate !== getTodayStr() ? <CircleDot size={18} className="text-maroon" /> : <Circle size={18} className="text-text-muted" />}
                                    <span className="font-bold text-[14px]">Schedule Date</span>
                                  </label>
                                </div>
                                
                                {releaseDate !== getTodayStr() && (
                                  <div className="animate-fade-in w-full max-w-50">
                                    <input 
                                      type="date" 
                                      value={releaseDate} 
                                      onChange={e => setReleaseDate(e.target.value)}
                                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-off-white text-[14px] font-semibold outline-none text-text-main focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/10 transition-all"
                                    />
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-5 p-4 rounded-xl bg-gold-light/40 border border-gold-border/60 flex items-start gap-3 transition-colors hover:bg-gold-light/60">
                            <input 
                              type="checkbox" 
                              id="verifyDoc" 
                              checked={documentVerified}
                              onChange={e => setDocumentVerified(e.target.checked)}
                              className="mt-0.5 w-5 h-5 text-maroon focus:ring-maroon border-border rounded cursor-pointer transition-all"
                            />
                            <label htmlFor="verifyDoc" className="text-[14px] text-text-main font-semibold leading-snug cursor-pointer select-none">
                              I confirm that the document is complete, correct, and ready for release.
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
        </div>
        ) : (
          <div>
            <h3 className="text-sm font-bold text-text-main uppercase tracking-[0.06em] mb-4">Additional Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Appointment Date</label>
                <div className="text-[15px] font-bold text-text-main">
                  {appt?.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Walk-in'}
                </div>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Time Slot</label>
                <div className="text-[15px] font-bold text-text-main">
                  {appt?.time_slot ? (() => {
                    const parts = appt.time_slot.split(':');
                    if (parts.length < 2) return appt.time_slot;
                    const h = parseInt(parts[0], 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return `${h % 12 || 12}:${parts[1]} ${ampm}`;
                  })() : 'Any time'}
                </div>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Priority</label>
                <div className="text-[15px] font-bold text-text-main capitalize">
                  {appt?.priority_class || 'Regular'}
                </div>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Ticket Issued At</label>
                <div className="text-[15px] font-bold text-text-main">
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                </div>
              </div>
            </div>
            
            {(appt?.notes || (appt?.transaction_types?.required_documents && appt.transaction_types.required_documents.length > 0)) && (
              <div className="grid grid-cols-1 gap-4 mb-2">
                {appt?.notes && (
                  <div className="p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                    <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Request Details (Purpose, Semester, Year)</label>
                    <div className="text-[14px] font-medium text-text-main whitespace-pre-wrap leading-relaxed">
                      {appt.notes}
                    </div>
                  </div>
                )}
                
                {appt?.transaction_types?.required_documents && appt.transaction_types.required_documents.length > 0 && (
                  <div className="p-5 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-1">
                    <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Required Documents</label>
                    <ul className="text-[14px] font-medium text-text-main pl-4 m-0 space-y-1">
                      {appt.transaction_types.required_documents.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-full text-[13.5px] font-semibold shadow-lg animate-fade-down z-9999 flex items-center gap-2">
          <Check size={16} className="text-success" />
          {toastMsg}
        </div>
      )}
    </div>
  ), document.body)
}
