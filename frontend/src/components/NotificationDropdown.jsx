import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Info, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';

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

export default function NotificationDropdown({ isMobile = false, mobileRoute }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await getNotifications(token);
      setNotifications(data || []);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} color={M.success} />;
      case 'warning': return <AlertTriangle size={16} color={M.danger} />;
      default: return <Info size={16} color={M.textSub} />;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        style={!isMobile ? {
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: M.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '4px', transition: 'color 0.2s', position: 'relative'
        } : undefined}
        className={isMobile ? "bg-transparent border-none text-white cursor-pointer hover:text-gold transition-colors p-1 flex items-center justify-center relative" : ""}
        onMouseEnter={!isMobile ? e => e.currentTarget.style.color = M.maroon : undefined}
        onMouseLeave={!isMobile ? e => e.currentTarget.style.color = M.textSub : undefined}
        onClick={() => {
          if (isMobile && mobileRoute) {
            navigate(mobileRoute);
          } else {
            setIsOpen(!isOpen);
          }
        }}
        aria-label={`View notifications (${unreadCount} unread)`}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span 
            className={isMobile ? "absolute top-0 right-0 bg-gold text-maroon text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full" : ""}
            style={!isMobile ? { position: 'absolute', top: '2px', right: '4px', backgroundColor: M.maroon, color: 'white', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' } : {}}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        isMobile ? createPortal(
          <div className="fixed right-5 top-[80px] w-[85vw] max-w-[320px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-border overflow-hidden z-[9999] animate-fade-up" ref={dropdownRef}>
            <div className="flex items-center justify-between p-3 border-b border-border bg-off-white">
              <h3 className="m-0 text-[14px] font-semibold text-text-main font-sans">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-maroon hover:text-maroon-dark bg-transparent border-none cursor-pointer font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-[260px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-[13px]">
                  <Bell size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="m-0">No notifications yet.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex gap-3 p-3.5 border-b border-border last:border-none transition-colors ${!n.is_read ? 'bg-maroon/5' : 'bg-white hover:bg-off-white'}`}>
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <p className={`m-0 text-[13px] font-semibold truncate ${!n.is_read ? 'text-text-main' : 'text-text-sub'}`}>
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-text-muted">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="m-0 text-[12px] text-text-sub leading-tight">
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
          </div>,
          document.body
        ) : (
          <div className="absolute right-0 top-full mt-3 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-border w-[320px] overflow-hidden z-50 animate-fade-up">
            <div className="flex items-center justify-between p-3 border-b border-border bg-off-white">
              <h3 className="m-0 text-[14px] font-semibold text-text-main font-sans">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-maroon hover:text-maroon-dark bg-transparent border-none cursor-pointer font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-[13px]">
                  <Bell size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="m-0">No notifications yet.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex gap-3 p-3.5 border-b border-border last:border-none transition-colors ${!n.is_read ? 'bg-maroon/5' : 'bg-white hover:bg-off-white'}`}>
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <p className={`m-0 text-[13px] font-semibold truncate ${!n.is_read ? 'text-text-main' : 'text-text-sub'}`}>
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-text-muted">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="m-0 text-[12px] text-text-sub leading-tight">
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
        )
      )}
    </div>
  );
}
