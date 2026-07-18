import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Calendar, ClipboardList, Ticket, Bot, User, Settings, ChevronRight } from 'lucide-react';

const SEARCH_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/student/dashboard', type: 'page' },
  { id: 'book', label: 'Book Appointment', icon: Calendar, path: '/student/book', type: 'page' },
  { id: 'appointments', label: 'My Appointments', icon: ClipboardList, path: '/student/appointments', type: 'page' },
  { id: 'queue', label: 'Live Queue Status', icon: Ticket, path: '/student/queue', type: 'page' },
  { id: 'ai-chat', label: 'Ask AI Assistant', icon: Bot, path: '/student/ai-chat', type: 'action', desc: 'Chat with our virtual guide' },
  { id: 'profile', label: 'My Profile', icon: User, path: '#', type: 'page' },
  { id: 'settings', label: 'Account Settings', icon: Settings, path: '#', type: 'page' },
];

export default function GlobalSearch({ isMobile = false, onAiPrompt }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Filter items
  const filteredItems = query.trim() === '' 
    ? [] 
    : SEARCH_ITEMS.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

  // Add the AI prompt item if there's a query
  const displayItems = [...filteredItems];
  if (query.trim() !== '') {
    displayItems.push({
      id: 'ai-prompt',
      label: `Ask AI about "${query}"`,
      icon: Bot,
      path: '/student/ai-chat',
      type: 'ai-prompt',
      isPrompt: true
    });
  }

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
    if (item.path !== '#') {
      if (item.isPrompt) {
        if (onAiPrompt) {
          onAiPrompt(query);
        } else {
          navigate(item.path, { state: { initialQuery: query } });
        }
      } else {
        navigate(item.path);
      }
    }
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${isMobile ? '' : 'mr-auto hidden md:block'}`}>
      <Search 
        size={isMobile ? 14 : 16} 
        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${isMobile ? 'left-3 text-slate-400' : 'left-4 text-slate-400'}`} 
      />
      <input 
        type="text" 
        placeholder="Search..." 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim() !== '') setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={isMobile ? (
          "bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 text-[12px] rounded-full py-1.5 pl-8 pr-3 w-[120px] focus:outline-none focus:bg-white focus:border-maroon/30 focus:ring-2 focus:ring-maroon/5 transition-all shadow-sm"
        ) : (
          "bg-slate-50 border border-slate-200 text-slate-700 text-[13.5px] font-sans rounded-full py-2.5 pl-10 pr-4 w-[320px] focus:outline-none focus:bg-white focus:border-maroon/30 focus:ring-4 focus:ring-maroon/5 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
        )}
      />

      {isOpen && displayItems.length > 0 && (
        <div className={`absolute left-0 top-full mt-2 bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden z-50 flex flex-col py-2 transition-all origin-top ${isMobile ? 'w-[240px]' : 'w-[320px]'}`}>
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.isPrompt ? 'bg-maroon-light text-maroon' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13.5px] font-semibold truncate ${item.isPrompt ? 'text-maroon font-serif' : 'text-slate-700'}`}>
                    {item.label}
                  </div>
                  {item.desc && (
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</div>
                  )}
                </div>
                <ChevronRight size={14} className={item.isPrompt ? 'text-maroon opacity-50' : 'text-slate-300'} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
