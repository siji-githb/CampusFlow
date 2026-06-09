import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getRegistrarRecords } from '../../services/adminService'

// ── Design Tokens ──────────────────────────────────────────────────────────────
const M = {
  maroon: '#7B1A2A',
  maroonDark: '#5C1320',
  maroonLight: '#F9F0F1',
  maroonMid: 'rgba(123,26,42,0.08)',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold: '#B8900A',
  goldLight: '#FDF6E3',
  goldBorder: 'rgba(184,144,10,0.3)',
  white: '#FFFFFF',
  offWhite: '#F9F7F4',
  surface: '#F2EDE8',
  border: '#EAE7E2',
  text: '#1C1917',
  textSub: '#57534E',
  textMuted: '#A8A29E',
  green: '#15803D',
  greenLight: '#F0FDF4',
  greenBorder: '#BBF7D0',
  blue: '#1D4ED8',
  blueLight: '#EFF6FF',
  blueBorder: '#BFDBFE',
  red: '#DC2626',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
  purple: '#6D28D9',
  purpleLight: '#F5F3FF',
}

const DOC_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  completed: { label: 'Completed', bg: M.greenLight, color: M.green, border: M.greenBorder },
  released: { label: 'Released', bg: M.blueLight, color: M.blue, border: M.blueBorder },
  processing: { label: 'Processing', bg: M.goldLight, color: M.gold, border: M.goldBorder },
  pending: { label: 'Pending', bg: M.maroonLight, color: M.maroon, border: M.maroonBorder },
  cancelled: { label: 'Cancelled', bg: M.redLight, color: M.red, border: M.redBorder },
  archived: { label: 'Archived', bg: M.surface, color: M.textMuted, border: M.border },
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
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
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={M.border} strokeWidth={5} />
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
  const typeNames = [...new Set(records.map(r => r.type))]

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Registrar Records</h1>
          <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Document issuance history and student record management.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Timeframe:</span>
            <div style={{ position: 'relative' }}>
              <select
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
                style={{ padding: '9px 32px 9px 14px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', color: M.text, outline: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", appearance: 'none', fontWeight: 600 }}>
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: M.textMuted, fontSize: '12px' }}>▾</span>
            </div>
          </div>
          <button onClick={() => exportCSV(csvRows, 'registrar_records.csv')}
            style={{ padding: '9px 18px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.white, color: M.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '7px' }}>
            📤 Export CSV
          </button>
          <button onClick={load}
            style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '7px' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '20px' }}>⚠ {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Records', value: totalRecords.toLocaleString(), color: M.maroon, sub: `For ${months} ${months === 1 ? 'month' : 'months'}` },
          { label: 'Completed/Released', value: completedRecs.toLocaleString(), color: M.green, sub: `${totalRecords > 0 ? Math.round((completedRecs / totalRecords) * 100) : 0}% fulfillment rate` },
          { label: 'Pending/Processing', value: pendingRecs.toLocaleString(), color: M.gold, sub: 'Requires action' },
          { label: 'Archived', value: archivedRecs.toLocaleString(), color: M.textSub, sub: 'Historical records' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s`, background: M.white, borderRadius: '16px', padding: '22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '34px', fontWeight: 800, color: c.color, lineHeight: 1, marginBottom: '6px', minHeight: '34px' }}>
              {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '34px', background: M.border, borderRadius: '8px' }} /> : c.value}
            </div>
            <div style={{ fontSize: '12px', color: M.textMuted }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Table + Breakdown ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.5s', display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px' }}>

        {/* Left: Records Table */}
        <div>
          {/* Search + Type tabs */}
          <div style={{ marginBottom: '16px' }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by student name, record ID, or student ID…"
                style={{ width: '100%', padding: '10px 16px 10px 38px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', color: M.text, outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif", boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = M.maroon}
                onBlur={e => e.target.style.borderColor = M.border}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: M.textMuted }}>🔍</span>
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: M.textMuted, fontSize: '16px', padding: '2px 6px' }}>×</button>
              )}
            </div>

            {/* Document type tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', ...typeNames].map((type, i) => (
                <button key={type} onClick={() => { setActiveType(type); setPage(1) }} style={{
                  padding: '6px 14px', borderRadius: '100px',
                  border: `1px solid ${activeType === type ? M.maroon : M.border}`,
                  background: activeType === type ? M.maroon : M.white,
                  color: activeType === type ? M.white : M.textSub,
                  fontSize: '12px', fontWeight: activeType === type ? 700 : 400,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                  transition: 'all 0.15s',
                }}>
                  {type === 'all' ? 'All Types' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1.4fr 1.2fr 100px 100px 110px 40px', padding: '12px 20px', background: M.surface, borderBottom: `1px solid ${M.border}` }}>
              {['Record ID', 'Student', 'Document Type', 'Requested', 'Processed', 'Status', ''].map(h => (
                <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              [1, 2, 3, 4, 5].map((n, idx) => (
                <div key={n} style={{
                  display: 'grid', gridTemplateColumns: '110px 1.4fr 1.2fr 100px 100px 110px 40px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: idx === 4 ? 'none' : `1px solid ${M.border}`,
                  background: idx % 2 === 0 ? M.white : '#FDFCFB',
                }}>
                  <div className="animate-shimmer" style={{ height: '16px', width: '60px', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '24px', width: '70%', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '16px', width: '80%', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '16px', width: '60px', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '16px', width: '60px', borderRadius: '4px' }} />
                  <div className="animate-shimmer" style={{ height: '24px', width: '70px', borderRadius: '100px' }} />
                  <div />
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>🗂️</div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No records found</p>
                <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>Try adjusting your search or filters.</p>
              </div>
            ) : (
              paginated.map((rec, idx) => {
                const isExpanded = expandedId === rec.id
                const typeColor = DOC_COLORS[typeNames.indexOf(rec.type) % DOC_COLORS.length]
                const isLast = idx === paginated.length - 1

                return (
                  <div key={rec.id}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '110px 1.4fr 1.2fr 100px 100px 110px 40px',
                      padding: '14px 20px', alignItems: 'center',
                      borderBottom: isLast && !isExpanded ? 'none' : `1px solid ${M.border}`,
                      background: isExpanded ? M.maroonLight : idx % 2 === 0 ? M.white : '#FDFCFB',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = M.offWhite }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = idx % 2 === 0 ? M.white : '#FDFCFB' }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: M.maroon }}>{rec.id}</span>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.student}</div>
                        <div style={{ fontSize: '10px', color: M.textMuted, fontFamily: 'monospace', marginTop: '1px' }}>{rec.studentId}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: M.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.type}</span>
                      </div>

                      <span style={{ fontSize: '12px', color: M.textMuted }}>{rec.requested}</span>
                      <span style={{ fontSize: '12px', color: M.textMuted }}>{rec.processed}</span>
                      <StatusBadge status={rec.status} />
                      <span style={{ color: M.textMuted, fontSize: '14px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'block', textAlign: 'center' }}>▾</span>
                    </div>

                    {/* Expanded row detail */}
                    {isExpanded && (
                      <div style={{ padding: '16px 24px', background: M.maroonLight, borderBottom: isLast ? 'none' : `1px solid ${M.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          {[
                            { l: 'Record ID', v: rec.id, mono: true },
                            { l: 'Student ID', v: rec.studentId, mono: true },
                            { l: 'Copies Requested', v: rec.copies },
                            { l: 'Current Status', v: STATUS_CFG[rec.status]?.label || rec.status },
                          ].map((d, i) => (
                            <div key={i}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: M.maroon, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{d.l}</div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: M.maroon, fontFamily: d.mono ? 'monospace' : 'inherit' }}>{d.v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${M.maroonBorder}` }}>
                          <button onClick={() => setViewingRecord(rec)} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: M.maroon, color: M.white, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            View Full Record
                          </button>
                          {(rec.status === 'completed' || rec.status === 'released') && (
                            <button style={{ padding: '7px 16px', borderRadius: '8px', border: `1px solid ${M.maroonBorder}`, background: 'transparent', color: M.maroon, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                              🖨 Print Record
                            </button>
                          )}
                          {(rec.status === 'pending' || rec.status === 'processing') && (
                            <button style={{ padding: '7px 16px', borderRadius: '8px', border: `1px solid ${M.greenBorder}`, background: M.greenLight, color: M.green, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                              ✓ Mark as Released
                            </button>
                          )}
                          <button style={{ padding: '7px 16px', borderRadius: '8px', border: `1px solid ${M.maroonBorder}`, background: 'transparent', color: M.maroon, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            📋 Add Note
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
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: M.surface }}>
                <span style={{ fontSize: '12px', color: M.textMuted }}>
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '5px 11px', borderRadius: '7px', border: `1px solid ${M.border}`, background: M.white, fontSize: '12px', fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                        : page >= totalPages - 3 ? totalPages - 6 + i
                          : page - 3 + i
                    return (
                      <button key={p} onClick={() => setPage(p)} style={{
                        width: '30px', height: '30px', borderRadius: '7px',
                        border: `1px solid ${page === p ? M.maroon : M.border}`,
                        background: page === p ? M.maroon : M.white,
                        color: page === p ? M.white : M.text,
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      }}>{p}</button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: '5px 11px', borderRadius: '7px', border: `1px solid ${M.border}`, background: M.white, fontSize: '12px', fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Status Filter Panel */}
          <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Filter by Status</p>
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                style={{ width: '100%', padding: '9px 32px 9px 14px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.surface, fontSize: '13px', color: M.text, outline: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", appearance: 'none', fontWeight: 600 }}>
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
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: M.textMuted, fontSize: '12px' }}>▾</span>
            </div>
          </div>

          {/* Document Type Breakdown */}
          <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Document Types</p>
            {loading ? (
              <div style={{ color: M.textMuted, fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {typeBreakdown.map((t, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Ring pct={t.pct} color={t.color} size={32} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: M.text, lineHeight: 1.3 }}>{t.name}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: t.color }}>{t.pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: M.surface, borderRadius: '2px' }}>
                      <div style={{ height: '4px', borderRadius: '2px', background: t.color, width: `${t.pct}%`, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: M.textMuted, marginTop: '3px' }}>{t.count.toLocaleString()} records</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View Record Modal ── */}
      {viewingRecord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: M.white, borderRadius: '24px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
             {/* Header */}
             <div style={{ padding: '24px 32px', background: M.maroonLight, borderBottom: `1px solid ${M.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 700, color: M.maroon, margin: '0 0 4px' }}>Record Details</h2>
                 <p style={{ fontSize: '13px', color: M.maroon, opacity: 0.8, margin: 0 }}>{viewingRecord.id}</p>
               </div>
               <button onClick={() => setViewingRecord(null)} style={{ background: 'none', border: 'none', fontSize: '32px', color: M.maroon, cursor: 'pointer', opacity: 0.6, lineHeight: 1 }}>×</button>
             </div>
             
             {/* Body */}
             <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Student Info */}
                  <div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Student Information</h3>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: M.text }}>{viewingRecord.student}</div>
                    <div style={{ fontSize: '13px', color: M.textSub, fontFamily: 'monospace', marginTop: '4px' }}>ID: {viewingRecord.studentId}</div>
                    <div style={{ fontSize: '13px', color: M.textSub, marginTop: '4px' }}>Course: BS Information Technology</div>
                    <div style={{ fontSize: '13px', color: M.textSub, marginTop: '4px' }}>Year Level: 3rd Year</div>
                  </div>
                  {/* Document Info */}
                  <div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Document Details</h3>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: M.text }}>{viewingRecord.type}</div>
                    <div style={{ fontSize: '13px', color: M.textSub, marginTop: '4px' }}>Copies Requested: {viewingRecord.copies}</div>
                    <div style={{ fontSize: '13px', color: M.textSub, marginTop: '4px' }}>Purpose: Employment / Reference</div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: `1px solid ${M.border}`, margin: 0 }} />

                {/* Timeline */}
                <div>
                   <h3 style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>Processing Timeline</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                     {/* Connecting Line */}
                     <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: M.border }} />
                     
                     <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                       <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: M.white, border: `3px solid ${M.maroon}`, zIndex: 1, marginTop: '2px' }} />
                       <div>
                         <div style={{ fontSize: '13px', fontWeight: 700, color: M.text }}>Request Submitted</div>
                         <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '2px' }}>{viewingRecord.requested} • Verified via Student Portal</div>
                       </div>
                     </div>
                     
                     <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                       <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: M.white, border: `3px solid ${M.gold}`, zIndex: 1, marginTop: '2px' }} />
                       <div>
                         <div style={{ fontSize: '13px', fontWeight: 700, color: M.text }}>Processing Started</div>
                         <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '2px' }}>Reviewing clearance and generating document.</div>
                       </div>
                     </div>

                     {(viewingRecord.status === 'completed' || viewingRecord.status === 'released') && (
                       <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                         <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: M.white, border: `3px solid ${M.green}`, zIndex: 1, marginTop: '2px' }} />
                         <div>
                           <div style={{ fontSize: '13px', fontWeight: 700, color: M.green }}>Ready for Release</div>
                           <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '2px' }}>{viewingRecord.processed} • Available at Window 2</div>
                         </div>
                       </div>
                     )}
                   </div>
                </div>
             </div>
             
             {/* Footer */}
             <div style={{ padding: '20px 32px', background: M.surface, borderTop: `1px solid ${M.border}`, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
               <button onClick={() => setViewingRecord(null)} style={{ padding: '10px 20px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.white, color: M.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", transition: 'background 0.1s' }} onMouseEnter={e => e.target.style.background = M.offWhite} onMouseLeave={e => e.target.style.background = M.white}>
                 Close
               </button>
               {(viewingRecord.status === 'completed' || viewingRecord.status === 'released') && (
                 <button style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                   🖨 Print Record
                 </button>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
