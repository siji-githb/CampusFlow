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
  const triggerRef = useRef(null);
  
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const effectiveIsMobile = isMobile || windowWidth < 768;

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
    
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/notifications/ws?token=${token}`;
    
    let ws = null;
    let reconnectTimeout = null;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        // Fetch to ensure we didn't miss any messages while disconnected
        fetchNotifications();
      };

      ws.onmessage = (event) => {
        try {
          const newNotification = JSON.parse(event.data);
          setNotifications((prev) => {
            // Prevent duplicate notifications in state
            if (prev.some(n => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
        } catch (e) {
          console.error('Failed to parse websocket message', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        // Auto-reconnect after 3 seconds if it unexpectedly drops
        reconnectTimeout = setTimeout(() => {
          connectWs();
        }, 3000);
      };
    };

    connectWs();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // prevent reconnect on intentional unmount
        ws.close();
      }
    };
  }, [token]);

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
            className={isMobile ? "absolute top-0 right-0 bg-maroon text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full" : ""}
            style={!isMobile ? { position: 'absolute', top: '2px', right: '4px', backgroundColor: M.maroon, color: 'white', fontSize: '9px', fontWeight: 'bold', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' } : {}}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[35px] w-[90vw] max-w-[320px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-border overflow-hidden animate-fade-up z-9999" ref={dropdownRef}>
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
                          {new Date(n.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
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
      )}
    </div>
  );
}
