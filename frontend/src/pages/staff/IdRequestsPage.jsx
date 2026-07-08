import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/useAuth'
import { getIdRequests, updateIdRequestStatus, getStudentRecords, sendIdRequestEmail } from '../../services/adminService'
import { Check, X, Clock, HelpCircle, Mail, BookOpen, Send, User, Calendar, AtSign, Search } from 'lucide-react'

// ── Email Reply Modal ──────────────────────────────────────────────────────────
function EmailModal({ req, token, onClose, onSentAndResolve }) {
  const [studentId, setStudentId] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  // Directory search state
  const [query, setQuery] = useState('')
  const [allRecords, setAllRecords] = useState([])
  const [loadingDir, setLoadingDir] = useState(true)
  const [dirError, setDirError] = useState('')
  const searchRef = useRef()

  const defaultMessage = (id) =>
    `Hi ${req.first_name},\n\nThank you for reaching out to the CRMC Registrar's Office.\n\nAfter checking our records, your Student ID is:\n\n  ${id || '[Student ID Here]'}\n\nPlease keep this for your records. You can now use this ID to create your CampusFlow account.\n\nIf you have any other concerns, feel free to contact us.\n\nBest regards,\nCRMC Registrar's Office`

  useEffect(() => {
    setMessage(defaultMessage(''))
    // Fetch directory on mount
    getStudentRecords(token)
      .then(res => setAllRecords(res.records || []))
      .catch(e => setDirError(e.message))
      .finally(() => setLoadingDir(false))
  }, [])

  const handleIdChange = (val) => {
    setStudentId(val)
    setMessage(defaultMessage(val))
  }

  // Filter records by name or student_id
  const trimmedQuery = query.trim().toLowerCase()
  const filtered = trimmedQuery.length >= 2
    ? allRecords.filter(r =>
        r.student_id?.toLowerCase().includes(trimmedQuery) ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(trimmedQuery) ||
        `${r.last_name} ${r.first_name}`.toLowerCase().includes(trimmedQuery)
      ).slice(0, 6)
    : []

  const handleSelectRecord = (r) => {
    handleIdChange(r.student_id)
    setQuery(`${r.last_name}, ${r.first_name} — ${r.student_id}`)
  }

  const handleSend = async () => {
    setSending(true)
    setSendError('')
    try {
      const subject = 'Your CRMC Student ID – CampusFlow'
      await sendIdRequestEmail(token, req.id, subject, message)
      setSent(true)
    } catch (err) {
      setSendError(err.message || 'Failed to send email. Check configuration.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] w-full max-w-[850px] overflow-hidden animate-fade-up">
        
        {/* Header */}
        <div className="bg-maroon px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-gold tracking-widest uppercase m-0 mb-1">ID Request Response</p>
            <h2 className="text-white font-serif text-[20px] font-bold m-0">Send Student ID</h2>
          </div>
          <button onClick={onClose} className="bg-white/10 border-none text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors shrink-0 text-[18px] leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Student Info & Search */}
          <div className="flex flex-col">
            {/* Student Info */}
            <div className="bg-off-white border border-border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-[13px] text-text-sub">
                <User size={14} className="text-maroon shrink-0" />
                <span><span className="font-semibold text-text-main">{req.first_name} {req.last_name}</span></span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-sub">
                <BookOpen size={14} className="text-maroon shrink-0" />
                <span>{req.course}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-sub col-span-2">
                <AtSign size={14} className="text-maroon shrink-0" />
                <span>{req.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-sub col-span-2">
                <Calendar size={14} className="text-maroon shrink-0" />
                <span>Requested {new Date(req.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Directory Search */}
            <div className="mb-6 flex-1">
              <label className="block text-[11px] font-bold text-text-sub tracking-wider uppercase mb-1.5">
                <span className="flex items-center gap-1.5"><Search size={12} /> Search School Directory</span>
              </label>
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); if (studentId) { setStudentId(''); setMessage(defaultMessage('')) } }}
                  placeholder="Type name or student ID to search…"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border-[1.5px] border-border text-[13px] text-text-main outline-none focus:border-maroon transition-colors"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>

              {/* Loading / error state */}
              {loadingDir && (
                <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-maroon border-t-transparent rounded-full animate-spin" /> Loading directory…
                </p>
              )}
              {dirError && <p className="text-[11px] text-danger mt-1.5">{dirError}</p>}

              {/* Live results dropdown */}
              {filtered.length > 0 && (
                <div className="mt-1.5 rounded-xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.08)] bg-white overflow-hidden max-h-[160px] overflow-y-auto">
                  {filtered.map((r, i) => (
                    <button
                      key={r.student_id}
                      type="button"
                      onClick={() => handleSelectRecord(r)}
                      className={`w-full text-left flex items-center justify-between px-4 py-2.5 border-none cursor-pointer transition-colors hover:bg-maroon-light
                        ${i !== filtered.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-text-main">{r.last_name}, {r.first_name}</div>
                        <div className="text-[11px] text-text-sub mt-0.5">{r.course}</div>
                      </div>
                      <span className="text-[12px] font-bold text-maroon shrink-0 ml-4">{r.student_id}</span>
                    </button>
                  ))}
                </div>
              )}
              {trimmedQuery.length >= 2 && !loadingDir && filtered.length === 0 && (
                <p className="text-[11px] text-text-muted mt-1.5">No matching records found in the directory.</p>
              )}
            </div>

            {/* Selected / manual Student ID */}
            <div>
              <label className="block text-[11px] font-bold text-text-sub tracking-wider uppercase mb-1.5">
                Student ID to Send <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={studentId}
                onChange={e => handleIdChange(e.target.value)}
                placeholder="Auto-filled from search, or type manually"
                className={`w-full px-3.5 py-2.5 rounded-lg border-[1.5px] text-[14px] text-text-main outline-none transition-colors
                  ${studentId ? 'border-success bg-success-light font-bold text-success' : 'border-border focus:border-maroon'}`}
              />
            </div>
          </div>

          {/* Right Column: Email body & Actions */}
          <div className="flex flex-col h-full">
            <div className="mb-4 flex-1 flex flex-col">
              <label className="block text-[11px] font-bold text-text-sub tracking-wider uppercase mb-1.5">Email Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full h-full min-h-[220px] px-3.5 py-3 rounded-lg border-[1.5px] border-border text-[13px] text-text-main outline-none focus:border-maroon transition-colors resize-none font-[inherit] leading-relaxed"
              />
            </div>

            {sendError && (
              <div className="mb-4 py-2.5 px-3.5 rounded-lg bg-danger-light border border-danger-border text-danger text-[13px]">
                {sendError}
              </div>
            )}

            {sent && (
              <div className="mb-4 py-2.5 px-3.5 rounded-lg bg-success-light border border-success-border text-success text-[13px] flex items-center gap-2">
                <Check size={15} /> Email sent successfully to the student.
              </div>
            )}

            <div className="flex gap-3 mt-auto">
              {!sent && (
                <button
                  onClick={handleSend}
                  disabled={!studentId.trim() || sending}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] border-none transition-colors
                    ${(studentId.trim() && !sending) ? 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark' : 'bg-border text-text-muted cursor-not-allowed'}`}
                >
                  <Mail size={16} /> {sending ? 'Sending Email...' : 'Send Email Now'}
                </button>
              )}
              {sent && (
                <button
                  onClick={() => onSentAndResolve(req.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] bg-success-light text-success border border-success-border cursor-pointer hover:bg-success hover:text-white transition-colors"
                >
                  <Check size={16} /> Mark Request as Resolved
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IdRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [emailTarget, setEmailTarget] = useState(null) // the req object to show modal for

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

  const handleSentAndResolve = async (id) => {
    await handleUpdateStatus(id, 'resolved')
    setEmailTarget(null)
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

      {/* Email Modal */}
      {emailTarget && (
        <EmailModal
          req={emailTarget}
          token={token}
          onClose={() => setEmailTarget(null)}
          onSentAndResolve={handleSentAndResolve}
        />
      )}

      <div className="mb-6">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">User Management</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <HelpCircle size={24} className="text-maroon" /> Student ID Requests
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Manage requests from students who forgot their Student ID.
          Click <strong>Send Email</strong> to compose a reply, then mark as resolved.
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
                <button
                  onClick={() => setEmailTarget(req)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-maroon text-white font-bold text-[13px] border-none cursor-pointer hover:bg-maroon-dark transition-colors"
                >
                  <Send size={14} /> Send Email
                </button>
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
                  {req.resolved_at ? new Date(req.resolved_at).toLocaleString() : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
