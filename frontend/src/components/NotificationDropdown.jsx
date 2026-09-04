import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Info, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useWebSocket } from '../context/WebSocketContext';
import { markNotificationRead, markAllNotificationsRead, clearAllNotifications } from '../services/notificationService';

const M = {
  maroon: '#7B1A2A',
  textSub: '#57534E',
  textMuted: '#A8A29E',
  border: '#EAE7E2',
  white: '#FFFFFF',
  surface: '#F2EDE8',
  danger: '#DC2626',
  success: '#15803D',
};

export default function NotificationDropdown({ isMobile = false }) {
  const { token } = useAuth();
  const { notifications, setNotifications } = useWebSocket();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const effectiveIsMobile = isMobile || windowWidth < 768;

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(event.target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(event.target);
      if (isOutsideDropdown && isOutsideTrigger) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      await markNotificationRead(token, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error('Failed to mark read', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(token);
      setNotifications([]);
    } catch (e) {
      console.error('Failed to clear notifications', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} color={M.success} />;
      case 'warning': return <AlertTriangle size={16} color={M.danger} />;
      default: return <Info size={16} color={M.textSub} />;
    }
  };

  const formatNotificationTime = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && 
                    d.getMonth() === today.getMonth() && 
                    d.getFullYear() === today.getFullYear();
    
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) {
      return `Today ${timeStr}`;
    } else {
      const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return `${dateStr} ${timeStr}`;
    }
  };

  return (
    <div ref={triggerRef} className="relative">
      <button
        style={!effectiveIsMobile ? {
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: M.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '4px', transition: 'color 0.2s', position: 'relative'
        } : undefined}
        className={effectiveIsMobile ? "bg-transparent border-none text-slate-500 cursor-pointer hover:text-maroon transition-colors p-1 flex items-center justify-center relative" : ""}
        onMouseEnter={!effectiveIsMobile ? e => e.currentTarget.style.color = M.maroon : undefined}
        onMouseLeave={!effectiveIsMobile ? e => e.currentTarget.style.color = M.textSub : undefined}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        aria-label={`View notifications (${unreadCount} unread)`}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span 
            className={isMobile ? "absolute top-0 right-0 bg-maroon text-white text-fluid-9 font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full" : ""}
            style={!isMobile ? { position: 'absolute', top: '2px', right: '4px', backgroundColor: M.maroon, color: 'white', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' } : {}}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop for easy tap-outside */}
          <div 
            className="fixed inset-0 z-9998 sm:hidden bg-black/10 backdrop-blur-2xs transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />

          <div 
            ref={dropdownRef}
            className="fixed sm:absolute left-3.5 right-3.5 sm:left-auto sm:right-0 top-13.5 sm:top-8.75 sm:w-85 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white rounded-2xl sm:rounded-xl shadow-[0_12px_45px_rgba(0,0,0,0.18)] border border-border overflow-hidden animate-fade-up z-9999"
          >
            <div className="flex items-center justify-between p-3.5 sm:p-3 border-b border-border bg-off-white">
              <h3 className="m-0 text-fluid-14 font-bold sm:font-semibold text-text-main font-sans">Notifications</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-fluid-11 text-maroon hover:text-maroon-dark bg-transparent border-none cursor-pointer font-bold sm:font-semibold transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    className="text-fluid-11 text-text-sub hover:text-danger bg-transparent border-none cursor-pointer font-semibold transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-[65vh] sm:max-h-90 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-fluid-13">
                  <Bell size={24} className="mx-auto mb-2 opacity-50 text-gold" />
                  <p className="m-0 font-medium">No notifications yet.</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border/60">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      className={`flex gap-3 p-3.5 sm:p-3.5 transition-colors cursor-pointer ${!n.is_read ? 'bg-maroon/5 hover:bg-maroon/10' : 'bg-white hover:bg-off-white'}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col mb-1">
                          <p className={`m-0 text-fluid-13 font-semibold leading-snug ${!n.is_read ? 'text-text-main' : 'text-text-sub'}`}>
                            {n.title}
                          </p>
                          <span className="text-fluid-10-5 text-text-muted mt-0.5">
                            {formatNotificationTime(n.created_at)}
                          </span>
                        </div>
                        <p className="m-0 text-fluid-12 text-text-sub leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button 
                          onClick={(e) => handleMarkRead(n.id, e)}
                          className="shrink-0 self-center w-6 h-6 flex items-center justify-center rounded-full border-none bg-transparent hover:bg-maroon/10 text-maroon cursor-pointer"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
