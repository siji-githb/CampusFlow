import React, { useState, useEffect, useMemo } from 'react'
import { getAvailableSlots, rescheduleAppointment } from '../services/appointmentService'
import { HelpCircle, CloudSun, Sun, Info, AlertTriangle, Users } from 'lucide-react'
import { CalendarWidget, SlotBtn } from './CalendarWidget'

export default function RescheduleModal({ token, appointment, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsData, setSlotsData] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmingReschedule, setConfirmingReschedule] = useState(false)

  const todayDate = new Date()
  const minDate = todayDate.toISOString().split('T')[0]
  const maxDateObj = new Date(); maxDateObj.setDate(maxDateObj.getDate() + 30)
  const maxDate = maxDateObj.toISOString().split('T')[0]

  useEffect(() => {
    if (!selectedDate) return
    const fetchSlots = async () => {
      setLoading(true); setError(''); setSlotsData(null); setSelectedSlot('')
      try { setSlotsData(await getAvailableSlots(appointment.transaction_type_id, selectedDate)) }
      catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    fetchSlots()
  }, [selectedDate, appointment.transaction_type_id])

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
      await rescheduleAppointment(token, appointment.id, selectedDate, selectedSlot, appointment.notes)
      onSuccess()
    } catch (e) { setError(e.message); setLoading(false); setConfirmingReschedule(false); }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="animate-fade-up relative w-full max-w-140 bg-white rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md px-8 py-6 border-b border-border flex justify-between items-center">
          <h2 className="font-serif text-[24px] font-bold m-0 text-maroon">Reschedule Appointment</h2>
          <button onClick={onClose} className="bg-transparent border-none text-[28px] cursor-pointer text-text-sub hover:text-maroon transition-colors leading-none">×</button>
        </div>

        <div className="p-8">
          {error && <div className="py-3 px-4 rounded-[10px] bg-danger-light border border-danger-border text-danger text-[13px] mb-6 font-medium">⚠ {error}</div>}

          {/* Calendar card */}
          <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <CalendarWidget selectedDate={selectedDate} onDateSelect={setSelectedDate} minDateStr={minDate} maxDateStr={maxDate} />
          </div>

          {/* Slots skeleton */}
          {loading && !slotsData && (
            <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-6">
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
            </div>
          )}

          {/* Slots panel */}
          {slotsData && !loading && (
            <div className="bg-white rounded-[14px] border-[1.5px] border-border p-6 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)] animate-fade-up">
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
                <div className="mb-2">
                  <p className="text-[12px] font-semibold text-text-sub m-0 mb-2.5 flex items-center gap-1.5">
                    <Sun size={14} className="text-gold" /> Afternoon
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {afternoonSlots.map(s => <SlotBtn key={s.time_slot} slot={{ ...s, display: fmt12h(s.time_slot) }} selected={selectedSlot === s.time_slot} onSelect={setSelectedSlot} selectedDate={selectedDate} />)}
                  </div>
                </div>
              )}
            </div>
          )}



          <button 
            onClick={handleConfirmClick} 
            disabled={!selectedSlot || loading}
            className={`w-full py-4 px-6 rounded-xl border-none text-[15px] font-bold font-sans transition-all duration-200 shadow-sm ${
              selectedSlot && !loading ? 'bg-maroon text-white cursor-pointer hover:opacity-90 shadow-[0_4px_12px_rgba(123,26,42,0.15)]' : 'bg-gray-200 text-text-muted cursor-not-allowed opacity-70'
            }`}
          >
            Confirm Reschedule
          </button>
        </div>
      </div>

      {/* Confirmation Inner Modal */}
      {confirmingReschedule && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setConfirmingReschedule(false)} />
          <div className="animate-scale-up relative w-full max-w-85 bg-white rounded-3xl p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <div className="w-16 h-16 rounded-full bg-gold-light text-gold flex items-center justify-center mx-auto mb-5 border-2 border-gold-border">
              <HelpCircle size={28} />
            </div>
            <h3 className="font-serif text-[22px] font-bold text-maroon m-0 mb-3">Confirm Change?</h3>
            <p className="text-[14px] text-text-sub m-0 mb-8 leading-normal">
              Move your appointment to <strong className="text-text-main">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</strong> at <strong className="text-maroon">{selectedSlot ? fmt12h(selectedSlot) : ''}</strong>?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirmExecute}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl border-none bg-maroon text-white text-[14px] font-bold cursor-pointer font-sans transition-all hover:opacity-90 shadow-[0_4px_12px_rgba(123,26,42,0.15)] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Yes, Reschedule'}
              </button>
              <button 
                onClick={() => setConfirmingReschedule(false)}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl border-[1.5px] border-border bg-white text-text-main text-[14px] font-bold cursor-pointer font-sans transition-all hover:bg-off-white disabled:opacity-50"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
