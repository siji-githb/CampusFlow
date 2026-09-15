import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import { getRegistrarRecords } from '../../services/adminService'
import { ChevronDown, Download, RefreshCw, AlertTriangle, Search, X as XIcon, FolderOpen, Printer, Check, Clipboard, CheckCircle, Clock, Archive, Calendar } from 'lucide-react'

const DOC_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  completed: { label: 'Completed', bg: 'bg-success-light', color: 'text-success', border: 'border-success-border' },
  released: { label: 'Released', bg: 'bg-info-light', color: 'text-info', border: 'border-info-border' },
  processing: { label: 'Processing', bg: 'bg-gold-light', color: 'text-gold', border: 'border-gold-border' },
  pending: { label: 'Pending', bg: 'bg-maroon-light', color: 'text-maroon', border: 'border-maroon-border' },
  cancelled: { label: 'Cancelled', bg: 'bg-danger-light', color: 'text-danger', border: 'border-danger-border' },
  archived: { label: 'Archived', bg: 'bg-surface', color: 'text-text-muted', border: 'border-border' },
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span className={`text-fluid-10 font-bold py-1 px-2.5 rounded-full border tracking-[0.04em] whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

// ── Circular ring ──────────────────────────────────────────────────────────────
const Ring = ({ pct, color, size = 44 }) => {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 100) / 100
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7E2" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

// ── Export CSV ─────────────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Timeframe Dropdown ─────────────────────────────────────────────────────────
function TimeframeDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const options = [
    { value: 1, label: 'Past 1 Month' },
    { value: 3, label: 'Past 3 Months' },
    { value: 6, label: 'Past 6 Months' },
    { value: 12, label: 'Past 1 Year (12 Mo)' }
  ]
  const currentLabel = options.find(o => o.value === value)?.label || `${value} Months`

  return (
    <div className="relative z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2.25 rounded-xl border border-border bg-white text-fluid-12-5 font-bold text-text-main outline-none cursor-pointer font-sans hover:bg-surface hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      >
        <Calendar size={14} className="text-gold shrink-0" />
        <span>{currentLabel}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-border shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-fade-up max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="px-2.5 py-1 text-fluid-10 font-extrabold text-text-muted uppercase tracking-wider">Timeframe</div>
            {options.map(o => {
              const isActive = value === o.value
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between text-fluid-12 font-medium transition-colors ${
                    isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main hover:bg-off-white'
                  }`}
                >
                  <span>{o.label}</span>
                  {isActive && <Check size={13} className="text-maroon shrink-0" />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AdminRegistrarRecordsPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminRegistrarRecordsPage() {
  const { token } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [expandedId, setExpandedId]   = useState(null)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [months, setMonths]           = useState(1)
  const [openDropdown, setOpenDropdown] = useState(null)
  const toast = useToast()

  const showToast = (msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
  }

  const PER_PAGE = 8

  const load = useCallback(async () => {
    setLoading(true)
    try { 
      const rawRecords = await getRegistrarRecords(token, months * 30)
      const mapped = rawRecords.map(r => ({
        id: `REC-${r.id.split('-')[0].toUpperCase()}`,
        rawId: r.id,
        student: `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.trim() || 'Unknown Student',
        studentId: r.users?.student_id || 'N/A',
        email: r.users?.email || '—',
        course: r.users?.course || 'General Student',
        priority_class: r.priority_class || r.users?.priority_class || 'regular',
        type: r.transaction_types?.name || 'Unknown',
        selected_documents: r.selected_documents || [],
        appointmentDate: r.appointment_date ? new Date(r.appointment_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
        timeSlot: r.time_slot || '—',
        requested: r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
        processed: (r.status === 'pending' || r.status === 'processing') ? '—' : (r.release_date ? new Date(r.release_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date(r.appointment_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })),
        releaseDate: r.release_date ? new Date(r.release_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : null,
        status: r.status,
        notes: r.notes || null,
        required_documents: r.transaction_types?.required_documents || [],
        copies: (r.selected_documents && r.selected_documents.length > 0) ? r.selected_documents.length : 1,
      }))
      setRecords(mapped)
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token, months])

  useEffect(() => { load() }, [load])

  // ── All type names ─────────────────────────────────────────────────────────
  const PREFERRED_ORDER = [
    'Transcript of Records (TOR)',
    'Certificate of Enrollment (COE)',
    'Diploma Release',
    'General Weighted Average (GWA)',
    'Completion Form - Request',
    'Completion Form - Submission'
  ]
  
  const typeNames = [...new Set(records.map(r => r.type))].sort((a, b) => {
    const indexA = PREFERRED_ORDER.indexOf(a)
    const indexB = PREFERRED_ORDER.indexOf(b)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // ── Filter + search ────────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    if (activeType !== 'all' && r.type !== activeType) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.student.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q)
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalRecords = records.length
  const completedRecs = records.filter(r => r.status === 'completed' || r.status === 'released').length
  const pendingRecs = records.filter(r => r.status === 'pending' || r.status === 'processing').length
  const archivedRecs = records.filter(r => r.status === 'archived').length

  const typeBreakdown = typeNames.map((name, i) => ({
    name, color: DOC_COLORS[i % DOC_COLORS.length],
    count: records.filter(r => r.type === name).length,
    pct: totalRecords > 0 ? Math.round((records.filter(r => r.type === name).length / totalRecords) * 100) : 0,
  }))

  const csvRows = filtered.map(r => ({
    'Record ID': r.id, Student: r.student, 'Student ID': r.studentId,
    'Document Type': r.type, 'Date Requested': r.requested, 'Date Processed': r.processed,
    Status: r.status, Copies: r.copies,
  }))

  return (
    <div className="animate-fade-up font-sans w-full pb-10">
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Record Management</p>
          <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
            <FolderOpen size={26} className="text-maroon shrink-0" /> Registrar Records
          </h1>
          <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
            Review document issuance history, track fulfillment statuses, and export archival records.
          </p>
        </div>
        <div className="flex gap-2.5 items-center mt-2 lg:mt-0">
          <TimeframeDropdown value={months} onChange={setMonths} />
          <button
            onClick={() => {
              if (!csvRows.length) {
                showToast('No records to export.', 'error')
                return
              }
              exportCSV(csvRows, 'registrar_records.csv')
              showToast('Exported registrar records to CSV!')
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.25 rounded-xl border border-border bg-white text-text-main text-fluid-12-5 font-bold cursor-pointer font-sans hover:bg-surface hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <Download size={14} className="text-text-muted" />
            <span>Export Records</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-[12px_16px] rounded-[10px] bg-danger-light text-danger border border-danger-border mb-5 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
        {[
          { label: 'Total Records', value: totalRecords.toLocaleString(), icon: <FolderOpen size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', border: 'border-maroon-border/60', sub: `For ${months} ${months === 1 ? 'month' : 'months'}` },
          { label: 'Completed/Released', value: completedRecs.toLocaleString(), icon: <CheckCircle size={18} />, bg: 'bg-success-light', fg: 'text-success', border: 'border-success-border/60', sub: `${totalRecords > 0 ? Math.round((completedRecs / totalRecords) * 100) : 0}% fulfillment rate` },
          { label: 'Pending/Processing', value: pendingRecs.toLocaleString(), icon: <Clock size={18} />, bg: 'bg-gold-light', fg: 'text-gold', border: 'border-gold-border/60', sub: 'Requires action' },
          { label: 'Archived', value: archivedRecs.toLocaleString(), icon: <Archive size={18} />, bg: 'bg-blue-light', fg: 'text-blue', border: 'border-blue-border/60', sub: 'Historical records' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-4 sm:p-5 bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between h-full" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="text-fluid-10 font-extrabold uppercase tracking-[0.08em] text-text-muted mt-1">{c.label}</div>
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${c.border} ${c.bg} ${c.fg}`}>
                  {c.icon}
                </div>
              </div>
              <div className="font-sans text-fluid-28 sm:text-fluid-36 font-extrabold leading-none m-0 min-h-9 text-text-main">
                {loading ? <div className="animate-pulse w-15 h-9 bg-border rounded-lg" /> : c.value}
              </div>
            </div>
            <div className="text-fluid-11 font-medium text-text-muted mt-2 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${c.fg} bg-current inline-block shrink-0`} />
              <span>{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Records Table Section ── */}
      <div className="animate-fade-up w-full" style={{ animationDelay: '0.5s' }}>

        {/* Search & Filter Controls (Side-by-side next to each other) */}
        <div className="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search (shortened width) */}
          <div className="relative w-full md:w-80 shrink-0">
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by student, ID, record…"
              className="w-full py-2.25 pr-9 pl-10 rounded-xl border border-border bg-white text-fluid-12-5 text-text-main outline-none font-sans box-border focus:border-maroon transition-colors shadow-2xs"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted pointer-events-none"><Search size={15} /></span>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted flex items-center p-0.5 hover:text-text-main transition-colors"><XIcon size={14} /></button>
            )}
          </div>

          {/* Filters next to Search Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter by Status Dropdown */}
            <div className="relative z-20">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border bg-white text-fluid-12 text-text-main font-semibold outline-none cursor-pointer font-sans transition-all shadow-2xs ${
                  openDropdown === 'status' ? 'border-maroon/50 ring-2 ring-maroon/10 shadow-xs' : 'border-border hover:border-maroon/30 hover:bg-surface/30'
                }`}
              >
                <span>{statusFilter === 'all' ? 'All Statuses' : (STATUS_CFG[statusFilter]?.label || statusFilter)}</span>
                <span className="text-fluid-10 font-bold text-text-muted bg-surface px-1.5 py-0.5 rounded-full">
                  {statusFilter === 'all' ? records.length : records.filter(r => r.status === statusFilter).length}
                </span>
                <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${openDropdown === 'status' ? 'rotate-180 text-maroon' : ''}`} />
              </button>
              {openDropdown === 'status' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute left-0 top-full mt-1.5 w-max min-w-44 bg-white rounded-2xl border border-border shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-fade-up max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {['all', 'completed', 'released', 'processing', 'pending', 'archived'].map(s => {
                      const count = s === 'all' ? records.length : records.filter(r => r.status === s).length
                      const label = s === 'all' ? 'All Statuses' : (STATUS_CFG[s]?.label || s)
                      const isActive = statusFilter === s
                      return (
                        <div
                          key={s}
                          onClick={() => { setStatusFilter(s); setPage(1); setOpenDropdown(null); }}
                          className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-3 text-fluid-12 transition-colors ${
                            isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main font-medium hover:bg-off-white'
                          }`}
                        >
                          <span>{label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-fluid-10 font-bold text-text-muted bg-surface px-1.5 py-0.5 rounded-full">{count}</span>
                            {isActive && <Check size={13} className="text-maroon shrink-0" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Document Types Dropdown (clean document names only, no donut circle or progress bar) */}
            <div className="relative z-20">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border bg-white text-fluid-12 text-text-main font-semibold outline-none cursor-pointer font-sans transition-all shadow-2xs max-w-72 ${
                  openDropdown === 'type' ? 'border-maroon/50 ring-2 ring-maroon/10 shadow-xs' : 'border-border hover:border-maroon/30 hover:bg-surface/30'
                }`}
              >
                <span className="truncate">{activeType === 'all' ? 'All Document Types' : activeType}</span>
                <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${openDropdown === 'type' ? 'rotate-180 text-maroon' : ''}`} />
              </button>
              {openDropdown === 'type' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute right-0 top-full mt-1.5 w-max min-w-56 max-w-80 sm:max-w-96 bg-white rounded-2xl border border-border shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-fade-up max-h-72 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <div
                      onClick={() => { setActiveType('all'); setPage(1); setOpenDropdown(null); }}
                      className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-2 text-fluid-12 transition-colors ${
                        activeType === 'all' ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main font-medium hover:bg-off-white'
                      }`}
                    >
                      <span className="truncate">All Document Types</span>
                      {activeType === 'all' && <Check size={13} className="text-maroon shrink-0" />}
                    </div>
                    {typeNames.map((name, i) => {
                      const isActive = activeType === name
                      return (
                        <div
                          key={i}
                          onClick={() => { setActiveType(name); setPage(1); setOpenDropdown(null); }}
                          className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-2 text-fluid-12 transition-colors ${
                            isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main font-medium hover:bg-off-white'
                          }`}
                        >
                          <span className="truncate" title={name}>{name}</span>
                          {isActive && <Check size={13} className="text-maroon shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Reset Filters button */}
            {(activeType !== 'all' || statusFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => { setActiveType('all'); setStatusFilter('all'); setSearch(''); setPage(1); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-fluid-11 font-bold text-text-muted hover:text-maroon cursor-pointer bg-transparent border-none transition-colors"
              >
                <XIcon size={13} />
                <span>Reset filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col gap-3">
            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-[110px_1fr_180px_110px_40px] px-5 pb-2 pt-1 border-b border-border/60">
              {['Record ID', 'Student & Document', 'Dates', 'Status', ''].map(h => (
                <span key={h} className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em]">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              [1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3 shadow-sm">
                  <div className="animate-pulse h-4 w-1/4 rounded bg-border" />
                  <div className="animate-pulse h-6 w-3/4 rounded bg-border" />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div className="p-[60px_24px] text-center bg-white rounded-2xl border border-border shadow-sm">
                <div className="flex justify-center mb-4 text-text-muted/50"><FolderOpen size={52} strokeWidth={1.5} /></div>
                <p className="font-serif text-fluid-18 font-bold text-text-main m-0 mb-1">No records found</p>
                <p className="text-fluid-13 text-text-muted m-0 max-w-62.5 mx-auto">Try adjusting your search query or filters to find what you are looking for.</p>
              </div>
            ) : (
              paginated.map((rec) => {
                const isExpanded = expandedId === rec.id
                const typeColor = DOC_COLORS[typeNames.indexOf(rec.type) % DOC_COLORS.length]

                return (
                  <div key={rec.id} className={`group bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${isExpanded ? 'border-maroon ring-1 ring-maroon/20' : 'border-border hover:border-maroon/30 hover:shadow-md'}`}>
                    {/* Desktop Table Row (>= lg) */}
                    <div className="hidden lg:grid grid-cols-[110px_1fr_180px_110px_40px] p-[16px_20px] items-center cursor-pointer bg-white"
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    >
                      <span className="font-mono text-fluid-13 font-bold text-maroon">{rec.id}</span>

                      <div className="min-w-0 pr-4">
                        <div className="text-fluid-14 font-bold text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-maroon transition-colors mb-1">{rec.student}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-fluid-11 font-medium text-text-muted font-mono">{rec.studentId}</div>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            {rec.selected_documents && rec.selected_documents.length > 1 ? (
                              rec.selected_documents.map((d, idx) => (
                                <span key={d.id || idx} className="text-[10.5px] font-bold text-maroon bg-maroon-light py-0.5 px-2 rounded-md border border-maroon-border/30">
                                  {d.name}
                                </span>
                              ))
                            ) : (
                              <>
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                                <span className="text-fluid-12 font-medium text-text-sub overflow-hidden text-ellipsis whitespace-nowrap">{rec.type}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 pr-4">
                        <div className="text-fluid-12 font-medium text-text-sub"><span className="text-text-muted font-bold mr-1">Req:</span>{rec.requested}</div>
                        <div className="text-fluid-12 font-medium text-text-sub"><span className="text-text-muted font-bold mr-1">Pro:</span>{rec.processed}</div>
                      </div>
                      
                      <div className="flex items-center">
                        <StatusBadge status={rec.status} />
                      </div>

                      <span className={`text-text-muted transition-transform duration-200 flex justify-end ${isExpanded ? 'rotate-180 text-maroon' : 'rotate-0'}`}><ChevronDown size={20} /></span>
                    </div>

                    {/* Mobile/Tablet Card View (< lg) */}
                    <div className="lg:hidden p-4 sm:p-5 flex flex-col gap-3 cursor-pointer bg-white"
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-fluid-12 font-extrabold text-maroon bg-maroon/5 px-2.5 py-1 rounded-lg border border-maroon/15">{rec.id}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={rec.status} />
                          <span className={`text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180 text-maroon' : 'rotate-0'}`}>
                            <ChevronDown size={18} />
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-fluid-14 font-bold text-text-main group-hover:text-maroon transition-colors">{rec.student}</div>
                        <div className="text-fluid-11 font-medium text-text-muted font-mono mt-0.5">{rec.studentId}</div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.selected_documents && rec.selected_documents.length > 1 ? (
                          rec.selected_documents.map((d, idx) => (
                            <span key={d.id || idx} className="text-[10.5px] font-bold text-maroon bg-maroon-light py-0.5 px-2 rounded-md border border-maroon-border/30">
                              {d.name}
                            </span>
                          ))
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                            <span className="text-fluid-12 font-medium text-text-sub">{rec.type}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-fluid-11 font-medium text-text-muted">
                        <div><span className="font-bold text-text-sub">Req:</span> {rec.requested}</div>
                        <div><span className="font-bold text-text-sub">Pro:</span> {rec.processed}</div>
                      </div>
                    </div>

                    {/* Expanded row detail */}
                    {isExpanded && (
                      <div className="p-4 sm:p-[20px_24px] bg-surface/50 border-t border-border">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                          {[
                            { l: 'Record ID', v: rec.id, mono: true },
                            { l: 'Student ID', v: rec.studentId, mono: true },
                            { l: 'Copies Requested', v: rec.copies },
                            { l: 'Current Status', v: STATUS_CFG[rec.status]?.label || rec.status },
                          ].map((d, i) => (
                            <div key={i}>
                              <div className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.08em] mb-1.5">{d.l}</div>
                              <div className={`text-fluid-13 sm:text-fluid-14 font-bold text-text-main ${d.mono ? 'font-mono' : 'font-sans'}`}>{d.v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/60">
                          <button onClick={() => setViewingRecord(rec)} className="py-2 px-4 rounded-xl border-none bg-maroon text-white text-fluid-12 font-bold cursor-pointer font-sans hover:bg-maroon-dark transition-colors shadow-sm">
                            View Full Record
                          </button>
                          {(rec.status === 'completed' || rec.status === 'released') && (
                            <button className="py-2 px-4 rounded-xl border border-border bg-white text-text-main text-fluid-12 font-semibold cursor-pointer font-sans flex items-center gap-1.5 hover:border-maroon/30 hover:text-maroon transition-all shadow-sm">
                              <Printer size={14} /> Print Record
                            </button>
                          )}
                          {(rec.status === 'pending' || rec.status === 'processing') && (
                            <button className="py-2 px-4 rounded-xl border border-success/30 bg-success-light text-success text-fluid-12 font-bold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-success hover:text-white transition-all shadow-sm">
                              <Check size={14} /> Mark as Released
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Pagination footer */}
            {filtered.length > 0 && (
              <div className="p-4 sm:p-[16px_20px] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-fluid-12 font-medium text-text-muted text-center sm:text-left">
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className={`py-1.5 px-3 rounded-lg border text-fluid-12 font-bold font-sans transition-colors ${page === 1 ? 'border-border/50 bg-surface/50 text-text-muted/50 cursor-not-allowed' : 'border-border bg-white text-text-main hover:bg-off-white hover:border-maroon/30 cursor-pointer shadow-sm'}`}>
                    Prev
                  </button>
                  <span className="sm:hidden text-fluid-12 font-bold text-text-sub px-2">
                    {page} / {totalPages}
                  </span>
                  <div className="hidden sm:flex items-center gap-1.5">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const p = totalPages <= 7 ? i + 1
                        : page <= 4 ? i + 1
                          : page >= totalPages - 3 ? totalPages - 6 + i
                            : page - 3 + i
                      return (
                        <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-fluid-12 font-bold cursor-pointer font-sans border transition-all ${page === p ? 'border-maroon bg-maroon text-white shadow-sm' : 'border-border bg-white text-text-main hover:bg-off-white hover:border-maroon/30 shadow-sm'}`}>
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className={`py-1.5 px-3 rounded-lg border text-fluid-12 font-bold font-sans transition-colors ${page === totalPages ? 'border-border/50 bg-surface/50 text-text-muted/50 cursor-not-allowed' : 'border-border bg-white text-text-main hover:bg-off-white hover:border-maroon/30 cursor-pointer shadow-sm'}`}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* ── View Record Modal ── */}
      {viewingRecord && createPortal((
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/50 overflow-y-auto animate-fade-in" onClick={() => setViewingRecord(null)}>
          <div className="bg-white rounded-3xl w-full max-w-160 my-auto shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border/80 overflow-hidden animate-fade-up relative flex flex-col" onClick={e => e.stopPropagation()}>
             {/* Decorative top accent bar */}
             <div className="h-1.5 w-full bg-linear-to-r from-maroon via-maroon-dark to-gold shrink-0" />

             {/* Header */}
             <div className="p-6 sm:p-7 pb-4 sm:pb-5 border-b border-border/60 flex items-start justify-between bg-white relative">
               <div>
                 <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                   <span className="text-fluid-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-maroon-light text-maroon border border-maroon-border/60">
                     Registrar Record
                   </span>
                   <span className="text-fluid-11 font-mono font-semibold text-text-sub bg-surface px-2 py-0.5 rounded-md border border-border">
                     {viewingRecord.id}
                   </span>
                   <StatusBadge status={viewingRecord.status} />
                 </div>
                 <h2 className="font-serif text-fluid-22 sm:text-fluid-24 font-bold text-text-main m-0">Record Details</h2>
               </div>
               <button 
                 onClick={() => setViewingRecord(null)}
                 className="w-9 h-9 rounded-full border border-border/80 bg-surface flex items-center justify-center text-text-muted hover:text-text-main hover:bg-off-white transition-all cursor-pointer shrink-0"
                 title="Close"
               >
                 <XIcon size={17} />
               </button>
             </div>
             
              {/* Body */}
              <div className="p-5 sm:p-7 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Section 1: Student Information & Appointment Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Student Info Card */}
                  <div className="bg-surface/40 p-4 rounded-2xl border border-border/70 flex flex-col justify-between">
                    <div>
                      <h3 className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-2">Student Information</h3>
                      <div className="text-fluid-15 font-bold text-text-main">{viewingRecord.student}</div>
                      <div className="text-fluid-12 text-text-sub font-mono mt-1">ID: {viewingRecord.studentId}</div>
                      {viewingRecord.email && viewingRecord.email !== '—' && (
                        <div className="text-fluid-12 text-text-sub mt-1 truncate" title={viewingRecord.email}>
                          Email: {viewingRecord.email}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between flex-wrap gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-fluid-10 font-bold text-text-muted uppercase block">Course</span>
                        <span className="text-fluid-12 font-semibold text-text-main truncate block" title={viewingRecord.course}>
                          {viewingRecord.course || 'General Student'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-fluid-10 font-bold text-text-muted uppercase block">Priority</span>
                        <span className="text-fluid-10 font-bold px-2 py-0.5 rounded-full bg-gold-light text-gold border border-gold-border inline-block uppercase tracking-wider">
                          {viewingRecord.priority_class || 'Regular'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Schedule Card */}
                  <div className="bg-surface/40 p-4 rounded-2xl border border-border/70 flex flex-col justify-between">
                    <div>
                      <h3 className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-2">Appointment Schedule</h3>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-maroon shrink-0" />
                        <span className="text-fluid-13 font-bold text-text-main">{viewingRecord.appointmentDate}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={14} className="text-gold shrink-0" />
                        <span className="text-fluid-12 font-semibold text-text-sub">Slot: {viewingRecord.timeSlot}</span>
                      </div>
                      {viewingRecord.releaseDate && (
                        <div className="text-fluid-11 text-text-sub mt-2 bg-white/80 p-2 rounded-lg border border-border">
                          <span className="font-bold text-text-muted block">Target Release Date:</span>
                          <span className="font-semibold text-success">{viewingRecord.releaseDate}</span>
                        </div>
                      )}
                    </div>
                    {viewingRecord.notes && (
                      <div className="mt-3 pt-2 border-t border-border/60 text-fluid-11 text-text-muted italic">
                        &ldquo;{viewingRecord.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Requested Documents */}
                <div className="bg-white p-4 rounded-2xl border border-border/70">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.08em] m-0">
                      Requested Documents ({viewingRecord.copies})
                    </h3>
                  </div>
                  {viewingRecord.selected_documents && viewingRecord.selected_documents.length > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewingRecord.selected_documents.map((d, idx) => (
                        <span key={d.id || idx} className="text-fluid-12 font-bold text-maroon bg-maroon-light py-1 px-2.5 rounded-lg border border-maroon-border/40">
                          {d.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-fluid-14 font-bold text-text-main">{viewingRecord.type}</div>
                  )}

                  {/* Required Documents Checklist */}
                  {viewingRecord.required_documents && viewingRecord.required_documents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <span className="text-fluid-10 font-bold text-text-muted uppercase block mb-1.5">Requirements Checklist</span>
                      <div className="flex flex-wrap gap-1.5">
                        {viewingRecord.required_documents.map((req, rIdx) => (
                          <span key={rIdx} className="text-fluid-11 font-medium bg-surface text-text-sub py-0.5 px-2 rounded-md border border-border flex items-center gap-1">
                            <CheckCircle size={12} className="text-success" />
                            <span>{req}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-none border-t border-border m-0" />

                {/* Section 3: Processing Timeline */}
                <div>
                   <h3 className="text-fluid-10 font-extrabold text-text-muted uppercase tracking-[0.08em] m-0 mb-3.5">Official Processing Timeline</h3>
                   <div className="flex flex-col gap-4 relative pl-1">
                     {/* Connecting Line */}
                     <div className="absolute left-2.75 top-2.5 bottom-2.5 w-0.5 bg-border" />
                     
                     {/* Step 1: Request Created */}
                     <div className="flex gap-3.5 relative items-start">
                       <div className="w-4 h-4 rounded-full bg-white border-[3px] border-maroon z-10 shrink-0 mt-0.5" />
                       <div>
                         <div className="text-fluid-13 font-bold text-text-main">Request Created</div>
                         <div className="text-fluid-11-5 text-text-muted mt-0.5">{viewingRecord.requested} • Logged via Student Portal</div>
                       </div>
                     </div>
                     
                     {/* Step 2: Scheduled Appointment */}
                     <div className="flex gap-3.5 relative items-start">
                       <div className="w-4 h-4 rounded-full bg-white border-[3px] border-gold z-10 shrink-0 mt-0.5" />
                       <div>
                         <div className="text-fluid-13 font-bold text-text-main">Appointment Scheduled</div>
                         <div className="text-fluid-11-5 text-text-muted mt-0.5">Reserved for {viewingRecord.appointmentDate} ({viewingRecord.timeSlot})</div>
                       </div>
                     </div>

                     {/* Step 3: Current Status & Fulfillment */}
                     {viewingRecord.status === 'cancelled' ? (
                       <div className="flex gap-3.5 relative items-start">
                         <div className="w-4 h-4 rounded-full bg-white border-[3px] border-danger z-10 shrink-0 mt-0.5" />
                         <div>
                           <div className="text-fluid-13 font-bold text-danger">Appointment Cancelled</div>
                           <div className="text-fluid-11-5 text-text-muted mt-0.5">Appointment was cancelled before processing.</div>
                         </div>
                       </div>
                     ) : (viewingRecord.status === 'completed' || viewingRecord.status === 'released') ? (
                       <div className="flex gap-3.5 relative items-start">
                         <div className="w-4 h-4 rounded-full bg-white border-[3px] border-success z-10 shrink-0 mt-0.5" />
                         <div>
                           <div className="text-fluid-13 font-bold text-success">Document Released / Fulfilled</div>
                           <div className="text-fluid-11-5 text-text-muted mt-0.5">
                             {viewingRecord.processed !== '—' ? `${viewingRecord.processed} • ` : ''}Transaction successfully finalized
                           </div>
                         </div>
                       </div>
                     ) : viewingRecord.status === 'processing' ? (
                       <div className="flex gap-3.5 relative items-start">
                         <div className="w-4 h-4 rounded-full bg-white border-[3px] border-gold z-10 shrink-0 mt-0.5 animate-pulse" />
                         <div>
                           <div className="text-fluid-13 font-bold text-gold">In Preparation</div>
                           <div className="text-fluid-11-5 text-text-muted mt-0.5">Registrar staff currently reviewing requirements and preparing document.</div>
                         </div>
                       </div>
                     ) : (
                       <div className="flex gap-3.5 relative items-start">
                         <div className="w-4 h-4 rounded-full bg-white border-[3px] border-border z-10 shrink-0 mt-0.5" />
                         <div>
                           <div className="text-fluid-13 font-bold text-text-sub">Awaiting Appointment Verification</div>
                           <div className="text-fluid-11-5 text-text-muted mt-0.5">Student is scheduled to arrive at the Registrar Office on the appointment date.</div>
                         </div>
                       </div>
                     )}
                   </div>
                </div>
             </div>
             
             {/* Footer */}
             <div className="p-5 sm:p-6 bg-surface/80 border-t border-border/80 flex justify-end gap-3 rounded-b-3xl">
               <button onClick={() => setViewingRecord(null)} className="py-2.5 px-5 rounded-xl border border-border/80 bg-white text-text-main text-fluid-13 font-semibold hover:bg-off-white transition-colors cursor-pointer">
                 Close
               </button>
               {(viewingRecord.status === 'completed' || viewingRecord.status === 'released') && (
                 <button className="py-2.5 px-5 rounded-xl border-none bg-maroon text-white text-fluid-13 font-bold hover:bg-maroon-dark transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
                   <Printer size={15} /> Print Record
                 </button>
               )}
             </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
