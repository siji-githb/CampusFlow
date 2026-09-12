import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import { getAuditLog } from '../../services/adminService'
import { 
  Shield, Search, AlertTriangle, FileDown, Check, X, 
  RefreshCw, Filter, Calendar, Users, Settings, Ticket, 
  CheckCircle2, Clock, Eye, AlertOctagon, Info, ChevronLeft, ChevronRight, ChevronDown,
  Activity, Lock, ArrowRight, CornerDownRight, FileText
} from 'lucide-react'

// ── Action Meta & Color System Mapping ─────────────────────────────────────────
const getActionMeta = (actionStr = '', tableName = '', severity = 'Info') => {
  const a = actionStr.toLowerCase()
  const t = (tableName || '').toLowerCase()

  if (a.includes('suspend') || a.includes('deactivat') || severity === 'Critical') {
    return {
      bg: 'bg-danger-light text-danger border-danger-border',
      badge: 'bg-danger text-white',
      icon: <AlertOctagon size={13} className="shrink-0" />,
      category: 'Security'
    }
  }
  if (a.includes('role') || a.includes('reactivat') || severity === 'Warning') {
    return {
      bg: 'bg-gold-light text-gold border-gold-border',
      badge: 'bg-gold text-white',
      icon: <AlertTriangle size={13} className="shrink-0" />,
      category: 'Security'
    }
  }
  if (a.includes('creat') || a.includes('add')) {
    return {
      bg: 'bg-success-light text-success border-success-border',
      badge: 'bg-success text-white',
      icon: <CheckCircle2 size={13} className="shrink-0" />,
      category: 'Creation'
    }
  }
  if (a.includes('delete') || a.includes('remov')) {
    return {
      bg: 'bg-danger-light text-danger border-danger-border',
      badge: 'bg-danger text-white',
      icon: <X size={13} className="shrink-0" />,
      category: 'Deletion'
    }
  }
  if (t.includes('config') || a.includes('config') || a.includes('override')) {
    return {
      bg: 'bg-maroon-light text-maroon border-maroon-border',
      badge: 'bg-maroon text-white',
      icon: <Settings size={13} className="shrink-0" />,
      category: 'Configuration'
    }
  }
  if (t.includes('step') || t.includes('queue')) {
    return {
      bg: 'bg-info-light text-info border-info-border',
      badge: 'bg-info text-white',
      icon: <Ticket size={13} className="shrink-0" />,
      category: 'Queue Ops'
    }
  }
  return {
    bg: 'bg-surface text-text-sub border-border',
    badge: 'bg-text-muted text-white',
    icon: <Info size={13} className="shrink-0" />,
    category: 'System'
  }
}

// ── Relative Time Formatter ──────────────────────────────────────────────────
function formatRelativeTime(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Custom Filter Dropdown Component ──────────────────────────────────────────
function CustomFilterDropdown({
  label,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
  onClose
}) {
  const selectedOption = options.find(o => o.value === value) || options[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 px-3.5 py-2.25 rounded-xl border bg-white text-fluid-12-5 font-bold text-text-main outline-none cursor-pointer font-sans transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
          isOpen ? 'border-maroon ring-2 ring-maroon/10 bg-surface/50' : 'border-border hover:bg-surface hover:border-maroon/30'
        }`}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown 
          size={13} 
          className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-maroon' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 sm:left-0 top-full mt-1.5 min-w-44 bg-white rounded-2xl border border-border shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-fade-up">
            {label && (
              <div className="px-3 py-1.5 text-fluid-10 font-extrabold text-text-muted uppercase tracking-wider border-b border-border/50 mb-1">
                {label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {options.map(opt => {
                const isSelected = value === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      onClose()
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left cursor-pointer flex items-center justify-between text-fluid-12-5 transition-all border-none font-sans ${
                      isSelected 
                        ? 'bg-maroon-light text-maroon font-bold' 
                        : 'bg-transparent text-text-main hover:bg-surface font-medium'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={14} className="text-maroon shrink-0 stroke-2.5 ml-2" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Dropdown Options Definitions ─────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'users', label: 'Users & Roles' },
  { value: 'config', label: 'Office Config' },
  { value: 'queue', label: 'Queue Operations' },
  { value: 'appts', label: 'Appointments' },
  { value: 'docs', label: 'Document Types' },
]

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
]

const TIMEFRAME_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today (24h)' },
  { value: 'week', label: 'Past 7 Days' },
  { value: 'month', label: 'Past 30 Days' },
]

export default function AdminAuditLogPage() {
  const { token } = useAuth()
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [page, setPage]             = useState(1)
  const [selectedLog, setSelectedLog] = useState(null)
  const toast = useToast()

  const PER_PAGE = 10

  const showToast = (msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
  }

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const data = await getAuditLog(token, 500)
      setLogs(data || [])
    } catch (e) {
      setError(e.message || 'Failed to fetch audit log records')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ── Filtering Logic ────────────────────────────────────────────────────────
  const now = new Date()
  const filtered = logs.filter(l => {
    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase()
      const userName = l.users ? `${l.users.first_name} ${l.users.last_name} ${l.users.role || ''}`.toLowerCase() : 'system auto'
      const action = (l.action || '').toLowerCase()
      const target = (l.table_name || '').toLowerCase()
      const changes = (l.changes || '').toLowerCase()
      const recordId = (l.record_id || '').toLowerCase()
      if (!userName.includes(q) && !action.includes(q) && !target.includes(q) && !changes.includes(q) && !recordId.includes(q)) {
        return false
      }
    }

    // 2. Severity Filter
    if (severityFilter !== 'all') {
      if ((l.severity || 'Info').toLowerCase() !== severityFilter.toLowerCase()) {
        return false
      }
    }

    // 3. Category Filter
    if (categoryFilter !== 'all') {
      const tbl = (l.table_name || '').toLowerCase()
      if (categoryFilter === 'users' && !tbl.includes('user')) return false
      if (categoryFilter === 'config' && !tbl.includes('config')) return false
      if (categoryFilter === 'queue' && !tbl.includes('queue') && !tbl.includes('step')) return false
      if (categoryFilter === 'appts' && !tbl.includes('appoint')) return false
      if (categoryFilter === 'docs' && !tbl.includes('transaction') && !tbl.includes('type')) return false
    }

    // 4. Time Filter
    if (timeFilter !== 'all' && l.created_at) {
      const logDate = new Date(l.created_at)
      const diffHours = (now - logDate) / (1000 * 60 * 60)
      if (timeFilter === 'today' && diffHours > 24) return false
      if (timeFilter === 'week' && diffHours > 168) return false
      if (timeFilter === 'month' && diffHours > 720) return false
    }

    return true
  })

  // ── Pagination Calculation ─────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Stat Metrics ───────────────────────────────────────────────────────────
  const totalEvents     = logs.length
  const criticalEvents  = logs.filter(l => l.severity === 'Critical' || (l.action && (l.action.toLowerCase().includes('suspend') || l.action.toLowerCase().includes('role')))).length
  const configEvents    = logs.filter(l => (l.table_name || '').includes('config')).length
  const queueEvents     = logs.filter(l => (l.table_name || '').includes('queue') || (l.table_name || '').includes('step') || (l.table_name || '').includes('appoint')).length

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!filtered.length) {
      showToast('No logs to export.', 'error')
      return
    }
    const rows = filtered.map(l => ({
      'Timestamp': new Date(l.created_at).toLocaleString('en-PH'),
      'Actor Name': l.users ? `${l.users.first_name} ${l.users.last_name}` : 'System Auto',
      'Actor Role': l.users?.role ? l.users.role.toUpperCase() : 'SYSTEM',
      'Action Taken': l.action,
      'Target Table': l.table_name || '—',
      'Record Reference': l.record_id || '—',
      'Status': l.status || 'Success',
      'Severity': l.severity || 'Info',
      'Details / Changes': l.changes || '—',
    }))
    const keys = Object.keys(rows[0])
    const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `system_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${filtered.length} audit logs to CSV!`)
  }

  return (
    <div className="animate-fade-up font-sans w-full pb-10">
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Security &amp; Compliance</p>
          <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
            <Shield size={26} className="text-maroon shrink-0" /> System Audit Log
          </h1>
          <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
            Comprehensive chronological audit trail of all administrative actions, queue verifications, parameter modifications, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => fetchLogs(true)} 
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.25 rounded-xl border border-border bg-white text-text-main text-fluid-12-5 font-bold cursor-pointer font-sans hover:bg-surface hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <RefreshCw size={14} className={`text-text-muted ${refreshing ? 'animate-spin text-maroon' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>

          <button 
            onClick={exportCSV} 
            disabled={filtered.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2.25 rounded-xl border border-border bg-white text-text-main text-fluid-12-5 font-bold cursor-pointer font-sans hover:bg-surface hover:border-maroon/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
              filtered.length ? '' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <FileDown size={14} className="text-text-muted" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-[12px_16px] rounded-[10px] bg-danger-light text-danger border border-danger-border mb-5 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
        {[
          { label: 'Total Logged Actions', value: totalEvents, sub: 'Chronological records', icon: <Shield size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', border: 'border-maroon-border/60' },
          { label: 'Security & User Events', value: criticalEvents, sub: 'Roles & suspensions', icon: <AlertOctagon size={18} />, bg: 'bg-danger-light', fg: 'text-danger', border: 'border-danger-border/60' },
          { label: 'System Configuration', value: configEvents, sub: 'Office parameters & rules', icon: <Settings size={18} />, bg: 'bg-gold-light', fg: 'text-gold', border: 'border-gold-border/60' },
          { label: 'Queue & Service Actions', value: queueEvents, sub: 'Verifications & releases', icon: <Ticket size={18} />, bg: 'bg-blue-light', fg: 'text-blue', border: 'border-blue-border/60' },
        ].map((c, idx) => (
          <div 
            key={idx} 
            className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" 
            style={{ animationDelay: `${0.08 * (idx + 1)}s` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">{c.label}</span>
              <div className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${c.border} ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div>
              <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
                {loading ? <div className="animate-pulse w-14 h-6 sm:h-7 bg-border rounded-md" /> : c.value.toLocaleString()}
              </div>
              <div className="text-fluid-10 sm:text-fluid-11 font-medium text-text-sub truncate mt-1 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${c.fg} bg-current inline-block shrink-0`} />
                <span>{c.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Log Container with System Palette ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ animationDelay: '0.3s' }}>
        
        {/* ── Toolbar ── */}
        <div className="p-4 sm:p-5 border-b border-border bg-white flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-wrap">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-64">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search actions, user names, table names, changes, record IDs…"
              className="w-full py-2.5 pr-8 pl-10 rounded-full border border-border bg-white text-fluid-13 text-text-main outline-none font-sans box-border focus:border-maroon transition-colors"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted"><Search size={16} /></span>
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted flex items-center p-0.5 hover:text-text-main transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Category Filter */}
            <CustomFilterDropdown
              label="Audit Category"
              value={categoryFilter}
              options={CATEGORY_OPTIONS}
              onChange={val => { setCategoryFilter(val); setPage(1) }}
              isOpen={openDropdown === 'category'}
              onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Severity Filter */}
            <CustomFilterDropdown
              label="Event Severity"
              value={severityFilter}
              options={SEVERITY_OPTIONS}
              onChange={val => { setSeverityFilter(val); setPage(1) }}
              isOpen={openDropdown === 'severity'}
              onToggle={() => setOpenDropdown(openDropdown === 'severity' ? null : 'severity')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Timeframe Filter */}
            <CustomFilterDropdown
              label="Event Timeframe"
              value={timeFilter}
              options={TIMEFRAME_OPTIONS}
              onChange={val => { setTimeFilter(val); setPage(1) }}
              isOpen={openDropdown === 'time'}
              onToggle={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
              onClose={() => setOpenDropdown(null)}
            />

            {/* Reset Filter Button */}
            {(search || severityFilter !== 'all' || categoryFilter !== 'all' || timeFilter !== 'all') && (
              <button 
                onClick={() => { setSearch(''); setSeverityFilter('all'); setCategoryFilter('all'); setTimeFilter('all'); setPage(1) }}
                className="py-2.25 px-3 rounded-xl border border-border bg-white text-text-muted text-fluid-12 font-bold cursor-pointer hover:text-maroon hover:border-maroon/40 transition-colors shadow-2xs"
                title="Reset all filters"
              >
                Reset
              </button>
            )}

            <span className="text-fluid-12 text-text-muted font-bold ml-1 pl-2 border-l border-border hidden sm:inline-block">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

        </div>

        {/* ── Table Header ── */}
        <div className="hidden lg:grid grid-cols-[140px_1.4fr_1.8fr_130px_1.8fr_90px_45px] gap-3 px-5 py-3 bg-surface border-b border-border/60 text-fluid-11 font-extrabold text-text-muted uppercase tracking-[0.08em]">
          <span>Timestamp</span>
          <span>Actor / Performer</span>
          <span>Action Performed</span>
          <span>Target / Table</span>
          <span>Changes &amp; Context</span>
          <span className="text-center">Severity</span>
          <span></span>
        </div>

        {/* ── Table Body ── */}
        {loading ? (
          <>
            {/* Mobile/Tablet Skeletons */}
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:hidden">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-white animate-pulse flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-border rounded" />
                    <div className="h-5 w-16 bg-border rounded-full" />
                  </div>
                  <div className="h-16 rounded-xl bg-off-white" />
                  <div className="h-4 w-24 bg-border rounded self-end" />
                </div>
              ))}
            </div>

            {/* Desktop Skeletons */}
            <div className="hidden lg:block divide-y divide-border">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-5 grid grid-cols-[140px_1.4fr_1.8fr_130px_1.8fr_90px_45px] gap-3 items-center bg-white">
                  <div className="animate-pulse h-4 w-24 bg-border rounded" />
                  <div className="animate-pulse h-4 w-36 bg-border rounded" />
                  <div className="animate-pulse h-5 w-44 bg-border rounded" />
                  <div className="animate-pulse h-4 w-20 bg-border rounded" />
                  <div className="animate-pulse h-4 w-48 bg-border rounded" />
                  <div className="animate-pulse h-5 w-16 bg-border rounded-full mx-auto" />
                  <div className="animate-pulse h-6 w-6 bg-border rounded" />
                </div>
              ))}
            </div>
          </>
        ) : paginated.length === 0 ? (
          <div className="p-16 sm:p-24 text-center bg-white">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4 text-text-muted">
              <Shield size={32} strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-fluid-20 font-bold text-text-main m-0 mb-1.5">No Audit Events Found</h3>
            <p className="text-fluid-13-5 text-text-muted m-0 max-w-96 mx-auto leading-relaxed">
              {search || severityFilter !== 'all' || categoryFilter !== 'all' || timeFilter !== 'all'
                ? 'No system logs matched your current filter criteria. Try resetting your search or filters.'
                : 'System actions, configurations, and verification logs will appear here automatically.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile & Tablet Portrait Cards (< lg) ── */}
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-surface/30 lg:hidden">
              {paginated.map(log => {
                const meta = getActionMeta(log.action, log.table_name, log.severity)
                const actorName = log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System Auto'
                const actorRole = log.users?.role ? log.users.role.toUpperCase() : 'SYSTEM'
                const logDate = log.created_at ? new Date(log.created_at) : null
                const relTime = formatRelativeTime(log.created_at)

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="bg-white rounded-2xl border border-border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 cursor-pointer group animate-fade-up"
                  >
                    {/* Card Top: Relative Time & Severity */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-fluid-12-5 font-bold text-text-main block">
                          {relTime}
                        </span>
                        <span className="text-fluid-11 text-text-muted block font-mono">
                          {logDate ? logDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <span className={`text-fluid-10 font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        log.severity === 'Critical' ? 'bg-danger-light text-danger border-danger-border' :
                        log.severity === 'Warning' ? 'bg-gold-light text-gold border-gold-border' :
                        'bg-info-light text-info border-info-border'
                      }`}>
                        {log.severity || 'Info'}
                      </span>
                    </div>

                    {/* Card Body: Actor & Action Box */}
                    <div className="p-2.5 rounded-xl bg-off-white border border-border/70 flex flex-col gap-2">
                      {/* Actor */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-fluid-11 shrink-0 border ${
                          actorRole === 'ADMIN' ? 'bg-maroon-light text-maroon border-maroon-border' :
                          actorRole === 'STAFF' ? 'bg-gold-light text-gold border-gold-border' :
                          'bg-surface text-text-main border-border'
                        }`}>
                          {actorName[0]?.toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-fluid-13 font-bold text-text-main truncate group-hover:text-maroon transition-colors">
                            {actorName}
                          </div>
                          <div className="text-fluid-10 font-extrabold uppercase tracking-wider text-text-muted">
                            {actorRole}
                          </div>
                        </div>
                      </div>

                      {/* Action Tag */}
                      <div className="pt-1.5 border-t border-border/50 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-fluid-11 font-bold px-2 py-0.5 rounded-lg border max-w-[65%] truncate ${meta.bg}`}>
                          {meta.icon}
                          <span className="truncate">{log.action}</span>
                        </span>
                        <span className="text-fluid-11 font-mono text-text-muted font-bold truncate">
                          {log.table_name || 'system'}
                        </span>
                      </div>

                      {/* Changes snippet if available */}
                      {log.changes && (
                        <p className="text-fluid-11-5 text-text-sub font-medium m-0 truncate pt-1 border-t border-border/40">
                          {log.changes}
                        </p>
                      )}
                    </div>

                    {/* Card Action Link */}
                    <div className="pt-1 flex items-center justify-between text-fluid-12 font-bold text-maroon">
                      <span>View Details</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop Table (>= lg) ── */}
            <div className="hidden lg:block divide-y divide-border/60">
              {paginated.map((log) => {
                const meta = getActionMeta(log.action, log.table_name, log.severity)
                const actorName = log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System Auto'
                const actorRole = log.users?.role ? log.users.role.toUpperCase() : 'SYSTEM'
                const logDate = log.created_at ? new Date(log.created_at) : null
                const relTime = formatRelativeTime(log.created_at)

                return (
                  <div 
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-4 sm:px-5 sm:py-4 grid grid-cols-[140px_1.4fr_1.8fr_130px_1.8fr_90px_45px] gap-3 items-center hover:bg-surface/50 cursor-pointer transition-colors group bg-white"
                  >
                    
                    {/* 1. Date & Time */}
                    <div>
                      <span className="text-fluid-12-5 font-bold text-text-main block">
                        {relTime}
                      </span>
                      <span className="text-fluid-11 text-text-muted block font-mono mt-0.5">
                        {logDate ? logDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    {/* 2. Actor / User */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-fluid-11 shrink-0 border ${
                        actorRole === 'ADMIN' ? 'bg-maroon-light text-maroon border-maroon-border' :
                        actorRole === 'STAFF' ? 'bg-gold-light text-gold border-gold-border' :
                        'bg-surface text-text-main border-border'
                      }`}>
                        {actorName[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-fluid-13 font-bold text-text-main block truncate group-hover:text-maroon transition-colors">
                          {actorName}
                        </span>
                        <span className="text-fluid-10 font-extrabold uppercase tracking-wider text-text-muted block">
                          {actorRole}
                        </span>
                      </div>
                    </div>

                    {/* 3. Action Performed */}
                    <div className="min-w-0">
                      <span className={`inline-flex items-center gap-1.5 text-fluid-11 font-bold px-2.5 py-1 rounded-lg border max-w-full truncate ${meta.bg}`}>
                        {meta.icon}
                        <span className="truncate">{log.action}</span>
                      </span>
                    </div>

                    {/* 4. Target Entity / Table */}
                    <div className="min-w-0">
                      <span className="text-fluid-12 font-bold font-mono text-text-main block truncate">
                        {log.table_name || 'system'}
                      </span>
                      {log.record_id && (
                        <span className="text-fluid-10-5 text-text-muted font-mono block truncate" title={log.record_id}>
                          ID: {log.record_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>

                    {/* 5. Changes & Context */}
                    <div className="min-w-0">
                      <p className="text-fluid-12 text-text-sub font-medium m-0 truncate" title={log.changes || 'No additional payload'}>
                        {log.changes || '—'}
                      </p>
                    </div>

                    {/* 6. Severity Badge */}
                    <div className="text-center">
                      <span className={`inline-block text-fluid-10 font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        log.severity === 'Critical' ? 'bg-danger-light text-danger border-danger-border' :
                        log.severity === 'Warning' ? 'bg-gold-light text-gold border-gold-border' :
                        'bg-info-light text-info border-info-border'
                      }`}>
                        {log.severity || 'Info'}
                      </span>
                    </div>

                    {/* 7. Action Button */}
                    <div className="flex justify-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log) }}
                        className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center text-text-muted hover:text-maroon hover:border-maroon/30 transition-colors shadow-2xs cursor-pointer"
                        title="Inspect event details"
                      >
                        <Eye size={14} />
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Pagination Footer ── */}
        {filtered.length > 0 && (
          <div className="p-[14px_24px] border-t border-border bg-white flex items-center justify-between flex-wrap gap-3">
            <span className="text-fluid-12-5 text-text-muted font-medium">
              Showing <strong className="text-text-main">{Math.min((page - 1) * PER_PAGE + 1, filtered.length)}</strong>–<strong className="text-text-main">{Math.min(page * PER_PAGE, filtered.length)}</strong> of <strong className="text-text-main">{filtered.length}</strong> events
            </span>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className={`flex items-center gap-1 py-1.5 px-3 rounded-lg border border-border bg-white text-fluid-12-5 font-bold font-sans transition-all ${
                  page === 1 ? 'cursor-not-allowed text-text-muted opacity-60' : 'cursor-pointer text-text-main hover:bg-surface hover:border-maroon/30'
                }`}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-fluid-12 font-bold text-text-muted px-2">
                Page {page} of {totalPages}
              </span>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className={`flex items-center gap-1 py-1.5 px-3 rounded-lg border border-border bg-white text-fluid-12-5 font-bold font-sans transition-all ${
                  page === totalPages ? 'cursor-not-allowed text-text-muted opacity-60' : 'cursor-pointer text-text-main hover:bg-surface hover:border-maroon/30'
                }`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Event Detail Modal (MasterListPage Standard) ── */}
      {selectedLog && createPortal((
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 animate-fade-in" onClick={() => setSelectedLog(null)}>
          <div 
            className="animate-fade-up relative my-auto w-full max-w-xl bg-white text-text-main rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border/80 overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Top decorative accent bar */}
            <div className="h-1.5 w-full bg-linear-to-r from-maroon via-maroon-dark to-gold shrink-0" />
            
            {/* Modal Header */}
            <div className="p-6 sm:p-8 pb-4 sm:pb-5 border-b border-border/60 flex items-start justify-between bg-white relative">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border/80 shadow-2xs">
                  <Shield size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-fluid-10 font-bold text-gold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold-light border border-gold-border/60">
                      Audit Event
                    </span>
                    {selectedLog.table_name && (
                      <span className="text-fluid-11 font-mono font-semibold text-text-sub bg-surface px-2 py-0.5 rounded-md border border-border">
                        {selectedLog.table_name}
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-fluid-20 sm:text-fluid-22 font-bold text-text-main m-0 leading-snug truncate">
                    {selectedLog.action}
                  </h2>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-10 h-10 rounded-full border border-border/80 bg-surface flex items-center justify-center text-text-muted hover:text-text-main hover:bg-off-white transition-all cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="p-6 sm:p-8 flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto">
              
              {/* Actor & Timestamp Card */}
              <div className="p-4 rounded-2xl bg-surface border border-border grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-fluid-11 text-text-muted font-bold uppercase tracking-wider block">Performer / Actor</span>
                  <strong className="text-fluid-14 text-text-main font-bold block mt-0.5">
                    {selectedLog.users ? `${selectedLog.users.first_name} ${selectedLog.users.last_name}` : 'System Automated'}
                  </strong>
                  <span className="text-fluid-11-5 text-text-sub font-mono block mt-0.5">
                    Role: {selectedLog.users?.role?.toUpperCase() || 'SYSTEM'}
                  </span>
                </div>

                <div>
                  <span className="text-fluid-11 text-text-muted font-bold uppercase tracking-wider block">Exact Timestamp</span>
                  <strong className="text-fluid-13 text-text-main font-semibold block mt-0.5">
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'}
                  </strong>
                  <span className="text-fluid-11-5 text-gold font-bold block mt-0.5">
                    {formatRelativeTime(selectedLog.created_at)}
                  </span>
                </div>
              </div>

              {/* Entity Target Card */}
              <div className="p-4 rounded-2xl bg-surface border border-border grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-fluid-11 text-text-muted font-bold uppercase tracking-wider block">Target Database Table</span>
                  <span className="text-fluid-13 text-maroon font-mono font-bold block mt-0.5">
                    {selectedLog.table_name || 'system'}
                  </span>
                </div>

                <div>
                  <span className="text-fluid-11 text-text-muted font-bold uppercase tracking-wider block">Severity &amp; Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-fluid-10-5 font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-gold-light text-gold border border-gold-border">
                      {selectedLog.severity || 'Info'}
                    </span>
                    <span className="text-fluid-10-5 font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-success-light text-success border border-success-border">
                      {selectedLog.status || 'Success'}
                    </span>
                  </div>
                </div>

                {selectedLog.record_id && (
                  <div className="sm:col-span-2 pt-2 border-t border-border">
                    <span className="text-fluid-11 text-text-muted font-bold uppercase tracking-wider block">Record Primary Key</span>
                    <code className="text-fluid-12 text-text-sub font-mono block mt-1 bg-white p-2 rounded-lg border border-border break-all">
                      {selectedLog.record_id}
                    </code>
                  </div>
                )}
              </div>

              {/* Recorded Payload / Changes */}
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <span className="text-fluid-11 text-text-muted font-bold uppercase tracking-wider block mb-1.5">Recorded Changes &amp; Parameters</span>
                <div className="text-fluid-13 text-text-main font-medium bg-white p-3.5 rounded-xl border border-border leading-relaxed wrap-break-word whitespace-pre-wrap font-sans">
                  {selectedLog.changes || 'No structured modification payload attached to this event.'}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 bg-surface/80 border-t border-border/80 flex justify-end rounded-b-3xl">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="py-2.5 px-6 rounded-xl border border-border/80 bg-white text-text-main font-sans font-semibold text-fluid-13 hover:bg-off-white transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      ), document.body)}

    </div>
  )
}


