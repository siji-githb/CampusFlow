with open("c:/CampusFlow/frontend/src/pages/admin/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    data = f.read()

import re

new_nav = """  const navGroups = [
    {
      title: 'Main Menu',
      items: [
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview' },
        { id: 'reports', icon: <BarChart2 size={18} />, label: 'Analytics' },
        { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue' },
        { id: 'appts', icon: <Calendar size={18} />, label: 'Appointments' },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'records', icon: <FolderOpen size={18} />, label: 'Registrar Records' },
        { id: 'student_records', icon: <ClipboardList size={18} />, label: 'Student Records' },
        { id: 'users', icon: <Users size={18} />, label: 'User Management' },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'config', icon: <Settings size={18} />, label: 'Office Config' },
        { id: 'audit', icon: <Shield size={18} />, label: 'Audit Log' },
      ]
    }
  ]"""
data = re.sub(r"  const navItems = \[\s*\{.*?\s*\]", new_nav, data, count=1, flags=re.DOTALL)

new_nav_ui = """        <nav className="flex-1 flex flex-col gap-6 px-1 overflow-y-auto pb-6 scrollbar-hide">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] px-4 mb-1">
                {group.title}
              </div>
              <div className="flex flex-col gap-1 pl-3 pr-2">
                {group.items.map(item => (
                  <SideItem key={item.id} icon={item.icon} label={item.label}
                    active={activeNav === item.id}
                    onClick={() => setActiveNav(item.id)} />
                ))}
              </div>
            </div>
          ))}
        </nav>"""
data = re.sub(r"        <nav className=\"flex-1 flex flex-col gap-1\">\s*\{navItems.map\(item => \(\s*<SideItem key=\{item\.id\} icon=\{item\.icon\} label=\{item\.label\}\s*active=\{activeNav === item\.id\}\s*onClick=\{.*?\}\s*\/>\s*\)\)\}\s*<\/nav>", new_nav_ui, data, count=1, flags=re.DOTALL)

with open("c:/CampusFlow/frontend/src/pages/admin/AdminDashboard.jsx", "w", encoding="utf-8") as f:
    f.write(data)
