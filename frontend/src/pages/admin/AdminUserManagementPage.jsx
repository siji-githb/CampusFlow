import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getAllUsers, updateUserRole, getDashboardStats, toggleUserStatus } from '../../services/adminService'
import { GraduationCap, Briefcase, Shield, AlertTriangle, Check, Search, X as XIcon, Users, Pencil, MoreVertical, Ban, CheckCircle } from 'lucide-react'

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CFG = {
  student: { label: 'Student', bg: 'bg-surface', color: 'text-text-main', dotBg: 'bg-[#1C1917]', border: 'border-border' },
  staff:   { label: 'Staff',   bg: 'bg-gold-light', color: 'text-gold', dotBg: 'bg-gold', border: 'border-gold-border' },
  admin:   { label: 'Admin',   bg: 'bg-maroon-light', color: 'text-maroon', dotBg: 'bg-maroon', border: 'border-maroon-border' },
}

// ── Priority class from user profile ──────────────────────────────────────────
const getPriorityClass = (user) => {
  const pc = user.priority_class || user.profile?.priority_class
  if (!pc) return user.role === 'student' ? 'Regular' : 'N/A'
  const MAP = {
    graduating: 'Graduating', pwd: 'PWD', regular: 'Regular',
    irregular: 'Irregular', transferee: 'Transferee', pregnant: 'Pregnant',
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
    <div className={`rounded-full border flex items-center justify-center shrink-0 font-bold tracking-[0.02em] ${cfg.bg} ${cfg.color} ${cfg.border}`} style={{
      width: size, height: size,
      fontSize: size * 0.37,
    }}>{initials}</div>
  )
}

// ── Role Badge ─────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = ROLE_CFG[role] || ROLE_CFG.student
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dotBg}`} />
      <span className="text-[13px] font-semibold text-text-main">{cfg.label}</span>
    </div>
  )
}

// ── Priority Badge ─────────────────────────────────────────────────────────────
const PriorityBadge = ({ label }) => {
  if (!label || label === 'N/A') return <span className="text-[12px] text-text-muted">N/A</span>
  const colorMap = { Graduating: 'text-maroon', PWD: 'text-gold', Regular: 'text-text-sub', Irregular: 'text-info', Transferee: 'text-success', Pregnant: 'text-pink-600' }
  const color = colorMap[label] || 'text-text-sub'
  return <span className={`text-[12px] font-semibold ${color}`}>{label}</span>
}

// ── Edit Role Modal ────────────────────────────────────────────────────────────
function EditRoleModal({ user, onSave, onClose, saving }) {
  const [role, setRole] = useState(user.role)
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-200" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-210 w-105 bg-white rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <Avatar name={`${user.first_name} ${user.last_name}`} role={user.role} size={44} />
          <div>
            <div className="font-serif text-[18px] font-bold text-text-main">{user.first_name} {user.last_name}</div>
            <div className="text-[12px] text-text-muted">{user.email}</div>
          </div>
        </div>

        <label className="text-[12px] font-bold text-text-muted uppercase tracking-[0.06em] block mb-2">Assign Role</label>
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {['student', 'staff', 'admin'].map(r => {
            const cfg = ROLE_CFG[r]
            const active = role === r
            return (
              <button key={r} onClick={() => setRole(r)} className={`p-[14px_10px] rounded-xl border-2 text-[13px] font-sans capitalize transition-all duration-150 cursor-pointer ${active ? `${cfg.bg} ${cfg.color} font-bold` : 'bg-off-white text-text-sub font-normal border-border'} ${active && r === 'student' ? 'border-info' : active && r === 'staff' ? 'border-gold' : active && r === 'admin' ? 'border-maroon' : ''}`}>
                <div className="mb-1 flex justify-center">
                  {r === 'student' ? <GraduationCap size={24} /> : r === 'staff' ? <Briefcase size={24} /> : <Shield size={24} />}
                </div>
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 px-3 rounded-[10px] border border-border bg-off-white text-text-main text-[14px] font-semibold cursor-pointer font-sans hover:bg-surface transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(user.id, role)} disabled={saving || role === user.role}
            className={`flex-2 py-2.5 px-3 rounded-[10px] border-none text-[14px] font-bold font-sans transition-colors ${saving || role === user.role ? 'bg-border text-text-muted cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}`}>
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
      <div className="mb-6">
        <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">USER MANAGEMENT</div>
        <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
          <Users className="text-maroon" size={24} /> User Management
        </h1>
        <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
          Manage system accounts, adjust roles, and export the user directory.
        </p>
      </div>

      {/* Alerts */}
      {error   && <div className="p-[12px_16px] rounded-[10px] bg-danger-light text-danger border border-danger-border mb-5 text-[13px] flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}
      {success && <div className="p-[12px_16px] rounded-[10px] bg-success-light text-success border border-success-border mb-5 text-[13px] flex items-center gap-2"><Check size={16} /> {success}</div>}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'All Users',        value: statsLoading ? '—' : counts.all.toLocaleString(),     icon: <Users size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon' },
          { label: 'Active Students',  value: statsLoading ? '—' : counts.student.toLocaleString(), icon: <GraduationCap size={18} />, bg: 'bg-surface', fg: 'text-text-sub' },
          { label: 'Registrar Staff',  value: statsLoading ? '—' : counts.staff.toLocaleString(),   icon: <Briefcase size={18} />, bg: 'bg-gold-light', fg: 'text-gold' },
          { label: 'Admin Accounts',   value: statsLoading ? '—' : counts.admin.toLocaleString(),   icon: <Shield size={18} />, bg: 'bg-maroon-light', fg: 'text-maroon' },
        ].map((c, i) => (
          <div key={i} className="animate-fade-up rounded-2xl p-[18px_20px] bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-text-muted mt-1">{c.label}</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div className="font-sans text-[36px] font-extrabold leading-none m-0 min-h-9 text-text-main">
              {statsLoading ? <div className="animate-pulse w-15 h-9 rounded-lg bg-border" /> : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls: Tabs + Search + Actions ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden" style={{ animationDelay: '0.5s' }}>

        {/* Tab bar + search row */}
        <div className="flex items-center justify-between px-5 border-b border-border flex-wrap gap-2">
          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1) }} className={`py-3.5 px-4 bg-transparent border-none border-b-2 text-[13px] cursor-pointer font-sans transition-colors duration-150 whitespace-nowrap flex items-center gap-1.5 ${activeTab === t.key ? 'border-maroon text-maroon font-bold' : 'border-transparent text-text-muted font-normal hover:text-maroon/80'}`}>
                {t.label}
                <span className={`text-[11px] font-bold py-px px-1.75 rounded-full ${activeTab === t.key ? 'bg-maroon-light text-maroon' : 'bg-surface text-text-muted'}`}>{counts[t.key]}</span>
              </button>
            ))}
          </div>

          {/* Search + Export */}
          <div className="flex items-center gap-2 py-2.5">
            <div className="relative">
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by name, ID, email…"
                className="py-2 pr-3.5 pl-8.5 rounded-[9px] border border-border bg-off-white text-[13px] text-text-main outline-none w-55 font-sans focus:border-maroon transition-colors"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted"><Search size={14} /></span>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted flex items-center p-0.5"><XIcon size={14} /></button>
              )}
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[120px_1.6fr_1.4fr_130px_100px] p-[14px_24px] bg-off-white border-b border-border">
          {['ID', 'NAME', 'EMAIL', 'ROLE', 'ACTIONS'].map(h => (
            <span key={h} className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          [1, 2, 3, 4, 5].map((n, idx) => (
            <div key={n} className={`grid grid-cols-[120px_1.6fr_1.4fr_130px_100px] p-[16px_24px] items-center ${idx === 4 ? 'border-none' : 'border-b border-border/60'} bg-white`}>
              <div className="animate-pulse h-4 w-17.5 rounded bg-border" />
              <div className="flex items-center gap-4">
                <div className="animate-pulse w-10 h-10 rounded-full bg-border" />
                <div className="animate-pulse h-5 w-[60%] rounded bg-border" />
              </div>
              <div className="animate-pulse h-4 w-[80%] rounded bg-border" />
              <div className="animate-pulse h-6 w-17.5 rounded-full bg-border" />
              <div className="animate-pulse h-8 w-15 rounded bg-border" />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div className="p-[60px_24px] text-center">
            <div className="flex justify-center mb-4 text-text-muted/50"><Users size={52} strokeWidth={1.5} /></div>
            <p className="font-serif text-[18px] font-bold text-text-main m-0 mb-1">No users found</p>
            <p className="text-[13px] text-text-muted m-0 max-w-62.5 mx-auto">
              {search ? 'Try adjusting your search query or filters to find what you are looking for.' : 'No accounts have been registered in the system yet.'}
            </p>
          </div>
        ) : (
          paginated.map((user, idx) => {
            const name     = `${user.first_name} ${user.last_name}`
            const uid      = user.student_id || user.staff_id || `UID-${user.id?.slice(0, 8)}`
            const isLast   = idx === paginated.length - 1

            return (
              <div key={user.id} className={`grid grid-cols-[120px_1.6fr_1.4fr_130px_100px] p-[16px_24px] items-center transition-all duration-200 hover:bg-surface group ${isLast ? 'border-none' : 'border-b border-border'} bg-white ${user.is_active === false ? 'opacity-60 grayscale-[0.2]' : 'opacity-100'}`}>
                {/* ID */}
                <div className="text-[12.5px] text-text-muted font-mono font-medium">{uid}</div>

                {/* Name */}
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="shadow-sm rounded-full bg-white"><Avatar name={name} role={user.role} size={38} /></div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="text-[14px] font-bold text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-maroon transition-colors">{name}</div>
                    {user.is_active === false && <span className="text-[10px] font-bold text-danger bg-danger-light py-0.5 px-1.5 rounded-sm w-fit border border-danger-border leading-none">SUSPENDED</span>}
                  </div>
                </div>

                {/* Email */}
                <div className="text-[13px] font-medium text-text-sub whitespace-nowrap overflow-hidden text-ellipsis pr-4">{user.email}</div>

                {/* Role */}
                <div className="flex items-center">
                  <div className="bg-surface py-1 px-2.5 rounded-md border border-border/50">
                    <RoleBadge role={user.role} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={() => setEditUser(user)}
                    title="Update role"
                    className="w-8 h-8 rounded-lg border border-border bg-white text-text-sub cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-maroon hover:border-maroon hover:text-white shadow-sm"
                  ><Pencil size={14} /></button>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                    title="More options"
                    className={`w-8 h-8 rounded-lg border cursor-pointer flex items-center justify-center transition-all duration-200 ${dropdownOpen === user.id ? 'border-border bg-off-white text-text-main shadow-sm' : 'border-transparent bg-transparent text-text-sub hover:bg-off-white hover:border-border hover:shadow-sm'}`}
                  ><MoreVertical size={16} /></button>
                  
                  {dropdownOpen === user.id && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1.5 z-10 min-w-35 animate-fade-up" style={{ animationDuration: '0.15s' }}>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active !== false)}
                        className={`w-full py-2 px-3 border-none bg-transparent text-left text-[13px] cursor-pointer rounded-lg flex items-center gap-2.5 transition-colors duration-150 font-sans font-semibold ${user.is_active !== false ? 'text-danger hover:bg-danger-light' : 'text-success hover:bg-success-light'}`}
                      >
                        <span className="flex items-center shrink-0">{user.is_active !== false ? <Ban size={15} /> : <CheckCircle size={15} />}</span> 
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
          <div className="p-[13px_24px] border-t border-border flex items-center justify-between bg-surface">
            <span className="text-[12px] text-text-muted">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1 items-center">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className={`py-1 px-3 rounded-md border border-border bg-white text-[12px] font-semibold font-sans ${page === 1 ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-off-white'}`}>
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)} className={`w-7.5 h-7.5 rounded-md text-[12px] font-semibold cursor-pointer font-sans border ${page === p ? 'border-maroon bg-maroon text-white' : 'border-border bg-white text-text-main hover:bg-off-white'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className={`py-1 px-3 rounded-md border border-border bg-white text-[12px] font-semibold font-sans ${page === totalPages ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-off-white'}`}>
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
