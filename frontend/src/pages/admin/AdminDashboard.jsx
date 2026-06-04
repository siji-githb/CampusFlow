import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { getDashboardStats, getReports, getOfficeConfig, updateOfficeConfig, getAllUsers, updateUserRole, getAuditLog, getAiInsights } from '../../services/adminService'  // ← M12

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray400: '#9C9690', gray500: '#706B65', text: '#1C1917' }
const TABS = ['Overview', 'Reports', 'Office Config', 'Users', 'Audit Log']

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar user={user} subtitle="Admin Panel" onLogout={() => { logout(); navigate('/login') }} />

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: `1px solid ${M.gray200}`, padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '4px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? M.maroon : M.gray500, borderBottom: `2px solid ${activeTab === tab ? M.maroon : 'transparent'}`, marginBottom: '-1px', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'color .15s' }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {activeTab === 'Overview'     && <OverviewTab />}
        {activeTab === 'Reports'      && <ReportsTab />}
        {activeTab === 'Office Config'&& <OfficeConfigTab />}
        {activeTab === 'Users'        && <UsersTab />}
        {activeTab === 'Audit Log'    && <AuditLogTab />}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardStats(token).then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading stats...</div>
  if (error)   return <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px' }}>{error}</div>
  if (!stats)  return null

  const CARDS = [
    { value: stats.today.total,     label: 'Total today',          icon: '📅', color: '#1D4ED8', bg: '#EFF6FF'   },
    { value: stats.today.completed, label: 'Completed today',      icon: '✅', color: '#15803D', bg: '#F0FDF4'   },
    { value: stats.active_queue,    label: 'Active in queue',      icon: '🎫', color: M.gold,    bg: M.goldLight },
    { value: stats.today.cancelled, label: 'Cancelled today',      icon: '❌', color: M.maroon,  bg: M.maroonLight },
    { value: stats.week_total,      label: 'This week',            icon: '📊', color: '#6D28D9', bg: '#F5F3FF'   },
    { value: stats.total_students,  label: 'Registered students',  icon: '👥', color: M.gray500, bg: M.offWhite  },
  ]

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 1.5rem' }}>Dashboard Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
        {CARDS.map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', fontSize: '1.1rem' }}>{c.icon}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: M.text, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: M.gray500, marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.5rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: M.text, margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Breakdown</h3>
        {[
          { label: 'Confirmed', value: stats.today.confirmed, color: '#15803D' },
          { label: 'Completed', value: stats.today.completed, color: '#1D4ED8' },
          { label: 'Cancelled', value: stats.today.cancelled, color: M.maroon  },
          { label: 'No Show',   value: stats.today.no_show,   color: M.gray500 },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: M.gray500, width: '80px' }}>{item.label}</span>
            <div style={{ flex: 1, background: M.gray200, borderRadius: '100px', height: '8px' }}>
              <div style={{ height: '8px', borderRadius: '100px', background: item.color, width: stats.today.total > 0 ? `${(item.value / stats.today.total) * 100}%` : '0%', transition: 'width .5s' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: M.text, width: '24px', textAlign: 'right' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab() {
  const { token } = useAuth()
  const [report, setReport]   = useState(null)
  const [days, setDays]       = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // ── M12: AI Insights state ────────────────────────────────────────────────
  const [insights, setInsights]           = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError]   = useState('')

  useEffect(() => {
    setLoading(true)
    getReports(token, days).then(setReport).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [days, token])

  // ── M12: Load insights on first render ───────────────────────────────────
  useEffect(() => { loadInsights() }, [])

  const loadInsights = async () => {
    setInsightLoading(true)
    setInsightError('')
    try {
      const data = await getAiInsights(token)
      setInsights(data)
    } catch (e) {
      setInsightError(e.message)
    } finally {
      setInsightLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: 0 }}>Transaction Reports</h2>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${M.gray200}`, fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: M.text }}
          onFocus={e => e.target.style.borderColor = M.maroon}
          onBlur={e  => e.target.style.borderColor = M.gray200}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* ── M12: AI Daily Insight card ── */}
      <div style={{ background: 'white', borderRadius: '14px', border: `1px solid rgba(123,26,42,0.2)`, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(123,26,42,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: M.maroon, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
              🤖 AI Daily Insight
            </div>
            <div style={{ fontSize: '11px', color: M.gray400 }}>
              {insights?.date || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <button
            onClick={loadInsights}
            disabled={insightLoading}
            style={{ padding: '6px 16px', borderRadius: '7px', border: 'none', background: insightLoading ? '#B8667A' : M.maroon, color: 'white', fontSize: '12px', fontWeight: 600, cursor: insightLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
          >
            {insightLoading ? 'Generating...' : '↻ Refresh'}
          </button>
        </div>

        {insightError && (
          <p style={{ fontSize: '12px', color: M.maroon, margin: '0 0 10px' }}>{insightError}</p>
        )}

        {insightLoading ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
            {[0,1,2].map(j => (
              <div key={j} style={{ width: '6px', height: '6px', borderRadius: '50%', background: M.maroon, opacity: 0.4, animation: 'pulse 1.2s infinite', animationDelay: `${j*0.2}s` }} />
            ))}
            <span style={{ fontSize: '12px', color: M.gray500, marginLeft: '6px' }}>Generating insight...</span>
          </div>
        ) : insights ? (
          <>
            <p style={{ fontSize: '14px', color: M.text, lineHeight: 1.7, margin: '0 0 14px' }}>
              {insights.insight}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'Total',       value: insights.total,           color: M.text    },
                { label: 'Completed',   value: insights.completed,       color: '#15803D' },
                { label: 'No-shows',    value: insights.no_shows,        color: M.maroon  },
                { label: 'Pending',     value: insights.pending,         color: M.gold    },
                { label: 'Completion',  value: `${insights.completion_rate}%`, color: '#1D4ED8' },
              ].map((s, i) => (
                <div key={i} style={{ background: M.offWhite, borderRadius: '8px', padding: '8px 14px', border: `1px solid ${M.gray200}`, textAlign: 'center', minWidth: '72px' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: M.gray500, marginTop: '3px', letterSpacing: '0.03em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: '13px', color: M.gray400, margin: 0 }}>
            Click Refresh to generate today's AI-powered summary.
          </p>
        )}
      </div>

      {/* Existing report content */}
      {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading report...</div>
      ) : report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Total',           value: report.total_appointments, color: M.text    },
              { label: 'Completed',       value: report.completed,          color: '#15803D' },
              { label: 'Completion Rate', value: `${report.completion_rate}%`, color: '#1D4ED8' },
              { label: 'No-show Rate',    value: `${report.no_show_rate}%`, color: M.maroon  },
            ].map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', border: `1px solid ${M.gray200}`, padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '12px', color: M.gray500, marginTop: '4px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: M.text, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Transaction Type</h3>
            {report.by_type.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: M.text, flex: 1 }}>{item.name}</span>
                <div style={{ width: '140px', background: M.gray200, borderRadius: '100px', height: '6px' }}>
                  <div style={{ height: '6px', borderRadius: '100px', background: M.maroon, width: report.total_appointments > 0 ? `${(item.count / report.total_appointments) * 100}%` : '0%' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: M.text, width: '24px', textAlign: 'right' }}>{item.count}</span>
              </div>
            ))}
          </div>

          {report.by_date.length > 0 && (
            <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: M.text, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Volume</h3>
              {report.by_date.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: M.gray500, width: '90px' }}>{item.date}</span>
                  <div style={{ flex: 1, background: M.gray200, borderRadius: '100px', height: '6px' }}>
                    <div style={{ height: '6px', borderRadius: '100px', background: '#1D4ED8', width: `${(item.count / Math.max(...report.by_date.map(d => d.count))) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: M.text, width: '24px', textAlign: 'right' }}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function OfficeConfigTab() {
  const { token } = useAuth()
  const [config, setConfig]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [edited, setEdited]   = useState({})
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  useEffect(() => {
    getOfficeConfig(token)
      .then(data => { setConfig(data); const init = {}; data.forEach(c => { init[c.key] = c.value }); setEdited(init) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSave = async (key) => {
    setSaving(key); setError(''); setSuccess('')
    try { await updateOfficeConfig(token, key, edited[key]); setSuccess(`"${key}" updated`) }
    catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  const LABELS = { daily_cap_tor: 'Daily Cap — TOR', daily_cap_coe: 'Daily Cap — COE', daily_cap_diploma: 'Daily Cap — Diploma', office_open_time: 'Office Open Time', office_close_time: 'Office Close Time', slot_duration_minutes: 'Slot Duration (minutes)', booking_cutoff_days: 'Booking Cutoff (days)' }

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 1.5rem' }}>Office Configuration</h2>
      {error   && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon,  fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#F0FDF4',    color: '#15803D', fontSize: '13px', marginBottom: '1rem', border: '1px solid #BBF7D0' }}>{success}</div>}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading config...</div> : (
        <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, overflow: 'hidden' }}>
          {config.map((item, i) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: i < config.length - 1 ? `1px solid ${M.gray200}` : 'none', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: M.text, margin: '0 0 2px' }}>{LABELS[item.key] || item.key}</p>
                <p style={{ fontSize: '11px', color: M.gray400, margin: 0 }}>{item.key}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={edited[item.key] ?? item.value} onChange={e => setEdited({ ...edited, [item.key]: e.target.value })}
                  style={{ width: '100px', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${M.gray200}`, fontSize: '13px', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: M.text, textAlign: 'center' }}
                  onFocus={e => e.target.style.borderColor = M.maroon}
                  onBlur={e  => e.target.style.borderColor = M.gray200} />
                <button onClick={() => handleSave(item.key)} disabled={saving === item.key}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: saving === item.key ? '#B8667A' : M.maroon, color: 'white', fontSize: '12px', fontWeight: 600, cursor: saving === item.key ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {saving === item.key ? '...' : 'Save'}
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
function UsersTab() {
  const { token } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [error, setError]     = useState('')

  const fetchUsers = async () => {
    try { setUsers(await getAllUsers(token)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchUsers() }, [])

  const handleRole = async (id, role) => {
    setUpdating(id)
    try { await updateUserRole(token, id, role); await fetchUsers() }
    catch (e) { setError(e.message) }
    finally { setUpdating(null) }
  }

  const ROLE_BADGE = {
    student: { bg: '#EFF6FF',    color: '#1D4ED8', border: '#BFDBFE'        },
    staff:   { bg: M.goldLight,  color: M.gold,    border: `${M.gold}40`    },
    admin:   { bg: M.maroonLight,color: M.maroon,  border: `${M.maroon}30`  },
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 1.5rem' }}>User Management</h2>
      {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading users...</div> : (
        <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', padding: '10px 16px', background: M.offWhite, borderBottom: `1px solid ${M.gray200}` }}>
            {['Name', 'Email', 'Role', 'Change Role'].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: M.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>{h}</span>
            ))}
          </div>
          {users.map((u, i) => {
            const rb = ROLE_BADGE[u.role] || ROLE_BADGE.student
            return (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', alignItems: 'center', padding: '12px 16px', borderBottom: i < users.length - 1 ? `1px solid ${M.gray200}` : 'none' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: M.text, padding: '0 8px' }}>{u.last_name}, {u.first_name}</span>
                <span style={{ fontSize: '13px', color: M.gray500, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: rb.bg, color: rb.color, border: `1px solid ${rb.border}`, textTransform: 'capitalize', margin: '0 8px', whiteSpace: 'nowrap' }}>{u.role}</span>
                <select value={u.role} onChange={e => handleRole(u.id, e.target.value)} disabled={updating === u.id}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${M.gray200}`, fontSize: '12px', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: M.text, margin: '0 8px' }}>
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
function AuditLogTab() {
  const { token } = useAuth()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    getAuditLog(token).then(setLogs).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [token])

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: M.maroon, margin: '0 0 1.5rem' }}>Audit Log</h2>
      {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: M.gray500 }}>Loading audit log...</div> : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}` }}>
          <p style={{ fontSize: '14px', color: M.gray500, margin: 0 }}>No audit entries yet. Actions will be recorded here as the system is used.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr auto', padding: '10px 16px', background: M.offWhite, borderBottom: `1px solid ${M.gray200}` }}>
            {['Time', 'User', 'Action', 'Table'].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: M.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>{h}</span>
            ))}
          </div>
          {logs.map((log, i) => (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr auto', alignItems: 'center', padding: '11px 16px', borderBottom: i < logs.length - 1 ? `1px solid ${M.gray200}` : 'none' }}>
              <span style={{ fontSize: '12px', color: M.gray400, padding: '0 8px' }}>{new Date(log.created_at).toLocaleString()}</span>
              <span style={{ fontSize: '13px', color: M.text,    padding: '0 8px' }}>{log.users ? `${log.users.first_name} ${log.users.last_name}` : '—'}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: M.text, padding: '0 8px' }}>{log.action}</span>
              <span style={{ fontSize: '12px', color: M.gray400, padding: '0 8px' }}>{log.table_name || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}