import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { getIdRequests, updateIdRequestStatus, getStudentRecords, sendIdRequestEmail, deleteIdRequest } from '../../services/adminService'
import { Check, X, Clock, HelpCircle, Mail, BookOpen, Send, User, Calendar, AtSign, Search, Trash2 } from 'lucide-react'

// ── Email Reply Modal ──────────────────────────────────────────────────────────
function EmailModal({ req, token, onClose, onSentAndResolve }) {
  const [studentId, setStudentId] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  // Directory search state
  const [query, setQuery] = useState(req?.last_name || '')
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
      setTimeout(() => {
        onSentAndResolve(req.id)
      }, 1000)
    } catch (err) {
      setSendError(err.message || 'Failed to send email. Check configuration.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] w-full max-w-212.5 overflow-hidden animate-fade-up">
        
        {/* Header - White */}
        <div className="bg-white border-b border-border px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-gold tracking-widest uppercase m-0 mb-1">ID Request Response</p>
            <h2 className="text-text-main font-serif text-[20px] font-bold m-0">Send Student ID</h2>
          </div>
          <button onClick={onClose} className="bg-slate-100 border-none text-text-sub hover:text-text-main rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors shrink-0 text-[18px] leading-none">
            ×
          </button>
        </div>

        <div className="px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-h-[85vh] overflow-y-auto">
          
          {/* Left Column: Student Info & Search */}
          <div className="flex flex-col">
            {/* Student Info */}
            <div className="bg-off-white border border-border rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-[13px] text-text-sub">
                <User size={14} className="text-maroon shrink-0" />
                <span><span className="font-semibold text-text-main">{req.first_name} {req.last_name}</span></span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-sub">
                <BookOpen size={14} className="text-maroon shrink-0" />
                <span>{req.course}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-sub sm:col-span-2">
                <AtSign size={14} className="text-maroon shrink-0" />
                <span className="truncate">{req.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-sub sm:col-span-2">
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
                <div className="mt-1.5 rounded-xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.08)] bg-white overflow-hidden max-h-40 overflow-y-auto">
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
          <div className="flex flex-col h-full min-h-65">
            <div className="mb-4 flex-1 flex flex-col">
              <label className="block text-[11px] font-bold text-text-sub tracking-wider uppercase mb-1.5">Email Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full flex-1 min-h-45 px-3.5 py-3 rounded-lg border-[1.5px] border-border text-[13px] text-text-main outline-none focus:border-maroon transition-colors resize-none font-[inherit] leading-relaxed"
              />
            </div>

            {sendError && (
              <div className="mb-4 py-2.5 px-3.5 rounded-lg bg-danger-light border border-danger-border text-danger text-[13px]">
                {sendError}
              </div>
            )}

            {sent && (
              <div className="mb-4 py-2.5 px-3.5 rounded-lg bg-success-light border border-success-border text-success text-[13px] flex items-center gap-2">
                <Check size={15} /> Email sent and request marked resolved.
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

  const [pendingPage, setPendingPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const loadRequests = useCallback(async (showSkeleton = true) => {
    try {
      if (showSkeleton) setLoading(true)
      const data = await getIdRequests(token)
      setRequests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      if (showSkeleton) setLoading(false)
    }
  }, [token])

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent('ID_REQUESTS_UPDATED', () => {
    loadRequests(false)
  })

  useEffect(() => {
    loadRequests()
    const t = setInterval(() => loadRequests(false), 60000)
    return () => clearInterval(t)
  }, [loadRequests])

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

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} request(s)? This cannot be undone.`)) return
    
    setIsDeleting(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map(id => deleteIdRequest(token, id))
      )
      const failed = results.filter(r => r.status === 'rejected').length
      const succeeded = results.length - failed

      setIsSelectMode(false)
      setSelectedIds(new Set())
      await loadRequests()

      if (failed > 0) {
        setError(`Deleted ${succeeded} of ${results.length} request(s). ${failed} failed — they may have already been removed by another staff member.`)
      }
    } catch (err) {
      setError('Failed to delete requests: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const pending = requests
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

  const history = requests
    .filter(r => r.status !== 'pending')
    .sort((a, b) => {
      const timeB = new Date(b.resolved_at || b.created_at || 0).getTime()
      const timeA = new Date(a.resolved_at || a.created_at || 0).getTime()
      return timeB - timeA
    })

  const itemsPerPage = 5
  
  const totalPendingPages = Math.ceil(pending.length / itemsPerPage) || 1
  const startPending = (pendingPage - 1) * itemsPerPage
  const endPending = Math.min(startPending + itemsPerPage, pending.length)
  const currentPending = pending.slice(startPending, startPending + itemsPerPage)

  const totalHistoryPages = Math.ceil(history.length / itemsPerPage) || 1
  const startHistory = (historyPage - 1) * itemsPerPage
  const endHistory = Math.min(startHistory + itemsPerPage, history.length)
  const currentHistory = history.slice(startHistory, startHistory + itemsPerPage)

  return (
    <div className="animate-fade-up max-w-5xl">

      {/* Email Modal */}
      {emailTarget && (
        <EmailModal
          req={emailTarget}
          token={token}
          onClose={() => setEmailTarget(null)}
          onSentAndResolve={handleSentAndResolve}
        />
      )}

      {/* ── Page Header (Always visible) ── */}
      <div className="animate-fade-up mb-6">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">User Management</p>
        <h1 className="font-serif text-[22px] sm:text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <HelpCircle size={24} className="text-maroon shrink-0" /> Student ID Requests
        </h1>
        <p className="text-[12px] sm:text-[13px] text-text-sub mt-1.5 sm:mt-2 mb-0">
          Manage requests from students who forgot their Student ID.
          Click <strong>Send Email</strong> to compose a reply, then mark as resolved.
        </p>
      </div>

      {error && (
        <div className="animate-fade-up py-3 px-4 rounded-xl bg-danger-light border border-danger-border text-danger text-[13px] mb-6">
          {error}
        </div>
      )}

      {/* PENDING */}
      <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-[15px] font-bold text-text-main mb-3 flex items-center gap-2">
          <Clock size={18} className="text-gold" />
          <span>Needs Action</span>
          {!loading ? (
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-text-sub text-[11px] font-bold">
              {pending.length}
            </span>
          ) : (
            <span className="w-6 h-4.5 rounded-full bg-border/60 animate-pulse inline-block" />
          )}
        </h2>

        {loading ? (
          <div className="mb-8 grid gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border-[1.5px] border-maroon-border/30 p-5 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-pulse">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-border/70 rounded-md mb-2.5" />
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <div className="h-4 w-52 bg-border/50 rounded" />
                    <div className="h-4 w-36 bg-border/50 rounded" />
                  </div>
                  <div className="h-3 w-44 bg-border/40 rounded mt-3.5" />
                </div>
                <div className="h-10 w-full sm:w-32 bg-border/60 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center text-text-muted text-[14px] mb-8 shadow-sm">
            No pending ID requests.
          </div>
        ) : (
          <div className="mb-10">
            <div className="grid gap-4">
              {currentPending.map(req => (
                <div key={req.id} className="animate-fade-up bg-white rounded-2xl border-[1.5px] border-maroon-border p-5 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-shadow hover:shadow-md">
                  <div>
                    <div className="font-bold text-[16px] text-text-main">{req.first_name} {req.last_name}</div>
                    <div className="flex flex-wrap items-center gap-4 mt-1.5 text-[12px] text-text-sub">
                      <span><strong>Email:</strong> {req.email}</span>
                      <span><strong>Course:</strong> {req.course}</span>
                    </div>
                    <div className="text-[11px] text-text-muted mt-2">Requested: {new Date(req.created_at).toLocaleString()}</div>
                  </div>

                  <button
                    onClick={() => setEmailTarget(req)}
                    className="px-4 py-2.5 bg-maroon text-white text-[13px] font-bold rounded-xl border-none cursor-pointer hover:bg-maroon-dark transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 w-full sm:w-auto"
                  >
                    <Mail size={15} /> Send Email
                  </button>
                </div>
              ))}
            </div>

            {/* Pending Pagination */}
            {totalPendingPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-[12px] text-text-muted">
                  Showing {startPending + 1}–{endPending} of {pending.length}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pendingPage === 1}
                    onClick={() => setPendingPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-white text-[12px] font-semibold text-text-sub hover:bg-off-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pendingPage === totalPendingPages}
                    onClick={() => setPendingPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-white text-[12px] font-semibold text-text-sub hover:bg-off-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HISTORY */}
      <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center justify-between mb-3 mt-4">
          <h2 className="text-[15px] font-bold text-text-main m-0 flex items-center gap-2">
            <Check size={18} className="text-success" /> History
          </h2>
          {!loading && history.length > 0 && (
            <button 
              onClick={() => {
                setIsSelectMode(!isSelectMode)
                setSelectedIds(new Set())
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-bold cursor-pointer transition-colors ${
                isSelectMode 
                  ? 'bg-off-white border-border text-text-sub hover:bg-border'
                  : 'bg-danger-light border-danger-border text-danger hover:bg-danger hover:text-white'
              }`}
            >
              {isSelectMode ? 'Cancel Selection' : <><Trash2 size={14} /> Delete Records</>}
            </button>
          )}
        </div>

        {isSelectMode && selectedIds.size > 0 && (
          <div className="mb-3 p-3 bg-danger-light/50 border border-danger-border rounded-xl flex items-center justify-between animate-fade-in">
            <span className="text-[13px] text-danger font-semibold">{selectedIds.size} selected</span>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            className="px-4 py-1.5 bg-danger text-white border-none rounded-lg text-[12px] font-bold cursor-pointer hover:bg-danger-dark transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-pulse">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-5 w-40 bg-border/60 rounded-md" />
                  <div className="h-4 w-20 bg-border/40 rounded-full" />
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1.5">
                  <div className="h-4 w-48 bg-border/40 rounded" />
                  <div className="h-4 w-32 bg-border/40 rounded" />
                </div>
              </div>
              <div className="h-4 w-36 bg-border/40 rounded shrink-0" />
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-6 text-center text-text-muted text-[13px] shadow-sm">
          No resolved requests yet.
        </div>
      ) : (
        <div>
          <div className="grid gap-3">
            {currentHistory.map(req => {
              const isSelected = selectedIds.has(req.id)
              return (
                <div 
                  key={req.id} 
                  onClick={() => {
                    if (!isSelectMode) return;
                    const newSelected = new Set(selectedIds)
                    if (newSelected.has(req.id)) newSelected.delete(req.id)
                    else newSelected.add(req.id)
                    setSelectedIds(newSelected)
                  }}
                  className={`bg-white rounded-xl border px-4 sm:px-5 py-3.5 flex items-start sm:items-center gap-3 sm:gap-4 transition-colors ${
                    isSelectMode ? 'cursor-pointer hover:bg-off-white' : ''
                  } ${isSelected ? 'border-danger bg-danger-light/20' : 'border-border'}`}
                >
                  {isSelectMode && (
                    <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 sm:mt-0 ${
                      isSelected ? 'border-danger bg-danger' : 'border-text-muted bg-transparent'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-semibold text-text-main">{req.last_name}, {req.first_name}</div>
                      <div className="text-[12px] text-text-sub mt-0.5 break-all">{req.email} • {req.course}</div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold mb-1 ${req.status === 'resolved' ? 'bg-success-light text-success' : 'bg-surface text-text-muted'}`}>
                        {req.status.toUpperCase()}
                      </span>
                      <div className="text-[11px] text-text-muted">
                        {req.resolved_at ? new Date(req.resolved_at).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls for History */}
          <div className="px-2 py-4 mt-1 flex justify-between items-center">
            <div className="text-[13px] text-text-sub font-medium">
              Showing <span className="font-bold text-text-main">{startHistory + 1}-{endHistory}</span> of <span className="font-bold text-text-main">{history.length}</span> requests
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-[12px] font-semibold cursor-pointer hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button 
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-[12px] font-semibold cursor-pointer hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
