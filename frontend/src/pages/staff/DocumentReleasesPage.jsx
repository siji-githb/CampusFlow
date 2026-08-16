import { useState, useEffect, useCallback, useMemo } from 'react'
import { getUncollectedDocuments, getCollectedDocuments, confirmStep, remindStudent } from '../../services/queueService'
import { useAuth } from '../../context/useAuth'
import { FileText, FolderOpen, AlertTriangle, Search, Check, X, Loader2, Clock, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, Bell, Calendar } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function DocumentReleasesPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('uncollected')
  const [uncollected, setUncollected] = useState([])
  const [collected, setCollected] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [markingId, setMarkingId] = useState(null)
  const [remindingId, setRemindingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: typeof msg === 'string' ? msg : JSON.stringify(msg), type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Format assigned release date safely without timezone shift
  const formatReleaseDate = (dateStr) => {
    if (!dateStr) return 'Today'
    try {
      const cleanStr = String(dateStr).split('T')[0]
      const [y, m, d] = cleanStr.split('-').map(Number)
      if (y && m && d) {
        const dt = new Date(y, m - 1, d)
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    } catch {}
    return dateStr
  }

  // Calculate waiting time strictly relative to the assigned release date
  const getWaitingTimeInfo = (releaseDateStr, fallbackDays = 0) => {
    if (!releaseDateStr) {
      return {
        label: 'Today',
        isOverdue: false,
        isDueSoon: false,
        isScheduled: false,
        days: 0
      }
    }

    try {
      const cleanStr = String(releaseDateStr).split('T')[0]
      const [y, m, d] = cleanStr.split('-').map(Number)
      if (y && m && d) {
        const releaseDate = new Date(y, m - 1, d)
        releaseDate.setHours(0, 0, 0, 0)
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const diffDays = Math.round((today.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays < 0) {
          const daysAhead = Math.abs(diffDays)
          return {
            label: daysAhead === 1 ? 'Scheduled (Tomorrow)' : `Scheduled (${daysAhead}d left)`,
            isOverdue: false,
            isDueSoon: false,
            isScheduled: true,
            days: diffDays
          }
        }
        
        if (diffDays === 0) {
          return {
            label: 'Today',
            isOverdue: false,
            isDueSoon: false,
            isScheduled: false,
            days: 0
          }
        }
        
        return {
          label: `${diffDays}d waiting`,
          isOverdue: diffDays >= 3,
          isDueSoon: diffDays >= 1 && diffDays < 3,
          isScheduled: false,
          days: diffDays
        }
      }
    } catch {}

    const days = fallbackDays || 0
    return {
      label: days === 0 ? 'Today' : `${days}d waiting`,
      isOverdue: days >= 3,
      isDueSoon: days >= 1 && days < 3,
      isScheduled: days < 0,
      days
    }
  }

  // Fetch both uncollected and collected concurrently so tab switching is instantaneous with no skeleton reload
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setIsRefreshing(true)
    setError('')
    try {
      const [uncollectedData, collectedData] = await Promise.all([
        getUncollectedDocuments(token),
        getCollectedDocuments(token)
      ])
      setUncollected(uncollectedData || [])
      setCollected(collectedData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [token])

  const handleMarkCollected = async (ticketId, stepNumber) => {
    setMarkingId(ticketId)
    try {
      await confirmStep(token, ticketId, stepNumber, null, true)
      showToast('Document marked as collected successfully')
      await fetchData(true)
    } catch (err) {
      setError('Failed to mark as collected: ' + err.message)
    } finally {
      setMarkingId(null)
    }
  }

  const handleRemindStudent = async (ticketId, studentName) => {
    setRemindingId(ticketId)
    try {
      await remindStudent(token, ticketId)
      showToast(`Reminder notification sent to ${studentName || 'student'}!`)
    } catch (err) {
      showToast(err.message || 'Failed to send reminder', 'error')
    } finally {
      setRemindingId(null)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Reset pagination when switching tabs or typing in search
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearch('')
    setCurrentPage(1)
  }

  const handleSearchChange = (val) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const filteredUncollected = useMemo(() => {
    if (!search.trim()) return uncollected
    const q = search.toLowerCase()
    return uncollected.filter(doc => 
      doc.queue_number?.toLowerCase().includes(q) ||
      doc.student_name?.toLowerCase().includes(q) ||
      doc.student_id?.toLowerCase().includes(q) ||
      doc.transaction_type?.toLowerCase().includes(q)
    )
  }, [uncollected, search])

  const filteredCollected = useMemo(() => {
    if (!search.trim()) return collected
    const q = search.toLowerCase()
    return collected.filter(doc => 
      doc.queue_number?.toLowerCase().includes(q) ||
      doc.student_name?.toLowerCase().includes(q) ||
      doc.student_id?.toLowerCase().includes(q) ||
      doc.transaction_type?.toLowerCase().includes(q)
    )
  }, [collected, search])

  const currentList = activeTab === 'uncollected' ? filteredUncollected : filteredCollected
  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return currentList.slice(start, start + ITEMS_PER_PAGE)
  }, [currentList, currentPage])

  const renderPriorityBadge = (priorityClass) => {
    const p = (priorityClass || 'regular').toLowerCase()
    const isPriority = p === 'pwd' || p === 'alumni' || p === 'pregnant' || p === 'priority'
    
    if (isPriority) {
      return (
        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border bg-maroon-light text-maroon border-maroon-border">
          {priorityClass}
        </span>
      )
    }
    
    return (
      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border bg-gold-light text-gold border-gold-border">
        {priorityClass || 'Regular'}
      </span>
    )
  }

  // ── Skeleton Loading Screen (Initial Load Only) ─────────────────────────
  if (loading && uncollected.length === 0 && collected.length === 0) {
    return (
      <div className="animate-fade-in w-full">
        {/* Header Skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-3 w-28 bg-border/60 rounded mb-2" />
          <div className="h-7 w-64 bg-border/70 rounded-lg mb-2" />
          <div className="h-3.5 w-110 max-w-full bg-border/40 rounded" />
        </div>

        {/* Stats Summary Skeleton (2 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl px-5 py-3.5 border border-border shadow-xs flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-border/60 rounded" />
                <div className="w-8.5 h-8.5 rounded-lg bg-border/40" />
              </div>
              <div>
                <div className="h-6.5 w-14 bg-border/70 rounded-md mb-1.5" />
                <div className="h-3 w-32 bg-border/40 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar Skeleton (No background box) */}
        <div className="flex items-center justify-between gap-4 mb-6 animate-pulse">
          <div className="h-10 w-64 bg-border/40 rounded-xl" />
          <div className="h-10 w-72 bg-border/40 rounded-xl" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden animate-pulse">
          <div className="h-12 bg-surface/80 border-b border-border" />
          <div className="divide-y divide-border/60">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="h-6 w-20 bg-border/70 rounded" />
                <div className="h-5 w-36 bg-border/60 rounded" />
                <div className="h-5 w-20 bg-border/50 rounded" />
                <div className="h-5 w-44 bg-border/50 rounded" />
                <div className="h-5 w-24 bg-border/40 rounded-full" />
                <div className="h-9 w-44 bg-border/60 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in w-full pb-8">
      
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Document Management</p>
          <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2.5">
            <FolderOpen size={24} className="text-maroon" /> Document Releases
          </h1>
          <p className="text-[12px] text-text-sub mt-1.5 mb-0">
            Track documents that are ready for student collection and review completed pickup records.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-border text-[12px] font-bold text-text-main hover:bg-surface transition-all shadow-xs cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={13} className={`text-maroon ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Stats Summary Bar (2 Cards - Compact Height) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Ready for Pickup */}
        <div className="bg-white rounded-2xl px-5 py-3.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:border-gold/50 hover:shadow-xs transition-all flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em]">
              Ready for Pickup
            </span>
            <div className="w-8.5 h-8.5 rounded-lg bg-gold-light text-gold border border-gold-border/60 flex items-center justify-center shrink-0">
              <Clock size={16} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[26px] font-extrabold text-gold leading-tight tracking-tight">
              {uncollected.length}
            </div>
            <div className="text-[11.5px] font-medium text-text-sub mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block shrink-0"></span>
              Pending student collection
            </div>
          </div>
        </div>

        {/* Total Claimed */}
        <div className="bg-white rounded-2xl px-5 py-3.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:border-success/50 hover:shadow-xs transition-all flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em]">
              Total Claimed
            </span>
            <div className="w-8.5 h-8.5 rounded-lg bg-success-light text-success border border-success-border/60 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <div className="font-serif text-[26px] font-extrabold text-success leading-tight tracking-tight">
              {collected.length}
            </div>
            <div className="text-[11.5px] font-medium text-text-sub mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block shrink-0"></span>
              Successfully completed
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs & Search Bar (Clean: without background container box) ── */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        {/* Segmented Tab Controls */}
        <div className="flex bg-white p-1 rounded-xl border border-border shadow-xs">
          <button 
            onClick={() => handleTabChange('uncollected')}
            className={`px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'uncollected' 
                ? 'bg-maroon text-white shadow-xs' 
                : 'bg-transparent text-text-sub hover:text-text-main'
            }`}
          >
            <Clock size={14} />
            <span>Uncollected</span>
          </button>

          <button 
            onClick={() => handleTabChange('collected')}
            className={`px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'collected' 
                ? 'bg-maroon text-white shadow-xs' 
                : 'bg-transparent text-text-sub hover:text-text-main'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Collected History</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-72 flex-1 sm:flex-initial">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search by queue no., student name, or ID..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-white text-[12.5px] font-medium outline-none text-text-main focus:border-maroon transition-all shadow-xs"
          />
          {search && (
            <button 
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-6 bg-danger-light text-danger px-4 py-3 rounded-2xl text-[13px] font-semibold border border-danger-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
          <button onClick={() => setError('')} className="bg-transparent border-none text-danger cursor-pointer hover:opacity-70 flex">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Uncollected Data Table ── */}
      {activeTab === 'uncollected' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          {filteredUncollected.length === 0 ? (
            <div className="p-14 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-3 border border-border text-text-muted">
                <FileText size={28} />
              </div>
              <h3 className="text-[16px] font-bold text-text-main mb-1">
                {search ? 'No Matching Releases' : 'No Pending Pickups'}
              </h3>
              <p className="text-[12.5px] text-text-sub max-w-sm m-0">
                {search ? `No release requests matched "${search}". Try searching with another term.` : 'There are currently no documents waiting to be collected by students.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface/80 border-b border-border text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em]">
                      <th className="py-3.5 px-6">Queue No.</th>
                      <th className="py-3.5 px-6">Student Details</th>
                      <th className="py-3.5 px-6">Priority</th>
                      <th className="py-3.5 px-6">Requested Document</th>
                      <th className="py-3.5 px-6">Release Date</th>
                      <th className="py-3.5 px-6">Pickup Status</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedItems.map(doc => {
                      const waitingInfo = getWaitingTimeInfo(doc.release_date, doc.days_waiting)

                      return (
                        <tr 
                          key={doc.queue_ticket_id}
                          className={`hover:bg-surface/50 transition-colors ${
                            waitingInfo.isOverdue ? 'bg-danger-light/5' : ''
                          }`}
                        >
                          {/* Queue Number */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="font-serif text-[20px] font-extrabold text-maroon leading-none">
                              {doc.queue_number}
                            </span>
                          </td>

                          {/* Student Details */}
                          <td className="py-4 px-6">
                            <div className="font-bold text-text-main text-[13.5px] leading-tight">
                              {doc.student_name}
                            </div>
                            <div className="text-[11px] font-mono text-text-sub font-bold mt-1">
                              {doc.student_id ? `ID: ${doc.student_id}` : '—'}
                            </div>
                          </td>

                          {/* Priority Badge */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            {renderPriorityBadge(doc.priority_class)}
                          </td>

                          {/* Document */}
                          <td className="py-4 px-6">
                            <div className="text-[13px] font-bold text-text-main leading-snug">
                              {doc.transaction_type}
                            </div>
                          </td>

                          {/* Ready Since (Assigned Release Date) */}
                          <td className="py-4 px-6 text-[12.5px] font-medium text-text-sub whitespace-nowrap">
                            {formatReleaseDate(doc.release_date)}
                          </td>

                          {/* Waiting Time (Elapsed since release date) */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border ${
                              waitingInfo.isOverdue 
                                ? 'bg-danger-light text-danger border-danger-border' 
                                : waitingInfo.isDueSoon 
                                ? 'bg-gold-light text-gold border-gold-border'
                                : waitingInfo.isScheduled
                                ? 'bg-info-light text-info border-info-border'
                                : 'bg-success-light text-success border-success-border'
                            }`}>
                              {waitingInfo.isOverdue && <AlertTriangle size={12} className="stroke-3" />}
                              {waitingInfo.isScheduled ? <Calendar size={12} /> : <Clock size={12} />}
                              {waitingInfo.label}
                            </span>
                          </td>

                          {/* Action Buttons (Remind + Mark Collected) */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {/* Remind Student Button */}
                              <button
                                onClick={() => handleRemindStudent(doc.queue_ticket_id, doc.student_name)}
                                disabled={remindingId === doc.queue_ticket_id}
                                title="Send reminder notification to student"
                                className="px-3 py-2 rounded-xl bg-surface hover:bg-gold-light text-text-main hover:text-gold border border-border hover:border-gold-border text-[12px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                              >
                                {remindingId === doc.queue_ticket_id ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin text-gold" />
                                    <span>Sending…</span>
                                  </>
                                ) : (
                                  <>
                                    <Bell size={13} className="text-gold" />
                                    <span>Remind</span>
                                  </>
                                )}
                              </button>

                              {/* Mark Collected Button */}
                              <button
                                onClick={() => handleMarkCollected(doc.queue_ticket_id, doc.step_number)}
                                disabled={markingId === doc.queue_ticket_id}
                                className="px-3.5 py-2 rounded-xl bg-success text-white text-[12px] font-extrabold hover:bg-success-dark transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                              >
                                {markingId === doc.queue_ticket_id ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    Processing…
                                  </>
                                ) : (
                                  <>
                                    <Check size={13} className="stroke-3" />
                                    Mark Collected
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination Bar (Clean Typography) ── */}
              {filteredUncollected.length > 0 && (
                <div className="px-6 py-4 border-t border-border bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-[12.5px] text-text-sub font-medium">
                    {filteredUncollected.length <= 1 ? (
                      <>Showing <strong className="font-bold text-text-main">{filteredUncollected.length}</strong> record</>
                    ) : (
                      <>
                        Showing <strong className="font-bold text-text-main">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUncollected.length)}</strong> of <strong className="font-bold text-text-main">{filteredUncollected.length}</strong> records
                      </>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Previous Page"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                      ).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-bold cursor-pointer transition-colors ${
                            currentPage === num 
                              ? 'bg-maroon text-white border border-maroon shadow-xs' 
                              : 'bg-white text-text-main border border-border hover:bg-surface'
                          }`}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Next Page"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Collected History Data Table ── */}
      {activeTab === 'collected' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          {filteredCollected.length === 0 ? (
            <div className="p-14 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-3 border border-border text-text-muted">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-[16px] font-bold text-text-main mb-1">
                {search ? 'No Records Found' : 'No Collection History'}
              </h3>
              <p className="text-[12.5px] text-text-sub max-w-sm m-0">
                {search ? `No completed releases matched "${search}".` : 'Documents marked as collected will appear here with full timestamps.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface/80 border-b border-border text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em]">
                      <th className="py-3.5 px-6">Queue No.</th>
                      <th className="py-3.5 px-6">Student Details</th>
                      <th className="py-3.5 px-6">Priority</th>
                      <th className="py-3.5 px-6">Claimed Document</th>
                      <th className="py-3.5 px-6 text-right">Collected At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedItems.map(doc => (
                      <tr key={doc.queue_ticket_id} className="hover:bg-surface/50 transition-colors">
                        {/* Queue Number */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="font-serif text-[18px] font-bold text-text-muted leading-none">
                            {doc.queue_number}
                          </span>
                        </td>

                        {/* Student Details */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-text-main text-[13.5px] leading-tight">
                            {doc.student_name}
                          </div>
                          <div className="text-[11px] font-mono text-text-muted font-bold mt-1">
                            {doc.student_id ? `ID: ${doc.student_id}` : '—'}
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {renderPriorityBadge(doc.priority_class)}
                        </td>

                        {/* Document */}
                        <td className="py-4 px-6">
                          <div className="text-[13px] font-bold text-text-main leading-snug">
                            {doc.transaction_type}
                          </div>
                        </td>

                        {/* Collected Timestamp */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="text-[12.5px] font-extrabold text-success inline-flex items-center gap-1.5 justify-end">
                            <CheckCircle2 size={14} />
                            {doc.confirmed_at ? new Date(doc.confirmed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </div>
                          <div className="text-[11px] text-text-muted font-medium mt-0.5">
                            {doc.confirmed_at ? new Date(doc.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination Bar (Clean Typography) ── */}
              {filteredCollected.length > 0 && (
                <div className="px-6 py-4 border-t border-border bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-[12.5px] text-text-sub font-medium">
                    {filteredCollected.length <= 1 ? (
                      <>Showing <strong className="font-bold text-text-main">{filteredCollected.length}</strong> record</>
                    ) : (
                      <>
                        Showing <strong className="font-bold text-text-main">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCollected.length)}</strong> of <strong className="font-bold text-text-main">{filteredCollected.length}</strong> records
                      </>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Previous Page"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                      ).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-bold cursor-pointer transition-colors ${
                            currentPage === num 
                              ? 'bg-maroon text-white border border-maroon shadow-xs' 
                              : 'bg-white text-text-main border border-border hover:bg-surface'
                          }`}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-border bg-white text-text-main cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Next Page"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Toast Notification (Adhering strictly to #006600 rule) ── */}
      {toastMsg && (
        <div className={`fixed bottom-10 right-8 z-10000 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border text-[13.5px] font-bold animate-fade-up ${
          toastMsg.type === 'error'
            ? 'bg-danger text-white border-danger-border'
            : 'bg-[#006600] text-white border-[#005200]'
        }`}>
          {toastMsg.type === 'error' ? (
            <AlertTriangle size={17} className="shrink-0 text-white" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Check size={13} className="text-white stroke-3" />
            </div>
          )}
          <span className="text-white">{toastMsg.text}</span>
          <button 
            onClick={() => setToastMsg(null)} 
            className="ml-2.5 bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-0 flex items-center shrink-0 transition-opacity"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

    </div>
  )
}
