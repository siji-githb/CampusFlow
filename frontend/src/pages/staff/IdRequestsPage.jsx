import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { useToast } from '../../context/ToastContext'
import { getIdRequests, updateIdRequestStatus, getStudentRecords, sendIdRequestEmail, deleteIdRequest } from '../../services/adminService'
import { Check, X, Clock, HelpCircle, Mail, BookOpen, Send, User, Calendar, AtSign, Search, Trash2, GraduationCap, ShieldCheck, AlertTriangle } from 'lucide-react'

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

  const defaultMessage = useCallback((id) =>
    `Hi ${req?.first_name || 'Student'},\n\nThank you for reaching out to the CRMC Registrar's Office.\n\nAfter checking our records, your Student ID is:\n\n  ${id || '[Student ID Here]'}\n\nPlease keep this for your records. You can now use this ID to create your CampusFlow account.\n\nIf you have any other concerns, feel free to contact us.\n\nBest regards,\nCRMC Registrar's Office`, [req?.first_name])

  useEffect(() => {
    setMessage(defaultMessage(''))
    // Fetch directory on mount
    getStudentRecords(token)
      .then(res => setAllRecords(res.records || []))
      .catch(e => setDirError(e.message))
      .finally(() => setLoadingDir(false))
  }, [defaultMessage, token])

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

  return createPortal((
    <div 
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" 
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
      
      <div 
        className="animate-fade-up relative my-auto w-full max-w-4xl xl:max-w-5xl bg-white text-text-main rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 font-sans overflow-hidden max-h-[92vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Top decorative accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-maroon via-maroon-dark to-gold" />

        {/* Header */}
        <div className="flex justify-between items-start mb-5 pb-4 border-b border-border gap-4 pt-1 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold uppercase tracking-wider border border-maroon-border">
                <Mail size={13} /> ID Request Response
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-off-white text-text-sub text-fluid-11 font-mono font-bold border border-border">
                Ref: <strong className="text-maroon">#{req.id?.slice(0, 8) || req.id}</strong>
              </span>
              {studentId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-light text-success text-fluid-11 font-mono font-bold border border-success-border">
                  ID: <strong>{studentId}</strong>
                </span>
              )}
            </div>
            <h2 className="font-serif text-fluid-22 sm:text-fluid-26 font-extrabold text-maroon m-0 leading-tight tracking-tight">
              Send Student ID
            </h2>
            <p className="text-fluid-12 text-text-muted mt-1 mb-0 font-medium">
              Search directory records or input the student ID to send official credentials via email.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 -mr-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
            {/* Left Column: Requester info & Search (5 cols) */}
            <div className="flex flex-col space-y-3.5 md:col-span-5">
              {/* Requester Information Card */}
              <div className="p-3.5 bg-off-white/70 rounded-2xl border border-border/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 rounded-xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border/60 shadow-xs">
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block leading-none mb-1">
                      Student Requester
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-text-main m-0 truncate leading-tight">
                      {req.first_name} {req.last_name}
                    </h4>
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0 hidden sm:inline-block">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-text-sub">
                    <GraduationCap size={13} className="text-maroon shrink-0" />
                    <span className="truncate text-[11px]">{req.course || 'Degree Program Not Specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-sub">
                    <AtSign size={13} className="text-maroon shrink-0" />
                    <span className="truncate text-[11px] font-semibold text-text-main">{req.email}</span>
                  </div>
                </div>
              </div>

              {/* Search School Directory */}
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Search size={13} className="text-maroon" /> Search School Directory
                </label>
                <div className="relative">
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); if (studentId) { setStudentId(''); setMessage(defaultMessage('')) } }}
                    placeholder="Search by student name or ID..."
                    className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-border bg-off-white/60 text-xs text-text-main placeholder:text-text-muted/50 outline-none focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/10 transition-all shadow-xs"
                  />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); if (studentId) { setStudentId(''); setMessage(defaultMessage('')) } }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 rounded hover:bg-surface cursor-pointer transition-colors"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {loadingDir && (
                  <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1.5 font-medium">
                    <span className="inline-block w-3 h-3 border-2 border-maroon border-t-transparent rounded-full animate-spin" /> 
                    Loading directory database...
                  </p>
                )}
                {dirError && <p className="text-[11px] text-danger mt-1 font-medium">{dirError}</p>}

                {/* Dropdown Live Results (Refined compact sizing) */}
                {filtered.length > 0 && (
                  <div className="mt-1.5 rounded-xl border border-border shadow-md bg-white overflow-hidden max-h-44 overflow-y-auto custom-scrollbar divide-y divide-border/60 animate-fade-up">
                    {filtered.map(r => (
                      <button
                        key={r.student_id}
                        type="button"
                        onClick={() => handleSelectRecord(r)}
                        className="w-full text-left flex items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-maroon-light/50 group border-none bg-transparent"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-text-main group-hover:text-maroon transition-colors leading-snug">
                            {r.last_name}, {r.first_name}
                          </div>
                          <div className="text-[11px] text-text-sub truncate mt-0.5">{r.course}</div>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-maroon bg-white px-2 py-0.5 rounded border border-maroon-border/40 shadow-2xs shrink-0">
                          {r.student_id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {trimmedQuery.length >= 2 && !loadingDir && filtered.length === 0 && (
                  <p className="text-[11px] text-text-muted mt-1.5 font-medium">No matching records found in directory.</p>
                )}
              </div>

              {/* Student ID to Send */}
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-maroon" /> Student ID to Send <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={e => handleIdChange(e.target.value)}
                  placeholder="Auto-filled from search, or type manually"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none transition-all shadow-xs ${
                    studentId 
                      ? 'border-success bg-success-light/40 text-success ring-2 ring-success/15' 
                      : 'border-border bg-off-white/60 text-text-main placeholder:text-text-muted/50 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/10'
                  }`}
                />
              </div>
            </div>

            {/* Right Column: Email Preview & Feedback (7 cols) */}
            <div className="flex flex-col h-full min-h-60 md:col-span-7">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-maroon" /> Email Message Preview
                </span>
                <span className="text-[10px] text-text-muted font-normal">Editable</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full flex-1 min-h-48 sm:min-h-60 p-3.5 rounded-xl border border-border bg-off-white/50 text-xs sm:text-[13px] font-sans font-medium text-text-main placeholder:text-text-muted/50 outline-none focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/10 transition-all shadow-xs resize-none leading-relaxed custom-scrollbar"
              />

              {sendError && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-danger-light text-danger border border-danger-border flex items-center gap-2 text-xs font-medium animate-fade-in">
                  <AlertTriangle size={14} className="shrink-0" /> {sendError}
                </div>
              )}

              {sent && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-success-light text-success border border-success-border flex items-center gap-2 text-xs font-bold animate-fade-in">
                  <Check size={15} className="shrink-0" /> Email sent successfully! Resolving request...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-border mt-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50 min-w-20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!studentId.trim() || sending || sent}
            className="px-4.5 py-2 rounded-xl bg-maroon text-white hover:bg-maroon-dark text-xs font-bold transition-all cursor-pointer shadow-[0_4px_14px_rgba(123,26,42,0.18)] hover:shadow-[0_6px_18px_rgba(123,26,42,0.25)] active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : sent ? (
              <>
                <Check size={14} />
                <span>Sent!</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Send Email & Resolve</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ), document.body)
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IdRequestsPage() {
  const { token } = useAuth()
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [emailTarget, setEmailTarget] = useState(null) // the req object to show modal for

  const [pendingPage, setPendingPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
      toast.success(`ID request marked as ${status}`)
    } catch (err) {
      toast.error("Failed to update status: " + err.message)
    }
  }

  const handleSentAndResolve = async (id) => {
    await handleUpdateStatus(id, 'resolved')
    setEmailTarget(null)
  }

  const confirmDeleteSelected = async () => {
    if (selectedIds.size === 0) return
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
      setShowDeleteModal(false)
      await loadRequests()

      if (failed > 0) {
        toast.warning(`Deleted ${succeeded} request(s), but ${failed} failed.`)
      } else {
        toast.success(`Successfully deleted ${succeeded} request(s)`)
      }
    } catch (err) {
      toast.error('Failed to delete requests: ' + err.message)
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

      {/* Delete Confirmation Modal (matches MasterListPage design) */}
      {showDeleteModal && createPortal((
        <div 
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" 
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
          <div 
            className="animate-fade-up relative my-auto w-full max-w-md bg-white text-text-main rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.2)] border border-border z-10 text-center font-sans overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-danger" />
            <div className="w-14 h-14 rounded-2xl bg-danger-light border border-danger-border flex items-center justify-center mx-auto mb-4 text-danger shadow-xs">
              <Trash2 size={26} />
            </div>
            <h3 className="text-fluid-20 font-bold text-text-main m-0 mb-2 font-serif">Delete Selected Requests?</h3>
            <p className="text-fluid-13 text-text-sub m-0 mb-6 leading-relaxed">
              You are about to permanently delete <strong className="text-maroon font-bold">{selectedIds.size}</strong> selected ID request(s). This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setShowDeleteModal(false)} 
                disabled={isDeleting} 
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-fluid-13 font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDeleteSelected} 
                disabled={isDeleting} 
                className="flex-1 px-4 py-3 rounded-xl border-none bg-danger text-white hover:bg-danger-hover text-fluid-13 font-bold cursor-pointer transition-all shadow-[0_6px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_8px_25px_rgba(220,38,38,0.28)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Page Header (Always visible) ── */}
      <div className="animate-fade-up mb-6">
        <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">User Management</p>
        <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 flex items-center gap-2">
          <HelpCircle size={24} className="text-maroon shrink-0" /> Student ID Requests
        </h1>
        <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0">
          Manage requests from students who forgot their Student ID.
          Click <strong>Send Email</strong> to compose a reply, then mark as resolved.
        </p>
      </div>

      {error && (
        <div className="animate-fade-up py-3 px-4 rounded-xl bg-danger-light border border-danger-border text-danger text-fluid-13 mb-6">
          {error}
        </div>
      )}

      {/* PENDING */}
      <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-fluid-15 font-bold text-text-main mb-3 flex items-center gap-2">
          <Clock size={18} className="text-gold" />
          <span>Needs Action</span>
          {!loading ? (
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-text-sub text-fluid-11 font-bold">
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
          <div className="bg-white rounded-2xl border border-border p-10 text-center text-text-muted text-fluid-14 mb-8 shadow-sm">
            No pending ID requests.
          </div>
        ) : (
          <div className="mb-10">
            <div className="grid gap-4">
              {currentPending.map(req => (
                <div key={req.id} className="animate-fade-up bg-white rounded-2xl border-[1.5px] border-maroon-border p-5 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-shadow hover:shadow-md">
                  <div>
                    <div className="font-bold text-fluid-16 text-text-main">{req.first_name} {req.last_name}</div>
                    <div className="flex flex-wrap items-center gap-4 mt-1.5 text-fluid-12 text-text-sub">
                      <span><strong>Email:</strong> {req.email}</span>
                      <span><strong>Course:</strong> {req.course}</span>
                    </div>
                    <div className="text-fluid-11 text-text-muted mt-2">Requested: {new Date(req.created_at).toLocaleString()}</div>
                  </div>

                  <button
                    onClick={() => setEmailTarget(req)}
                    className="px-4 py-2.5 bg-maroon text-white text-fluid-13 font-bold rounded-xl border-none cursor-pointer hover:bg-maroon-dark transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 w-full sm:w-auto"
                  >
                    <Mail size={15} /> Send Email
                  </button>
                </div>
              ))}
            </div>

            {/* Pending Pagination */}
            {totalPendingPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-fluid-12 text-text-muted">
                  Showing {startPending + 1}–{endPending} of {pending.length}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pendingPage === 1}
                    onClick={() => setPendingPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-white text-fluid-12 font-semibold text-text-sub hover:bg-off-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pendingPage === totalPendingPages}
                    onClick={() => setPendingPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-white text-fluid-12 font-semibold text-text-sub hover:bg-off-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          <h2 className="text-fluid-15 font-bold text-text-main m-0 flex items-center gap-2">
            <Check size={18} className="text-success" /> History
          </h2>
          {!loading && history.length > 0 && (
            <button 
              onClick={() => {
                setIsSelectMode(!isSelectMode)
                setSelectedIds(new Set())
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-fluid-12 font-bold cursor-pointer transition-colors ${
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
            <span className="text-fluid-13 text-danger font-semibold">{selectedIds.size} selected</span>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="px-4 py-1.5 bg-danger text-white border-none rounded-lg text-fluid-12 font-bold cursor-pointer hover:bg-danger-dark transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
            >
              <Trash2 size={13} /> Confirm Delete
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
        <div className="bg-white rounded-2xl border border-border p-6 text-center text-text-muted text-fluid-13 shadow-sm">
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
                      <div className="text-fluid-14 font-semibold text-text-main">{req.last_name}, {req.first_name}</div>
                      <div className="text-fluid-12 text-text-sub mt-0.5 break-all">{req.email} • {req.course}</div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className={`inline-block px-2 py-1 rounded-md text-fluid-10 font-bold mb-1 ${req.status === 'resolved' ? 'bg-success-light text-success' : 'bg-surface text-text-muted'}`}>
                        {req.status.toUpperCase()}
                      </span>
                      <div className="text-fluid-11 text-text-muted">
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
            <div className="text-fluid-13 text-text-sub font-medium">
              Showing <span className="font-bold text-text-main">{startHistory + 1}-{endHistory}</span> of <span className="font-bold text-text-main">{history.length}</span> requests
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-fluid-12 font-semibold cursor-pointer hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button 
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-fluid-12 font-semibold cursor-pointer hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
