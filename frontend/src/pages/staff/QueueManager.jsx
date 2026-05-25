import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getTodaysQueue, confirmStep } from '../../services/queueService'

const STEP_COLORS = {
  pending: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export default function QueueManager() {
  const { token } = useAuth()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchQueue = async () => {
    try {
      const data = await getTodaysQueue(token)
      setQueue(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfirm = async (queueTicketId, stepNumber) => {
    const key = `${queueTicketId}-${stepNumber}`
    setConfirming(key)
    setError('')
    try {
      await confirmStep(token, queueTicketId, stepNumber)
      await fetchQueue()
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(null)
    }
  }

  const activeQueue = queue.filter(q => q.ticket.status !== 'completed')
  const completedQueue = queue.filter(q => q.ticket.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Today's Queue</h2>
          <p className="text-gray-500 text-sm">
            {activeQueue.length} active · {completedQueue.length} completed
            {lastUpdated && ` · Updated ${lastUpdated}`}
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading queue...</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">No queue tickets for today yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active tickets */}
          {activeQueue.map(({ ticket, steps }) => {
            // eslint-disable-next-line no-unused-vars
            const currentStep = steps.find(s => s.status === 'in_progress')
            return (
              <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-bold text-green-600">
                        {ticket.queue_number}
                      </span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        In Progress
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {ticket.users?.last_name}, {ticket.users?.first_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      ID: {ticket.users?.student_id} · {ticket.appointments?.time_slot}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Step {ticket.current_step}/{ticket.total_steps}</p>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div key={step.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg ${STEP_COLORS[step.status]}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{step.step_number}.</span>
                        <span className="text-sm font-medium">{step.step_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.status === 'completed' && (
                          <span className="text-xs">✅ Done</span>
                        )}
                        {step.status === 'pending' && (
                          <span className="text-xs">⏳ Waiting</span>
                        )}
                        {step.status === 'in_progress' && (
                          <button
                            onClick={() => handleConfirm(ticket.id, step.step_number)}
                            disabled={confirming === `${ticket.id}-${step.step_number}`}
                            className="text-xs bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold px-3 py-1.5 rounded-lg"
                          >
                            {confirming === `${ticket.id}-${step.step_number}`
                              ? 'Confirming...'
                              : '✓ Confirm Done'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Completed tickets */}
          {completedQueue.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Completed Today</p>
              <div className="space-y-2">
                {completedQueue.map(({ ticket }) => (
                  <div key={ticket.id}
                    className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-400 mr-3">{ticket.queue_number}</span>
                      <span className="text-sm text-gray-500">
                        {ticket.users?.last_name}, {ticket.users?.first_name}
                      </span>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}