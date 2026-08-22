import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/useAuth'
import { getReports, getAiInsights, getTransactionTypes } from '../../services/adminService'
import { getDocumentColor } from '../../utils/colors'
import { Download, RotateCcw, Sparkles, ChevronDown, AlertTriangle, BarChart2, Bot, FileText, Clock, CheckCircle, Activity, Award, XCircle, CheckCircle2, Layers, Loader2 } from 'lucide-react'
import DonutChart from '../../components/DonutChart'

const SERIES_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

// ── Filter Pill ────────────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, options, onChange, disabled, widthClass = "min-w-32.5" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className={`flex items-center gap-2.5 mr-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] pt-0.5 whitespace-nowrap">{label}</span>
      <div className="relative z-10 group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`appearance-none flex items-center justify-between py-2 pr-3.5 pl-3.5 rounded-xl border border-border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] font-bold text-text-main outline-none cursor-pointer font-sans ${widthClass} transition-colors hover:border-maroon/30 disabled:bg-gray-50 disabled:text-gray-400`}
        >
          <span className="pr-4 truncate text-left" style={{ maxWidth: '240px' }}>{currentLabel}</span>
          <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : 'group-hover:text-text-main'}`} />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className={`absolute left-0 top-full mt-2 bg-white rounded-xl border border-border shadow-lg p-2 z-50 ${widthClass === 'min-w-32.5' ? 'min-w-45' : 'min-w-full max-w-[320px]'} animate-fade-up max-h-75 overflow-y-auto`} style={{ animationDuration: '0.2s' }}>
              {options.map(o => {
                const isActive = value === o.value;
                return (
                  <div
                    key={o.value}
                    onClick={() => { onChange(o.value); setIsOpen(false); }}
                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon' : 'text-text-main hover:bg-off-white'}`}
                  >
                    <div className="flex items-center gap-2.5">
                       <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                         {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                       </div>
                       <span className="text-[12px] font-semibold">{o.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
            <div className="bg-white rounded-2xl border border-border/60 shadow-[0_12px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] p-4 min-w-45">
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

const fmt12h = (t) => {
  if (!t) return ''
  const parts = t.split(':')
  if (parts.length < 2) return t
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

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
  const [transactionTypes, setTransactionTypes] = useState([])

  useEffect(() => {
    getTransactionTypes(token).then(data => setTransactionTypes(data)).catch(console.error)
  }, [token])

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

      // Fetch all windows in parallel (always fetch all, filter client-side)
      const p1 = Promise.all(windows.map(w => getReports(token, w, 'all')))
      const p2 = viewType === 'annually' ? p1 : Promise.all(annualWindows.map(w => getReports(token, w, 'all')))
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

        const currByType = curr.by_type || []
        const prevByType = prev.by_type || []
        const allNames = [...new Set([
          ...currByType.map(t => t.name),
          ...prevByType.map(t => t.name)
        ])]
        const diffByType = allNames.map(name => {
          const ct = currByType.find(t => t.name === name)
          const pt = prevByType.find(t => t.name === name)
          return { name, count: Math.max(0, (ct?.count || 0) - (pt?.count || 0)) }
        })

        annual.push({
          month: annualLabels[i],
          total:     Math.max(0, (curr.total_appointments || 0) - (prev.total_appointments || 0)),
          completed: Math.max(0, (curr.completed || 0) - (prev.completed || 0)),
          cancelled: Math.max(0, (curr.cancelled || 0) - (prev.cancelled || 0)),
          no_show:   Math.max(0, (curr.no_show || 0) - (prev.no_show || 0)),
          by_type:   diffByType,
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
  const TYPE_ORDER = ['Transcript of Records (TOR)', 'Certificate of Enrollment (COE)', 'Diploma Release', 'General Weighted Average (GWA)', 'Completion Form - Request', 'Completion Form - Submission']
  const TYPE_COLORS = ['#7B1A2A', '#B8900A', '#1D4ED8', '#15803D', '#6D28D9', '#EA580C']

  // Collect all unique type names across all monthly periods, sorted consistently
  const allTypeNamesRaw = [...new Set([
    ...TYPE_ORDER,
    ...monthlyReports.flatMap(m => m.by_type.map(t => t.name))
  ])]

  const allTypeNames = (docType === 'all' 
    ? allTypeNamesRaw 
    : allTypeNamesRaw.filter(name => name.toLowerCase().includes(docType.toLowerCase()))
  ).sort((a, b) => {
    const iA = TYPE_ORDER.indexOf(a), iB = TYPE_ORDER.indexOf(b)
    if (iA === -1 && iB === -1) return a.localeCompare(b)
    if (iA === -1) return 1; if (iB === -1) return -1
    return iA - iB
  })

  // Build bars: one per time period, each bar has segments per type
  const chartBars = monthlyReports.map(m => ({
    label: m.month,
    segments: allTypeNames.map(name => {
      const found = m.by_type.find(t => t.name === name)
      return found?.count || 0
    }),
  }))

  const paddedReportByType = [...(report?.by_type || [])];
  TYPE_ORDER.forEach(name => {
    if (!paddedReportByType.some(t => t.name === name)) {
      paddedReportByType.push({ name, count: 0 });
    }
  });

  const filteredReportByType = paddedReportByType.filter(t => 
    docType === 'all' || t.name.toLowerCase().includes(docType.toLowerCase())
  )

  const totalVol = docType === 'all' 
    ? (report?.total_appointments || 0)
    : filteredReportByType.reduce((sum, t) => sum + t.count, 0)

  // Y-axis label based on selected filter
  const yAxisLabel = viewType === 'monthly' ? 'Requests / Day' : 'Requests / Month'

  // Trend title based on filter
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const trendTitle = viewType === 'monthly' ? `${monthNames[selectedMonth]} (Daily)` : `${new Date().getFullYear()} (Annually)`

  // Fallback series if no by_type data
  const fallbackBars = monthlyReports.map(m => ({
    label: m.month,
    segments: [docType === 'all' ? Math.max(0, m.total) : m.by_type.filter(t => t.name.toLowerCase().includes(docType.toLowerCase())).reduce((sum, t) => sum + t.count, 0)],
  }))
  const fallbackTypeNames = ['Total']

  const activeBars = chartBars.length > 0 && allTypeNames.length > 0 ? chartBars : fallbackBars
  const activeTypeNames = allTypeNames.length > 0 ? allTypeNames : fallbackTypeNames

  const activeColors = activeTypeNames.map(name => getDocumentColor(name))

  // Most requested type
  const mostRequested = filteredReportByType[0]
  const mostReqPct = mostRequested && totalVol > 0
    ? Math.round((mostRequested.count / totalVol) * 100)
    : 0

  // Monthly table rows
  const tableRows = annualReports.map((m, i) => {
    const filteredTotal = docType === 'all' 
      ? Math.max(0, m.total) 
      : m.by_type.filter(t => t.name.toLowerCase().includes(docType.toLowerCase())).reduce((sum, t) => sum + t.count, 0)
    
    return {
      Period:     m.month,
      Total:      filteredTotal,
      Completed:  docType === 'all' ? Math.max(0, m.completed) : '-',
      Cancelled:  docType === 'all' ? Math.max(0, m.cancelled) : '-',
      'No Show':  docType === 'all' ? Math.max(0, m.no_show) : '-',
      'Completion Rate': docType === 'all' ? (m.total > 0 ? `${Math.round((m.completed / m.total) * 100)}%` : '0%') : '-'
    }
  })

  // ── Monthly Performance Summary & Donut Data ──
  const performanceTotals = useMemo(() => {
    return annualReports.reduce((acc, m) => {
      const tot = typeof m.total === 'number' ? m.total : 0
      const comp = typeof m.completed === 'number' ? m.completed : 0
      const canc = typeof m.cancelled === 'number' ? m.cancelled : 0
      const noSh = typeof m.no_show === 'number' ? m.no_show : 0
      return {
        total: acc.total + tot,
        completed: acc.completed + comp,
        cancelled: acc.cancelled + canc,
        noShow: acc.noShow + noSh
      }
    }, { total: 0, completed: 0, cancelled: 0, noShow: 0 })
  }, [annualReports])

  const completionPct = performanceTotals.total > 0
    ? Math.round((performanceTotals.completed / performanceTotals.total) * 100)
    : 0
  const cancellationPct = performanceTotals.total > 0
    ? Math.round((performanceTotals.cancelled / performanceTotals.total) * 100)
    : 0
  const noShowPct = performanceTotals.total > 0
    ? Math.round((performanceTotals.noShow / performanceTotals.total) * 100)
    : 0

  const statusDonutData = useMemo(() => {
    return [
      { name: 'Completed', count: performanceTotals.completed },
      { name: 'Cancelled', count: performanceTotals.cancelled },
      { name: 'No Show', count: performanceTotals.noShow },
    ]
  }, [performanceTotals])

  const statusDonutColors = ['#15803D', '#DC2626', '#B8900A']

  // Best month with most completed transactions
  const bestMonth = useMemo(() => {
    if (!annualReports.length) return null
    const valid = annualReports.filter(r => (r.completed || 0) > 0)
    if (!valid.length) return null
    return valid.reduce((best, cur) => (cur.completed || 0) > (best.completed || 0) ? cur : best, valid[0])
  }, [annualReports])

  return (
    <div className="animate-fade-up font-sans w-full pb-10">
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">System Analytics</p>
          <h1 className="font-serif text-[22px] sm:text-[26px] font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
            <BarChart2 size={26} className="text-maroon shrink-0" /> Analytics &amp; Reports
          </h1>
          <p className="text-[12px] sm:text-[13px] text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
            Review AI insights, analyze processing trends, and download annual reports.
          </p>
        </div>
      </div>

      {/* ── AI Insight Card ── */}
      <div className="animate-fade-up bg-[#FDFCFB] rounded-2xl border border-maroon-border/40 p-7 mb-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" style={{ animationDelay: '0.1s' }}>
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
            {insightLoading ? (
              <span className="flex items-center gap-1.5"><Loader2 size={14} className="text-maroon animate-spin" /> Generating…</span>
            ) : (
              <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-maroon" /> Refresh AI</span>
            )}
          </button>
        </div>

        {insightLoading ? (
          /* ── Dedicated AI Card Skeleton State ── */
          <div className="animate-pulse flex flex-col gap-4">
            {/* Paragraph lines skeleton */}
            <div className="space-y-2 mb-3">
              <div className="h-4 bg-border/70 rounded-md w-full" />
              <div className="h-4 bg-border/70 rounded-md w-[88%]" />
              <div className="h-4 bg-border/60 rounded-md w-[60%]" />
            </div>

            {/* Sub-header skeleton */}
            <div className="h-3 bg-border/40 rounded w-36 mb-1 mt-1" />

            {/* Row 1: 3 cards skeleton */}
            <div className="grid grid-cols-3 gap-3 mb-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-border/50" />
                    <div className="h-3 bg-border/40 rounded w-20" />
                  </div>
                  <div className="h-7 bg-border/60 rounded w-24 mb-2" />
                  <div className="h-3 bg-border/30 rounded w-32" />
                </div>
              ))}
            </div>

            {/* Row 2: 3 cards skeleton */}
            <div className="grid grid-cols-3 gap-3 mb-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-border/50" />
                    <div className="h-3 bg-border/40 rounded w-28" />
                  </div>
                  <div className="h-7 bg-border/60 rounded w-20 mb-2" />
                  <div className="h-3 bg-border/30 rounded w-36" />
                </div>
              ))}
            </div>
          </div>
        ) : insights ? (
          <>
            <p className="text-[15px] text-text-main font-medium leading-[1.65] m-0 mb-6">{insights.insight}</p>
            <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em] mb-3 mt-1">Predictive Intelligence</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* Peak Hour */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-info-light flex items-center justify-center">
                    <Clock size={14} className="text-info" />
                  </div>
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Peak Hour</span>
                </div>
                <div className="font-serif text-[26px] font-bold text-info leading-none mb-1">
                  {insights.peak_hour && insights.peak_hour !== 'N/A' ? insights.peak_hour : '—'}
                </div>
                <div className="text-[11px] text-text-sub font-medium">
                  {insights.peak_hour && insights.peak_hour !== 'N/A' ? 'Busiest time slot today' : 'No appointments today'}
                </div>
              </div>

              {/* Busiest Document */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gold-light flex items-center justify-center">
                    <FileText size={14} className="text-gold" />
                  </div>
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Busiest Document</span>
                </div>
                <div className="font-serif text-[18px] font-bold text-gold leading-tight mb-1 line-clamp-2">
                  {insights.busiest_document && insights.busiest_document !== 'N/A' ? insights.busiest_document : '—'}
                </div>
                <div className="text-[11px] text-text-sub font-medium">
                  {insights.busiest_document && insights.busiest_document !== 'N/A' ? 'Most requested doc type' : 'No requests today'}
                </div>
              </div>

              {/* Served Today */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-success-light flex items-center justify-center">
                    <CheckCircle size={14} className="text-success" />
                  </div>
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Served Today</span>
                </div>
                <div className="font-serif text-[26px] font-bold text-success leading-none mb-1">
                  {insights.served_today ?? 0}
                </div>
                <div className="text-[11px] text-text-sub font-medium">
                  {insights.total > 0 ? `out of ${insights.total} total appointments` : 'No appointments today'}
                </div>
              </div>
            </div>

            {/* Forecast Row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Tomorrow's Forecast */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-maroon-light flex items-center justify-center">
                    <Activity size={14} className="text-maroon" />
                  </div>
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Tomorrow's Forecast</span>
                </div>
                {insights.forecast?.insufficient_data ? (
                  <>
                    <div className="font-serif text-[26px] font-bold text-text-muted leading-none mb-1">—</div>
                    <div className="text-[11px] text-text-sub font-medium">Not enough history yet</div>
                  </>
                ) : (
                  <>
                    <div className="font-serif text-[26px] font-bold text-maroon leading-none mb-1">
                      {insights.forecast?.predicted_count ?? '—'} <span className="text-[14px] font-sans font-semibold text-text-muted">expected</span>
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">
                      {insights.forecast?.weekday}{insights.forecast?.top_transaction_type ? ` · Top: ${insights.forecast.top_transaction_type}` : ''}
                    </div>
                  </>
                )}
              </div>

              {/* 14-Day Trend */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    insights.trend?.direction === 'up' ? 'bg-success-light' :
                    insights.trend?.direction === 'down' ? 'bg-danger-light' : 'bg-surface'
                  }`}>
                    <Activity size={14} className={
                      insights.trend?.direction === 'up' ? 'text-success' :
                      insights.trend?.direction === 'down' ? 'text-danger' : 'text-text-muted'
                    } />
                  </div>
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">14-Day Trend</span>
                </div>
                {insights.trend?.insufficient_data ? (
                  <>
                    <div className="font-serif text-[26px] font-bold text-text-muted leading-none mb-1">—</div>
                    <div className="text-[11px] text-text-sub font-medium">Not enough history yet</div>
                  </>
                ) : (
                  <>
                    <div className={`font-serif text-[26px] font-bold leading-none mb-1 ${
                      insights.trend?.direction === 'up' ? 'text-success' :
                      insights.trend?.direction === 'down' ? 'text-danger' : 'text-text-main'
                    }`}>
                      {insights.trend?.direction === 'up' ? '↑' : insights.trend?.direction === 'down' ? '↓' : '→'} {Math.round(Math.abs(insights.trend?.percent_change ?? 0))}%
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">
                      {insights.trend?.recent_count} recent vs {insights.trend?.prior_count} prior
                    </div>
                  </>
                )}
              </div>

              {/* Demand Driver */}
              <div className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
                    <Sparkles size={14} className="text-[#6D28D9]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">Most In-Demand</span>
                </div>
                {insights.trend?.driving_type ? (
                  <>
                    <div className="font-serif text-[18px] font-bold text-[#6D28D9] leading-tight mb-1 line-clamp-2">
                      {insights.trend.driving_type}
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">Highest student demand lately</div>
                  </>
                ) : (
                  <>
                    <div className="font-serif text-[26px] font-bold text-text-muted leading-none mb-1">—</div>
                    <div className="text-[11px] text-text-sub font-medium">{insights.trend?.direction === 'down' ? 'Volume is decreasing' : 'Demand is evenly spread'}</div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[14px] text-text-sub font-medium m-0">Click Refresh to generate today's AI-powered insight.</p>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="animate-fade-up flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border mb-7 flex-wrap" style={{ animationDelay: '0.2s' }}>
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
        <FilterSelect label="Document" value={docType} onChange={setDocType} widthClass="w-65" options={[
          { value: 'all', label: 'All Types' },
          ...transactionTypes.map(t => ({ value: t.name, label: t.name }))
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
          { label: 'Total Volume', value: totalVol.toLocaleString(), icon: <FileText size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon', sub: 'Total requests in period' },
          { label: 'Completion Rate', value: docType === 'all' ? `${report?.completion_rate || 0}%` : '—', icon: <CheckCircle size={18} />, bg: 'bg-info-light', fg: 'text-info', sub: 'Successfully processed' },
          { label: 'Avg Process Time', value: docType === 'all' ? `${report?.avg_processing_mins || 0}m` : '—', icon: <Clock size={18} />, bg: 'bg-gold-light', fg: 'text-gold', sub: 'Per document average' },
          { label: 'No-Show Rate', value: docType === 'all' ? `${report?.no_show_rate || 0}%` : '—', icon: <AlertTriangle size={18} />, bg: 'bg-danger-light', fg: 'text-danger', sub: 'Missed appointments' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-[18px_20px] bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.08em]">{c.label}</div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-[28px] font-bold text-text-main leading-none">
              {loading ? <div className="animate-pulse w-15 h-9 bg-border rounded-lg" /> : c.value}
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
          <div className="h-62.5 flex items-end gap-2 pt-5">
            {Array.from({ length: viewType === 'monthly' ? new Date(new Date().getFullYear(), parseInt(selectedMonth) + 1, 0).getDate() : 12 }).map((_, i) => (
              <div key={i} className="animate-pulse flex-1 bg-border rounded-t-lg" style={{ height: `${30 + (i % 3) * 25}%`, animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        ) : activeBars.length < 1 ? (
          <div className="h-40 flex items-center justify-center text-text-muted flex-col gap-2.5">
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
      {!loading && filteredReportByType.length > 0 && (
        <div className="animate-fade-up mt-7 bg-white rounded-2xl border border-border p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8" style={{ animationDelay: '0.5s' }}>
          <div className="mb-6 border-b border-border pb-4">
            <p className="text-[10px] font-extrabold text-gold uppercase tracking-[0.08em] m-0 mb-1.5">Breakdown</p>
            <h2 className="font-serif text-[20px] font-bold text-text-main m-0">By Transaction Type</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-center">
            <div className="flex justify-center lg:border-r border-border/50 lg:pr-4">
              <DonutChart 
                data={[...filteredReportByType].sort((a, b) => {
                  const iA = TYPE_ORDER.indexOf(a.name)
                  const iB = TYPE_ORDER.indexOf(b.name)
                  if (iA === -1 && iB === -1) return b.count - a.count
                  if (iA === -1) return 1
                  if (iB === -1) return -1
                  return iA - iB
                })} 
                total={totalVol} 
                colors={[...filteredReportByType].sort((a, b) => {
                  const iA = TYPE_ORDER.indexOf(a.name)
                  const iB = TYPE_ORDER.indexOf(b.name)
                  if (iA === -1 && iB === -1) return b.count - a.count
                  if (iA === -1) return 1
                  if (iB === -1) return -1
                  return iA - iB
                }).map(type => getDocumentColor(type.name))} 
                hideLegend={true}
              />
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
            {[...filteredReportByType].sort((a, b) => {
              const iA = TYPE_ORDER.indexOf(a.name)
              const iB = TYPE_ORDER.indexOf(b.name)
              if (iA === -1 && iB === -1) return b.count - a.count
              if (iA === -1) return 1
              if (iB === -1) return -1
              return iA - iB
            }).map((type, i) => {
              const pct = totalVol > 0 ? Math.round((type.count / totalVol) * 100) : 0
              const color = getDocumentColor(type.name)
              return (
                <div key={i} className="bg-white shadow-sm rounded-2xl p-5 border border-border hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-text-main mb-1.5 leading-tight">{type.name}</div>
                      <div className="text-[11.5px] font-medium text-text-muted">{type.count.toLocaleString()} records</div>
                    </div>
                    <div className="relative shrink-0 flex items-center justify-center" style={{ width: 54, height: 54 }}>
                      <svg width="54" height="54" className="-rotate-90 drop-shadow-sm">
                        <circle cx="27" cy="27" r="22" fill="none" stroke="#F3F2F0" strokeWidth="5" />
                        <circle 
                          cx="27" cy="27" r="22" 
                          fill="none" stroke={color} strokeWidth="5" 
                          strokeDasharray={`${(pct / 100) * (2 * Math.PI * 22)} 139`} 
                          strokeLinecap="round" 
                          className="transition-all duration-1000 ease-out" 
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-serif text-[13px] font-bold" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Performance & Fulfillment Section ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-7 overflow-hidden" style={{ animationDelay: '0.7s' }}>
        
        {/* Section Header */}
        <div className="flex items-center justify-between p-6 sm:p-7 bg-white border-b border-border/60 flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-gold uppercase tracking-widest m-0 mb-1.5">ANNUAL METRICS</p>
            <h2 className="font-serif text-[22px] font-bold text-maroon m-0 flex items-center gap-3">
              Monthly Performance &amp; Fulfillment
              <span className="px-2.5 py-1 rounded-lg bg-maroon-light border border-maroon-border text-[11px] font-sans font-bold text-maroon tracking-wider shadow-xs">
                {new Date().getFullYear()}
              </span>
            </h2>
            <p className="text-[12px] text-text-sub m-0 mt-1">
              Annual breakdown of appointment outcomes, cancellation rates, and monthly fulfillment totals.
            </p>
          </div>
          <button 
            onClick={() => exportCSV(tableRows, 'campusflow_monthly_performance.csv')}
            className="py-2.5 px-4.5 rounded-xl border border-border bg-white shadow-xs text-text-main text-[12.5px] font-bold cursor-pointer font-sans flex items-center gap-2 hover:bg-surface hover:border-maroon/30 transition-all"
          >
            <Download size={15} className="text-text-muted" /> Export CSV
          </button>
        </div>

        {/* ── Performance Donut & Executive Summary ── */}
        <div className="p-6 sm:p-7 bg-off-white/40 border-b border-border/60">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left: Outcome Donut Report */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col items-center justify-center">
              <div className="w-full flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] font-extrabold text-gold uppercase tracking-wider block">OUTCOME REPORT</span>
                  <h3 className="font-serif text-[16px] font-bold text-text-main m-0">Appointment Status </h3>
                </div>
                <span className="text-[11px] font-bold text-text-muted bg-surface px-2.5 py-1 rounded-full border border-border/80">
                  {performanceTotals.total} Total
                </span>
              </div>

              {loading ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-maroon border-t-transparent rounded-full animate-spin" />
                </div>
              ) : performanceTotals.total === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-text-muted text-sm text-center">
                  <Layers size={32} className="opacity-30 mb-2" />
                  No appointment records recorded this year yet
                </div>
              ) : (
                <DonutChart
                  data={statusDonutData}
                  total={performanceTotals.total}
                  colors={statusDonutColors}
                  hideLegend={true}
                />
              )}

              {/* Custom Status Legend Row */}
              <div className="grid grid-cols-3 gap-2.5 w-full mt-4 pt-3 border-t border-border">
                <div className="p-2 rounded-xl bg-success/5 border border-success/15 text-center">
                  <div className="text-[10px] font-extrabold text-success uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Completed
                  </div>
                  <div className="font-serif text-[15px] font-bold text-success mt-0.5">{performanceTotals.completed} <span className="text-[11px] font-sans text-text-muted">({completionPct}%)</span></div>
                </div>

                <div className="p-2 rounded-xl bg-danger/5 border border-danger/15 text-center">
                  <div className="text-[10px] font-extrabold text-danger uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" /> Cancelled
                  </div>
                  <div className="font-serif text-[15px] font-bold text-danger mt-0.5">{performanceTotals.cancelled} <span className="text-[11px] font-sans text-text-muted">({cancellationPct}%)</span></div>
                </div>

                <div className="p-2 rounded-xl bg-gold/5 border border-gold/20 text-center">
                  <div className="text-[10px] font-extrabold text-gold-dark uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" /> No Show
                  </div>
                  <div className="font-serif text-[15px] font-bold text-gold-dark mt-0.5">{performanceTotals.noShow} <span className="text-[11px] font-sans text-text-muted">({noShowPct}%)</span></div>
                </div>
              </div>
            </div>

            {/* Right: Key Summary Highlights */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              
              {/* Highlight Card 1: Fulfillment Efficiency */}
              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center shrink-0 border border-success-border">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Overall Completion Rate</div>
                    <div className="font-serif text-[26px] font-extrabold text-success leading-tight mt-0.5">
                      {completionPct}%
                    </div>
                    <div className="text-[11.5px] text-text-sub font-medium mt-0.5">
                      {performanceTotals.completed} out of {performanceTotals.total} scheduled appointments successfully completed
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${completionPct >= 80 ? 'bg-success-light text-success border-success-border' : 'bg-gold-light text-gold border-gold-border'}`}>
                    {completionPct >= 80 ? 'High Fulfillment' : 'Moderate Fulfillment'}
                  </span>
                </div>
              </div>

              {/* Highlight Card 2: Drop-Off Rate & Peak Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Drop-off breakdown */}
                <div className="bg-white p-4.5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Total Drop-Off</span>
                    <div className="w-7 h-7 rounded-lg bg-danger-light text-danger flex items-center justify-center border border-danger-border">
                      <XCircle size={15} />
                    </div>
                  </div>
                  <div>
                    <div className="font-serif text-[22px] font-bold text-danger leading-none mb-1">
                      {cancellationPct + noShowPct}%
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">
                      {performanceTotals.cancelled + performanceTotals.noShow} missed appointments
                    </div>
                  </div>
                </div>

                {/* Peak Month */}
                <div className="bg-white p-4.5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Peak Month</span>
                    <div className="w-7 h-7 rounded-lg bg-gold/10 text-gold flex items-center justify-center border border-gold/20">
                      <Award size={15} />
                    </div>
                  </div>
                  <div>
                    <div className="font-serif text-[18px] font-bold text-text-main leading-none mb-1 truncate">
                      {bestMonth ? bestMonth.month : '—'}
                    </div>
                    <div className="text-[11px] text-text-sub font-medium">
                      {bestMonth ? `${bestMonth.completed} completed (${bestMonth.total > 0 ? Math.round((bestMonth.completed / bestMonth.total) * 100) : 0}%)` : 'No completed appointments yet'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Highlight Card 3: Executive Summary Note */}
              <div className="p-4 rounded-2xl bg-maroon-light/60 border border-maroon-border/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white text-maroon flex items-center justify-center shrink-0 border border-maroon-border mt-0.5">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-maroon">Performance Summary</div>
                  <p className="text-[12px] text-text-main font-medium leading-relaxed m-0 mt-0.5">
                    {performanceTotals.total === 0 
                      ? "No appointments have been recorded for this year yet. Historical completion trends will display as students book and attend appointments."
                      : `The office maintains a ${completionPct}% completion rate across ${performanceTotals.total} total bookings. Cancellations (${cancellationPct}%) and no-shows (${noShowPct}%) remain within normal registrar operating thresholds.`
                    }
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ── Monthly Breakdown Table ── */}
        <div className="p-5 px-6 sm:px-7 bg-white border-b border-border flex items-center justify-between">
          <h3 className="font-serif text-[16px] font-bold text-text-main m-0">Month-by-Month Breakdown</h3>
          <span className="text-[11.5px] text-text-muted font-medium">Showing all 12 months</span>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[140px_repeat(4,1fr)_160px] p-[14px_28px] bg-surface/60 border-b border-border text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.08em]">
          <span>Month</span>
          <span>Total</span>
          <span>Completed</span>
          <span>Cancelled</span>
          <span>No Show</span>
          <span>Completion Rate</span>
        </div>

        {/* Table Rows */}
        <div className="bg-white">
          {loading ? (
            <div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-[140px_repeat(4,1fr)_160px] p-[18px_28px] border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-border rounded-full animate-pulse" />
                    <div className="animate-pulse h-4.5 w-[60%] bg-border rounded" />
                  </div>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="animate-pulse h-4.5 w-[50%] bg-border rounded my-auto" />
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
                <div key={i} className={`group grid grid-cols-[140px_repeat(4,1fr)_160px] p-[16px_28px] items-center transition-all duration-200 hover:bg-off-white/70 ${i < tableRows.length - 1 ? 'border-b border-border/50' : 'border-none'} bg-white`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-border group-hover:bg-maroon transition-colors" />
                    <span className="font-serif text-[14.5px] font-bold text-text-main group-hover:text-maroon transition-colors">{row.Period}</span>
                  </div>
                  <span className="text-[14.5px] font-bold text-text-main">{row.Total.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                    <span className="text-[13.5px] font-semibold text-text-sub">{row.Completed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
                    <span className="text-[13.5px] font-semibold text-text-sub">{row.Cancelled.toLocaleString()}</span>
                  </div>
                  <span className="text-[13.5px] font-medium text-text-sub pl-2">{row['No Show'].toLocaleString()}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${compRate}%` }} />
                    </div>
                    <span className={`text-[12.5px] font-bold min-w-9 ${textColor}`}>{row['Completion Rate']}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Summary Footer */}
        {!loading && tableRows.length > 0 && (
          <div className="grid grid-cols-[140px_repeat(4,1fr)_160px] p-[18px_28px] bg-maroon-light border-t border-maroon-border items-center">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-maroon shadow-xs" />
              <span className="text-[11px] font-extrabold text-maroon uppercase tracking-widest pt-0.5">Annual Total</span>
            </div>
            <span className="font-serif text-[17px] font-bold text-maroon">{performanceTotals.total.toLocaleString()}</span>
            <span className="font-serif text-[17px] font-bold text-success">{performanceTotals.completed.toLocaleString()}</span>
            <span className="font-serif text-[17px] font-bold text-danger">{performanceTotals.cancelled.toLocaleString()}</span>
            <span className="font-serif text-[17px] font-bold text-text-main pl-2">{performanceTotals.noShow.toLocaleString()}</span>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-maroon-border rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-maroon transition-all duration-700" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="font-serif text-[16px] font-bold text-maroon">{completionPct}%</span>
            </div>
          </div>
        )}
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
