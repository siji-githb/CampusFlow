import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  getTransactionTypes,
  getAvailableSlots,
  bookAppointment
} from '../../services/appointmentService'

export default function BookAppointment() {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [transactionTypes, setTransactionTypes] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsData, setSlotsData] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Min date — tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Max date — 30 days from now
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  useEffect(() => {
    getTransactionTypes()
      .then(setTransactionTypes)
      .catch(err => setError(err.message))
  }, [])

  const handleSelectType = (type) => {
    setSelectedType(type)
    setSelectedDate('')
    setSlotsData(null)
    setSelectedSlot('')
    setStep(2)
  }

  const handleDateChange = async (e) => {
    const date = e.target.value
    setSelectedDate(date)
    setSelectedSlot('')
    setSlotsData(null)
    setError('')
    if (!date) return

    // Check if weekend
    const dayOfWeek = new Date(date + 'T00:00:00').getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setError('Please select a weekday (Monday to Friday)')
      return
    }

    setLoading(true)
    try {
      const data = await getAvailableSlots(selectedType.id, date)
      setSlotsData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    setLoading(true)
    setError('')
    try {
      await bookAppointment(token, {
        transaction_type_id: selectedType.id,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        notes: notes || null
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h2>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-medium">{selectedType?.name}</span>
          </p>
          <p className="text-gray-500 text-sm mb-1">
            📅 {selectedDate} at {selectedSlot}
          </p>
          <p className="text-gray-400 text-xs mt-4 mb-6">
            Please bring all required documents on your appointment date.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/student/appointments')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              View My Appointments
            </button>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-semibold text-gray-800">Book Appointment</span>
        </div>
        <button
          onClick={() => navigate('/student/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                {s === 1 ? 'Transaction' : s === 2 ? 'Schedule' : 'Confirm'}
              </span>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Step 1 — Select Transaction Type */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Select Transaction Type</h2>
            <p className="text-gray-500 text-sm mb-4">What document do you need from the Registrar?</p>
            <div className="space-y-3">
              {transactionTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type)}
                  className="w-full text-left bg-white border border-gray-200 hover:border-green-500 hover:shadow-sm rounded-xl p-4 transition-all"
                >
                  <h3 className="font-semibold text-gray-800">{type.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{type.description}</p>
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Required documents:</p>
                    <div className="flex flex-wrap gap-1">
                      {type.required_documents?.map((doc, i) => (
                        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Select Date and Time */}
        {step === 2 && selectedType && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Choose Schedule</h2>
            <p className="text-gray-500 text-sm mb-4">
              Booking for: <span className="font-medium text-green-600">{selectedType.name}</span>
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                min={minDate}
                max={maxDateStr}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            {loading && (
              <div className="text-center py-6 text-gray-400 text-sm">Loading available slots...</div>
            )}

            {slotsData && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Available Time Slots</p>
                  <span className="text-xs text-gray-400">
                    {slotsData.total_booked}/{slotsData.daily_cap} slots booked
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {slotsData.slots.map((slot) => (
                    <button
                      key={slot.time_slot}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time_slot)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all
                        ${!slot.available
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : selectedSlot === slot.time_slot
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                        }`}
                    >
                      {slot.time_slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSlot && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special instructions or concerns..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setSelectedType(null) }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedSlot}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg text-sm"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && selectedType && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Confirm Appointment</h2>
            <p className="text-gray-500 text-sm mb-4">Please review your appointment details.</p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction</span>
                <span className="font-medium text-gray-800">{selectedType.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-800">{selectedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-800">{selectedSlot}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student</span>
                <span className="font-medium text-gray-800">{user?.first_name} {user?.last_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Priority</span>
                <span className="font-medium text-gray-800 capitalize">{user?.priority_class}</span>
              </div>
              {notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Notes</span>
                  <span className="font-medium text-gray-800">{notes}</span>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">📋 Required Documents</p>
              <ul className="space-y-1">
                {selectedType.required_documents?.map((doc, i) => (
                  <li key={i} className="text-sm text-yellow-700 flex items-center gap-2">
                    <span>•</span> {doc}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm"
              >
                ← Back
              </button>
              <button
                onClick={handleBook}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg text-sm"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
