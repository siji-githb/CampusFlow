import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'

const STATUS_STYLES = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-gray-100 text-gray-600',
}

export default function MyAppointments() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)

  const fetchAppointments = async () => {
    try {
      const data = await getMyAppointments(token)
      setAppointments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    setCancelling(id)
    try {
      await cancelAppointment(token, id)
      await fetchAppointments()
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-semibold text-gray-800">My Appointments</span>
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
          <div className="text-center py-12 text-gray-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No appointments yet.</p>
            <button
              onClick={() => navigate('/student/book')}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm"
            >
              Book an Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {appt.transaction_types?.name || 'Transaction'}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_STYLES[appt.status] || 'bg-gray-100 text-gray-600'}`}>
                    {appt.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📅 {appt.appointment_date} at {appt.time_slot}</p>
                  <p>🏷️ Priority: <span className="capitalize">{appt.priority_class}</span></p>
                  {appt.notes && <p>📝 {appt.notes}</p>}
                </div>

                {appt.transaction_types?.processing_steps && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-600 mb-1">Processing steps:</p>
                    <div className="flex flex-wrap gap-1">
                      {appt.transaction_types.processing_steps.map((step, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {i + 1}. {step}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {appt.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    disabled={cancelling === appt.id}
                    className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {cancelling === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}