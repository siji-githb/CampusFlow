import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import { getAllUsers, updateUserRole, getDashboardStats, toggleUserStatus } from '../../services/adminService'
import { GraduationCap, Briefcase, Shield, AlertTriangle, Check, Search, X, Users, Pencil, MoreVertical, Ban, CheckCircle, CheckCircle2, Download } from 'lucide-react'

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
    alumni: 'Alumni', pwd: 'PWD', regular: 'Regular', pregnant: 'Pregnant',
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
      <span className="text-fluid-13 font-semibold text-text-main">{cfg.label}</span>
    </div>
  )
}

// ── Priority Badge ─────────────────────────────────────────────────────────────
const PriorityBadge = ({ label }) => {
  if (!label || label === 'N/A') return <span className="text-fluid-12 text-text-muted">N/A</span>
  const colorMap = { Alumni: 'text-maroon', PWD: 'text-gold', Regular: 'text-text-sub', Pregnant: 'text-pink-600' }
  const color = colorMap[label] || 'text-text-sub'
  return <span className={`text-fluid-12 font-semibold ${color}`}>{label}</span>
}

// ── Edit Role Modal ────────────────────────────────────────────────────────────
function EditRoleModal({ user, onSave, onClose, saving }) {
  const [role, setRole] = useState(user.role)
  return createPortal((
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
      <div 
        className="animate-fade-up relative my-auto w-full max-w-105 bg-white text-text-main rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 font-sans overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top decorative accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-maroon via-maroon-dark to-gold" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3.5 mb-6 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar name={`${user.first_name} ${user.last_name}`} role={user.role} size={46} />
            <div className="min-w-0">
              <div className="font-serif text-fluid-18 font-bold text-text-main leading-snug truncate">{user.first_name} {user.last_name}</div>
              <div className="text-fluid-12 text-text-muted truncate">{user.email}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider block mb-2.5">Assign Role</label>
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {['student', 'staff', 'admin'].map(r => {
            const cfg = ROLE_CFG[r]
            const active = role === r
            return (
              <button 
                key={r} 
                type="button"
                onClick={() => setRole(r)} 
                className={`p-[14px_10px] rounded-2xl border-2 text-fluid-13 font-sans capitalize transition-all duration-150 cursor-pointer flex flex-col items-center justify-center ${active ? `${cfg.bg} ${cfg.color} font-bold shadow-xs` : 'bg-off-white text-text-sub font-medium border-border hover:bg-surface'} ${active && r === 'student' ? 'border-maroon/40' : active && r === 'staff' ? 'border-gold' : active && r === 'admin' ? 'border-maroon' : ''}`}
              >
                <div className="mb-1.5 flex justify-center">
                  {r === 'student' ? <GraduationCap size={24} /> : r === 'staff' ? <Briefcase size={24} /> : <Shield size={24} />}
                </div>
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2.5 pt-3 border-t border-border">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-fluid-13 font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onSave(user.id, role)} 
            disabled={saving || role === user.role}
            className={`flex-2 py-2.5 px-4 rounded-xl border-none text-fluid-13 font-bold font-sans transition-all shadow-[0_4px_14px_rgba(123,26,42,0.18)] active:scale-[0.98] ${saving || role === user.role ? 'bg-border text-text-muted cursor-not-allowed shadow-none' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:shadow-[0_6px_18px_rgba(123,26,42,0.25)]'}`}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  ), document.body)
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
  const [loading, setLoading]     = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [saving, setSaving]       = useState(false)
  const toast = useToast()
  const [search, setSearch]       = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const showToast = useCallback((msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
  }, [toast])
  const [editUser, setEditUser]   = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [page, setPage]           = useState(1)
  const PER_PAGE = 8

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try { setUsers(await getAllUsers(token)) }
    catch (e) { showToast(e.message || 'Failed to fetch users', 'error') }
    finally { setLoading(false) }
  }, [token, showToast])

  useEffect(() => {
    fetchUsers()
    getDashboardStats(token).catch(() => {}).finally(() => setStatsLoading(false))
  }, [fetchUsers, token])

  const handleSaveRole = async (userId, role) => {
    setSaving(true)
    try {
      await updateUserRole(token, userId, role)
      await fetchUsers()
      showToast('Role updated successfully.')
      setEditUser(null)
    } catch (e) {
      showToast(e.message || 'Failed to update role.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus
      await toggleUserStatus(token, userId, newStatus)
      await fetchUsers()
      showToast(`User successfully ${newStatus ? 'reactivated' : 'suspended'}.`)
      setDropdownOpen(null)
    } catch (e) {
      showToast(e.message || 'Failed to change status.', 'error')
    }
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
    <div className="animate-fade-up font-sans w-full pb-10">
      {/* ── Header ── */}
      <div className="mb-6">
        <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">User Management</p>
        <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
          <Users size={26} className="text-maroon shrink-0" /> User Management
        </h1>
        <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
          Manage user accounts, adjust system permissions, and audit role access.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
        {[
          { label: 'All Users',        value: statsLoading ? '—' : counts.all.toLocaleString(),     icon: <Users size={18} strokeWidth={2.2} />, bg: 'bg-maroon-light', fg: 'text-maroon', border: 'border-maroon-border/60', sub: 'Total registered accounts', subColor: 'text-maroon' },
          { label: 'Active Students',  value: statsLoading ? '—' : counts.student.toLocaleString(), icon: <GraduationCap size={18} strokeWidth={2.2} />, bg: 'bg-blue-light', fg: 'text-blue', border: 'border-blue-border/60', sub: 'Enrolled students', subColor: 'text-blue' },
          { label: 'Registrar Staff',  value: statsLoading ? '—' : counts.staff.toLocaleString(),   icon: <Briefcase size={18} strokeWidth={2.2} />, bg: 'bg-gold-light', fg: 'text-gold', border: 'border-gold-border/60', sub: 'Counter & office staff', subColor: 'text-gold' },
          { label: 'Admin Accounts',   value: statsLoading ? '—' : counts.admin.toLocaleString(),   icon: <Shield size={18} strokeWidth={2.2} />, bg: 'bg-maroon-light', fg: 'text-maroon', border: 'border-maroon-border/60', sub: 'System administrators', subColor: 'text-maroon' },
        ].map((c, i) => (
          <div 
            key={i} 
            className="animate-fade-up bg-white rounded-xl sm:rounded-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 border border-border shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between min-h-25.5 sm:min-h-28 gap-1.5 h-full" 
            style={{ animationDelay: `${0.08 * (i + 1)}s` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-fluid-10 sm:text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em] truncate leading-tight">{c.label}</span>
              <div className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${c.border} ${c.bg} ${c.fg}`}>
                {c.icon}
              </div>
            </div>
            <div>
              <div className="font-serif text-fluid-20 sm:text-fluid-26 font-extrabold text-text-main leading-tight tracking-tight m-0">
                {statsLoading ? <div className="animate-pulse w-14 h-6 sm:h-7 bg-border rounded-md" /> : c.value}
              </div>
              <div className={`text-fluid-10 sm:text-fluid-11 font-medium mt-0.5 flex items-center gap-1.5 truncate ${c.subColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
                <span>{c.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls: Tabs + Search + Actions ── */}
      <div className="animate-fade-up bg-white rounded-2xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden" style={{ animationDelay: '0.5s' }}>

        {/* Tab bar + search row */}
        <div className="flex items-center justify-between px-3 sm:px-5 border-b border-border flex-wrap gap-2">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1) }} className={`py-3.5 px-3 sm:px-4 bg-transparent border-none border-b-2 text-fluid-13 cursor-pointer font-sans transition-colors duration-150 whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === t.key ? 'border-maroon text-maroon font-bold' : 'border-transparent text-text-muted font-normal hover:text-maroon/80'}`}>
                {t.label}
                <span className={`text-fluid-11 font-bold py-px px-1.75 rounded-full ${activeTab === t.key ? 'bg-maroon-light text-maroon' : 'bg-surface text-text-muted'}`}>{counts[t.key]}</span>
              </button>
            ))}
          </div>

          {/* Search + Export */}
          <div className="flex items-center gap-2 py-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by name, ID, email…"
                className="py-2 pr-3.5 pl-8.5 rounded-[9px] border border-border bg-off-white text-fluid-13 text-text-main outline-none w-full sm:w-55 font-sans focus:border-maroon transition-colors"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted"><Search size={14} /></span>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted flex items-center p-0.5"><X size={14} /></button>
              )}
            </div>
            <button
              type="button"
              onClick={() => exportCSV(filtered)}
              className="py-2 px-3 rounded-[9px] border border-border bg-white text-fluid-12 font-bold text-text-main hover:bg-surface transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
              title="Export filtered list to CSV"
            >
              <Download size={13} className="text-text-sub" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Desktop Table header (>= lg) */}
        <div className="hidden lg:grid grid-cols-[120px_1.6fr_1.4fr_130px_100px] p-[14px_24px] bg-off-white border-b border-border">
          {['ID', 'NAME', 'EMAIL', 'ROLE', 'ACTIONS'].map(h => (
            <span key={h} className="text-fluid-11 font-bold text-text-muted uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {/* Rows Container */}
        {loading ? (
          <>
            {/* Mobile/Tablet Loading Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 lg:hidden">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="p-4 rounded-2xl border border-border bg-white animate-pulse flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-border" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 bg-border rounded" />
                      <div className="h-3 w-20 bg-border rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-48 bg-border/60 rounded" />
                  <div className="h-8 w-full bg-border/40 rounded-xl" />
                </div>
              ))}
            </div>

            {/* Desktop Loading Skeletons */}
            <div className="hidden lg:block">
              {[1, 2, 3, 4, 5].map((n, idx) => (
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
              ))}
            </div>
          </>
        ) : paginated.length === 0 ? (
          <div className="p-[60px_24px] text-center">
            <div className="flex justify-center mb-4 text-text-muted/50"><Users size={52} strokeWidth={1.5} /></div>
            <p className="font-serif text-fluid-18 font-bold text-text-main m-0 mb-1">No users found</p>
            <p className="text-fluid-13 text-text-muted m-0 max-w-62.5 mx-auto">
              {search ? 'Try adjusting your search query or filters to find what you are looking for.' : 'No accounts have been registered in the system yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile & Tablet Portrait Cards (< lg) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 lg:hidden bg-surface/30">
              {paginated.map((user) => {
                const name = `${user.first_name} ${user.last_name}`
                const uid = user.student_id || user.staff_id || `UID-${user.id?.slice(0, 8)}`

                return (
                  <div
                    key={user.id}
                    className={`bg-white rounded-2xl border border-border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 animate-fade-up ${user.is_active === false ? 'opacity-70 grayscale-[0.2]' : 'opacity-100'}`}
                  >
                    {/* Top: Avatar, Name, Status */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="shadow-xs rounded-full shrink-0">
                        <Avatar name={name} role={user.role} size={40} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-fluid-14 font-bold text-text-main truncate">
                          {name}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-fluid-11 font-mono text-text-muted font-medium">
                            {uid}
                          </span>
                          {user.is_active === false && (
                            <span className="text-[10px] font-bold text-danger bg-danger-light py-0.5 px-1.5 rounded-sm border border-danger-border leading-none">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Email & Role */}
                    <div className="p-2.5 rounded-xl bg-off-white border border-border/70 flex flex-col gap-2">
                      <div className="text-fluid-12 text-text-sub truncate font-medium">
                        {user.email}
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                        <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-text-muted">Role:</span>
                        <RoleBadge role={user.role} />
                      </div>
                    </div>

                    {/* Bottom: Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                      <button
                        onClick={() => setEditUser(user)}
                        className="flex-1 py-1.75 px-3 rounded-xl border border-border bg-white text-text-main text-fluid-12 font-bold cursor-pointer hover:bg-surface hover:border-maroon/30 transition-all shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <Pencil size={13} className="text-maroon shrink-0" />
                        <span>Edit Role</span>
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                          title="More options"
                          className={`w-8.5 h-8.5 rounded-xl border cursor-pointer flex items-center justify-center transition-all ${dropdownOpen === user.id ? 'border-border bg-off-white text-text-main shadow-sm' : 'border-border bg-white text-text-sub hover:bg-surface shadow-2xs'}`}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {dropdownOpen === user.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(null)} />
                            <div className="absolute bottom-full right-0 mb-1.5 bg-white border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1.5 z-20 min-w-36 animate-fade-up">
                              <button
                                onClick={() => { handleToggleStatus(user.id, user.is_active !== false); setDropdownOpen(null); }}
                                className={`w-full py-2 px-3 border-none bg-transparent text-left text-fluid-12 cursor-pointer rounded-lg flex items-center gap-2 font-sans font-bold transition-colors ${user.is_active !== false ? 'text-danger hover:bg-danger-light' : 'text-success hover:bg-success-light'}`}
                              >
                                <span className="shrink-0">{user.is_active !== false ? <Ban size={14} /> : <CheckCircle size={14} />}</span>
                                <span>{user.is_active !== false ? 'Suspend User' : 'Reactivate User'}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop Table (>= lg) ── */}
            <div className="hidden lg:block">
              {paginated.map((user, idx) => {
                const name     = `${user.first_name} ${user.last_name}`
                const uid      = user.student_id || user.staff_id || `UID-${user.id?.slice(0, 8)}`
                const isLast   = idx === paginated.length - 1
                const isNearBottom = idx >= Math.max(0, paginated.length - 2)

                return (
                  <div key={user.id} className={`grid grid-cols-[120px_1.6fr_1.4fr_130px_100px] p-[16px_24px] items-center transition-all duration-200 hover:bg-surface group ${isLast ? 'border-none' : 'border-b border-border'} bg-white ${user.is_active === false ? 'opacity-60 grayscale-[0.2]' : 'opacity-100'}`}>
                    {/* ID */}
                    <div className="text-fluid-12-5 text-text-muted font-mono font-medium">{uid}</div>

                    {/* Name */}
                    <div className="flex items-center gap-3.5 min-w-0 pr-4">
                      <div className="shadow-sm rounded-full bg-white"><Avatar name={name} role={user.role} size={38} /></div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="text-fluid-14 font-bold text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-maroon transition-colors">{name}</div>
                        {user.is_active === false && <span className="text-fluid-10 font-bold text-danger bg-danger-light py-0.5 px-1.5 rounded-sm w-fit border border-danger-border leading-none">SUSPENDED</span>}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="text-fluid-13 font-medium text-text-sub whitespace-nowrap overflow-hidden text-ellipsis pr-4">{user.email}</div>

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
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(null)} />
                          <div className={`absolute ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 bg-white border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1.5 z-20 min-w-35 animate-fade-up`} style={{ animationDuration: '0.15s' }}>
                            <button
                              onClick={() => { handleToggleStatus(user.id, user.is_active !== false); setDropdownOpen(null); }}
                              className={`w-full py-2 px-3 border-none bg-transparent text-left text-fluid-13 cursor-pointer rounded-lg flex items-center gap-2.5 transition-colors duration-150 font-sans font-semibold ${user.is_active !== false ? 'text-danger hover:bg-danger-light' : 'text-success hover:bg-success-light'}`}
                            >
                              <span className="flex items-center shrink-0">{user.is_active !== false ? <Ban size={15} /> : <CheckCircle size={15} />}</span> 
                              <span>{user.is_active !== false ? 'Suspend User' : 'Reactivate User'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="p-[13px_24px] border-t border-border flex items-center justify-between bg-surface flex-wrap gap-2">
            <span className="text-fluid-12 text-text-muted">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1 items-center">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className={`py-1 px-3 rounded-md border border-border bg-white text-fluid-12 font-semibold font-sans ${page === 1 ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-off-white'}`}>
                Prev
              </button>

              {/* Mobile page indicator */}
              <div className="sm:hidden text-fluid-12 font-bold text-text-main px-2">
                {page} / {totalPages}
              </div>

              {/* Desktop/Tablet numbered buttons */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1
                    : page <= 4 ? i + 1
                    : page >= totalPages - 3 ? totalPages - 6 + i
                    : page - 3 + i
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`w-7.5 h-7.5 rounded-md text-fluid-12 font-semibold cursor-pointer font-sans border ${page === p ? 'border-maroon bg-maroon text-white' : 'border-border bg-white text-text-main hover:bg-off-white'}`}>
                      {p}
                    </button>
                  )
                })}
              </div>

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className={`py-1 px-3 rounded-md border border-border bg-white text-fluid-12 font-semibold font-sans ${page === totalPages ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer text-text-main hover:bg-off-white'}`}>
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