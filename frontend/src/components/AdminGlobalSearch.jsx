import { useState, useEffect, useRef } from 'react';
import { Search, LayoutDashboard, BarChart2, Ticket, Calendar, FolderOpen, ClipboardList, Users, Shield, Settings, ChevronRight } from 'lucide-react';

const SEARCH_ITEMS = [
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, desc: 'View high-level summary and statistics' },
  { id: 'reports', label: 'Analytics & Reports', icon: BarChart2, desc: 'Detailed metrics and performance data' },
  { id: 'queue', label: 'Live Queue Management', icon: Ticket, desc: 'Manage the active front desk queue' },
  { id: 'appts', label: 'Appointments', icon: Calendar, desc: 'Manage scheduled student appointments' },
  { id: 'records', label: 'Registrar Records', icon: FolderOpen, desc: 'Access academic and institutional records' },
  { id: 'student_records', label: 'Student Records', icon: ClipboardList, desc: 'Manage student data and documents' },
  { id: 'users', label: 'User Management', icon: Users, desc: 'Manage staff roles and access' },
  { id: 'config', label: 'Office Configuration', icon: Settings, desc: 'Configure office settings and parameters' },
  { id: 'audit', label: 'Audit Log', icon: Shield, desc: 'View system activity and audit trails' },
];

export default function AdminGlobalSearch({ setActiveNav }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Filter items
  const displayItems = query.trim() === '' 
    ? [] 
    : SEARCH_ITEMS.filter(item => item.label.toLowerCase().includes(query.toLowerCase()) || (item.desc && item.desc.toLowerCase().includes(query.toLowerCase())));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (!isOpen || displayItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % displayItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + displayItems.length) % displayItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(displayItems[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleSelect = (item) => {
    setActiveNav(item.id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[300px] hidden md:block">
      <Search 
        size={16} 
        className="absolute top-1/2 -translate-y-1/2 pointer-events-none left-4 text-text-muted" 
      />
      <input 
        type="text" 
        placeholder="Search admin pages..." 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim() !== '') setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-surface border border-border text-text-main text-[13.5px] font-sans rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:bg-white focus:border-maroon/30 focus:ring-4 focus:ring-maroon/5 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
      />

      {isOpen && displayItems.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden z-50 flex flex-col py-2 transition-all origin-top">
          {displayItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors border-none bg-transparent ${isActive ? 'bg-slate-50' : ''}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-text-muted">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold truncate text-text-main">
                    {item.label}
                  </div>
                  {item.desc && (
                    <div className="text-[11px] text-text-sub truncate mt-0.5">{item.desc}</div>
                  )}
                </div>
                <ChevronRight size={14} className="text-border" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
