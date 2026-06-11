import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getReports, getAiInsights } from '../../services/adminService'
import { Printer, Download, Filter, RefreshCw, AlertTriangle, BarChart2, Bot, FileDown } from 'lucide-react'

// ── Design Tokens ──────────────────────────────────────────────────────────────
const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonMid:    'rgba(123,26,42,0.08)',
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
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
  purple:       '#6D28D9',
  purpleLight:  '#F5F3FF',
}

const SERIES_COLORS = [M.maroon, M.gold, M.blue, M.green, M.purple, '#EA580C']

// ── Filter Pill ────────────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, options, onChange }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
    <label style={{ fontSize: '12px', color: M.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}:</label>
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', padding: '7px 28px 7px 12px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', color: M.text, outline: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", minWidth: '130px' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: M.textMuted, fontSize: '11px' }}>▾</span>
    </div>
  </div>
)

// ── Multi-Line SVG Chart ───────────────────────────────────────────────────────
function MultiLineChart({ series, labels }) {
  const W = 800, H = 220
  const PAD = { top: 20, right: 24, bottom: 36, left: 44 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const allVals = series.flatMap(s => s.data)
  const maxV = Math.max(...allVals, 1) * 1.2
  const minV = 0

  const toX = i => PAD.left + (i / Math.max(labels.length - 1, 1)) * cW
  const toY = v => PAD.top + cH - ((v - minV) / (maxV - minV)) * cH

  const makePath = data =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  const makeArea = (data, i) => {
    if (data.length === 0) return ''
    const last = data.length - 1
    const pts = data.map((v, j) => `${toX(j).toFixed(1)},${toY(v).toFixed(1)}`).join(' L')
    return `M${toX(0).toFixed(1)},${toY(data[0]).toFixed(1)} L${pts} L${toX(last).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
  }

  const yTicks = 5
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxV / yTicks) * i))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity="0.12" />
            <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* Grid */}
      {yTickVals.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(t)} x2={PAD.left + cW} y2={toY(t)} stroke={M.border} strokeWidth={1} strokeDasharray="4,4" />
          <text x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fontSize="10" fill={M.textMuted}>{t}</text>
        </g>
      ))}

      {/* Area fills */}
      {series.map((s, i) => s.data.length > 0 && (
        <path key={`area${i}`} d={makeArea(s.data, i)} fill={`url(#grad${i})`} />
      ))}

      {/* Lines */}
      {series.map((s, i) => s.data.length > 0 && (
        <path key={`line${i}`} d={makePath(s.data)} fill="none"
          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
          strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={i === 1 ? '6,3' : 'none'}
        />
      ))}

      {/* Dots */}
      {series.map((s, i) => s.data.map((v, j) => (
        <circle key={`dot${i}-${j}`}
          cx={toX(j)} cy={toY(v)} r={3.5}
          fill={M.white} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2}
        />
      )))}

      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={M.textMuted}>{l}</text>
      ))}
    </svg>
  )
}

// ── Export to CSV ──────────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AdminReportsPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const { token } = useAuth()

  // Filters
  const [dateRange, setDateRange]   = useState('30') // days
  const [docType, setDocType]       = useState('all')
  const [department, setDepartment] = useState('registrar')

  // Data
  const [report, setReport]             = useState(null)
  const [monthlyReports, setMonthlyReports] = useState([]) // 6-month history
  const [insights, setInsights]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [insightLoading, setInsightLoading] = useState(false)
  const [error, setError]               = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Fetch current range + per-month data (30-day windows back)
      const [main, m1, m2, m3, m4, m5, m6] = await Promise.all([
        getReports(token, Number(dateRange)),
        getReports(token, 30),
        getReports(token, 60),
        getReports(token, 90),
        getReports(token, 120),
        getReports(token, 150),
        getReports(token, 180),
      ])
      setReport(main)

      // Build 6 synthetic monthly deltas from cumulative reports
      const cumulative = [m1, m2, m3, m4, m5, m6]
      const monthly = cumulative.map((r, i) => {
        const prev = i > 0 ? cumulative[i - 1] : { total_appointments: 0, completed: 0 }
        return {
          month: getMonthLabel(i),
          total:     (r.total_appointments || 0) - (prev.total_appointments || 0),
          completed: (r.completed || 0) - (prev.completed || 0),
          cancelled: (r.cancelled || 0) - (prev.cancelled || 0),
          no_show:   (r.no_show || 0) - (prev.no_show || 0),
          by_type:   r.by_type || [],
        }
      })
      setMonthlyReports(monthly)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token, dateRange])

  const loadInsights = async () => {
    setInsightLoading(true)
    try { setInsights(await getAiInsights(token)) }
    catch { /* silent */ }
    finally { setInsightLoading(false) }
  }

  useEffect(() => { load(); loadInsights() }, [load])

  // ── Derived ────────────────────────────────────────────────────────────────
  const monthLabels = monthlyReports.map(m => m.month)

  // Build series per transaction type across months
  const allTypeNames = [...new Set(
    monthlyReports.flatMap(m => m.by_type.map(t => t.name))
  )].slice(0, 4)

  const chartSeries = allTypeNames.map(name => ({
    name,
    data: monthlyReports.map(m => {
      const t = m.by_type.find(t => t.name === name)
      return t?.count || 0
    }),
  }))

  // Fallback series if no by_type
  const fallbackSeries = [
    { name: 'Total', data: monthlyReports.map(m => Math.max(0, m.total)) },
    { name: 'Completed', data: monthlyReports.map(m => Math.max(0, m.completed)) },
  ]

  const activeSeries = chartSeries.length > 0 ? chartSeries : fallbackSeries

  // Most requested type
  const mostRequested = report?.by_type?.[0]
  const totalVol = report?.total_appointments || 0
  const mostReqPct = mostRequested && totalVol > 0
    ? Math.round((mostRequested.count / totalVol) * 100)
    : 0

  // Monthly table rows
  const tableRows = monthlyReports.map((m, i) => ({
    Month:      m.month,
    Total:      Math.max(0, m.total),
    Completed:  Math.max(0, m.completed),
    Cancelled:  Math.max(0, m.cancelled),
    'No Show':  Math.max(0, m.no_show),
    'Completion Rate': m.total > 0 ? `${Math.round((m.completed / m.total) * 100)}%` : '—',
  }))

  return (
    <div>
      {/* ── INTERACTIVE UI (Hidden when printing) ── */}
      <div className="no-print">
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Analytics Dashboard</h1>
          <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Comprehensive view of institutional document processing metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.print()}
            style={{ padding: '9px 18px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.white, color: M.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Printer size={16} /> Print Data Summary
          </button>
          <button onClick={() => exportCSV(tableRows, 'campusflow_annual_report.csv')}
            style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: M.maroon, color: M.white, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Download size={16} /> Download Annual Report
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '14px 20px', background: M.white, borderRadius: '12px', border: `1px solid ${M.border}`, marginBottom: '24px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: M.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center' }}><Filter size={15} /></span> Filters
        </span>
        <div style={{ width: '1px', height: '24px', background: M.border }} />
        <FilterSelect label="Date Range" value={dateRange} onChange={v => setDateRange(v)} options={[
          { value: '30',  label: 'Last 30 Days' },
          { value: '90',  label: 'Last Quarter'  },
          { value: '180', label: 'Year to Date'  },
          { value: '365', label: 'Full Year'     },
        ]} />
        <FilterSelect label="Document Type" value={docType} onChange={setDocType} options={[
          { value: 'all', label: 'All' },
          { value: 'tor', label: 'TOR' },
          { value: 'coe', label: 'COE' },
          { value: 'diploma', label: 'Diploma' },
        ]} />

        <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${M.maroonBorder}`, background: M.maroonLight, color: M.maroon, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Apply
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} /> {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>

        {/* Total Transactions */}
        <div className="animate-fade-up" style={{ animationDelay: '0.1s', background: M.white, borderRadius: '16px', padding: '22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Transactions</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '8px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: M.border, borderRadius: '8px' }} /> : (report?.total_appointments || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: M.textMuted }}>For the selected period</div>
        </div>

        {/* Avg Processing Time */}
        <div className="animate-fade-up" style={{ animationDelay: '0.2s', background: M.white, borderRadius: '16px', padding: '22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Processing Time</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '80px', height: '36px', background: M.border, borderRadius: '8px' }} /> : <>{report?.avg_processing_mins || 0} <span style={{ fontSize: '18px', fontWeight: 600 }}>Mins</span></>}
          </div>
          <div style={{ fontSize: '11px', color: M.textMuted }}>Average across all types</div>
        </div>

        {/* Completion Rate */}
        <div className="animate-fade-up" style={{ animationDelay: '0.3s', background: M.white, borderRadius: '16px', padding: '22px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completion Rate</div>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: M.maroon, lineHeight: 1, marginBottom: '10px' }}>
            {loading ? <div className="animate-shimmer" style={{ width: '90px', height: '36px', background: M.border, borderRadius: '8px' }} /> : `${report?.completion_rate ?? 0}%`}
          </div>
          <div style={{ width: '100%', height: '6px', background: M.surface, borderRadius: '3px' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: `linear-gradient(90deg, ${M.maroon}, ${M.gold})`, width: `${report?.completion_rate ?? 0}%`, transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Most Requested */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s', background: M.maroon, borderRadius: '16px', padding: '22px', boxShadow: '0 4px 16px rgba(123,26,42,0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -18, top: -18, width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Most Requested</div>
          {loading || !mostRequested ? (
            <div className="animate-shimmer" style={{ width: '120px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', marginBottom: '8px' }} />
          ) : (
            <>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: M.white, lineHeight: 1.2, marginBottom: '6px' }}>
                {mostRequested.name.length > 14 ? mostRequested.name.slice(0, 14) + '…' : mostRequested.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                Represents <strong style={{ color: M.white }}>{mostReqPct}%</strong> of volume
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Document Volume Trends Chart ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.5s', background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, padding: '28px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Trends</p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: M.text, margin: 0 }}>Document Volume Trends (6 Months)</h2>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            {activeSeries.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '24px', height: '3px', background: SERIES_COLORS[i % SERIES_COLORS.length], borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: M.textSub, fontWeight: 500 }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '10px', paddingTop: '20px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-shimmer" style={{ flex: 1, height: `${20 + Math.random() * 80}%`, background: M.border, borderRadius: '6px 6px 0 0', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : monthLabels.length < 2 ? (
          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.textMuted, flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><BarChart2 size={40} /></div>
            <p style={{ margin: 0, fontSize: '14px' }}>Not enough monthly data to plot trends yet.</p>
          </div>
        ) : (
          <MultiLineChart series={activeSeries} labels={monthLabels} />
        )}
      </div>

      {/* ── AI Insight Card ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.6s', background: M.maroonLight, borderRadius: '16px', border: `1px solid ${M.maroonBorder}`, padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(123,26,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><Bot size={26} color={M.maroon} /></span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: M.maroon, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Analytics Insight</div>
              <div style={{ fontSize: '11px', color: M.maroon, opacity: 0.7, marginTop: '1px' }}>
                {insights?.date || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          <button onClick={loadInsights} disabled={insightLoading}
            style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: M.maroon, color: M.white, fontSize: '12px', fontWeight: 600, cursor: insightLoading ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", opacity: insightLoading ? 0.7 : 1 }}>
            {insightLoading ? 'Generating…' : <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> Refresh</span>}
          </button>
        </div>
        {insights ? (
          <>
            <p style={{ fontSize: '15px', color: M.maroonDark, lineHeight: 1.65, margin: '0 0 20px' }}>{insights.insight}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { l: 'Total',      v: insights.total,                c: M.text  },
                { l: 'Completed',  v: insights.completed,            c: M.green },
                { l: 'No-shows',   v: insights.no_shows,             c: M.red   },
                { l: 'Pending',    v: insights.pending,              c: M.gold  },
                { l: 'Completion', v: `${insights.completion_rate}%`,c: M.blue  },
              ].map((s, i) => (
                <div key={i} style={{ background: M.white, borderRadius: '10px', padding: '12px 18px', border: `1px solid ${M.maroonBorder}`, textAlign: 'center', flex: 1, minWidth: '80px' }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: '10px', color: M.textMuted, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: '14px', color: M.maroon, opacity: 0.75, margin: 0 }}>Click Refresh to generate today's AI-powered insight.</p>
        )}
      </div>

      {/* ── Monthly Performance Detail Table ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.7s', background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Table header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${M.border}` }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Detail</p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Monthly Performance Detail</h2>
          </div>
          <button onClick={() => exportCSV(tableRows, 'campusflow_monthly_report.csv')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.offWhite, color: M.text, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><FileDown size={14} /></span> Export CSV
          </button>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', padding: '12px 24px', background: M.surface, borderBottom: `1px solid ${M.border}` }}>
          {['Month', 'Total', 'Completed', 'Cancelled', 'No Show', 'Completion Rate'].map(h => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', padding: '16px 24px', borderBottom: `1px solid ${M.border}` }}>
                <div className="animate-shimmer" style={{ height: '18px', width: '60%', background: M.border, borderRadius: '4px' }} />
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="animate-shimmer" style={{ height: '18px', width: '40%', background: M.border, borderRadius: '4px', margin: 'auto 0 auto auto' }} />
                ))}
              </div>
            ))}
          </div>
        ) : tableRows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: M.textMuted }}>No monthly data available yet.</div>
        ) : (
          tableRows.map((row, i) => {
            const compRate = parseInt(row['Completion Rate']) || 0
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)',
                padding: '16px 24px', alignItems: 'center',
                borderBottom: i < tableRows.length - 1 ? `1px solid ${M.border}` : 'none',
                background: i % 2 === 0 ? M.white : '#FDFCFB',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? M.white : '#FDFCFB'}
              >
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, color: M.maroon }}>{row.Month}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: M.text }}>{row.Total.toLocaleString()}</span>
                <span style={{ fontSize: '14px', color: M.green, fontWeight: 600 }}>{row.Completed.toLocaleString()}</span>
                <span style={{ fontSize: '14px', color: M.red,   fontWeight: 500 }}>{row.Cancelled.toLocaleString()}</span>
                <span style={{ fontSize: '14px', color: M.textMuted }}>{row['No Show'].toLocaleString()}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '6px', background: M.surface, borderRadius: '3px', maxWidth: '80px' }}>
                    <div style={{ height: '6px', borderRadius: '3px', background: compRate >= 90 ? M.green : compRate >= 70 ? M.gold : M.red, width: `${compRate}%` }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: compRate >= 90 ? M.green : compRate >= 70 ? M.gold : M.red, minWidth: '36px' }}>{row['Completion Rate']}</span>
                </div>
              </div>
            )
          })
        )}

        {/* Summary footer */}
        {!loading && tableRows.length > 0 && (() => {
          const totals = tableRows.reduce((acc, r) => ({
            total: acc.total + r.Total,
            completed: acc.completed + r.Completed,
            cancelled: acc.cancelled + r.Cancelled,
            noShow: acc.noShow + r['No Show'],
          }), { total: 0, completed: 0, cancelled: 0, noShow: 0 })
          const overallRate = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', padding: '16px 24px', background: M.maroonLight, borderTop: `2px solid ${M.maroonBorder}` }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: M.maroon, textTransform: 'uppercase', letterSpacing: '0.04em' }}>6-Month Total</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 800, color: M.maroon }}>{totals.total.toLocaleString()}</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 800, color: M.green }}>{totals.completed.toLocaleString()}</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 800, color: M.red }}>{totals.cancelled.toLocaleString()}</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 800, color: M.textMuted }}>{totals.noShow.toLocaleString()}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '6px', background: M.maroonBorder, borderRadius: '3px', maxWidth: '80px' }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: M.maroon, width: `${overallRate}%` }} />
                </div>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 800, color: M.maroon }}>{overallRate}%</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Transaction Type Breakdown ── */}
      {!loading && report?.by_type?.length > 0 && (
        <div style={{ marginTop: '24px', background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Breakdown</p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>By Transaction Type</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {report.by_type.map((type, i) => {
              const pct = totalVol > 0 ? Math.round((type.count / totalVol) * 100) : 0
              const color = SERIES_COLORS[i % SERIES_COLORS.length]
              return (
                <div key={i} style={{ background: M.offWhite, borderRadius: '12px', padding: '18px 20px', border: `1px solid ${M.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: M.text }}>{type.name}</span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: M.border, borderRadius: '3px', marginBottom: '6px' }}>
                    <div style={{ height: '6px', borderRadius: '3px', background: color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: '12px', color: M.textMuted }}>{type.count.toLocaleString()} records</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div> {/* End .no-print */}

      {/* ── PRINT-ONLY DOCUMENT ── */}
      <div className="print-only" style={{ padding: '20px', color: '#000', background: '#fff', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
        {/* Letterhead */}
        <div style={{ borderBottom: '2px solid #7B1A2A', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: '28px', color: '#7B1A2A' }}>CampusFlow</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Institutional Analytics Report</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
            <p style={{ margin: 0 }}>Generated: <strong>{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
            <p style={{ margin: '4px 0 0' }}>Department: <strong>Registrar</strong></p>
            <p style={{ margin: '4px 0 0' }}>Data Window: <strong>Last {dateRange} Days</strong></p>
          </div>
        </div>

        {/* Executive Summary */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: '#7B1A2A', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Executive Summary</h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div style={{ flex: 1, padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '6px' }}>Total Volume</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{(report?.total_appointments || 0).toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '6px' }}>Completion Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{report?.completion_rate ?? 0}%</div>
          </div>
          <div style={{ flex: 1, padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '6px' }}>Avg Processing</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{report?.avg_processing_mins || 0} Mins</div>
          </div>
        </div>

        {/* AI Insight */}
        {insights && (
          <div style={{ marginBottom: '30px', padding: '16px', borderLeft: '4px solid #7B1A2A', background: '#fcfcfc' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#7B1A2A' }}>AI Analytics Insight</h3>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#333' }}>{insights.insight}</p>
          </div>
        )}

        {/* Monthly Performance Table */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: '#7B1A2A', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px', pageBreakBefore: 'auto' }}>Monthly Performance Breakdown</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '30px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '10px', textAlign: 'left', textTransform: 'uppercase', color: '#444' }}>Month</th>
              <th style={{ padding: '10px', textAlign: 'right', textTransform: 'uppercase', color: '#444' }}>Total</th>
              <th style={{ padding: '10px', textAlign: 'right', textTransform: 'uppercase', color: '#444' }}>Completed</th>
              <th style={{ padding: '10px', textAlign: 'right', textTransform: 'uppercase', color: '#444' }}>Cancelled</th>
              <th style={{ padding: '10px', textAlign: 'right', textTransform: 'uppercase', color: '#444' }}>No Show</th>
              <th style={{ padding: '10px', textAlign: 'right', textTransform: 'uppercase', color: '#444' }}>Rate</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: '#7B1A2A' }}>{row.Month}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{row.Total.toLocaleString()}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{row.Completed.toLocaleString()}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{row.Cancelled.toLocaleString()}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{row['No Show'].toLocaleString()}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{row['Completion Rate']}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Transaction Type Breakdown */}
        {report?.by_type?.length > 0 && (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: '#7B1A2A', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px', pageBreakInside: 'avoid' }}>Top Requests By Type</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {report.by_type.slice(0, 8).map((type, i) => {
                const pct = totalVol > 0 ? Math.round((type.count / totalVol) * 100) : 0
                return (
                  <div key={i} style={{ padding: '12px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{type.name}</span>
                    <span style={{ color: '#666' }}>{type.count.toLocaleString()} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '10px', color: '#999' }}>
          CampusFlow Automated Reporting System • END OF REPORT
        </div>
      </div>
    </div>
  )
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function getMonthLabel(offset) {
  const d = new Date()
  d.setMonth(d.getMonth() - (5 - offset))
  return d.toLocaleDateString('en-PH', { month: 'short' })
}
