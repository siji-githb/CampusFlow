import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import crmcLogo from '../../assets/crmc-logo.webp'
import AdminLiveQueuePage from './AdminLiveQueuePage'
import AdminAppointmentsPage from './AdminAppointmentsPage'
import AdminReportsPage from './AdminReportsPage'
import AdminRegistrarRecordsPage from './AdminRegistrarRecordsPage'
import AdminUserManagementPage from './AdminUserManagementPage'
import AdminOfficeConfigPage from './AdminOfficeConfigPage'
import AdminAuditLogPage from './AdminAuditLogPage'
import {
  getDashboardStats, getReports, getOfficeConfig, updateOfficeConfig,
  getAllUsers, updateUserRole, getAuditLog, getAiInsights
} from '../../services/adminService'

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

// ── Sidebar Nav Item ───────────────────────────────────────────────────────────
const SideItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '12px',
    width: '100%', padding: '10px 16px', borderRadius: '10px',
    border: 'none', cursor: 'pointer', textAlign: 'left',
    background: active ? M.maroon : 'transparent',
    color: active ? M.white : M.textSub,
    fontSize: '13.5px', fontWeight: active ? 600 : 400,
    fontFamily: "'IBM Plex Sans', sans-serif",
    transition: 'all 0.15s',
  }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = M.surface; e.currentTarget.style.color = M.text; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.textSub; } }}
  >
    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {active && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />}
  </button>
)

// ── Circular Progress Ring ─────────────────────────────────────────────────────
const Ring = ({ pct, color, size = 48 }) => {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={M.border} strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

const LineChart = ({ actualData, labels }) => {
  const W = 560, H = 180, PAD = { top: 20, right: 20, bottom: 36, left: 45 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const maxV = Math.max(...actualData, 4) * 1.15
  const minV = 0

  const toX = i => PAD.left + (i / (actualData.length - 1)) * cW
  const toY = v => PAD.top + cH - ((v - minV) / (maxV - minV)) * cH

  const makePath = data =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  const makeArea = data => {
    const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' L')
    const last = data.length - 1
    return `M${toX(0).toFixed(1)},${toY(data[0]).toFixed(1)} L${pts} L${toX(last).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
  }

  const yTicks = [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), Math.round(maxV)]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={M.maroon} stopOpacity="0.15" />
          <stop offset="100%" stopColor={M.maroon} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={M.gold} stopOpacity="0.12" />
          <stop offset="100%" stopColor={M.gold} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradMonthly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={M.blue} stopOpacity="0.12" />
          <stop offset="100%" stopColor={M.blue} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(t)} x2={PAD.left + cW} y2={toY(t)} stroke={M.border} strokeWidth={1} strokeDasharray="3,3" />
          <text x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fontSize="10" fill={M.textMuted}>{t}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={makeArea(actualData)} fill="url(#gradActual)" />

      {/* Line */}
      <path d={makePath(actualData)} fill="none" stroke={M.maroon} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {actualData.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={4} fill={M.white} stroke={M.maroon} strokeWidth={2} />
      ))}

      {/* X-axis labels */}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={M.textMuted}>{l}</text>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardStats(token)
      .then(s => setStats(s))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    setChartLoading(true)
    getReports(token, days)
      .then(r => setReport(r))
      .catch(e => setError(e.message))
      .finally(() => setChartLoading(false))
  }, [token, days])

  if (error) return (
    <div style={{ padding: '14px 18px', borderRadius: '12px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}` }}>{error}</div>
  )

  // Stat cards matching reference image layout
  const CARDS = [
    {
      label: 'Total Appointments Today',
      value: loading || !stats ? null : stats?.today?.total || 0,
      sub: loading || !stats ? '—' : `${stats?.today?.completed || 0} Completed`,
      subColor: M.green,
      icon: '📅',
      bg: M.maroon,
      textColor: M.white,
      dark: true,
    },
    {
      label: 'Active Queue',
      value: loading || !stats ? null : stats?.active_queue || 0,
      sub: loading || !stats ? '—' : 'Currently in progress',
      subColor: 'rgba(255,255,255,0.75)',
      icon: '🎫',
      bg: M.gold,
      textColor: M.white,
      dark: true,
    },
    {
      label: 'Completion Rate',
      value: loading || !stats ? null : `${stats?.today?.total > 0 ? Math.round(((stats?.today?.completed || 0) / stats?.today?.total) * 100) : 0}%`,
      sub: loading || !stats ? '—' : 'Of total scheduled',
      subColor: M.textSub,
      icon: null,
      bg: M.white,
      textColor: M.text,
      dark: false,
    },
    {
      label: 'Avg. Wait Time',
      value: loading || !stats ? null : `${Math.round(stats?.avg_wait_minutes || 0)} min`,
      sub: loading || !stats ? '—' : 'System-wide average',
      subColor: M.textMuted,
      icon: '⏱',
      bg: M.white,
      textColor: M.text,
      dark: false,
    },
  ]

  // Build chart data from report.by_date
  const chartLabels = report?.by_date?.map(d => {
    const dt = new Date(d.date)
    return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const actualData = report?.by_date?.map(d => d.count) || [0, 0, 0, 0, 0, 0, 0]

  // Transaction distribution from report
  const txTypes = report?.by_type || []
  const txTotal = txTypes.reduce((s, t) => s + t.count, 0) || 1
  const TX_COLORS = [M.maroon, M.gold, M.blue, M.green, M.purple]

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '34px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Overview</h1>
        <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Welcome back. Here is the current status of the registrar operations.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {CARDS.map((c, i) => (
          <div key={i} className="animate-fade-up" style={{
            animationDelay: `${i * 0.1}s`,
            borderRadius: '16px', padding: '22px 20px',
            background: c.bg,
            border: c.dark ? 'none' : `1px solid ${M.border}`,
            boxShadow: c.dark ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
            {c.dark && (
              <div style={{ position: 'absolute', right: -16, top: -16, width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            )}
            <div style={{ fontSize: '11px', fontWeight: 600, color: c.dark ? 'rgba(255,255,255,0.65)' : M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{c.label}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: c.dark ? M.white : M.maroon, lineHeight: 1, marginBottom: '8px', minHeight: '36px' }}>
              {c.value === null ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: c.dark ? 'rgba(255,255,255,0.2)' : M.border, borderRadius: '8px' }} /> : c.value}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: c.subColor }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom row: Chart + Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

        {/* Volume Chart */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s', background: M.white, borderRadius: '16px', padding: '24px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Actual Volume</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Document Volume (Last {days} {days === 1 ? 'Day' : 'Days'})</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${M.border}`, fontSize: '12px', fontWeight: 600, color: M.textSub, outline: 'none', background: M.surface, cursor: 'pointer' }}>
                <option value={1}>Today</option>
                <option value={7}>1 Week</option>
                <option value={14}>2 Weeks</option>
                <option value={21}>3 Weeks</option>
                <option value={30}>1 Month</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: M.textSub }}>
                <div style={{ width: '20px', height: '2.5px', background: M.maroon, borderRadius: '2px' }} /> Daily Volume
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: '240px', padding: '10px 0' }}>
            {chartLoading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="typing-indicator" style={{ fontSize: '24px', color: M.maroon, fontWeight: 800 }}>Loading</div>
              </div>
            )}
            <LineChart actualData={actualData} labels={chartLabels} />
          </div>
        </div>

        {/* Transaction Distribution */}
        <div className="animate-fade-up" style={{ animationDelay: '0.5s', background: M.white, borderRadius: '16px', padding: '24px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: M.gold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Breakdown</p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text, margin: 0 }}>Transaction Distribution</h2>
          </div>

          {chartLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="animate-shimmer" style={{ width: '44px', height: '44px', borderRadius: '50%', background: M.border }} />
                  <div style={{ flex: 1 }}>
                    <div className="animate-shimmer" style={{ width: '60%', height: '14px', borderRadius: '4px', background: M.border, marginBottom: '6px' }} />
                    <div className="animate-shimmer" style={{ width: '40%', height: '12px', borderRadius: '4px', background: M.border }} />
                  </div>
                </div>
              ))}
            </div>
          ) : txTypes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: M.textMuted, fontSize: '13px' }}>No transaction data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {txTypes.slice(0, 5).map((tx, i) => {
                const pct = Math.round((tx.count / txTotal) * 100)
                const color = TX_COLORS[i % TX_COLORS.length]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Ring pct={pct} color={color} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: M.text, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.name}</div>
                      <div style={{ fontSize: '11px', color: M.textMuted }}>
                        <span style={{ fontWeight: 700, color }}>{pct}%</span> &nbsp;·&nbsp; {tx.count} records
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Today's quick summary */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${M.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { l: 'Confirmed', v: loading || !stats ? null : stats?.today?.confirmed || 0, c: M.green },
                { l: 'Cancelled', v: loading || !stats ? null : stats?.today?.cancelled || 0, c: M.red },
                { l: 'Completed', v: loading || !stats ? null : stats?.today?.completed || 0, c: M.blue },
                { l: 'No Show', v: loading || !stats ? null : stats?.today?.no_show || 0, c: M.textMuted },
              ].map((s, i) => (
                <div key={i} style={{ background: M.offWhite, borderRadius: '10px', padding: '10px 12px', border: `1px solid ${M.border}` }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: s.c, lineHeight: 1, minHeight: '20px' }}>
                    {s.v === null ? <div className="animate-shimmer" style={{ width: '40px', height: '20px', background: '#EAE7E2', borderRadius: '4px' }} /> : s.v}
                  </div>
                  <div style={{ fontSize: '11px', color: M.textMuted, marginTop: '4px' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab() {
  const { token } = useAuth()
  const [report, setReport] = useState(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState('')

  useEffect(() => {
    setLoading(true)
    getReports(token, days).then(setReport).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [days, token])

  useEffect(() => { loadInsights() }, [])

  const loadInsights = async () => {
    setInsightLoading(true); setInsightError('')
    try { setInsights(await getAiInsights(token)) }
    catch (e) { setInsightError(e.message) }
    finally { setInsightLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '34px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Reports</h1>
          <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Transaction analytics and AI-powered insights.</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '9px 14px', borderRadius: '8px', border: `1px solid ${M.border}`, fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", color: M.text, background: M.white }}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* AI Insight */}
      <div style={{ background: M.maroonLight, borderRadius: '16px', border: `1px solid ${M.maroonBorder}`, padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🤖</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: M.maroon, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Daily Insight</div>
              <div style={{ fontSize: '11px', color: M.maroon, opacity: 0.7, marginTop: '1px' }}>
                {insights?.date || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          <button onClick={loadInsights} disabled={insightLoading}
            style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: M.maroon, color: M.white, fontSize: '12px', fontWeight: 600, cursor: insightLoading ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", opacity: insightLoading ? 0.7 : 1 }}>
            {insightLoading ? 'Generating…' : '↻ Refresh'}
          </button>
        </div>
        {insightError && <p style={{ fontSize: '13px', color: M.red, margin: '0 0 10px' }}>{insightError}</p>}
        {insightLoading ? (
          <p style={{ fontSize: '14px', color: M.maroon, opacity: 0.6, margin: 0 }}>Generating insight…</p>
        ) : insights ? (
          <>
            <p style={{ fontSize: '15px', color: M.maroonDark, lineHeight: 1.65, margin: '0 0 20px' }}>{insights.insight}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { l: 'Total', v: insights.total, c: M.text },
                { l: 'Completed', v: insights.completed, c: M.green },
                { l: 'No-shows', v: insights.no_shows, c: M.red },
                { l: 'Pending', v: insights.pending, c: M.gold },
                { l: 'Completion', v: `${insights.completion_rate}%`, c: M.blue },
              ].map((s, i) => (
                <div key={i} style={{ background: M.white, borderRadius: '10px', padding: '12px 18px', border: `1px solid ${M.maroonBorder}`, textAlign: 'center', flex: 1, minWidth: '80px' }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: '10px', color: M.textMuted, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: '14px', color: M.maroon, opacity: 0.7, margin: 0 }}>Click Refresh to generate today's AI-powered summary.</p>
        )}
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '20px' }}>{error}</div>}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '110px', borderRadius: '14px' }} className="animate-shimmer" />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ height: '250px', borderRadius: '16px' }} className="animate-shimmer" />
            <div style={{ height: '250px', borderRadius: '16px' }} className="animate-shimmer" />
          </div>
        </div>
      ) : report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { l: 'Total', v: report.total_appointments, c: M.text },
              { l: 'Completed', v: report.completed, c: M.green },
              { l: 'Completion Rate', v: `${report.completion_rate}%`, c: M.blue },
              { l: 'No-show Rate', v: `${report.no_show_rate}%`, c: M.red },
            ].map((s, i) => (
              <div key={i} style={{ background: M.white, borderRadius: '14px', border: `1px solid ${M.border}`, padding: '20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: '12px', color: M.textMuted, marginTop: '5px' }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: M.text, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Transaction Type</h3>
              {report.by_type.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: M.textSub, width: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  <div style={{ flex: 1, background: M.surface, borderRadius: '100px', height: '7px' }}>
                    <div style={{ height: '7px', borderRadius: '100px', background: M.maroon, width: report.total_appointments > 0 ? `${(item.count / report.total_appointments) * 100}%` : '0%' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: M.text, width: '28px', textAlign: 'right' }}>{item.count}</span>
                </div>
              ))}
            </div>
            {report.by_date.length > 0 && (
              <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: M.text, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Volume</h3>
                {report.by_date.map((item, i) => {
                  const max = Math.max(...report.by_date.map(d => d.count)) || 1
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: M.textMuted, width: '80px' }}>{item.date}</span>
                      <div style={{ flex: 1, background: M.surface, borderRadius: '100px', height: '7px' }}>
                        <div style={{ height: '7px', borderRadius: '100px', background: M.blue, width: `${(item.count / max) * 100}%` }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: M.text, width: '28px', textAlign: 'right' }}>{item.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFICE CONFIG TAB
// ─────────────────────────────────────────────────────────────────────────────
function OfficeConfigTab() {
  const { token } = useAuth()
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [edited, setEdited] = useState({})
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getOfficeConfig(token)
      .then(data => { setConfig(data); const init = {}; data.forEach(c => { init[c.key] = c.value }); setEdited(init) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSave = async (key) => {
    setSaving(key); setError(''); setSuccess('')
    try { await updateOfficeConfig(token, key, edited[key]); setSuccess(`"${key}" updated.`) }
    catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  const LABELS = {
    daily_cap_tor: 'Daily Cap — TOR', daily_cap_coe: 'Daily Cap — COE',
    daily_cap_diploma: 'Daily Cap — Diploma', office_open_time: 'Office Open Time',
    office_close_time: 'Office Close Time', slot_duration_minutes: 'Slot Duration (minutes)',
    booking_cutoff_days: 'Booking Cutoff (days)',
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '34px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Office Configuration</h1>
        <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Manage daily caps, office hours, and slot settings.</p>
      </div>
      {error && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '20px' }}>{error}</div>}
      {success && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.greenLight, color: M.green, border: `1px solid ${M.greenBorder}`, marginBottom: '20px' }}>✓ {success}</div>}
      {loading ? (
        <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: '70px', borderBottom: i < 5 ? `1px solid ${M.border}` : 'none' }} className="animate-shimmer" />
          ))}
        </div>
      ) : (
        <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {config.map((item, i) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: i < config.length - 1 ? `1px solid ${M.border}` : 'none', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 3px' }}>{LABELS[item.key] || item.key}</p>
                <p style={{ fontSize: '11px', color: M.textMuted, margin: 0, fontFamily: 'monospace' }}>{item.key}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="text" value={edited[item.key] ?? item.value}
                  onChange={e => setEdited({ ...edited, [item.key]: e.target.value })}
                  style={{ width: '120px', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.offWhite, fontSize: '14px', outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif", color: M.text, textAlign: 'center' }}
                  onFocus={e => e.target.style.borderColor = M.maroon}
                  onBlur={e => e.target.style.borderColor = M.border} />
                <button onClick={() => handleSave(item.key)}
                  disabled={saving === item.key || String(edited[item.key]) === String(item.value)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: (saving === item.key || String(edited[item.key]) === String(item.value)) ? M.border : M.maroon, color: (String(edited[item.key]) === String(item.value)) ? M.textMuted : M.white, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {saving === item.key ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────
function UsersTab() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetch_ = async () => {
    try { setUsers(await getAllUsers(token)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch_() }, [])

  const handleRole = async (id, role) => {
    setUpdating(id)
    try { await updateUserRole(token, id, role); await fetch_() }
    catch (e) { setError(e.message) }
    finally { setUpdating(null) }
  }

  const ROLE = {
    student: { bg: M.blueLight, color: M.blue, border: M.blueBorder },
    staff: { bg: M.goldLight, color: M.gold, border: M.goldBorder },
    admin: { bg: M.maroonLight, color: M.maroon, border: M.maroonBorder },
  }

  const visible = users.filter(u => {
    const q = search.toLowerCase()
    return !q || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '34px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>User Management</h1>
          <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Manage roles and access for all registered accounts.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            style={{ padding: '9px 14px 9px 34px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.white, fontSize: '13px', color: M.text, outline: 'none', width: '220px', fontFamily: "'IBM Plex Sans', sans-serif" }} />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: M.textMuted, fontSize: '14px' }}>🔍</span>
        </div>
      </div>
      {error && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '20px' }}>{error}</div>}
      {loading ? (
        <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden' }}>
          <div style={{ height: '40px', background: M.surface, borderBottom: `1px solid ${M.border}` }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: '60px', borderBottom: i < 5 ? `1px solid ${M.border}` : 'none' }} className="animate-shimmer" />
          ))}
        </div>
      ) : (
        <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto', padding: '14px 28px', background: M.surface, borderBottom: `1px solid ${M.border}` }}>
            {['Name', 'Email', 'Current Role', 'Assign Role'].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {visible.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: M.textMuted, fontSize: '14px' }}>No users match your search.</div>
          )}
          {visible.map((u, i) => {
            const rb = ROLE[u.role] || ROLE.student
            return (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto', alignItems: 'center', padding: '16px 28px', borderBottom: i < visible.length - 1 ? `1px solid ${M.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: M.maroonMid, border: `1px solid ${M.maroonBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: M.maroon, flexShrink: 0 }}>
                    {u.first_name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: M.text }}>{u.last_name}, {u.first_name}</span>
                </div>
                <span style={{ fontSize: '13px', color: M.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                <div style={{ padding: '0 16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: rb.bg, color: rb.color, border: `1px solid ${rb.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{u.role}</span>
                </div>
                <select value={u.role} onChange={e => handleRole(u.id, e.target.value)} disabled={updating === u.id}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.offWhite, fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", color: M.text }}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG TAB
// ─────────────────────────────────────────────────────────────────────────────
function AuditLogTab() {
  const { token } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuditLog(token).then(setLogs).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [token])

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '34px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>Audit Log</h1>
        <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>System-wide action history for compliance and security.</p>
      </div>
      {error && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight, color: M.red, border: `1px solid ${M.redBorder}`, marginBottom: '20px' }}>{error}</div>}
      {loading ? (
        <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden' }}>
          <div style={{ height: '40px', background: M.surface, borderBottom: `1px solid ${M.border}` }} />
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} style={{ height: '50px', borderBottom: i < 7 ? `1px solid ${M.border}` : 'none' }} className="animate-shimmer" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: M.white, borderRadius: '16px', border: `1px solid ${M.border}` }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛡️</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No audit entries yet</p>
          <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>Actions will be recorded here as the system is used.</p>
        </div>
      ) : (
        <div style={{ background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1.5fr 2fr 120px', padding: '14px 28px', background: M.surface, borderBottom: `1px solid ${M.border}` }}>
            {['Timestamp', 'User', 'Action', 'Table'].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {logs.map((log, i) => (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '180px 1.5fr 2fr 120px', alignItems: 'center', padding: '14px 28px', borderBottom: i < logs.length - 1 ? `1px solid ${M.border}` : 'none' }}>
              <span style={{ fontSize: '12px', color: M.textMuted }}>
                {new Date(log.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: M.text }}>{log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System'}</span>
              <span style={{ fontSize: '13px', color: M.textSub }}>{log.action}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', background: M.surface, color: M.textSub, border: `1px solid ${M.border}`, whiteSpace: 'nowrap' }}>{log.table_name || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('overview')
  const [profileOpen, setProfileOpen] = useState(false)

  const navItems = [
    { id: 'overview', icon: '📊', label: 'Dashboard' },
    { id: 'reports', icon: '📈', label: 'Reports' },
    { id: 'queue', icon: '🎫', label: 'Live Queue' },
    { id: 'appts', icon: '📅', label: 'Appointments' },
    { id: 'records', icon: '🗂️', label: 'Registrar Records' },
    { id: 'users', icon: '👥', label: 'User Management' },
    { id: 'config', icon: '⚙️', label: 'Office Config' },
    { id: 'audit', icon: '🛡️', label: 'Audit Log' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: M.offWhite, fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Left Sidebar ── */}
      <aside style={{
        width: '240px', flexShrink: 0,
        background: M.white, borderRight: `1px solid ${M.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        padding: '24px 14px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px', marginBottom: '32px' }}>
          <img src={crmcLogo} alt="CRMC" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '14px', fontWeight: 700, color: M.maroon, lineHeight: 1.2 }}>Cebu Roosevelt</div>
            <div style={{ fontSize: '10px', color: M.textMuted, letterSpacing: '0.04em' }}>Registrar Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {navItems.map(item => (
            <SideItem key={item.id} icon={item.icon} label={item.label}
              active={activeNav === item.id}
              onClick={() => setActiveNav(item.id)} />
          ))}
        </nav>

        {/* Support */}
        <div style={{ borderTop: `1px solid ${M.border}`, paddingTop: '14px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '10px 16px', borderRadius: '10px',
            border: 'none', cursor: 'pointer', background: 'transparent',
            color: M.textMuted, fontSize: '13.5px', fontFamily: "'IBM Plex Sans', sans-serif",
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = M.surface; e.currentTarget.style.color = M.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.textMuted; }}
          >
            <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>💬</span> Support
          </button>
        </div>
      </aside>

      {/* ── Right Side ── */}
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top Bar */}
        <header style={{
          background: M.white, borderBottom: `1px solid ${M.border}`,
          padding: '0 32px', height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          position: 'sticky', top: 0, zIndex: 40,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Bell */}
            <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${M.border}`, background: M.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🔔</button>

            {/* Avatar + dropdown */}
            <div style={{ position: 'relative' }}>
              {profileOpen && <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 105 }} />}
              <button onClick={() => setProfileOpen(!profileOpen)} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: M.maroon, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: M.white,
              }}>
                {user?.first_name?.[0]?.toUpperCase() || 'A'}
              </button>
              {profileOpen && (
                <div style={{ position: 'absolute', top: '44px', right: 0, width: '210px', background: M.white, borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.13)', padding: '14px', zIndex: 110 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: M.text, marginBottom: '2px' }}>{user?.first_name} {user?.last_name}</div>
                  <div style={{ fontSize: '11px', color: M.textMuted, marginBottom: '12px', wordBreak: 'break-all' }}>{user?.email}</div>
                  <div style={{ height: '1px', background: M.border, marginBottom: '10px' }} />
                  <button onClick={() => { logout(); navigate('/login') }} style={{
                    width: '100%', padding: '9px 12px', borderRadius: '9px', border: 'none',
                    background: M.redLight, color: M.red, fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>🚪 Log Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{ padding: '36px 40px', flex: 1 }}>
          {activeNav === 'overview' && <OverviewTab />}
          {activeNav === 'reports' && <AdminReportsPage />}
          {activeNav === 'config' && <AdminOfficeConfigPage />}
          {activeNav === 'users' && <AdminUserManagementPage />}
          {activeNav === 'audit' && <AdminAuditLogPage />}
          {activeNav === 'queue' && <AdminLiveQueuePage />}
          {activeNav === 'appts' && <AdminAppointmentsPage />}
          {activeNav === 'records' && <AdminRegistrarRecordsPage />}
        </main>
      </div>
    </div>
  )
}