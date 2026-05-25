import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getMyQueue, activateQueue } from '../../services/queueService'
import { getMyAppointments } from '../../services/appointmentService'

const STEP_STATUS = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  completed: { label: 'Done', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

export default function MyQueue() {
  // eslint-disable-next-line no-unused-vars
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [queueData, setQueueData] = useState(null)
  const [todayAppointments, setTodayAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(null)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const fetchQueue = async () => {
    try {
      const data = await getMyQueue(token)
      setQueueData(data.ticket ? data : null)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchTodayAppointments = async () => {
    try {
      const appts = await getMyAppointments(token)
      const todayAppts = appts.filter(
        a => a.appointment_date === today && a.status === 'confirmed'
      )
      setTodayAppointments(todayAppts)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    Promise.all([fetchQueue(), fetchTodayAppointments()])
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleActivate = async (appointmentId) => {
    setActivating(appointmentId)
    setError('')
    try {
      await activateQueue(token, appointmentId)
      await fetchQueue()
      await fetchTodayAppointments()
    } catch (err) {
      setError(err.message)
    } finally {
      setActivating(null)
    }
  }

  const ticket = queueData?.ticket
  const steps = queueData?.steps || []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-semibold text-gray-800">My Queue</span>
        </div>
        <button
          onClick={() => navigate('/student/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading queue...</div>
        ) : ticket ? (
          // Active queue ticket
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Queue Number</p>
                  <p className="text-4xl font-bold text-green-600">{ticket.queue_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full capitalize
                    ${ticket.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {ticket.status === 'in_progress' ? 'In Progress' : ticket.status}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <p>{ticket.appointments?.transaction_types?.name}</p>
                <p>{ticket.appointments?.appointment_date} at {ticket.appointments?.time_slot}</p>
              </div>
            </div>

            {/* Step tracker */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Transaction Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const style = STEP_STATUS[step.status] || STEP_STATUS.pending
                  const isLast = index === steps.length - 1
                  return (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                          ${step.status === 'completed' ? 'bg-green-500 text-white' :
                            step.status === 'in_progress' ? 'bg-yellow-400 text-white' :
                            'bg-gray-200 text-gray-500'}`}>
                          {step.status === 'completed' ? '✓' : step.step_number}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 h-8 mt-1 ${step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800 text-sm">{step.step_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${style.color}`}>
                            {style.label}
                          </span>
                        </div>
                        {step.status === 'in_progress' && (
                          <p className="text-xs text-yellow-600 mt-1">
                            ⏳ Please proceed to this counter
                          </p>
                        )}
                        {step.status === 'completed' && step.confirmed_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            ✅ Confirmed at {new Date(step.confirmed_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {ticket.status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-green-600 font-semibold">🎉 Transaction Complete!</p>
                  <p className="text-gray-400 text-sm mt-1">All steps have been processed.</p>
                </div>
              )}
            </div>
          </div>
        ) : todayAppointments.length > 0 ? (
          // Has appointment today but no queue yet
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Today's Appointments</h2>
            <p className="text-gray-500 text-sm mb-4">
              Activate your queue number when you arrive at the Registrar's Office.
            </p>
            <div className="space-y-3">
              {todayAppointments.map((appt) => (
                <div key={appt.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm">
                        {appt.transaction_types?.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        📅 {appt.appointment_date} at {appt.time_slot}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Confirmed
                    </span>
                  </div>
                  <button
                    onClick={() => handleActivate(appt.id)}
                    disabled={activating === appt.id}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg text-sm"
                  >
                    {activating === appt.id ? 'Activating...' : '🎫 Get Queue Number'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // No appointments today
          <div className="text-center py-12">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-600 font-medium">No appointments today</p>
            <p className="text-gray-400 text-sm mt-1">
              Queue numbers are only available on your appointment date.
            </p>
            <button
              onClick={() => navigate('/student/book')}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm"
            >
              Book an Appointment
            </button>
          </div>
        )}
      </main>
    </div>
  )
}