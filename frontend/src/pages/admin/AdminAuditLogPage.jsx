import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getAuditLog } from '../../services/adminService'
import { FileDown, AlertTriangle, Search, Shield } from 'lucide-react'

const ACTION_COLORS = {
  created: { bg: 'bg-success-light', color: 'text-success' },
  updated: { bg: 'bg-info-light', color: 'text-info' },
  deleted: { bg: 'bg-maroon-light', color: 'text-maroon' },
  default: { bg: 'bg-surface', color: 'text-text-sub' },
}

const getActionStyle = (actionStr) => {
  const a = actionStr.toLowerCase()
  if (a.includes('creat')) return ACTION_COLORS.created
  if (a.includes('updat') || a.includes('chang')) return ACTION_COLORS.updated
  if (a.includes('delet') || a.includes('remov')) return ACTION_COLORS.deleted
  return ACTION_COLORS.default
}


export default function AdminAuditLogPage() {
  const { token } = useAuth()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const PER_PAGE = 15

  useEffect(() => {
    getAuditLog(token, 200) // fetch more for local pagination
      .then(data => {
        setLogs(data || [])
      })
      .catch(e => {
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [token])

  // Simple client-side search across username, action, and table
  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    const userName = l.users ? `${l.users.first_name} ${l.users.last_name}`.toLowerCase() : 'system'
    return userName.includes(q) || l.action.toLowerCase().includes(q) || (l.table_name || '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const exportCSV = () => {
    if (!filtered.length) return
    const rows = filtered.map(l => ({
      Timestamp: new Date(l.created_at).toLocaleString('en-PH'),
      User: l.users ? `${l.users.first_name} ${l.users.last_name}` : 'System',
      Action: l.action,
      Target: l.table_name || '—',
    }))
    const keys = Object.keys(rows[0])
    const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k]}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'audit_log_export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-bold text-maroon m-0 mb-1.5">Audit Log</h1>
          <p className="text-[15px] text-text-sub m-0">System-wide action history for security and compliance tracking.</p>
        </div>
        <button onClick={exportCSV} disabled={filtered.length === 0}
          className={`py-2.5 px-5 rounded-[10px] border border-border bg-white text-text-main text-[14px] font-semibold font-sans flex items-center gap-2 shadow-sm ${filtered.length ? 'cursor-pointer hover:bg-off-white' : 'cursor-not-allowed opacity-70'}`}>
          <FileDown size={16} /> Export Report
        </button>
      </div>

      {error && <div className="p-[14px_18px] rounded-xl bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-2"><AlertTriangle size={18} /> {error}</div>}

      <div className="animate-fade-up bg-white rounded-2xl border border-border overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]" style={{ animationDelay: '0.1s' }}>
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-[16px_24px] border-b border-border bg-off-white">
          <div className="relative">
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search actions, users, or tables…"
              className="w-[300px] py-2.5 pr-3.5 pl-9.5 rounded-[10px] border border-border bg-white text-[14px] text-text-main outline-none font-sans focus:border-maroon transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-text-muted"><Search size={16} /></span>
          </div>
          <span className="text-[13px] text-text-muted font-semibold">Total: {filtered.length} entries</span>
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-[120px_1.3fr_1.5fr_120px_80px_1.8fr_80px] gap-3 p-[14px_28px] bg-white border-b-2 border-surface">
          {['Date & Time', 'User Name', 'Action', 'Target', 'Status', 'Changes', 'Severity'].map(h => (
            <span key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {/* Table Body */}
        {loading ? (
          <div>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className={`grid grid-cols-[120px_1.3fr_1.5fr_120px_80px_1.8fr_80px] gap-3 p-[14px_28px] items-center ${i < 7 ? 'border-b border-border' : 'border-none'}`}>
                <div className="animate-pulse h-4 w-[80px] rounded bg-border" />
                <div className="animate-pulse h-4 w-[60%] rounded bg-border" />
                <div className="animate-pulse h-4 w-[70%] rounded bg-border" />
                <div className="animate-pulse h-4 w-[50px] rounded bg-border" />
                <div className="animate-pulse h-4 w-[40px] rounded bg-border" />
                <div className="animate-pulse h-4 w-[80%] rounded bg-border" />
                <div className="animate-pulse h-4 w-[40px] rounded bg-border" />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-20 text-center">
            <div className="flex justify-center mb-4 text-text-muted"><Shield size={48} /></div>
            <p className="text-[16px] font-semibold text-text-main m-0 mb-1.5">No audit entries found</p>
            <p className="text-[14px] text-text-muted m-0">{search ? 'Try adjusting your search criteria.' : 'System actions will appear here.'}</p>
          </div>
        ) : (
          <div>
            {paginated.map((log, i) => {
              const style = getActionStyle(log.action)
              const statusColor = log.status === 'Success' ? 'text-success' : 'text-danger'
              const statusBg = log.status === 'Success' ? 'bg-success' : 'bg-danger'
              
              const sevColors = {
                Info: { bg: 'bg-surface', color: 'text-text-sub' },
                Warning: { bg: 'bg-gold-light', color: 'text-gold' },
                Critical: { bg: 'bg-maroon-light', color: 'text-maroon' }
              }
              const sev = sevColors[log.severity] || sevColors.Info

              return (
                <div key={log.id} className={`grid grid-cols-[120px_1.3fr_1.5fr_120px_80px_1.8fr_80px] items-center gap-3 p-[16px_28px] transition-colors duration-150 hover:bg-off-white ${i < paginated.length - 1 ? 'border-b border-border' : 'border-none'} ${i % 2 === 0 ? 'bg-white' : 'bg-[#FDFCFB]'}`}>
                  <span className="text-[12px] text-text-sub font-mono">
                    {new Date(log.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-maroon-light text-maroon flex items-center justify-center text-[10px] font-bold shrink-0 border border-maroon-border">
                      {log.users?.first_name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <span className="text-[13px] font-semibold text-text-main whitespace-nowrap overflow-hidden text-ellipsis">
                      {log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System Auto'}
                    </span>
                  </div>

                  <div className="flex items-center min-w-0">
                    <span className={`text-[11px] font-bold py-[3px] px-2 rounded-md uppercase tracking-[0.04em] whitespace-nowrap overflow-hidden text-ellipsis ${style.bg} ${style.color}`}>
                      {log.action}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-text-sub whitespace-nowrap overflow-hidden text-ellipsis">{log.table_name || 'System / Config'}</div>
                    <div className="text-[11px] text-text-muted font-mono">{log.record_id || '—'}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${statusBg}`}></div>
                    <span className={`text-[12px] font-semibold ${statusColor}`}>{log.status || 'Success'}</span>
                  </div>

                  <div className="text-[12px] text-text-main whitespace-nowrap overflow-hidden text-ellipsis" title={log.changes}>
                    {log.changes || '—'}
                  </div>

                  <span className={`text-[11px] font-bold py-[3px] px-2 rounded-md text-center ${sev.bg} ${sev.color}`}>
                    {log.severity || 'Info'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="p-[14px_24px] border-t border-border bg-off-white flex items-center justify-between">
            <span className="text-[13px] text-text-muted">
              Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className={`py-1.5 px-3.5 rounded-lg border border-border bg-white text-[13px] font-semibold font-sans ${page === 1 ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-surface'}`}>
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className={`py-1.5 px-3.5 rounded-lg border border-border bg-white text-[13px] font-semibold font-sans ${page === totalPages ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-surface'}`}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
