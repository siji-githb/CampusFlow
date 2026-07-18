import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getReports, getAiInsights } from '../../services/adminService'
import { Printer, Download, Filter, RotateCcw, Sparkles, ChevronDown, AlertTriangle, BarChart2, Bot, FileDown, FileText, Clock, CheckCircle, Activity } from 'lucide-react'

const SERIES_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

// ── Filter Pill ────────────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, options, onChange, disabled }) => (
  <div className={`flex items-center gap-2.5 mr-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
    <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] pt-0.5 whitespace-nowrap">{label}</span>
    <div className="relative group">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="appearance-none py-2 pr-8 pl-3.5 rounded-xl border border-border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] font-bold text-text-main outline-none cursor-pointer font-sans min-w-[130px] transition-colors group-hover:border-text-muted/30 disabled:bg-gray-50 disabled:text-gray-400">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted transition-colors group-hover:text-text-main" />
    </div>
  </div>
)

// ── Stacked Bar Chart (Premium) ────────────────────────────────────────────────
function StackedBarChart({ bars, typeNames, colors, yAxisLabel }) {
  const [tooltip, setTooltip] = useState(null)
  const [hovered, setHovered] = useState(null)
  const W = 860, H = 280
  const PAD = { top: 32, right: 28, bottom: 52, left: 56 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...bars.map(b => b.segments.reduce((s, v) => s + v, 0)), 1) * 1.18
  const toY = v => PAD.top + cH - (v / maxVal) * cH

  // Wider bars with proper spacing
  const barW = Math.max(18, Math.min(56, (cW / bars.length) * 0.62))
  const gap = cW / bars.length
  const toX = i => PAD.left + gap * i + gap / 2

  const yTicks = 5
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxVal / yTicks) * i))

  // Build rounded-top path for topmost segment, flat for others
  const buildPath = (bx, y, bw, segH, isTop) => {
    const r = isTop && segH > 5 ? 5 : 0
    if (r === 0) return `M${bx},${y} h${bw} v${segH} h${-bw} Z`
    return `M${bx + r},${y} h${bw - r * 2} a${r},${r} 0 0 1 ${r},${r} v${segH - r} h${-bw} v${-(segH - r)} a${r},${r} 0 0 1 ${r},${-r} Z`
  }

  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block overflow-visible">
        <defs>
          {typeNames.map((_, i) => (
            <linearGradient key={i} id={`pgrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={colors[i]} stopOpacity="1" />
              <stop offset="100%" stopColor={colors[i]} stopOpacity="0.60" />
            </linearGradient>
          ))}
          {typeNames.map((_, i) => (
            <linearGradient key={`h${i}`} id={`phgrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={colors[i]} stopOpacity="1" />
              <stop offset="100%" stopColor={colors[i]} stopOpacity="0.85" />
            </linearGradient>
          ))}
          {/* Glow filter for hovered bar */}
          <filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Y grid lines — very subtle */}
        {yTickVals.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={toY(t)}
              x2={PAD.left + cW} y2={toY(t)}
              stroke={i === 0 ? '#D6D2CC' : '#EAE8E4'}
              strokeWidth={i === 0 ? 1.5 : 1}
              strokeDasharray={i === 0 ? 'none' : '5,4'}
            />
            <text
              x={PAD.left - 10} y={toY(t) + 4}
              textAnchor="end" fontSize="10" fill="#B0AAA4" fontFamily="inherit"
            >{t}</text>
          </g>
        ))}

        {/* Y-axis rotated label */}
        <text
          x={14} y={PAD.top + cH / 2}
          textAnchor="middle" fontSize="9" fill="#C0BAB4" fontWeight="700"
          letterSpacing="0.5"
          transform={`rotate(-90, 14, ${PAD.top + cH / 2})`}
        >{yAxisLabel.toUpperCase()}</text>

        {/* Stacked bars */}
        {bars.map((bar, bi) => {
          let cumY = PAD.top + cH
          const cx = toX(bi)
          const bx = cx - barW / 2
          const total = bar.segments.reduce((s, v) => s + v, 0)
          const isHov = hovered === bi
          const totalBarH = (total / maxVal) * cH
          const topY = PAD.top + cH - totalBarH

          return (
            <g key={bi}
              onMouseEnter={(e) => { setHovered(bi); setTooltip({ bar, bi, total, x: cx }) }}
              onMouseLeave={() => { setHovered(null); setTooltip(null) }}
              style={{ cursor: 'pointer' }}
            >
              {/* Hover background glow column */}
              {isHov && (
                <rect
                  x={bx - 5} y={PAD.top}
                  width={barW + 10} height={cH}
                  fill={colors[0]} fillOpacity="0.04"
                  rx={6}
                />
              )}

              {/* Bar segments */}
              {bar.segments.map((val, si) => {
                const minH = val > 0 ? 3 : 0
                const segH = Math.max(minH, (val / maxVal) * cH)
                const y = cumY - segH
                cumY -= segH
                const isTop = si === bar.segments.length - 1 || bar.segments.slice(si + 1).every(v => v === 0)
                const pathD = buildPath(bx, y, barW, segH, isTop)
                return (
                  <path
                    key={si}
                    d={pathD}
                    fill={isHov ? `url(#phgrad${si})` : `url(#pgrad${si})`}
                    filter={isHov ? 'url(#barGlow)' : 'none'}
                    style={{ transition: 'all 0.18s ease' }}
                  />
                )
              })}

              {/* Thin 1px gap lines between segments for definition */}
              {(() => {
                let gapY = PAD.top + cH
                return bar.segments.slice(0, -1).map((val, si) => {
                  const segH = Math.max(val > 0 ? 3 : 0, (val / maxVal) * cH)
                  gapY -= segH
                  return val > 0 && bar.segments[si + 1] > 0 ? (
                    <line key={`gap${si}`}
                      x1={bx} y1={gapY} x2={bx + barW} y2={gapY}
                      stroke="white" strokeWidth="1.5" opacity="0.5"
                    />
                  ) : null
                })
              })()}

              {/* Total label on top when hovered */}
              {isHov && total > 0 && (
                <text
                  x={cx} y={topY - 7}
                  textAnchor="middle" fontSize="11" fill="#7B1A2A"
                  fontWeight="800" fontFamily="inherit"
                >{total}</text>
              )}

              {/* X axis label */}
              <text
                x={cx} y={H - 10}
                textAnchor="middle"
                fontSize="10.5"
                fill={isHov ? '#7B1A2A' : '#A8A4A0'}
                fontWeight={isHov ? '800' : '500'}
                fontFamily="inherit"
                style={{ transition: 'fill 0.15s, font-weight 0.15s' }}
              >{bar.label}</text>

              {/* Bottom accent tick */}
              <line
                x1={cx - barW * 0.3} y1={PAD.top + cH + 3}
                x2={cx + barW * 0.3} y2={PAD.top + cH + 3}
                stroke={isHov ? '#7B1A2A' : '#D6D2CC'} strokeWidth="2"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.15s' }}
              />
            </g>
          )
        })}

        {/* Bottom baseline */}
        <line
          x1={PAD.left} y1={PAD.top + cH}
          x2={PAD.left + cW} y2={PAD.top + cH}
          stroke="#D6D2CC" strokeWidth="1.5"
        />
      </svg>

      {/* Premium floating tooltip */}
      {tooltip && (() => {
        const pct = (tooltip.x / W) * 100
        const goLeft = pct > 72
        return (
          <div
            className="absolute z-40 pointer-events-none"
            style={{
              top: '0px',
              left: goLeft ? 'auto' : `calc(${pct}% + 12px)`,
              right: goLeft ? `calc(${100 - pct}% + 12px)` : 'auto',
            }}
          >
            <div className="bg-white rounded-2xl border border-border/60 shadow-[0_12px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] p-4 min-w-[180px]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
                <div className="w-1 h-5 rounded-full bg-maroon" />
                <span className="text-[11px] font-extrabold text-maroon uppercase tracking-[0.09em]">
                  {tooltip.bar.label}
                </span>
              </div>
              {/* Rows */}
              {typeNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1">
                  <div className="w-2.5 h-2.5 rounded-[3px] shrink-0 shadow-sm" style={{ background: colors[i] }} />
                  <span className="text-[11px] text-text-sub flex-1 leading-none">{name}</span>
                  <span className="text-[13px] font-bold text-text-main tabular-nums">
                    {(tooltip.bar.segments[i] || 0).toLocaleString()}
                  </span>
                </div>
              ))}
              {/* Total */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
                <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Total</span>
                <span className="text-[16px] font-bold text-maroon tabular-nums leading-none">{tooltip.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
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
// MAIN AdminAnalyticsPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const { token } = useAuth()

  // Filters
  const [viewType, setViewType] = useState('monthly') // 'monthly' | 'annually'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()) // '0' to '11'
  const [docType, setDocType]       = useState('all')

  // Data
  const [report, setReport]             = useState(null)
  const [monthlyReports, setMonthlyReports] = useState([]) 
  const [annualReports, setAnnualReports] = useState([]) 
  const [insights, setInsights]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [insightLoading, setInsightLoading] = useState(false)
  const [error, setError]               = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const y = new Date().getFullYear()
      
      const daysAgo = (date) => {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const targetStart = new Date(date)
        targetStart.setHours(0, 0, 0, 0)
        return Math.round((todayStart - targetStart) / 86400000)
      }

      let windows = []
      let labels = []

      let annualWindows = []
      for (let m = 0; m <= 12; m++) {
        annualWindows.push(daysAgo(new Date(y, m, 1)))
      }
      const annualLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      if (viewType === 'annually') {
        windows = [...annualWindows]
        labels = [...annualLabels]
      } else {
        const m = parseInt(selectedMonth)
        const daysInMonth = new Date(y, m + 1, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          windows.push(daysAgo(new Date(y, m, d)))
          labels.push(d.toString())
        }
        windows.push(daysAgo(new Date(y, m + 1, 1))) // the end boundary
      }

      // Fetch all windows in parallel
      const p1 = Promise.all(windows.map(w => getReports(token, w)))
      const p2 = viewType === 'annually' ? p1 : Promise.all(annualWindows.map(w => getReports(token, w)))
      const [cumulativeResults, annualCumulativeResults] = await Promise.all([p1, p2])

      // Build main report stats based on exactly the selected period
      const overallCurr = cumulativeResults[0] // Start of period (older)
      const overallPrev = cumulativeResults[cumulativeResults.length - 1] // End of period (newer)

      const exactTotal = Math.max(0, (overallCurr.total_appointments || 0) - (overallPrev.total_appointments || 0))
      const exactCompleted = Math.max(0, (overallCurr.completed || 0) - (overallPrev.completed || 0))
      const exactCancelled = Math.max(0, (overallCurr.cancelled || 0) - (overallPrev.cancelled || 0))
      const exactNoShow = Math.max(0, (overallCurr.no_show || 0) - (overallPrev.no_show || 0))

      const exactByType = []
      const currMainByType = overallCurr.by_type || []
      const prevMainByType = overallPrev.by_type || []
      const allMainNames = [...new Set([...currMainByType.map(t => t.name), ...prevMainByType.map(t => t.name)])]
      allMainNames.forEach(name => {
        const ct = currMainByType.find(t => t.name === name)
        const pt = prevMainByType.find(t => t.name === name)
        exactByType.push({ name, count: Math.max(0, (ct?.count || 0) - (pt?.count || 0)) })
      })
      exactByType.sort((a, b) => b.count - a.count)

      setReport({
        total_appointments: exactTotal,
        completed: exactCompleted,
        cancelled: exactCancelled,
        no_show: exactNoShow,
        completion_rate: exactTotal > 0 ? Math.round((exactCompleted / exactTotal) * 100 * 10) / 10 : 0,
        no_show_rate: exactTotal > 0 ? Math.round((exactNoShow / exactTotal) * 100 * 10) / 10 : 0,
        avg_processing_mins: overallCurr.avg_processing_mins || 0,
        by_type: exactByType
      })

      const monthly = []
      for (let i = 0; i < labels.length; i++) {
        const curr = cumulativeResults[i]       // larger window (older end)
        const prev = cumulativeResults[i + 1]   // smaller window (newer end)

        const currByType = curr.by_type || []
        const prevByType = prev.by_type || []

        const allNames = [...new Set([
          ...currByType.map(t => t.name),
          ...prevByType.map(t => t.name)
        ])]

        const diffByType = allNames.map(name => {
          const ct = currByType.find(t => t.name === name)
          const pt = prevByType.find(t => t.name === name)
          return {
            name,
            count: Math.max(0, (ct?.count || 0) - (pt?.count || 0))
          }
        })

        monthly.push({
          month: labels[i],
          total:     Math.max(0, (curr.total_appointments || 0) - (prev.total_appointments || 0)),
          completed: Math.max(0, (curr.completed || 0) - (prev.completed || 0)),
          cancelled: Math.max(0, (curr.cancelled || 0) - (prev.cancelled || 0)),
          no_show:   Math.max(0, (curr.no_show || 0) - (prev.no_show || 0)),
          by_type:   diffByType,
        })
      }
      setMonthlyReports(monthly)

      const annual = []
      for (let i = 0; i < annualLabels.length; i++) {
        const curr = annualCumulativeResults[i]       
        const prev = annualCumulativeResults[i + 1]   
        annual.push({
          month: annualLabels[i],
          total:     Math.max(0, (curr.total_appointments || 0) - (prev.total_appointments || 0)),
          completed: Math.max(0, (curr.completed || 0) - (prev.completed || 0)),
          cancelled: Math.max(0, (curr.cancelled || 0) - (prev.cancelled || 0)),
          no_show:   Math.max(0, (curr.no_show || 0) - (prev.no_show || 0)),
        })
      }
      setAnnualReports(annual)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token, viewType, selectedMonth])

  const loadInsights = async () => {
    setInsightLoading(true)
    try { setInsights(await getAiInsights(token)) }
    catch { /* silent */ }
    finally { setInsightLoading(false) }
  }

  useEffect(() => { load(); loadInsights() }, [load])

  // ── Derived ────────────────────────────────────────────────────────────────
  const monthLabels = monthlyReports.map(m => m.month)

  // Consistent preferred order for document types
  const TYPE_ORDER = ['Transcript of Records (TOR)', 'Certificate of Enrollment (COE)', 'Diploma Release']
  const TYPE_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

  // Collect all unique type names across all monthly periods, sorted consistently
  const allTypeNames = [...new Set(
    monthlyReports.flatMap(m => m.by_type.map(t => t.name))
  )].sort((a, b) => {
    const iA = TYPE_ORDER.indexOf(a), iB = TYPE_ORDER.indexOf(b)
    if (iA === -1 && iB === -1) return a.localeCompare(b)
    if (iA === -1) return 1; if (iB === -1) return -1
    return iA - iB
  }).slice(0, 6)

  // Build bars: one per time period, each bar has segments per type
  const chartBars = monthlyReports.map(m => ({
    label: m.month,
    segments: allTypeNames.map(name => {
      const found = m.by_type.find(t => t.name === name)
      return found?.count || 0
    }),
  }))

  // Y-axis label based on selected filter
  const yAxisLabel = viewType === 'monthly' ? 'Requests / Day' : 'Requests / Month'

  // Trend title based on filter
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const trendTitle = viewType === 'monthly' ? `${monthNames[selectedMonth]} (Daily)` : `${new Date().getFullYear()} (Annually)`

  // Fallback series if no by_type data
  const fallbackBars = monthlyReports.map(m => ({
    label: m.month,
    segments: [Math.max(0, m.total)],
  }))
  const fallbackTypeNames = ['Total']

  const activeBars = chartBars.length > 0 && allTypeNames.length > 0 ? chartBars : fallbackBars
  const activeTypeNames = allTypeNames.length > 0 ? allTypeNames : fallbackTypeNames

  const DOC_COLOR_MAP = {
    'Transcript of Records (TOR)': '#7B1A2A',
    'Certificate of Enrollment (COE)': '#B8900A',
    'Diploma Release': '#1D4ED8'
  }
  const activeColors = activeTypeNames.map((name, i) => DOC_COLOR_MAP[name] || TYPE_COLORS[i % TYPE_COLORS.length])

  // Most requested type
  const mostRequested = report?.by_type?.[0]
  const totalVol = report?.total_appointments || 0
  const mostReqPct = mostRequested && totalVol > 0
    ? Math.round((mostRequested.count / totalVol) * 100)
    : 0

  // Monthly table rows
  const tableRows = annualReports.map((m, i) => ({
    Period:     m.month,
    Total:      Math.max(0, m.total),
    Completed:  Math.max(0, m.completed),
    Cancelled:  Math.max(0, m.cancelled),
    'No Show':  Math.max(0, m.no_show),
    'Completion Rate': m.total > 0 ? `${Math.round((m.completed / m.total) * 100)}%` : '—',
  }))

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">SYSTEM ANALYTICS</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <BarChart2 className="text-maroon" size={24} /> Analytics Dashboard
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-[650px]">
            Review AI insights, analyze processing trends, and download annual reports.
          </p>
        </div>
      </div>

      {/* ── AI Insight Card ── */}
      <div className="animate-fade-up bg-[#FDFCFB] rounded-2xl border border-maroon-border/40 p-7 mb-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" style={{ animationDelay: '0.6s' }}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon-light flex items-center justify-center text-maroon">
              <Bot size={22} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-maroon uppercase tracking-[0.08em]">AI Analytics Insight</div>
              <div className="text-[12px] font-medium text-text-sub mt-0.5">
                {insights?.date || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          <button onClick={loadInsights} disabled={insightLoading}
            className={`py-2 px-4 rounded-xl border border-border bg-white shadow-sm text-text-main text-[12px] font-bold cursor-pointer font-sans transition-all ${insightLoading ? 'opacity-70 cursor-not-allowed' : 'opacity-100 hover:bg-surface hover:-translate-y-0.5'}`}>
            {insightLoading ? 'Generating…' : <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-maroon" /> Refresh AI</span>}
          </button>
        </div>
        {insights ? (
          <>
            {/* Narrative paragraph */}
            <p className="text-[15px] text-text-main font-medium leading-[1.65] m-0 mb-6">{insights.insight}</p>

            {/* ── Today's 5-stat grid (unchanged) ── */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              {[
                { l: 'Total',      v: insights.total,                c: 'text-text-main'  },
                { l: 'Completed',  v: insights.completed,            c: 'text-success' },
                { l: 'No-shows',   v: insights.no_shows,             c: 'text-danger'   },
                { l: 'Pending',    v: insights.pending,              c: 'text-gold'  },
                { l: 'Completion', v: `${insights.completion_rate}%`,c: 'text-info'  },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-[16px] border border-border text-center shadow-sm hover:-translate-y-0.5 transition-transform">
                  <div className={`font-serif text-[24px] font-bold ${s.c} mb-1`}>{s.v}</div>
                  <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{s.l}</div>
                </div>
              ))}
            </div>

            {/* ── Predictive analytics row (M6 + M7) ── */}
            <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] mb-3 mt-1">Predictive Analytics</div>
            <div className="grid grid-cols-3 gap-3 mb-5">

              {/* Tomorrow's Forecast */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} className="text-info" />
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Tomorrow's Forecast</span>
                </div>
                {insights.forecast?.insufficient_data ? (
                  <div className="text-[12px] text-text-sub font-medium leading-snug">
                    Not enough history yet
                    <div className="text-[10px] text-text-muted mt-0.5">{insights.forecast?.sample_count != null ? `(${insights.forecast.sample_count} sample${insights.forecast.sample_count !== 1 ? 's' : ''})` : ''}</div>
                  </div>
                ) : (
                  <>
                    <div className="font-serif text-[28px] font-bold text-info leading-none mb-1">
                      {insights.forecast?.predicted_count ?? '—'}
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">
                      {insights.forecast?.weekday}
                      {insights.forecast?.top_transaction_type ? ` · ${insights.forecast.top_transaction_type}` : ''}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">based on {insights.forecast?.based_on_occurrences} historical {insights.forecast?.weekday}s</div>
                  </>
                )}
              </div>

              {/* No-show Risk Count */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-danger" />
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">No-show Risk</span>
                </div>
                {insights.no_show_risk?.insufficient_data ? (
                  <div className="text-[12px] text-text-sub font-medium leading-snug">Not enough history yet to score risk</div>
                ) : (
                  <>
                    <div className={`font-serif text-[28px] font-bold leading-none mb-1 ${insights.no_show_risk?.flagged_count > 0 ? 'text-danger' : 'text-success'}`}>
                      {insights.no_show_risk?.flagged_count ?? 0}
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">flagged in next 3 days</div>
                    <div className="text-[10px] text-text-muted mt-0.5">≥40% blended risk score</div>
                  </>
                )}
              </div>

              {/* 14-Day Volume Trend */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-gold" />
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">14-Day Trend</span>
                </div>
                {insights.trend?.insufficient_data ? (
                  <div className="text-[12px] text-text-sub font-medium leading-snug">Not enough history yet</div>
                ) : (
                  <>
                    <div className={`font-serif text-[28px] font-bold leading-none mb-1 ${
                      insights.trend?.direction === 'up' ? 'text-success' :
                      insights.trend?.direction === 'down' ? 'text-danger' : 'text-text-main'
                    }`}>
                      {insights.trend?.direction === 'up' ? '+' : insights.trend?.direction === 'down' ? '-' : ''}
                      {Math.abs(insights.trend?.percent_change ?? 0)}%
                    </div>
                    <div className="text-[11px] text-text-sub font-medium capitalize">{insights.trend?.direction}</div>
                    {insights.trend?.driving_type && (
                      <div className="text-[10px] text-text-muted mt-0.5">driven by: {insights.trend.driving_type}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Flagged no-show risk detail list ── */}
            {!insights.no_show_risk?.insufficient_data && insights.no_show_risk?.appointments?.length > 0 && (
              <div>
                <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] mb-2">High-Risk Appointments</div>
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="grid grid-cols-[2fr_2fr_1.2fr_1.2fr_1fr] bg-surface px-4 py-2.5 gap-3">
                    {['Student', 'Transaction', 'Date', 'Time', 'Risk'].map(h => (
                      <div key={h} className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{h}</div>
                    ))}
                  </div>
                  {insights.no_show_risk.appointments.map((appt, i) => (
                    <div key={appt.appointment_id} className={`grid grid-cols-[2fr_2fr_1.2fr_1.2fr_1fr] px-4 py-3 gap-3 items-center transition-colors hover:bg-surface/60 ${i < insights.no_show_risk.appointments.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="text-[13px] font-semibold text-text-main truncate">{appt.student_name}</div>
                      <div className="text-[12px] text-text-sub truncate">{appt.transaction_type}</div>
                      <div className="text-[12px] text-text-sub">{appt.appointment_date}</div>
                      <div className="text-[12px] text-text-sub">{appt.time_slot}</div>
                      <div className={`text-[13px] font-bold ${appt.risk_score >= 60 ? 'text-danger' : 'text-gold'}`}>
                        {appt.risk_score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[14px] text-text-sub font-medium m-0">Click Refresh to generate today's AI-powered insight.</p>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border mb-7 flex-wrap">
        <FilterSelect label="Timeframe" value={viewType} onChange={setViewType} options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'annually', label: 'Annually' },
        ]} />
        <div className="w-px h-6 bg-border mx-1" />
        <FilterSelect label="Month" value={selectedMonth} onChange={setSelectedMonth} disabled={viewType === 'annually'} options={[
          { value: '0', label: 'January' },
          { value: '1', label: 'February' },
          { value: '2', label: 'March' },
          { value: '3', label: 'April' },
          { value: '4', label: 'May' },
          { value: '5', label: 'June' },
          { value: '6', label: 'July' },
          { value: '7', label: 'August' },
          { value: '8', label: 'September' },
          { value: '9', label: 'October' },
          { value: '10', label: 'November' },
          { value: '11', label: 'December' },
        ]} />
        <div className="w-px h-6 bg-border mx-1" />
        <FilterSelect label="Document" value={docType} onChange={setDocType} options={[
          { value: 'all', label: 'All Types' },
          { value: 'tor', label: 'TOR' },
          { value: 'coe', label: 'COE' },
          { value: 'diploma', label: 'Diploma' },
        ]} />

        <div className="ml-auto flex items-center gap-2.5">
          <button onClick={() => exportCSV(tableRows, 'campusflow_annual_report.csv')}
            className="py-2 px-4 rounded-xl border border-border bg-white shadow-sm text-text-main text-[13px] font-bold cursor-pointer font-sans flex items-center gap-2 hover:bg-off-white hover:-translate-y-0.5 transition-all">
            <Download size={14} /> Export Data
          </button>
          <button onClick={load} className="py-2 px-4 rounded-xl border border-border bg-white shadow-sm text-text-main text-[13px] font-bold cursor-pointer font-sans flex items-center gap-2 hover:bg-off-white hover:-translate-y-0.5 transition-all">
            <RotateCcw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="p-[12px_16px] rounded-[10px] bg-danger-light text-danger border border-danger-border mb-6 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Volume', value: (report?.total_appointments || 0).toLocaleString(), icon: <FileText size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: 'For selected period' },
          { label: 'Avg Processing', value: <>{report?.avg_processing_mins || 0}&nbsp;<span className="text-[20px]">min</span></>, icon: <Clock size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'Across all types' },
          { label: 'Completion Rate', value: `${report?.completion_rate ?? 0}%`, icon: <CheckCircle size={18} />, bg: 'bg-success-light', fg: 'text-success', sub: 'Successfully processed' },
          { label: 'Top Request', value: mostRequested ? (mostRequested.name.length > 14 ? mostRequested.name.slice(0, 14) + '…' : mostRequested.name) : '—', icon: <Activity size={18} />, bg: 'bg-info-light', fg: 'text-info', sub: `${mostReqPct}% of volume` },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-[18px_20px] bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{c.label}</div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-[28px] font-bold text-text-main leading-none">
              {loading ? <div className="animate-pulse w-[60px] h-[36px] bg-border rounded-lg" /> : c.value}
            </div>
            <div className="text-[11px] font-medium text-text-muted mt-1.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Document Volume Trends Chart ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border p-7 mb-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3 border-b border-border pb-4">
          <div>
            <p className="text-[10px] font-extrabold text-gold uppercase tracking-[0.08em] m-0 mb-1.5">Trends</p>
            <h2 className="font-serif text-[20px] font-bold text-text-main m-0">Document Volume — {trendTitle}</h2>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 items-center">
            {activeTypeNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: activeColors[i] }} />
                <span className="text-[12px] text-text-sub font-semibold">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-[250px] flex items-end gap-2 pt-5">
            {Array.from({ length: viewType === 'monthly' ? new Date(new Date().getFullYear(), parseInt(selectedMonth) + 1, 0).getDate() : 12 }).map((_, i) => (
              <div key={i} className="animate-pulse flex-1 bg-border rounded-t-lg" style={{ height: `${30 + (i % 3) * 25}%`, animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        ) : activeBars.length < 1 ? (
          <div className="h-[160px] flex items-center justify-center text-text-muted flex-col gap-2.5">
            <BarChart2 size={40} />
            <p className="m-0 text-[14px]">Not enough data to plot trends yet.</p>
          </div>
        ) : (
          <StackedBarChart
            bars={activeBars}
            typeNames={activeTypeNames}
            colors={activeColors}
            yAxisLabel={yAxisLabel}
          />
        )}
      </div>

      {/* ── Transaction Type Breakdown ── */}
      {!loading && report?.by_type?.length > 0 && (
        <div className="mt-7 bg-white rounded-2xl border border-border p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8">
          <div className="mb-6 border-b border-border pb-4">
            <p className="text-[10px] font-extrabold text-gold uppercase tracking-[0.08em] m-0 mb-1.5">Breakdown</p>
            <h2 className="font-serif text-[20px] font-bold text-text-main m-0">By Transaction Type</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
            {[...report.by_type].sort((a, b) => {
              const order = ['Transcript of Records (TOR)', 'Certificate of Enrollment (COE)', 'Diploma Release']
              const iA = order.indexOf(a.name)
              const iB = order.indexOf(b.name)
              if (iA === -1 && iB === -1) return b.count - a.count
              if (iA === -1) return 1
              if (iB === -1) return -1
              return iA - iB
            }).map((type, i) => {
              const pct = totalVol > 0 ? Math.round((type.count / totalVol) * 100) : 0
              const DOC_COLOR_MAP = {
                'Transcript of Records (TOR)': '#7B1A2A',
                'Certificate of Enrollment (COE)': '#B8900A',
                'Diploma Release': '#1D4ED8'
              }
              const color = DOC_COLOR_MAP[type.name] || SERIES_COLORS[i % SERIES_COLORS.length]
              return (
                <div key={i} className="bg-white shadow-sm rounded-2xl p-[20px] border border-border hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-bold text-text-main">{type.name}</span>
                    <span className="font-serif text-[22px] font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface rounded-full mb-2">
                    <div className="h-1.5 rounded-full transition-[width] duration-600 ease" style={{ background: color, width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] font-medium text-text-muted">{type.count.toLocaleString()} records</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Monthly Performance Detail Table ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-7 overflow-hidden" style={{ animationDelay: '0.7s' }}>
        {/* Table header */}
        <div className="flex items-center justify-between p-[24px_28px] bg-white border-b border-border/50">
          <div>
            <p className="text-[10px] font-extrabold text-gold uppercase tracking-widest m-0 mb-2">Detail</p>
            <h2 className="font-serif text-[22px] font-bold text-text-main m-0 flex items-center gap-3">
              Monthly Performance
              <span className="px-2.5 py-1 rounded-lg bg-off-white border border-border text-[11px] font-sans font-bold text-text-muted tracking-wider shadow-sm">
                {new Date().getFullYear()}
              </span>
            </h2>
          </div>
          <button onClick={() => exportCSV(tableRows, 'campusflow_monthly_report.csv')}
            className="py-2.5 px-5 rounded-xl border border-border/80 bg-white shadow-sm text-text-main text-[13px] font-bold cursor-pointer font-sans flex items-center gap-2 hover:bg-surface hover:-translate-y-0.5 transition-all">
            <FileDown size={16} /> Export CSV
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[140px_repeat(4,1fr)_160px] p-[16px_28px] bg-[#fafafa] border-b border-border/50">
          {['Month', 'Total', 'Completed', 'Cancelled', 'No Show', 'Completion Rate'].map(h => (
            <span key={h} className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="bg-white rounded-b-2xl overflow-hidden">
        {loading ? (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-[140px_repeat(4,1fr)_160px] p-[20px_28px] border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-border rounded-full animate-pulse" />
                  <div className="animate-pulse h-[18px] w-[60%] bg-border rounded" />
                </div>
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="animate-pulse h-[18px] w-[50%] bg-border rounded my-auto" />
                ))}
              </div>
            ))}
          </div>
        ) : tableRows.length === 0 ? (
          <div className="p-[60px_24px] text-center text-text-muted font-medium">No monthly data available yet.</div>
        ) : (
          tableRows.map((row, i) => {
            const compRate = parseInt(row['Completion Rate']) || 0
            const barColor = compRate >= 90 ? 'bg-success' : compRate >= 70 ? 'bg-gold' : 'bg-danger'
            const textColor = compRate >= 90 ? 'text-success' : compRate >= 70 ? 'text-gold' : 'text-danger'
            return (
              <div key={i} className={`group grid grid-cols-[140px_repeat(4,1fr)_160px] p-[20px_28px] items-center transition-all duration-300 hover:bg-[#fafafa] ${i < tableRows.length - 1 ? 'border-b border-border/50' : 'border-none'} bg-white`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-border group-hover:bg-maroon transition-colors" />
                  <span className="font-serif text-[15px] font-bold text-text-main group-hover:text-maroon transition-colors">{row.Period}</span>
                </div>
                <span className="text-[15px] font-bold text-text-main">{row.Total.toLocaleString()}</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                  <span className="text-[14px] font-semibold text-text-sub">{row.Completed.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
                  <span className="text-[14px] font-semibold text-text-sub">{row.Cancelled.toLocaleString()}</span>
                </div>
                <span className="text-[14px] font-medium text-text-sub pl-2">{row['No Show'].toLocaleString()}</span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${compRate}%` }} />
                  </div>
                  <span className={`text-[13px] font-bold min-w-[36px] ${textColor}`}>{row['Completion Rate']}</span>
                </div>
              </div>
            )
          })
        )}
        </div>

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
            <div className="grid grid-cols-[140px_repeat(4,1fr)_160px] p-[20px_28px] bg-maroon-light border-t border-maroon-border rounded-b-2xl items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-maroon shadow-[0_0_8px_rgba(123,26,42,0.4)]" />
                <span className="text-[11px] font-extrabold text-maroon uppercase tracking-widest pt-0.5">Annual Total</span>
              </div>
              <span className="font-serif text-[18px] font-bold text-maroon">{totals.total.toLocaleString()}</span>
              <span className="font-serif text-[18px] font-bold text-success">{totals.completed.toLocaleString()}</span>
              <span className="font-serif text-[18px] font-bold text-danger">{totals.cancelled.toLocaleString()}</span>
              <span className="font-serif text-[18px] font-bold text-text-main pl-2">{totals.noShow.toLocaleString()}</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-maroon-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-maroon transition-all duration-1000" style={{ width: `${overallRate}%` }} />
                </div>
                <span className="font-serif text-[16px] font-bold text-maroon">{overallRate}%</span>
              </div>
            </div>
          )
        })()}
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
