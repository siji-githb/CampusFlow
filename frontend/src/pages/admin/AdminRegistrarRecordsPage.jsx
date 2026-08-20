import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
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
    <span className={`text-[10px] font-bold py-1 px-2.5 rounded-full border tracking-[0.04em] whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
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
        className="flex items-center gap-2 px-3.5 py-2.25 rounded-xl border border-border bg-white text-[12.5px] font-bold text-text-main outline-none cursor-pointer font-sans hover:bg-surface hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      >
        <Calendar size={14} className="text-gold shrink-0" />
        <span>{currentLabel}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-border shadow-lg p-1.5 z-50 animate-fade-up">
            <div className="px-2.5 py-1 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Timeframe</div>
            {options.map(o => {
              const isActive = value === o.value
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between text-[12px] font-medium transition-colors ${
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
  const [toastMsg, setToastMsg]       = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: typeof msg === 'string' ? msg : JSON.stringify(msg), type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const PER_PAGE = 8

  const load = useCallback(async () => {
    setLoading(true)
    try { 
      const rawRecords = await getRegistrarRecords(token, months * 30)
      const mapped = rawRecords.map(r => ({
        id: `REC-${r.id.split('-')[0].toUpperCase()}`,
        rawId: r.id,
        student: `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.trim(),
        studentId: r.users?.student_id || 'N/A',
        type: r.transaction_types?.name || 'Unknown',
        requested: new Date(r.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
        processed: (r.status === 'pending' || r.status === 'processing') ? '—' : new Date(r.appointment_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
        status: r.status,
        copies: 1,
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
    <div>
      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className={`fixed bottom-10 right-8 z-9999 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border text-[13.5px] font-bold animate-fade-up ${
          toastMsg.type === 'error' 
            ? 'bg-red-600 text-white border-red-700' 
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
          <button onClick={() => setToastMsg(null)} className="ml-2.5 bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-0 flex items-center shrink-0 transition-opacity">
            <XIcon size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">RECORD MANAGEMENT</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <FolderOpen className="text-maroon" size={24} /> Registrar Records
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
            Review document issuance history, track statuses, and export records.
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
            className="flex items-center gap-1.5 px-3.5 py-2.25 rounded-xl border border-border bg-white text-text-main text-[12.5px] font-bold cursor-pointer font-sans hover:bg-surface hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Records', value: totalRecords.toLocaleString(), icon: <FolderOpen size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: `For ${months} ${months === 1 ? 'month' : 'months'}` },
          { label: 'Completed/Released', value: completedRecs.toLocaleString(), icon: <CheckCircle size={18} />, bg: 'bg-success-light', fg: 'text-success', sub: `${totalRecords > 0 ? Math.round((completedRecs / totalRecords) * 100) : 0}% fulfillment rate` },
          { label: 'Pending/Processing', value: pendingRecs.toLocaleString(), icon: <Clock size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'Requires action' },
          { label: 'Archived', value: archivedRecs.toLocaleString(), icon: <Archive size={18} />, bg: 'bg-surface', fg: 'text-text-sub', sub: 'Historical records' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-[18px_20px] bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-text-muted mt-1">{c.label}</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-[36px] font-extrabold leading-none m-0 min-h-9 text-text-main">
              {loading ? <div className="animate-pulse w-15 h-9 bg-border rounded-lg" /> : c.value}
            </div>
            <div className="text-[11px] font-medium text-text-muted mt-1.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Table + Breakdown ── */}
      <div className="animate-fade-up grid grid-cols-[1fr_220px] gap-5" style={{ animationDelay: '0.5s' }}>

        {/* Left: Records Table */}
        <div>
          {/* Search + Type dropdown */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by student name, record ID, or student ID…"
                className="w-full py-2.5 pr-5 pl-10 rounded-full border border-border bg-white text-[13px] text-text-main outline-none font-sans box-border focus:border-maroon transition-colors"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted"><Search size={16} /></span>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted flex items-center p-0.5 hover:text-text-main transition-colors"><XIcon size={16} /></button>
              )}
            </div>

            </div>          {/* Table */}
          <div className="flex flex-col gap-3">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[110px_1fr_180px_110px_40px] px-5 pb-2 pt-1 border-b border-border/60">
              {['Record ID', 'Student & Document', 'Dates', 'Status', ''].map(h => (
                <span key={h} className="text-[11px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{h}</span>
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
                <p className="font-serif text-[18px] font-bold text-text-main m-0 mb-1">No records found</p>
                <p className="text-[13px] text-text-muted m-0 max-w-62.5 mx-auto">Try adjusting your search query or filters to find what you are looking for.</p>
              </div>
            ) : (
              paginated.map((rec) => {
                const isExpanded = expandedId === rec.id
                const typeColor = DOC_COLORS[typeNames.indexOf(rec.type) % DOC_COLORS.length]

                return (
                  <div key={rec.id} className={`group bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${isExpanded ? 'border-maroon ring-1 ring-maroon/20' : 'border-border hover:border-maroon/30 hover:shadow-md'}`}>
                    <div className="grid grid-cols-[110px_1fr_180px_110px_40px] p-[16px_20px] items-center cursor-pointer bg-white"
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    >
                      <span className="font-mono text-[13px] font-bold text-maroon">{rec.id}</span>

                      <div className="min-w-0 pr-4">
                        <div className="text-[14px] font-bold text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-maroon transition-colors mb-1">{rec.student}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-[11px] font-medium text-text-muted font-mono">{rec.studentId}</div>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                            <span className="text-[12px] font-medium text-text-sub overflow-hidden text-ellipsis whitespace-nowrap">{rec.type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 pr-4">
                        <div className="text-[12px] font-medium text-text-sub"><span className="text-text-muted font-bold mr-1">Req:</span>{rec.requested}</div>
                        <div className="text-[12px] font-medium text-text-sub"><span className="text-text-muted font-bold mr-1">Pro:</span>{rec.processed}</div>
                      </div>
                      
                      <div className="flex items-center">
                        <StatusBadge status={rec.status} />
                      </div>

                      <span className={`text-text-muted transition-transform duration-200 flex justify-end ${isExpanded ? 'rotate-180 text-maroon' : 'rotate-0'}`}><ChevronDown size={20} /></span>
                    </div>

                    {/* Expanded row detail */}
                    {isExpanded && (
                      <div className="p-[20px_24px] bg-surface/50 border-t border-border">
                        <div className="grid grid-cols-4 gap-6">
                          {[
                            { l: 'Record ID', v: rec.id, mono: true },
                            { l: 'Student ID', v: rec.studentId, mono: true },
                            { l: 'Copies Requested', v: rec.copies },
                            { l: 'Current Status', v: STATUS_CFG[rec.status]?.label || rec.status },
                          ].map((d, i) => (
                            <div key={i}>
                              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] mb-1.5">{d.l}</div>
                              <div className={`text-[14px] font-bold text-text-main ${d.mono ? 'font-mono' : 'font-sans'}`}>{d.v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
                          <button onClick={() => setViewingRecord(rec)} className="py-2 px-4 rounded-xl border-none bg-maroon text-white text-[12px] font-bold cursor-pointer font-sans hover:bg-maroon-dark transition-colors shadow-sm">
                            View Full Record
                          </button>
                          {(rec.status === 'completed' || rec.status === 'released') && (
                            <button className="py-2 px-4 rounded-xl border border-border bg-white text-text-main text-[12px] font-semibold cursor-pointer font-sans flex items-center gap-1.5 hover:border-maroon/30 hover:text-maroon transition-all shadow-sm">
                              <Printer size={14} /> Print Record
                            </button>
                          )}
                          {(rec.status === 'pending' || rec.status === 'processing') && (
                            <button className="py-2 px-4 rounded-xl border border-success/30 bg-success-light text-success text-[12px] font-bold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-success hover:text-white transition-all shadow-sm">
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
              <div className="p-[16px_20px] flex items-center justify-between">
                <span className="text-[12px] font-medium text-text-muted">
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className={`py-1.5 px-3 rounded-lg border text-[12px] font-bold font-sans transition-colors ${page === 1 ? 'border-border/50 bg-surface/50 text-text-muted/50 cursor-not-allowed' : 'border-border bg-white text-text-main hover:bg-off-white hover:border-maroon/30 cursor-pointer shadow-sm'}`}>
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                        : page >= totalPages - 3 ? totalPages - 6 + i
                          : page - 3 + i
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-[12px] font-bold cursor-pointer font-sans border transition-all ${page === p ? 'border-maroon bg-maroon text-white shadow-sm' : 'border-border bg-white text-text-main hover:bg-off-white hover:border-maroon/30 shadow-sm'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className={`py-1.5 px-3 rounded-lg border text-[12px] font-bold font-sans transition-colors ${page === totalPages ? 'border-border/50 bg-surface/50 text-text-muted/50 cursor-not-allowed' : 'border-border bg-white text-text-main hover:bg-off-white hover:border-maroon/30 cursor-pointer shadow-sm'}`}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Status Filter Panel */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-3">Filter by Status</p>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-border bg-white hover:border-maroon/30 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-text-main">{statusFilter === 'all' ? 'All Statuses' : STATUS_CFG[statusFilter]?.label || statusFilter}</span>
                  <span className="text-[11px] font-bold text-text-muted bg-surface group-hover:bg-off-white px-2 py-0.5 rounded-full transition-colors">
                    {statusFilter === 'all' ? records.length : records.filter(r => r.status === statusFilter).length}
                  </span>
                </div>
                <ChevronDown size={15} className={`text-text-muted transition-transform duration-200 ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'status' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border shadow-lg py-2 z-50 animate-fade-up" style={{ animationDuration: '0.2s' }}>
                    {['all', 'completed', 'released', 'processing', 'pending', 'archived'].map(s => {
                      const count = s === 'all' ? records.length : records.filter(r => r.status === s).length
                      const label = s === 'all' ? 'All Statuses' : (STATUS_CFG[s]?.label || s)
                      const isActive = statusFilter === s
                      return (
                        <div 
                          key={s} 
                          onClick={() => { setStatusFilter(s); setPage(1); setOpenDropdown(null); }}
                          className={`px-4 py-2 text-[13px] font-medium cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon' : 'text-text-main hover:bg-off-white'}`}
                        >
                          <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                               {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                             </div>
                             <span>{label}</span>
                          </div>
                          <span className="text-[11px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Document Type Breakdown */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-3.5">Document Types</p>
            {loading ? (
              <div className="text-text-muted text-[13px] py-5 text-center">Loading…</div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-border bg-white text-[13px] text-text-main font-semibold hover:border-maroon/30 transition-colors"
                >
                  <span className="truncate pr-2">{activeType === 'all' ? 'All Documents' : activeType}</span>
                  <ChevronDown size={15} className={`transition-transform duration-200 shrink-0 ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
                </button>
                
                {openDropdown === 'type' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border shadow-lg p-2 z-50 animate-fade-up flex flex-col gap-1 max-h-87.5 overflow-y-auto" style={{ animationDuration: '0.2s' }}>
                      <div 
                        onClick={() => { setActiveType('all'); setPage(1); setOpenDropdown(null); }}
                        className={`p-2.5 rounded-lg cursor-pointer transition-colors ${activeType === 'all' ? 'bg-maroon/5 border border-maroon/20' : 'hover:bg-off-white border border-transparent'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${activeType === 'all' ? 'border-maroon' : 'border-text-muted/40'}`}>
                            {activeType === 'all' && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                          </div>
                          <span className={`text-[12px] font-semibold ${activeType === 'all' ? 'text-maroon' : 'text-text-main'}`}>All Documents</span>
                        </div>
                      </div>
                      {typeBreakdown.map((t, i) => {
                        const isActive = activeType === t.name;
                        return (
                          <div 
                            key={i} 
                            onClick={() => { setActiveType(t.name); setPage(1); setOpenDropdown(null); }}
                            className={`p-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-maroon/5 border border-maroon/20' : 'hover:bg-off-white border border-transparent'}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                                  {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                                </div>
                                <span className={`text-[12px] font-semibold truncate ${isActive ? 'text-maroon' : 'text-text-main'}`}>{t.name}</span>
                              </div>
                              <span className="text-[11px] font-bold shrink-0" style={{ color: t.color }}>{t.pct}%</span>
                            </div>
                            <div className="w-full h-1 bg-surface rounded-full mt-1.5 mb-1 ml-5" style={{ width: 'calc(100% - 20px)' }}>
                              <div className="h-1 rounded-full transition-[width] duration-600 ease-in-out" style={{ background: t.color, width: `${t.pct}%` }} />
                            </div>
                            <div className="text-[10px] text-text-muted ml-5 font-medium">{t.count.toLocaleString()} records</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View Record Modal ── */}
      {viewingRecord && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-150 shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
             {/* Header */}
             <div className="p-[24px_32px] bg-maroon-light border-b border-border flex justify-between items-center">
               <div>
                 <h2 className="font-serif text-[24px] font-bold text-maroon m-0 mb-1">Record Details</h2>
                 <p className="text-[13px] text-maroon/80 m-0">{viewingRecord.id}</p>
               </div>
               <button onClick={() => setViewingRecord(null)} className="bg-transparent border-none flex items-center text-maroon cursor-pointer opacity-60 hover:opacity-100 transition-opacity"><XIcon size={24} /></button>
             </div>
             
             {/* Body */}
             <div className="p-8 flex flex-col gap-7">
                <div className="grid grid-cols-2 gap-6">
                  {/* Student Info */}
                  <div>
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-3">Student Information</h3>
                    <div className="text-[16px] font-semibold text-text-main">{viewingRecord.student}</div>
                    <div className="text-[13px] text-text-sub font-mono mt-1">ID: {viewingRecord.studentId}</div>
                    <div className="text-[13px] text-text-sub mt-1">Course: BS Information Technology</div>
                    <div className="text-[13px] text-text-sub mt-1">Year Level: 3rd Year</div>
                  </div>
                  {/* Document Info */}
                  <div>
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-3">Document Details</h3>
                    <div className="text-[15px] font-semibold text-text-main">{viewingRecord.type}</div>
                    <div className="text-[13px] text-text-sub mt-1">Copies Requested: {viewingRecord.copies}</div>
                    <div className="text-[13px] text-text-sub mt-1">Purpose: Employment / Reference</div>
                  </div>
                </div>

                <hr className="border-none border-t border-border m-0" />

                {/* Timeline */}
                <div>
                   <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.06em] m-0 mb-4">Processing Timeline</h3>
                   <div className="flex flex-col gap-5 relative">
                     {/* Connecting Line */}
                     <div className="absolute left-1.75 top-2.5 bottom-2.5 w-0.5 bg-border" />
                     
                     <div className="flex gap-4 relative">
                       <div className="w-4 h-4 rounded-full bg-white border-[3px] border-maroon z-10 mt-0.5" />
                       <div>
                         <div className="text-[13px] font-bold text-text-main">Request Submitted</div>
                         <div className="text-[12px] text-text-muted mt-0.5">{viewingRecord.requested} • Verified via Student Portal</div>
                       </div>
                     </div>
                     
                     <div className="flex gap-4 relative">
                       <div className="w-4 h-4 rounded-full bg-white border-[3px] border-gold z-10 mt-0.5" />
                       <div>
                         <div className="text-[13px] font-bold text-text-main">Processing Started</div>
                         <div className="text-[12px] text-text-muted mt-0.5">Reviewing clearance and generating document.</div>
                       </div>
                     </div>

                     {(viewingRecord.status === 'completed' || viewingRecord.status === 'released') && (
                       <div className="flex gap-4 relative">
                         <div className="w-4 h-4 rounded-full bg-white border-[3px] border-success z-10 mt-0.5" />
                         <div>
                           <div className="text-[13px] font-bold text-success">Ready for Release</div>
                           <div className="text-[12px] text-text-muted mt-0.5">{viewingRecord.processed} • Available at Window 2</div>
                         </div>
                       </div>
                     )}
                   </div>
                </div>
             </div>
             
             {/* Footer */}
             <div className="p-[20px_32px] bg-surface border-t border-border flex justify-end gap-3">
               <button onClick={() => setViewingRecord(null)} className="py-2.5 px-5 rounded-[10px] border border-border bg-white text-text-main text-[13px] font-semibold cursor-pointer font-sans transition-colors hover:bg-off-white">
                 Close
               </button>
               {(viewingRecord.status === 'completed' || viewingRecord.status === 'released') && (
                 <button className="py-2.5 px-5 rounded-[10px] border-none bg-maroon text-white text-[13px] font-bold cursor-pointer font-sans flex items-center gap-2 hover:bg-maroon-dark transition-colors">
                   <Printer size={15} /> Print Record
                 </button>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
