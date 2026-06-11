import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getAllUsers, updateUserRole, getDashboardStats, toggleUserStatus } from '../../services/adminService'
import { GraduationCap, Briefcase, Shield, AlertTriangle, Check, Search, X as XIcon, Users, Pencil, MoreVertical, Ban, CheckCircle } from 'lucide-react'

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
}

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CFG = {
  student: { label: 'Student', bg: M.blueLight,   color: M.blue,   border: M.blueBorder   },
  staff:   { label: 'Staff',   bg: M.goldLight,   color: M.gold,   border: M.goldBorder   },
  admin:   { label: 'Admin',   bg: M.maroonLight, color: M.maroon, border: M.maroonBorder },
}

// ── Priority class from user profile ──────────────────────────────────────────
const getPriorityClass = (user) => {
  const pc = user.priority_class || user.profile?.priority_class
  if (!pc) return user.role === 'student' ? 'Regular' : 'N/A'
  const MAP = {
    graduating: 'Graduating', pwd: 'PWD', regular: 'Regular',
    irregular: 'Irregular', transferee: 'Transferee',
  }
  return MAP[pc.toLowerCase()] || pc
}

// ── Avatar Initials ────────────────────────────────────────────────────────────
const Avatar = ({ name, role, size = 38 }) => {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
    : '?'
  const cfg = ROLE_CFG[role] || ROLE_CFG.student
  
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: size * 0.37, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, letterSpacing: '0.02em',
    }}>{initials}</div>
  )
}

// ── Role Badge ─────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = ROLE_CFG[role] || ROLE_CFG.student
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
      <span style={{ fontSize: '13px', fontWeight: 600, color: M.text }}>{cfg.label}</span>
    </div>
  )
}

// ── Priority Badge ─────────────────────────────────────────────────────────────
const PriorityBadge = ({ label }) => {
  if (!label || label === 'N/A') return <span style={{ fontSize: '12px', color: M.textMuted }}>N/A</span>
  const COLOR = { Graduating: M.maroon, PWD: M.gold, Regular: M.textSub, Irregular: M.blue, Transferee: M.green }
  const color = COLOR[label] || M.textSub
  return <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
}

// ── Edit Role Modal ────────────────────────────────────────────────────────────
function EditRoleModal({ user, onSave, onClose, saving }) {
  const [role, setRole] = useState(user.role)
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 210, width: '420px', background: M.white, borderRadius: '20px',
        padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <Avatar name={`${user.first_name} ${user.last_name}`} role={user.role} size={44} />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: M.text }}>{user.first_name} {user.last_name}</div>
            <div style={{ fontSize: '12px', color: M.textMuted }}>{user.email}</div>
          </div>
        </div>

        <label style={{ fontSize: '12px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Assign Role</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {['student', 'staff', 'admin'].map(r => {
            const cfg = ROLE_CFG[r]
            const active = role === r
            return (
              <button key={r} onClick={() => setRole(r)} style={{
                padding: '14px 10px', borderRadius: '12px', border: `2px solid ${active ? cfg.color : M.border}`,
                background: active ? cfg.bg : M.offWhite,
                color: active ? cfg.color : M.textSub,
                fontSize: '13px', fontWeight: active ? 700 : 400, cursor: 'pointer',
                textTransform: 'capitalize', fontFamily: "'IBM Plex Sans', sans-serif",
                transition: 'all 0.15s',
              }}>
                <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
                  {r === 'student' ? <GraduationCap size={24} /> : r === 'staff' ? <Briefcase size={24} /> : <Shield size={24} />}
                </div>
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: `1px solid ${M.border}`, background: M.offWhite, color: M.text, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Cancel
          </button>
          <button onClick={() => onSave(user.id, role)} disabled={saving || role === user.role}
            style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: (saving || role === user.role) ? M.border : M.maroon, color: (saving || role === user.role) ? M.textMuted : M.white, fontSize: '14px', fontWeight: 700, cursor: (saving || role === user.role) ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Export CSV ─────────────────────────────────────────────────────────────────
function exportCSV(users, filename = 'users_export.csv') {
  if (!users.length) return
  const rows = users.map(u => ({
    'Name': `${u.first_name} ${u.last_name}`,
    'Email': u.email,
    'Student/Staff ID': u.student_id || u.staff_id || '—',
    'Role': u.role,
    'Priority Class': getPriorityClass(u),
  }))
  const keys = Object.keys(rows[0])
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k]}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AdminUserManagementPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminUserManagementPage() {
  const { token }  = useAuth()
  const [users, setUsers]         = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [search, setSearch]       = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [editUser, setEditUser]   = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [page, setPage]           = useState(1)
  const PER_PAGE = 8

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try { setUsers(await getAllUsers(token)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    fetchUsers()
    getDashboardStats(token).then(setStats).catch(() => {}).finally(() => setStatsLoading(false))
  }, [fetchUsers, token])

  const handleSaveRole = async (userId, role) => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await updateUserRole(token, userId, role)
      await fetchUsers()
      setSuccess('Role updated successfully.')
      setEditUser(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    setError(''); setSuccess('')
    try {
      const newStatus = !currentStatus
      await toggleUserStatus(token, userId, newStatus)
      await fetchUsers()
      setSuccess(`User successfully ${newStatus ? 'reactivated' : 'suspended'}.`)
      setDropdownOpen(null)
    } catch (e) { setError(e.message) }
  }

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = {
    all:     users.length,
    student: users.filter(u => u.role === 'student').length,
    staff:   users.filter(u => u.role === 'staff').length,
    admin:   users.filter(u => u.role === 'admin').length,
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (activeTab !== 'all' && u.role !== activeTab) return false
    if (!search) return true
    const q = search.toLowerCase()
    const name = `${u.first_name} ${u.last_name}`.toLowerCase()
    return name.includes(q) || u.email.toLowerCase().includes(q) || (u.student_id || '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const TABS = [
    { key: 'all',     label: 'All Users' },
    { key: 'student', label: 'Students'  },
    { key: 'staff',   label: 'Staff'     },
    { key: 'admin',   label: 'Admins'    },
  ]

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: '26px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 700, color: M.maroon, margin: '0 0 6px' }}>User Management</h1>
        <p style={{ fontSize: '14px', color: M.textMuted, margin: 0 }}>Manage all student, staff, and administration accounts.</p>
      </div>

      {/* Alerts */}
      {error   && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.redLight,   color: M.red,   border: `1px solid ${M.redBorder}`,   marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} /> {error}</div>}
      {success && <div style={{ padding: '12px 16px', borderRadius: '10px', background: M.greenLight, color: M.green, border: `1px solid ${M.greenBorder}`, marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} /> {success}</div>}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'All Users',        value: statsLoading ? '—' : counts.all.toLocaleString(),     dark: false, color: M.maroon },
          { label: 'Active Students',  value: statsLoading ? '—' : counts.student.toLocaleString(), dark: false, color: M.blue   },
          { label: 'Registrar Staff',  value: statsLoading ? '—' : counts.staff.toLocaleString(),   dark: false, color: M.gold   },
          { label: 'Admin Accounts',   value: statsLoading ? '—' : counts.admin.toLocaleString(),   dark: true,  color: M.white  },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up" style={{
            animationDelay: `${0.1 * (i + 1)}s`,
            borderRadius: '16px', padding: '22px 20px',
            background: c.dark ? M.maroon : M.white,
            border: c.dark ? 'none' : `1px solid ${M.border}`,
            boxShadow: c.dark ? '0 4px 16px rgba(123,26,42,0.22)' : '0 1px 4px rgba(0,0,0,0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
            {c.dark && <div style={{ position: 'absolute', right: -16, top: -16, width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: c.dark ? 'rgba(255,255,255,0.6)' : M.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', fontWeight: 800, color: c.dark ? M.white : c.color, lineHeight: 1, margin: 0, minHeight: '36px' }}>
              {statsLoading ? <div className="animate-shimmer" style={{ width: '60px', height: '36px', background: c.dark ? 'rgba(255,255,255,0.2)' : M.border, borderRadius: '8px' }} /> : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls: Tabs + Search + Actions ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.5s', background: M.white, borderRadius: '16px', border: `1px solid ${M.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

        {/* Tab bar + search row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${M.border}`, flexWrap: 'wrap', gap: '8px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1) }} style={{
                padding: '14px 16px', background: 'none', border: 'none',
                borderBottom: activeTab === t.key ? `2px solid ${M.maroon}` : '2px solid transparent',
                color: activeTab === t.key ? M.maroon : M.textMuted,
                fontSize: '13px', fontWeight: activeTab === t.key ? 700 : 400,
                cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {t.label}
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '100px',
                  background: activeTab === t.key ? M.maroonLight : M.surface,
                  color: activeTab === t.key ? M.maroon : M.textMuted,
                }}>{counts[t.key]}</span>
              </button>
            ))}
          </div>

          {/* Search + Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by name, ID, email…"
                style={{ padding: '8px 14px 8px 34px', borderRadius: '9px', border: `1px solid ${M.border}`, background: M.offWhite, fontSize: '13px', color: M.text, outline: 'none', width: '220px', fontFamily: "'IBM Plex Sans', sans-serif" }}
                onFocus={e => e.target.style.borderColor = M.maroon}
                onBlur={e => e.target.style.borderColor = M.border}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: M.textMuted }}><Search size={14} /></span>
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: M.textMuted, display: 'flex', alignItems: 'center', padding: '0 2px' }}><XIcon size={14} /></button>
              )}
            </div>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1.6fr 1.4fr 120px 100px', padding: '11px 24px', background: M.surface, borderBottom: `1px solid ${M.border}` }}>
          {['ID', 'NAME', 'EMAIL', 'ROLE', 'ACTIONS'].map(h => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: M.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          [1, 2, 3, 4, 5].map((n, idx) => (
            <div key={n} style={{
              display: 'grid', gridTemplateColumns: '110px 1.6fr 1.4fr 120px 100px',
              padding: '14px 24px', alignItems: 'center',
              borderBottom: idx === 4 ? 'none' : `1px solid ${M.border}`,
              background: idx % 2 === 0 ? M.white : '#FDFCFB',
            }}>
              <div className="animate-shimmer" style={{ height: '16px', width: '70px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="animate-shimmer" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                <div className="animate-shimmer" style={{ height: '20px', width: '60%', borderRadius: '4px' }} />
              </div>
              <div className="animate-shimmer" style={{ height: '16px', width: '80%', borderRadius: '4px' }} />
              <div className="animate-shimmer" style={{ height: '24px', width: '60px', borderRadius: '100px' }} />
              <div className="animate-shimmer" style={{ height: '24px', width: '30px', borderRadius: '4px' }} />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: M.textMuted }}><Users size={48} /></div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>No users found</p>
            <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>
              {search ? 'Try adjusting your search query.' : 'No accounts registered yet.'}
            </p>
          </div>
        ) : (
          paginated.map((user, idx) => {
            const name     = `${user.first_name} ${user.last_name}`
            const uid      = user.student_id || user.staff_id || `UID-${user.id?.slice(0, 8)}`
            const priority = getPriorityClass(user)
            const isLast   = idx === paginated.length - 1

            return (
              <div key={user.id} style={{
                display: 'grid', gridTemplateColumns: '110px 1.6fr 1.4fr 120px 100px',
                padding: '16px 24px', alignItems: 'center',
                borderBottom: isLast ? 'none' : `1px solid ${M.border}`,
                background: idx % 2 === 0 ? M.white : '#FDFCFB',
                transition: 'background 0.1s',
                opacity: user.is_active === false ? 0.6 : 1,
              }}
                onMouseEnter={e => e.currentTarget.style.background = M.offWhite}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? M.white : '#FDFCFB'}
              >
                {/* ID */}
                <div style={{ fontSize: '12px', color: M.textMuted, fontFamily: 'monospace' }}>{uid}</div>

                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <Avatar name={name} role={user.role} size={34} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                </div>

                {/* Email */}
                <div style={{ fontSize: '13px', color: M.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>

                {/* Role */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <RoleBadge role={user.role} />
                  {user.is_active === false && <span style={{ fontSize: '10px', fontWeight: 700, color: M.red, background: M.redLight, padding: '2px 6px', borderRadius: '4px', width: 'fit-content', border: `1px solid ${M.redBorder}` }}>SUSPENDED</span>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                  <button
                    onClick={() => setEditUser(user)}
                    title="Update role"
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      border: `1px solid ${M.border}`, background: M.offWhite, color: M.textSub,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = M.maroonLight; e.currentTarget.style.borderColor = M.maroonBorder; e.currentTarget.style.color = M.maroon }}
                    onMouseLeave={e => { e.currentTarget.style.background = M.offWhite; e.currentTarget.style.borderColor = M.border; e.currentTarget.style.color = M.textSub }}
                  ><Pencil size={14} /></button>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                    title="More options"
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      border: `1px solid ${dropdownOpen === user.id ? M.border : 'transparent'}`,
                      background: dropdownOpen === user.id ? M.surface : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s', color: M.textSub,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = M.surface }}
                    onMouseLeave={e => { if(dropdownOpen !== user.id) e.currentTarget.style.background = 'transparent' }}
                  ><MoreVertical size={16} /></button>
                  
                  {dropdownOpen === user.id && (
                    <div style={{
                      position: 'absolute', top: '100%', right: '0', marginTop: '4px',
                      background: M.white, border: `1px solid ${M.border}`, borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '6px', zIndex: 10,
                      minWidth: '130px'
                    }}>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active !== false)}
                        style={{
                          width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
                          textAlign: 'left', fontSize: '13px', color: user.is_active !== false ? M.red : M.green, cursor: 'pointer',
                          borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.1s',
                          fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = user.is_active !== false ? M.redLight : M.greenLight}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ display: 'flex', alignItems: 'center' }}>{user.is_active !== false ? <Ban size={14} /> : <CheckCircle size={14} />}</span> 
                        {user.is_active !== false ? 'Suspend User' : 'Reactivate User'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '13px 24px', borderTop: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: M.surface }}>
            <span style={{ fontSize: '12px', color: M.textMuted }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${M.border}`, background: M.white, fontSize: '12px', fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i
                if (p < 1 || p > totalPages) return null
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
                style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${M.border}`, background: M.white, fontSize: '12px', fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? M.textMuted : M.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Role Modal ── */}
      {editUser && (
        <EditRoleModal
          user={editUser}
          onSave={handleSaveRole}
          onClose={() => setEditUser(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
