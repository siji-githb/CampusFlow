import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, DoorOpen, Cog, Users, Ticket } from 'lucide-react'

// ── Queue Details Modal ──

export default function QueueDetailsModal({ ticketData, onClose, onConfirm, onSendToProcessing, confirming, onSetReleaseDate }) {
  const { ticket, steps } = ticketData
  const student = ticket.users
  const name    = student ? `${student.last_name}, ${student.first_name}` : 'Unknown'
  const appt    = ticket.appointments
  
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const [releaseDate, setReleaseDate] = useState(appt?.release_date || getTodayStr())
  const [savingDate, setSavingDate] = useState(false)

  return createPortal((
    <div className="fixed inset-0 z-1000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-170 bg-white rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5"><Ticket size={14}/> Queue Details</div>
            <h2 className="font-serif text-[32px] font-extrabold text-maroon m-0 leading-none">{ticket.queue_number}</h2>
          </div>
          <button onClick={onClose} className="bg-surface/50 border-none cursor-pointer text-text-muted flex items-center justify-center hover:bg-border hover:text-text-main transition-colors p-2 rounded-full"><X size={20} /></button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 bg-surface/50 rounded-2xl border border-border shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-sm">
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-[0.04em] mb-1.5 flex items-center gap-1.5"><Users size={13} /> Student</div>
            <div className="text-[16px] font-bold text-text-main mb-0.5">{name}</div>
            <div className="text-[13px] text-text-sub font-mono">{student?.student_id || '—'}</div>
          </div>
          <div className="p-5 bg-surface/50 rounded-2xl border border-border shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-sm">
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-[0.04em] mb-1.5 flex items-center gap-1.5"><Ticket size={13} /> Transaction</div>
            <div className="text-[15px] font-semibold text-text-main leading-snug">{appt?.transaction_types?.name}</div>
          </div>
        </div>

        {/* Release Date */}
        {(() => {
          const currentActiveStep = steps.find(s => s.status === 'in_progress')
          const isCurrentlyInProcessing = currentActiveStep && (currentActiveStep.location === 'Back Office' || currentActiveStep.requires_presence === false)

          // If the date is already set, or we are in the processing table, display as text only
          if (appt?.release_date || isCurrentlyInProcessing) {
            return (
              <div className="mb-8 bg-off-white/80 backdrop-blur-sm p-5 rounded-2xl border border-border flex flex-col gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Document Release Date</label>
                <div className={`text-[15px] font-semibold ${appt?.release_date ? 'text-text-main' : 'text-text-muted italic'}`}>
                  {appt?.release_date 
                    ? new Date(appt.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) 
                    : 'Not set'}
                </div>
              </div>
            )
          }
          
          // Otherwise (student at counter, date not set), show the date picker so they can set it
          return (
            <div className="mb-8 bg-off-white/80 backdrop-blur-sm p-5 rounded-2xl border border-border flex items-end gap-4 flex-wrap shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex-1 min-w-50">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.04em] mb-2">Document Release Date</label>
                <input 
                  type="date" 
                  value={releaseDate} 
                  onChange={e => setReleaseDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-[13px] font-medium outline-none text-text-main font-sans focus:border-maroon focus:ring-2 focus:ring-maroon/20 transition-all shadow-sm"
                />
              </div>
            </div>
          )
        })()}

        {/* Steps */}
        <div>
          <h3 className="text-sm font-bold text-text-main uppercase tracking-[0.06em] mb-5">Processing Steps</h3>
          <div className="flex flex-col gap-0">
            {steps.filter(step => {
              if (step.step_name.includes('Release')) {
                const currentActiveStep = steps.find(s => s.status === 'in_progress')
                const isCurrentlyInProcessing = currentActiveStep && (currentActiveStep.location === 'Back Office' || currentActiveStep.requires_presence === false)
                const showRelease = ticket.status === 'completed' || isCurrentlyInProcessing || (currentActiveStep && currentActiveStep.step_number >= step.step_number)
                return showRelease
              }
              return true
            }).map((step, idx, filteredArr) => {
              const isLast = idx === filteredArr.length - 1
              const isCurrent = ticket.status === 'in_progress' && step.status === 'in_progress'
              const confirmKey = `${ticket.id}-${step.step_number}`
              const isConfirming = confirming === confirmKey
              
              const isReceiptSub = step.step_name.includes('Checking') || step.step_name.includes('Receipt Submission')
              const isFormSub = step.step_name.includes('Form Submission')
              const isFilingVerif = step.step_name.includes('Filing & Verification')
              const isVerifPrep = step.step_name.includes('Verification & Preparation')
              const isRelease = step.step_name.includes('Release')
              const isFormIssuance = step.step_name.includes('Form Issuance')
              
              const hideSendToProcessing = isReceiptSub || isFormSub || isFilingVerif || isRelease || isFormIssuance
              const hideConfirmStep = isVerifPrep && step.location !== 'Back Office'
              const confirmLabel = (isFilingVerif || isRelease || isFormIssuance) ? 'Mark as Done' : 'Confirm Step'
              
              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold shadow-sm transition-all duration-300
                      ${step.status === 'completed' ? 'bg-success text-white ring-4 ring-success-light/50' : 
                        step.status === 'in_progress' ? 'bg-maroon text-white border border-maroon ring-4 ring-maroon-light' : 
                        'bg-surface border border-border text-text-muted'}`}
                    >
                      {step.status === 'completed' ? <Check size={16} /> : step.step_number}
                    </div>
                    {!isLast && <div className={`w-[2px] flex-1 min-h-10 my-1.5 transition-colors duration-500 ${step.status === 'completed' ? 'bg-success/50' : 'bg-border/60'}`} />}
                  </div>
                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                    <div className={`flex justify-between items-center rounded-2xl transition-all duration-300 ${isCurrent ? 'bg-white p-4 border border-maroon-border shadow-md -mt-2' : 'bg-transparent py-2 border-none mt-0 opacity-70 hover:opacity-100'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className={`text-[15px] font-semibold ${step.status === 'completed' ? 'text-success' : 'text-text-main'}`}>{step.step_name}</div>
                        </div>
                        {step.status === 'completed' && step.confirmed_at && (
                          <div className="text-xs text-text-muted mt-0.5">Confirmed at {new Date(step.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                        )}
                        {isCurrent && (
                          <div className="text-xs text-gold mt-0.5 font-semibold">
                            {step.requires_presence !== false ? 'Active Step — student at counter' : 'Active Step — processing, no line'}
                          </div>
                        )}
                      </div>
                      {isCurrent && (
                        <div className="flex items-center gap-2.5">
                          {step.location !== 'Back Office' && !hideSendToProcessing && (
                            <button
                              onClick={() => {
                                const finalDate = releaseDate || new Date().toISOString().split('T')[0]
                                onSendToProcessing(ticket.id, appt?.transaction_types?.name, name, finalDate)
                                onClose()
                              }}
                              disabled={isConfirming}
                              className={`px-4 py-2.5 rounded-full border border-border text-[12.5px] font-bold font-sans transition-all shadow-sm hover:-translate-y-[1px]
                                ${isConfirming ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-white text-text-main cursor-pointer hover:bg-off-white'}
                              `}
                            >
                              Send to Processing
                            </button>
                          )}
                          {!hideConfirmStep && (
                            <button
                              onClick={() => {
                                const finalDate = releaseDate || new Date().toISOString().split('T')[0]
                                onConfirm(ticket.id, step.step_number, appt?.transaction_types?.name, name, confirmLabel, finalDate)
                                if (isLast || confirmLabel === 'Mark as Done') onClose()
                              }}
                              disabled={isConfirming}
                              className={`px-5 py-2.5 rounded-full border-none text-[12.5px] font-bold font-sans transition-all shadow-sm hover:-translate-y-[1px]
                                ${isConfirming ? 'bg-maroon/50 text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-md'}
                              `}
                            >
                              {isConfirming ? 'Confirming...' : confirmLabel}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  ), document.body)
}
