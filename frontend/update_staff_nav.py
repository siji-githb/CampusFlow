with open("c:/CampusFlow/frontend/src/pages/staff/StaffDashboard.jsx", "r", encoding="utf-8") as f:
    data = f.read()

import re

# Add LayoutDashboard to lucide-react imports
data = re.sub(r"import \{ (.*?) \} from 'lucide-react'", r"import { \1, LayoutDashboard } from 'lucide-react'", data)

new_nav = """  const navGroups = [
    {
      title: 'Main Menu',
      items: [
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview' },
        { id: 'queue', icon: <Ticket size={18} />, label: 'Live Queue' },
        { id: 'appointments', icon: <Calendar size={18} />, label: 'Appointments' },
      ]
    },
    {
      title: 'Records & Actions',
      items: [
        { id: 'records', icon: <ClipboardList size={18} />, label: 'Student Records' },
        { id: 'messages', icon: <MessageSquare size={18} />, label: 'Messages', badge: badgeStats.messages },
        { id: 'id-requests', icon: <HelpCircle size={18} />, label: 'Id Requests', badge: badgeStats.idRequests },
      ]
    }
  ]"""

data = re.sub(r"  const navItems = \[\s*\{.*?\s*\]", new_nav, data, count=1, flags=re.DOTALL)

new_nav_ui = """        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-6 px-1 overflow-y-auto pb-6 scrollbar-hide">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] px-4 mb-1">
                {group.title}
              </div>
              <div className="flex flex-col gap-1 pl-3 pr-2">
                {group.items.map(item => (
                  <SideItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeNav === item.id}
                    onClick={() => myWindow ? setActiveNav(item.id) : null}
                    badge={item.badge}
                    disabled={!myWindow}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>"""

# Replace from the start of the previous nav section to the end of the <nav> block
data = re.sub(r"        \{\/\* Nav \*\/}.*?<\/nav>", new_nav_ui, data, count=1, flags=re.DOTALL)

with open("c:/CampusFlow/frontend/src/pages/staff/StaffDashboard.jsx", "w", encoding="utf-8") as f:
    f.write(data)
