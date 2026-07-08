import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getReports, getAiInsights } from '../../services/adminService'
import { Printer, Download, Filter, RefreshCw, AlertTriangle, BarChart2, Bot, FileDown } from 'lucide-react'

const SERIES_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

// ── Filter Pill ────────────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, options, onChange }) => (
  <div className="relative flex items-center gap-1.5">
    <label className="text-[12px] text-text-muted font-medium whitespace-nowrap">{label}:</label>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none py-[7px] pr-7 pl-3 rounded-lg border border-border bg-white text-[13px] text-text-main outline-none cursor-pointer font-sans min-w-[130px]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-[11px]">▾</span>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
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
          <line x1={PAD.left} y1={toY(t)} x2={PAD.left + cW} y2={toY(t)} stroke="#EAE7E2" strokeWidth={1} strokeDasharray="4,4" />
          <text x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fontSize="10" fill="#A8A29E">{t}</text>
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
          fill="#FFFFFF" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2}
        />
      )))}

      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#A8A29E">{l}</text>
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
      // cumulative[0] = m1 (last 30 days), cumulative[5] = m6 (last 180 days)
      const cumulative = [m1, m2, m3, m4, m5, m6]
      const monthly = []
      for (let i = 0; i < 6; i++) {
        // i=0 is oldest (m6 - m5), i=5 is newest (m1)
        const currIndex = 5 - i
        const curr = cumulative[currIndex]
        const prev = currIndex > 0 ? cumulative[currIndex - 1] : { total_appointments: 0, completed: 0, cancelled: 0, no_show: 0, by_type: [] }
        
        const currByType = curr.by_type || []
        const prevByType = prev.by_type || []
        const diffByType = currByType.map(ct => {
          const pt = prevByType.find(p => p.name === ct.name)
          return {
            name: ct.name,
            count: Math.max(0, ct.count - (pt ? pt.count : 0))
          }
        })
        
        monthly.push({
          month: getMonthLabel(i),
          total:     (curr.total_appointments || 0) - (prev.total_appointments || 0),
          completed: (curr.completed || 0) - (prev.completed || 0),
          cancelled: (curr.cancelled || 0) - (prev.cancelled || 0),
          no_show:   (curr.no_show || 0) - (prev.no_show || 0),
          by_type:   diffByType,
        })
      }
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
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">SYSTEM ANALYTICS</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <BarChart2 className="text-maroon" size={24} /> Analytics Dashboard
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-[650px]">
            Review AI insights, analyze processing trends, and download annual reports.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => window.print()}
            className="py-2.5 px-4.5 rounded-[9px] border border-border bg-white text-text-main text-[13px] font-semibold cursor-pointer font-sans flex items-center gap-2">
            <Printer size={16} /> Print Data Summary
          </button>
          <button onClick={() => exportCSV(tableRows, 'campusflow_annual_report.csv')}
            className="py-2.5 px-4.5 rounded-[9px] border-none bg-maroon text-white text-[13px] font-bold cursor-pointer font-sans flex items-center gap-2 hover:bg-maroon-dark transition-colors">
            <Download size={16} /> Download Annual Report
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-5 p-[14px_20px] bg-white rounded-xl border border-border mb-6 flex-wrap shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <span className="text-[13px] font-bold text-text-main flex items-center gap-1.5">
          <span className="flex items-center"><Filter size={15} /></span> Filters
        </span>
        <div className="w-px h-6 bg-border" />
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

        <button onClick={load} className="ml-auto py-2 px-3.5 rounded-lg border border-maroon-border bg-maroon-light text-maroon text-[12px] font-bold cursor-pointer font-sans flex items-center gap-1.5 hover:bg-maroon hover:text-white transition-colors">
          <RefreshCw size={14} /> Apply
        </button>
      </div>

      {error && (
        <div className="p-[12px_16px] rounded-[10px] bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        {/* Total Transactions */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em]">Total Transactions</div>
          </div>
          <div className="font-serif text-[36px] font-bold text-maroon leading-none mb-2 min-h-[36px]">
            {loading ? <div className="animate-pulse w-[60px] h-[36px] bg-border rounded-lg" /> : (report?.total_appointments || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted">For the selected period</div>
        </div>

        {/* Avg Processing Time */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em]">Avg Processing Time</div>
          </div>
          <div className="font-serif text-[36px] font-bold text-maroon leading-none mb-2 min-h-[36px] flex items-baseline gap-1.5">
            {loading ? <div className="animate-pulse w-[80px] h-[36px] bg-border rounded-lg" /> : <>{report?.avg_processing_mins || 0} <span className="text-[18px] font-semibold">Mins</span></>}
          </div>
          <div className="text-[11px] text-text-muted">Average across all types</div>
        </div>

        {/* Completion Rate */}
        <div className="animate-fade-up bg-white rounded-2xl p-6 border border-border shadow-sm" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em]">Completion Rate</div>
          </div>
          <div className="font-serif text-[36px] font-bold text-maroon leading-none mb-2.5 min-h-[36px]">
            {loading ? <div className="animate-pulse w-[90px] h-[36px] bg-border rounded-lg" /> : `${report?.completion_rate ?? 0}%`}
          </div>
          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-800 ease-in-out" style={{ background: `linear-gradient(90deg, #7B1A2A, #B8900A)`, width: `${report?.completion_rate ?? 0}%` }} />
          </div>
        </div>

        {/* Most Requested */}
        <div className="animate-fade-up bg-maroon rounded-2xl p-6 shadow-[0_4px_16px_rgba(123,26,42,0.25)] relative overflow-hidden" style={{ animationDelay: '0.4s' }}>
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="text-[11px] font-semibold text-white/65 uppercase tracking-[0.06em] mb-3 relative z-10">Most Requested</div>
          {loading || !mostRequested ? (
            <div className="animate-pulse w-[120px] h-[28px] bg-white/20 rounded-md mb-2 relative z-10" />
          ) : (
            <div className="relative z-10">
              <div className="font-serif text-[22px] font-bold text-white leading-[1.2] mb-1.5">
                {mostRequested.name.length > 14 ? mostRequested.name.slice(0, 14) + '…' : mostRequested.name}
              </div>
              <div className="text-[11px] text-white/70 leading-[1.4]">
                Represents <strong className="text-white">{mostReqPct}%</strong> of volume
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Document Volume Trends Chart ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border p-7 mb-6 shadow-sm" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-1">Trends</p>
            <h2 className="font-serif text-[20px] font-bold text-text-main m-0">Document Volume Trends (6 Months)</h2>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 items-center">
            {activeSeries.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-[3px] rounded-sm" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                <span className="text-[12px] text-text-sub font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-[220px] flex items-end gap-2.5 pt-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse flex-1 bg-border rounded-t-md" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : monthLabels.length < 2 ? (
          <div className="h-[160px] flex items-center justify-center text-text-muted flex-col gap-2.5">
            <div className="flex justify-center"><BarChart2 size={40} /></div>
            <p className="m-0 text-[14px]">Not enough monthly data to plot trends yet.</p>
          </div>
        ) : (
          <MultiLineChart series={activeSeries} labels={monthLabels} />
        )}
      </div>

      {/* ── AI Insight Card ── */}
      <div className="animate-fade-up bg-maroon-light rounded-2xl border border-maroon-border p-6 mb-6 shadow-[0_1px_4px_rgba(123,26,42,0.04)]" style={{ animationDelay: '0.6s' }}>
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center"><Bot size={26} className="text-maroon" /></span>
            <div>
              <div className="text-[12px] font-bold text-maroon uppercase tracking-[0.06em]">AI Analytics Insight</div>
              <div className="text-[11px] text-maroon/70 mt-0.5">
                {insights?.date || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          <button onClick={loadInsights} disabled={insightLoading}
            className={`py-2 px-4 rounded-lg border-none bg-maroon text-white text-[12px] font-semibold cursor-pointer font-sans transition-opacity ${insightLoading ? 'opacity-70 cursor-not-allowed' : 'opacity-100 hover:bg-maroon-dark'}`}>
            {insightLoading ? 'Generating…' : <span className="flex items-center gap-1.5"><RefreshCw size={14} /> Refresh</span>}
          </button>
        </div>
        {insights ? (
          <>
            <p className="text-[15px] text-maroon-dark leading-[1.65] m-0 mb-5">{insights.insight}</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { l: 'Total',      v: insights.total,                c: 'text-text-main'  },
                { l: 'Completed',  v: insights.completed,            c: 'text-success' },
                { l: 'No-shows',   v: insights.no_shows,             c: 'text-danger'   },
                { l: 'Pending',    v: insights.pending,              c: 'text-gold'  },
                { l: 'Completion', v: `${insights.completion_rate}%`,c: 'text-info'  },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-[10px] p-[12px_18px] border border-maroon-border text-center flex-1 min-w-[80px]">
                  <div className={`font-serif text-[22px] font-bold ${s.c}`}>{s.v}</div>
                  <div className="text-[10px] text-text-muted mt-1 uppercase tracking-[0.04em]">{s.l}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[14px] text-maroon/75 m-0">Click Refresh to generate today's AI-powered insight.</p>
        )}
      </div>

      {/* ── Monthly Performance Detail Table ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border overflow-hidden shadow-sm" style={{ animationDelay: '0.7s' }}>
        {/* Table header */}
        <div className="flex items-center justify-between p-[20px_24px] border-b border-border">
          <div>
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-1">Detail</p>
            <h2 className="font-serif text-[18px] font-bold text-text-main m-0">Monthly Performance Detail</h2>
          </div>
          <button onClick={() => exportCSV(tableRows, 'campusflow_monthly_report.csv')}
            className="py-2 px-4 rounded-lg border border-border bg-off-white text-text-main text-[12px] font-semibold cursor-pointer font-sans flex items-center gap-2 hover:bg-surface transition-colors">
            <span className="flex items-center"><FileDown size={14} /></span> Export CSV
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[120px_repeat(5,1fr)] p-[12px_24px] bg-surface border-b border-border">
          {['Month', 'Total', 'Completed', 'Cancelled', 'No Show', 'Completion Rate'].map(h => (
            <span key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-[0.06em]">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-[120px_repeat(5,1fr)] p-[16px_24px] border-b border-border">
                <div className="animate-pulse h-[18px] w-[60%] bg-border rounded" />
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="animate-pulse h-[18px] w-[40%] bg-border rounded my-auto ml-auto" />
                ))}
              </div>
            ))}
          </div>
        ) : tableRows.length === 0 ? (
          <div className="p-10 text-center text-text-muted">No monthly data available yet.</div>
        ) : (
          tableRows.map((row, i) => {
            const compRate = parseInt(row['Completion Rate']) || 0
            const barColor = compRate >= 90 ? 'bg-success' : compRate >= 70 ? 'bg-gold' : 'bg-danger'
            const textColor = compRate >= 90 ? 'text-success' : compRate >= 70 ? 'text-gold' : 'text-danger'
            return (
              <div key={i} className={`grid grid-cols-[120px_repeat(5,1fr)] p-[16px_24px] items-center transition-colors duration-100 hover:bg-off-white ${i < tableRows.length - 1 ? 'border-b border-border' : 'border-none'} ${i % 2 === 0 ? 'bg-white' : 'bg-[#FDFCFB]'}`}>
                <span className="font-serif text-[15px] font-bold text-maroon">{row.Month}</span>
                <span className="text-[14px] font-semibold text-text-main">{row.Total.toLocaleString()}</span>
                <span className="text-[14px] font-semibold text-success">{row.Completed.toLocaleString()}</span>
                <span className="text-[14px] font-medium text-danger">{row.Cancelled.toLocaleString()}</span>
                <span className="text-[14px] text-text-muted">{row['No Show'].toLocaleString()}</span>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-surface rounded-full max-w-[80px]">
                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${compRate}%` }} />
                  </div>
                  <span className={`text-[13px] font-bold min-w-[36px] ${textColor}`}>{row['Completion Rate']}</span>
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
            <div className="grid grid-cols-[120px_repeat(5,1fr)] p-[16px_24px] bg-maroon-light border-t-2 border-maroon-border">
              <span className="text-[12px] font-bold text-maroon uppercase tracking-[0.04em]">6-Month Total</span>
              <span className="font-serif text-[16px] font-bold text-maroon">{totals.total.toLocaleString()}</span>
              <span className="font-serif text-[16px] font-bold text-success">{totals.completed.toLocaleString()}</span>
              <span className="font-serif text-[16px] font-bold text-danger">{totals.cancelled.toLocaleString()}</span>
              <span className="font-serif text-[16px] font-bold text-text-muted">{totals.noShow.toLocaleString()}</span>
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 bg-maroon-border rounded-full max-w-[80px]">
                  <div className="h-1.5 rounded-full bg-maroon" style={{ width: `${overallRate}%` }} />
                </div>
                <span className="font-serif text-[16px] font-bold text-maroon">{overallRate}%</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Transaction Type Breakdown ── */}
      {!loading && report?.by_type?.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-[11px] font-bold text-gold uppercase tracking-widest m-0 mb-1">Breakdown</p>
            <h2 className="font-serif text-[18px] font-bold text-text-main m-0">By Transaction Type</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {report.by_type.map((type, i) => {
              const pct = totalVol > 0 ? Math.round((type.count / totalVol) * 100) : 0
              const color = SERIES_COLORS[i % SERIES_COLORS.length]
              return (
                <div key={i} className="bg-off-white rounded-xl p-[18px_20px] border border-border">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[14px] font-semibold text-text-main">{type.name}</span>
                    <span className="font-serif text-[20px] font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full mb-1.5">
                    <div className="h-1.5 rounded-full transition-[width] duration-600 ease" style={{ background: color, width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] text-text-muted">{type.count.toLocaleString()} records</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div> {/* End .no-print */}

      {/* ── PRINT-ONLY DOCUMENT ── */}
      <div className="print-only p-5 text-black bg-white min-h-screen font-sans">
        {/* Letterhead */}
        <div className="border-b-2 border-maroon pb-5 mb-[30px] flex justify-between items-end">
          <div>
            <h1 className="m-0 font-serif text-[28px] text-maroon">CampusFlow</h1>
            <p className="mt-1 mb-0 text-[14px] text-[#555] uppercase tracking-wider">Institutional Analytics Report</p>
          </div>
          <div className="text-right text-[12px] text-[#666]">
            <p className="m-0">Generated: <strong>{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
            <p className="mt-1 mb-0">Department: <strong>Registrar</strong></p>
            <p className="mt-1 mb-0">Data Window: <strong>Last {dateRange} Days</strong></p>
          </div>
        </div>

        {/* Executive Summary */}
        <h2 className="text-[16px] font-bold uppercase text-maroon border-b border-[#ccc] pb-2 mb-4">Executive Summary</h2>
        <div className="flex gap-5 mb-[30px]">
          <div className="flex-1 p-4 border border-[#eee] rounded-lg bg-[#fafafa]">
            <div className="text-[11px] text-[#666] uppercase mb-1.5">Total Volume</div>
            <div className="text-[24px] font-bold">{(report?.total_appointments || 0).toLocaleString()}</div>
          </div>
          <div className="flex-1 p-4 border border-[#eee] rounded-lg bg-[#fafafa]">
            <div className="text-[11px] text-[#666] uppercase mb-1.5">Completion Rate</div>
            <div className="text-[24px] font-bold">{report?.completion_rate ?? 0}%</div>
          </div>
          <div className="flex-1 p-4 border border-[#eee] rounded-lg bg-[#fafafa]">
            <div className="text-[11px] text-[#666] uppercase mb-1.5">Avg Processing</div>
            <div className="text-[24px] font-bold">{report?.avg_processing_mins || 0} Mins</div>
          </div>
        </div>

        {/* AI Insight */}
        {insights && (
          <div className="mb-[30px] p-4 border-l-4 border-maroon bg-[#fcfcfc]">
            <h3 className="m-0 mb-2 text-[14px] text-maroon">AI Analytics Insight</h3>
            <p className="m-0 text-[14px] leading-normal text-[#333]">{insights.insight}</p>
          </div>
        )}

        {/* Monthly Performance Table */}
        <h2 className="text-[16px] font-bold uppercase text-maroon border-b border-[#ccc] pb-2 mb-4 break-before-auto">Monthly Performance Breakdown</h2>
        <table className="w-full border-collapse text-[12px] mb-[30px]">
          <thead>
            <tr className="bg-[#f0f0f0] border-b-2 border-[#ccc]">
              <th className="p-2.5 text-left uppercase text-[#444]">Month</th>
              <th className="p-2.5 text-right uppercase text-[#444]">Total</th>
              <th className="p-2.5 text-right uppercase text-[#444]">Completed</th>
              <th className="p-2.5 text-right uppercase text-[#444]">Cancelled</th>
              <th className="p-2.5 text-right uppercase text-[#444]">No Show</th>
              <th className="p-2.5 text-right uppercase text-[#444]">Rate</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={i} className="border-b border-[#eee]">
                <td className="p-2.5 font-bold text-maroon">{row.Month}</td>
                <td className="p-2.5 text-right">{row.Total.toLocaleString()}</td>
                <td className="p-2.5 text-right">{row.Completed.toLocaleString()}</td>
                <td className="p-2.5 text-right">{row.Cancelled.toLocaleString()}</td>
                <td className="p-2.5 text-right">{row['No Show'].toLocaleString()}</td>
                <td className="p-2.5 text-right font-bold">{row['Completion Rate']}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Transaction Type Breakdown */}
        {report?.by_type?.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold uppercase text-maroon border-b border-[#ccc] pb-2 mb-4 break-inside-avoid">Top Requests By Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {report.by_type.slice(0, 8).map((type, i) => {
                const pct = totalVol > 0 ? Math.round((type.count / totalVol) * 100) : 0
                return (
                  <div key={i} className="p-3 border border-[#eee] flex justify-between">
                    <span className="font-semibold">{type.name}</span>
                    <span className="text-[#666]">{type.count.toLocaleString()} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
        
        <div className="text-center mt-10 pt-5 border-t border-[#eee] text-[10px] text-[#999]">
          CampusFlow Automated Reporting System • END OF REPORT
        </div>
      </div>
    </div>
  )
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function getMonthLabel(offset) {
  const d = new Date()
  d.setDate(1) // Prevent month overflow (e.g., Feb 31 -> Mar 3)
  d.setMonth(d.getMonth() - (5 - offset))
  return d.toLocaleDateString('en-PH', { month: 'short' })
}
