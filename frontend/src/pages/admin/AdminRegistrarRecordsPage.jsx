import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getRegistrarRecords } from '../../services/adminService'
import { ChevronDown, FileDown, RefreshCw, AlertTriangle, Search, X as XIcon, FolderOpen, Printer, Check, Clipboard, CheckCircle, Clock, Archive } from 'lucide-react'

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
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">RECORD MANAGEMENT</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <FolderOpen className="text-maroon" size={24} /> Registrar Records
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-[650px]">
            Review document issuance history, track statuses, and export records.
          </p>
        </div>
        <div className="flex gap-2.5 items-center mt-2 lg:mt-0">
          <div className="flex items-center gap-2.5 mr-1.5">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] pt-0.5">Timeframe:</span>
            <div className="relative">
              <select
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
                className="py-[9px] pr-9 pl-4 rounded-xl border border-border bg-white text-[13px] text-text-main outline-none cursor-pointer font-sans appearance-none font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-text-muted/30 transition-all">
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-text-muted"><ChevronDown size={14} strokeWidth={2.5} /></span>
            </div>
          </div>
          <button onClick={() => exportCSV(csvRows, 'registrar_records.csv')}
            className="py-[9px] px-5 rounded-xl border border-border bg-white text-text-main text-[13px] font-bold cursor-pointer font-sans flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-off-white hover:border-text-muted/30 hover:-translate-y-0.5 transition-all">
            <FileDown size={16} strokeWidth={2.5} /> Export Records
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
            <div className="font-sans text-[36px] font-extrabold leading-none m-0 min-h-[36px] text-text-main">
              {loading ? <div className="animate-pulse w-[60px] h-[36px] bg-border rounded-lg" /> : c.value}
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

            {/* Type Dropdown */}
            <div className="relative shrink-0 w-full sm:w-[220px]">
              <select
                value={activeType}
                onChange={e => { setActiveType(e.target.value); setPage(1) }}
                className="w-full py-2.5 pr-9 pl-4 rounded-full border border-border bg-white text-[13px] text-text-main outline-none cursor-pointer font-sans appearance-none font-medium focus:border-maroon transition-colors">
                <option value="all">All Document Types</option>
                {typeNames.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-text-muted"><ChevronDown size={15} strokeWidth={2.5} /></span>
            </div>
          </div>          {/* Table */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Column headers */}
            <div className="grid grid-cols-[110px_1fr_1.7fr_140px_110px_110px_40px] p-[14px_24px] bg-off-white border-b border-border">
              {['Record ID', 'Student', 'Document Type', 'Requested', 'Processed', 'Status', ''].map(h => (
                <span key={h} className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em]">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              [1, 2, 3, 4, 5].map((n, idx) => (
                <div key={n} className={`grid grid-cols-[110px_1fr_1.7fr_140px_110px_110px_40px] p-[16px_24px] items-center ${idx === 4 ? 'border-none' : 'border-b border-border/60'} bg-white`}>
                  <div className="animate-pulse h-4 w-[60px] rounded bg-border" />
                  <div className="animate-pulse h-6 w-[70%] rounded bg-border" />
                  <div className="animate-pulse h-4 w-[80%] rounded bg-border" />
                  <div className="animate-pulse h-4 w-[60px] rounded bg-border" />
                  <div className="animate-pulse h-4 w-[60px] rounded bg-border" />
                  <div className="animate-pulse h-6 w-[70px] rounded-full bg-border" />
                  <div />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div className="p-[60px_24px] text-center">
                <div className="flex justify-center mb-4 text-text-muted/50"><FolderOpen size={52} strokeWidth={1.5} /></div>
                <p className="font-serif text-[18px] font-bold text-text-main m-0 mb-1">No records found</p>
                <p className="text-[13px] text-text-muted m-0 max-w-[250px] mx-auto">Try adjusting your search query or filters to find what you are looking for.</p>
              </div>
            ) : (
              paginated.map((rec, idx) => {
                const isExpanded = expandedId === rec.id
                const typeColor = DOC_COLORS[typeNames.indexOf(rec.type) % DOC_COLORS.length]
                const isLast = idx === paginated.length - 1

                return (
                  <div key={rec.id} className="group">
                    <div className={`grid grid-cols-[110px_1fr_1.7fr_140px_110px_110px_40px] p-[16px_24px] items-center cursor-pointer transition-all duration-200 ${isLast && !isExpanded ? 'border-none' : 'border-b border-border'} ${isExpanded ? 'bg-surface border-l-2 border-l-maroon' : 'bg-white hover:bg-surface border-l-2 border-l-transparent'}`}
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    >
                      <span className="font-mono text-[12.5px] font-bold text-maroon">{rec.id}</span>

                      <div className="min-w-0 pr-4">
                        <div className="text-[14px] font-bold text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-maroon transition-colors">{rec.student}</div>
                        <div className="text-[10.5px] font-medium text-text-muted font-mono mt-0.5">{rec.studentId}</div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: typeColor }} />
                        <span className="text-[13px] font-medium text-text-sub overflow-hidden text-ellipsis whitespace-nowrap">{rec.type}</span>
                      </div>

                      <span className="text-[13px] font-medium text-text-sub">{rec.requested}</span>
                      <span className="text-[13px] font-medium text-text-sub">{rec.processed}</span>
                      
                      <div className="flex items-center">
                        <StatusBadge status={rec.status} />
                      </div>

                      <span className={`text-text-muted transition-transform duration-200 flex justify-end ${isExpanded ? 'rotate-180' : 'rotate-0'}`}><ChevronDown size={18} /></span>
                    </div>

                    {/* Expanded row detail */}
                    {isExpanded && (
                      <div className={`p-[20px_24px] bg-off-white shadow-inner ${isLast ? 'border-none' : 'border-b border-border'}`}>
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
                        <div className="flex gap-2 mt-3.5 pt-3.5 border-t border-maroon-border">
                          <button onClick={() => setViewingRecord(rec)} className="py-[7px] px-4 rounded-lg border-none bg-maroon text-white text-[12px] font-bold cursor-pointer font-sans hover:bg-maroon-dark transition-colors">
                            View Full Record
                          </button>
                          {(rec.status === 'completed' || rec.status === 'released') && (
                            <button className="py-[7px] px-4 rounded-lg border border-maroon-border bg-transparent text-maroon text-[12px] font-semibold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-maroon/5 transition-colors">
                              <Printer size={14} /> Print Record
                            </button>
                          )}
                          {(rec.status === 'pending' || rec.status === 'processing') && (
                            <button className="py-[7px] px-4 rounded-lg border border-success-border bg-success-light text-success text-[12px] font-semibold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-success/10 transition-colors">
                              <Check size={14} /> Mark as Released
                            </button>
                          )}
                          <button className="py-[7px] px-4 rounded-lg border border-maroon-border bg-transparent text-maroon text-[12px] font-semibold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-maroon/5 transition-colors">
                            <Clipboard size={14} /> Add Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Pagination footer */}
            {filtered.length > 0 && (
              <div className="p-[12px_20px] border-t border-border flex items-center justify-between bg-surface">
                <span className="text-[12px] text-text-muted">
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className={`py-1 px-[11px] rounded-md border border-border bg-white text-[12px] font-semibold font-sans ${page === 1 ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-off-white'}`}>
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                        : page >= totalPages - 3 ? totalPages - 6 + i
                          : page - 3 + i
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-[30px] h-[30px] rounded-md text-[12px] font-semibold cursor-pointer font-sans border ${page === p ? 'border-maroon bg-maroon text-white' : 'border-border bg-white text-text-main hover:bg-off-white'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className={`py-1 px-[11px] rounded-md border border-border bg-white text-[12px] font-semibold font-sans ${page === totalPages ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-off-white'}`}>
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
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="w-full py-[9px] pr-8 pl-3.5 rounded-[9px] border border-border bg-surface text-[13px] text-text-main outline-none cursor-pointer font-sans appearance-none font-semibold focus:border-maroon transition-colors">
                {['all', 'completed', 'released', 'processing', 'pending', 'archived'].map(s => {
                  const count = s === 'all' ? records.length : records.filter(r => r.status === s).length
                  const label = s === 'all' ? 'All Statuses' : (STATUS_CFG[s]?.label || s)
                  return (
                    <option key={s} value={s}>
                      {label} ({count})
                    </option>
                  )
                })}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-text-muted"><ChevronDown size={14} /></span>
            </div>
          </div>

          {/* Document Type Breakdown */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-3.5">Document Types</p>
            {loading ? (
              <div className="text-text-muted text-[13px] py-5 text-center">Loading…</div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {typeBreakdown.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Ring pct={t.pct} color={t.color} size={32} />
                        <span className="text-[12px] font-semibold text-text-main leading-snug">{t.name}</span>
                      </div>
                      <span className="text-[12px] font-bold" style={{ color: t.color }}>{t.pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-surface rounded-full">
                      <div className="h-1 rounded-full transition-[width] duration-600 ease-in-out" style={{ background: t.color, width: `${t.pct}%` }} />
                    </div>
                    <div className="text-[10px] text-text-muted mt-1">{t.count.toLocaleString()} records</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View Record Modal ── */}
      {viewingRecord && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-[600px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
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
                     <div className="absolute left-[7px] top-[10px] bottom-[10px] w-0.5 bg-border" />
                     
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
