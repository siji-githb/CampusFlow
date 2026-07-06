import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getIdRequests, updateIdRequestStatus } from '../../services/adminService'
import { Check, X, Clock, HelpCircle, Mail, BookOpen } from 'lucide-react'

export default function IdRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = await getIdRequests(token)
      setRequests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      const updated = await updateIdRequestStatus(token, id, status)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated.data } : r))
    } catch (err) {
      alert("Failed to update status: " + err.message)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-8 w-48 bg-border rounded-md mb-4" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-border rounded-xl" />)}
      </div>
    )
  }

  const pending = requests.filter(r => r.status === 'pending')
  const history = requests.filter(r => r.status !== 'pending')

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-6">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">User Management</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <HelpCircle size={24} className="text-maroon" /> Student ID Requests
        </h1>
        <p className="text-[14px] text-text-sub mt-2 mb-0">
          Manage requests from students who forgot their Student ID. 
          Send them an email with their ID, then mark the request as resolved.
        </p>
      </div>

      {error && (
        <div className="py-3 px-4 rounded-xl bg-danger-light border border-danger-border text-danger text-[13px] mb-6">
          {error}
        </div>
      )}

      {/* PENDING */}
      <h2 className="text-[15px] font-bold text-text-main mb-3 flex items-center gap-2">
        <Clock size={18} className="text-gold" /> Needs Action ({pending.length})
      </h2>
      
      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center text-text-muted text-[14px] mb-8 shadow-sm">
          No pending ID requests.
        </div>
      ) : (
        <div className="grid gap-4 mb-10">
          {pending.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border-[1.5px] border-maroon-border p-5 shadow-sm flex items-start justify-between gap-5 transition-shadow hover:shadow-md">
              <div>
                <h3 className="text-[16px] font-bold text-text-main m-0 mb-1">
                  {req.last_name}, {req.first_name}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-[13px] text-text-sub mt-2">
                  <span className="flex items-center gap-1.5"><Mail size={15} /> {req.email}</span>
                  <span className="flex items-center gap-1.5"><BookOpen size={15} /> {req.course}</span>
                </div>
                <div className="text-[11px] text-text-muted mt-3">
                  Requested on {new Date(req.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <a href={`mailto:${req.email}?subject=Your CampusFlow Student ID&body=Hi ${req.first_name},`} className="w-full text-center px-4 py-2 rounded-lg bg-blue-light text-blue font-bold text-[13px] border border-blue-border no-underline hover:bg-blue hover:text-white transition-colors">
                  Send Email
                </a>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateStatus(req.id, 'resolved')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-success-light text-success font-bold text-[13px] border border-success-border cursor-pointer hover:bg-success hover:text-white transition-colors">
                    <Check size={16} /> Resolved
                  </button>
                  <button onClick={() => handleUpdateStatus(req.id, 'ignored')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface text-text-muted font-bold text-[13px] border border-border cursor-pointer hover:bg-border transition-colors" title="Dismiss without action">
                    <X size={16} /> Ignore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY */}
      <h2 className="text-[15px] font-bold text-text-main mb-3 flex items-center gap-2">
        <Check size={18} className="text-success" /> History
      </h2>
      
      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-6 text-center text-text-muted text-[13px] shadow-sm">
          No resolved requests yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {history.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-border px-5 py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-semibold text-text-main">{req.last_name}, {req.first_name}</div>
                <div className="text-[12px] text-text-sub mt-0.5">{req.email} • {req.course}</div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold mb-1 ${req.status === 'resolved' ? 'bg-success-light text-success' : 'bg-surface text-text-muted'}`}>
                  {req.status.toUpperCase()}
                </span>
                <div className="text-[11px] text-text-muted">
                  {new Date(req.resolved_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
