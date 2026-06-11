import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getAuditLog } from '../../services/adminService'
import { FileDown, AlertTriangle, Search, Shield } from 'lucide-react'

const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.3)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  surface:      '#F2EDE8',
  border:       '#EAE7E2',
  text:         '#1C1917',
  textSub:      '#57534E',
  textMuted:    '#A8A29E',
  green:        '#15803D',
  greenLight:   '#F0FDF4',
  greenBorder:  '#BBF7D0',
  blue:         '#1D4ED8',
  blueLight:    '#EFF6FF',
  blueBorder:   '#BFDBFE',
}

const ACTION_COLORS = {
  created: { bg: M.greenLight, color: M.green },
  updated: { bg: M.blueLight, color: M.blue },
  deleted: { bg: M.maroonLight, color: M.maroon },
  default: { bg: M.surface, color: M.textSub },
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '32px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Audit Log</h1>
          <p style={{ fontSize: '15px', color: M.textSub, margin: 0 }}>System-wide action history for security and compliance tracking.</p>
        </div>
        <button onClick={exportCSV} disabled={filtered.length === 0}
          style={{ padding: '10px 20px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.white, color: M.text, fontSize: '14px', fontWeight: 600, cursor: filtered.length ? 'pointer' : 'not-allowed', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <FileDown size={16} /> Export Report
        </button>
      </div>

      {error && <div style={{ padding: '14px 18px', borderRadius: '12px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} /> {error}</div>}

      <div className="animate-fade-up" style={{ animationDelay: '0.1s', background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${M.border}`, background: M.offWhite }}>
          <div style={{ position: 'relative' }}>
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search actions, users, or tables…"
              style={{ width: '300px', padding: '10px 14px 10px 38px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.white, fontSize: '14px', color: M.text, outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}
              onFocus={e => e.target.style.borderColor = M.maroon}
              onBlur={e => e.target.style.borderColor = M.border}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: M.textMuted }}><Search size={16} /></span>
          </div>
          <span style={{ fontSize: '13px', color: M.textMuted, fontWeight: 600 }}>Total: {filtered.length} entries</span>
        </div>

        {/* Table Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1.3fr 1.5fr 120px 80px 1.8fr 80px', gap: '12px', padding: '14px 28px', background: M.white, borderBottom: `2px solid ${M.surface}` }}>
          {['Date & Time', 'User Name', 'Action', 'Target', 'Status', 'Changes', 'Severity'].map(h => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>

        {/* Table Body */}
        {loading ? (
          <div>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '120px 1.3fr 1.5fr 120px 80px 1.8fr 80px', gap: '12px',
                padding: '14px 28px', alignItems: 'center',
                borderBottom: i < 7 ? `1px solid ${M.border}` : 'none'
              }}>
                <div className="animate-shimmer" style={{ height: '16px', width: '80px', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '60%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '70%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '50px', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '40px', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '80%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '16px', width: '40px', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: M.textMuted }}><Shield size={48} /></div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No audit entries found</p>
            <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>{search ? 'Try adjusting your search criteria.' : 'System actions will appear here.'}</p>
          </div>
        ) : (
          <div>
            {paginated.map((log, i) => {
              const style = getActionStyle(log.action)
              const statusColor = log.status === 'Success' ? M.green : M.red
              const sevColors = {
                Info: { bg: M.surface, color: M.textSub },
                Warning: { bg: M.goldLight, color: M.gold },
                Critical: { bg: M.maroonLight, color: M.maroon }
              }
              const sev = sevColors[log.severity] || sevColors.Info

              return (
                <div key={log.id} style={{
                  display: 'grid', gridTemplateColumns: '120px 1.3fr 1.5fr 120px 80px 1.8fr 80px', alignItems: 'center', gap: '12px',
                  padding: '16px 28px', borderBottom: i < paginated.length - 1 ? `1px solid ${M.border}` : 'none',
                  background: i % 2 === 0 ? M.white : '#FDFCFB', transition: 'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? M.white : '#FDFCFB'}
                >
                  <span style={{ fontSize: '12px', color: M.textSub, fontFamily: "'IBM Plex Sans', monospace" }}>
                    {new Date(log.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: M.maroonLight, color: M.maroon, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0, border: `1px solid ${M.maroonBorder}` }}>
                      {log.users ? log.users.first_name[0].toUpperCase() : 'S'}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System Auto'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: style.bg, color: style.color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.action}
                    </span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: M.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.table_name || 'System / Config'}</div>
                    <div style={{ fontSize: '11px', color: M.textMuted, fontFamily: 'monospace' }}>{log.record_id || '—'}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor }}>{log.status || 'Success'}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.changes}>
                    {log.changes || '—'}
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: sev.bg, color: sev.color, textAlign: 'center' }}>
                    {log.severity || 'Info'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${M.border}`, background: M.offWhite, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: M.textMuted }}>
              Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
