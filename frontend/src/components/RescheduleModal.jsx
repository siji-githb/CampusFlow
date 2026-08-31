import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getAvailableSlots, rescheduleAppointment } from '../services/appointmentService'
import { HelpCircle, CloudSun, Sun, Info, AlertTriangle, Users, Loader2 } from 'lucide-react'
import { CalendarWidget, SlotBtn } from './CalendarWidget'

export default function RescheduleModal({ token, appointment, appt, onClose, onSuccess, onConfirm }) {
  const currentAppt = appointment || appt || {}
  const txTypeId = currentAppt.transaction_type_id || currentAppt.transaction_types?.id
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsData, setSlotsData] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmingReschedule, setConfirmingReschedule] = useState(false)

  const fmtLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const todayDate = new Date()
  const minDateObj = new Date(todayDate)
  minDateObj.setDate(minDateObj.getDate() + 1) // Reschedule requires at least 1 day in advance (tomorrow)
  const minDate = fmtLocal(minDateObj)

  const maxDateObj = new Date(todayDate)
  maxDateObj.setDate(maxDateObj.getDate() + 30)
  const maxDate = fmtLocal(maxDateObj)

  useEffect(() => {
    if (!selectedDate || !txTypeId) return
    const fetchSlots = async () => {
      setLoading(true); setError(''); setSlotsData(null); setSelectedSlot('')
      try { setSlotsData(await getAvailableSlots(txTypeId, selectedDate)) }
      catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    fetchSlots()
  }, [selectedDate, txTypeId])

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

  const fmt12h = (t) => {
    if (!t) return ''
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }

  const handleConfirmClick = () => {
    if (!selectedDate || !selectedSlot) return
    setConfirmingReschedule(true)
  }

  const handleConfirmExecute = async () => {
    setLoading(true); setError('');
    try {
      if (onConfirm) {
        await onConfirm(currentAppt.id, selectedDate, selectedSlot)
      } else {
        await rescheduleAppointment(token, currentAppt.id, selectedDate, selectedSlot, currentAppt.notes)
      }
      if (onSuccess) onSuccess()
    } catch (e) { setError(e.message); setLoading(false); setConfirmingReschedule(false); }
  }

  const modalContent = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-4 pointer-events-auto">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-2xs transition-opacity" 
        onClick={() => !loading && onClose()} 
      />
      
      <div className="animate-fade-up relative w-full max-w-110 bg-white rounded-2xl sm:rounded-3xl max-h-[90vh] sm:max-h-[85vh] shadow-2xl flex flex-col z-10 border border-border overflow-hidden">
        {/* Sticky Header */}
        <div className="shrink-0 bg-white px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border flex justify-between items-center z-10">
          <div className="min-w-0 pr-2">
            <h2 className="font-serif text-base sm:text-lg font-bold m-0 text-maroon leading-tight">
              Reschedule Appointment
            </h2>
            <p className="text-fluid-11 sm:text-xs text-text-sub m-0 mt-0.5 truncate">
              {currentAppt.transaction_types?.name || 'Select a new date & time slot'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border bg-off-white text-text-sub hover:text-text-main flex items-center justify-center cursor-pointer transition-colors shadow-2xs text-base sm:text-lg shrink-0 font-sans"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 md:p-5 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="py-2.5 px-3 rounded-xl bg-danger-light border border-danger-border text-danger text-xs mb-3 font-medium flex items-center gap-1.5">
              <AlertTriangle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Calendar card */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-border p-2.5 sm:p-3.5 mb-3 shadow-2xs">
            <CalendarWidget 
              selectedDate={selectedDate} 
              onDateSelect={setSelectedDate} 
              minDateStr={minDate} 
              maxDateStr={maxDate} 
            />
          </div>

          {/* Slots skeleton */}
          {loading && !slotsData && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-border p-3.5 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="animate-pulse h-3.5 w-28 rounded bg-border" />
                <div className="animate-pulse h-3 w-20 rounded bg-border" />
              </div>
              <div className="space-y-1.5">
                <div className="animate-pulse h-2.5 w-14 rounded bg-border mb-1.5" />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-8 rounded-xl border border-border bg-border/20" />)}
                </div>
              </div>
            </div>
          )}

          {/* Slots panel */}
          {slotsData && !loading && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-border p-3 sm:p-3.5 mb-3 shadow-2xs animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-3 pb-2 border-b border-border/60">
                <h3 className="font-serif text-xs sm:text-sm font-bold text-text-main m-0">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
                <span className="text-fluid-10-5 sm:text-fluid-11-5 text-text-sub flex items-center gap-1 font-medium">
                  {slotsData.daily_cap === 0 ? (
                    <span className="text-danger font-bold uppercase tracking-wider text-fluid-9-5">Date Blocked</span>
                  ) : (
                    <><Users size={12} /> {slotsData.daily_cap - slotsData.total_booked} of {slotsData.daily_cap} slots left</>
                  )}
                </span>
              </div>

              {slotsData.note && (
                <div className={`p-2.5 rounded-xl border mb-2.5 flex items-start gap-1.5 text-xs ${slotsData.daily_cap === 0 ? 'bg-danger-light border-danger-border text-danger' : 'bg-info-light border-info-border text-info'}`}>
                  {slotsData.daily_cap === 0 ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-fluid-10-5 font-bold uppercase tracking-widest m-0 mb-0.5">
                      {slotsData.daily_cap === 0 ? 'Date Blocked' : 'Notice'}
                    </p>
                    <p className="text-fluid-11-5 m-0 font-medium leading-relaxed">
                      {slotsData.note}
                    </p>
                  </div>
                </div>
              )}

              {slotsData.slots.length === 0 && !slotsData.note && (
                <div className="p-3 text-center text-text-sub text-xs">
                  No available slots for this date.
                </div>
              )}

              {morningSlots.length > 0 && (
                <div className="mb-3">
                  <p className="text-fluid-10 sm:text-fluid-11 font-bold text-text-sub m-0 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
                    <CloudSun size={12} className="text-gold" /> Morning Slots
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {morningSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                  </div>
                </div>
              )}

              {afternoonSlots.length > 0 && (
                <div>
                  <p className="text-fluid-10 sm:text-fluid-11 font-bold text-text-sub m-0 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
                    <Sun size={12} className="text-gold" /> Afternoon Slots
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {afternoonSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 p-3 sm:p-3.5 bg-white border-t border-border z-10 flex gap-2">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl border border-border bg-white text-text-main text-xs sm:text-fluid-13 font-bold font-sans transition-colors hover:bg-off-white cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirmClick} 
            disabled={!selectedSlot || loading}
            className={`flex-2 py-2 sm:py-2.5 px-3.5 rounded-xl border-none text-xs sm:text-fluid-13 font-bold font-sans transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
              selectedSlot && !loading ? 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark' : 'bg-gray-200 text-text-muted cursor-not-allowed opacity-60'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Checking...</span>
              </>
            ) : (
              'Confirm Reschedule'
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Inner Modal */}
      {confirmingReschedule && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/60 transition-opacity backdrop-blur-2xs" onClick={() => !loading && setConfirmingReschedule(false)} />
          <div className="animate-fade-up relative w-[92%] max-w-sm bg-white rounded-2xl sm:rounded-3xl p-5 text-center shadow-2xl z-10 border border-border">
            <div className="w-11 h-11 rounded-full bg-gold-light text-gold flex items-center justify-center mx-auto mb-2.5 shadow-2xs border border-gold-border/60">
              <HelpCircle size={20} />
            </div>
            <h3 className="font-serif text-base font-bold text-text-main m-0 mb-1">Confirm Reschedule?</h3>
            <p className="text-xs text-text-sub m-0 mb-4 leading-relaxed">
              Move your appointment to <strong className="text-text-main">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong> at <strong className="text-maroon font-bold">{selectedSlot ? fmt12h(selectedSlot) : ''}</strong>?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmingReschedule(false)}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-xl border border-border bg-white text-text-main text-xs font-bold font-sans hover:bg-off-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Go Back
              </button>
              <button 
                onClick={handleConfirmExecute}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-xl border-none bg-maroon text-white text-xs font-bold font-sans hover:bg-maroon-dark transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-80"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Yes, Reschedule'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
}
