import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/useAuth';
import { useWebSocket } from '../../context/WebSocketContext';
import StudentLayout from '../../components/layout/StudentLayout';
import { Bell, CheckCircle, Info, AlertTriangle, Check } from 'lucide-react';
import { markNotificationRead, markAllNotificationsRead, clearAllNotifications } from '../../services/notificationService';

const M = {
  maroon: '#7B1A2A',
  textSub: '#57534E',
  textMuted: '#A8A29E',
  border: '#EAE7E2',
  white: '#FFFFFF',
  danger: '#DC2626',
  success: '#15803D',
};

export default function StudentNotifications({ embedded = false }) {
  const { token } = useAuth();
  const { notifications, setNotifications, fetchInitialNotifications } = useWebSocket();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialNotifications();
    const interval = setInterval(fetchInitialNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchInitialNotifications]);

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationRead(token, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(token);
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-danger shrink-0" />;
      default: return <Info className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-text-sub shrink-0" />;
    }
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    if (isToday) return timeStr;
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${datePart} at ${timeStr}`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading && notifications.length === 0) {
    const skeleton = (
      <div className="flex-1 w-full pb-22 md:pb-0 px-4 md:px-0 animate-pulse">
        <div className="hidden md:flex justify-between items-center mb-6">
          <div>
            <div className="h-7 w-40 bg-border/80 rounded mb-2" />
            <div className="h-3.5 w-64 bg-border/40 rounded" />
          </div>
        </div>
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-off-white/80 flex justify-between items-center">
            <div className="h-4 w-32 bg-border/60 rounded" />
            <div className="h-4 w-20 bg-border/40 rounded" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 flex gap-4 items-start">
                <div className="w-5 h-5 rounded-full bg-border/60 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="h-4 w-44 bg-border/70 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-border/40 rounded" />
                </div>
                <div className="h-3 w-16 bg-border/40 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    if (embedded) return skeleton;
    return <StudentLayout mobileTitle="Notifications" backTo="/student/dashboard" activeTab="">{skeleton}</StudentLayout>;
  }

  const content = (
    <div className="flex-1 w-full pb-22 md:pb-0 px-4 md:px-0">
      
      {/* Desktop Title Header */}
      <div className="hidden md:flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-maroon m-0 flex items-center gap-2.5">
            <Bell className="text-maroon w-6 h-6 lg:w-7 lg:h-7" /> Notifications
          </h1>
          <p className="text-xs sm:text-sm text-text-sub m-0 mt-1">
            Stay updated on your appointment status, document approvals, and live queue alerts.
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-maroon-light text-maroon border border-maroon-border">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-border shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-border bg-off-white/80 gap-2">
          <h3 className="m-0 text-xs sm:text-base font-bold text-text-main font-sans flex items-center gap-2 truncate">
            All Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-maroon-light text-maroon border border-maroon-border md:hidden">
                {unreadCount} new
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs sm:text-sm text-maroon hover:text-maroon-dark bg-transparent border-none cursor-pointer font-bold transition-colors py-1 px-1.5 sm:px-2 rounded-lg hover:bg-maroon-light/40"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-xs sm:text-sm text-text-sub hover:text-danger bg-transparent border-none cursor-pointer font-bold transition-colors py-1 px-1.5 sm:px-2 rounded-lg hover:bg-red-50"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        
        <div>
          {loading ? (
            <div className="p-8 text-center text-text-muted text-xs sm:text-sm font-medium">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-text-muted">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white flex items-center justify-center mx-auto mb-3 text-gold opacity-70">
                <Bell size={24} className="sm:w-7 sm:h-7" />
              </div>
              <p className="m-0 font-bold text-text-main text-sm sm:text-base mb-1">No notifications yet</p>
              <p className="m-0 text-text-sub text-xs sm:text-sm">When you receive updates about appointments or queue, they will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className={`flex gap-2.5 sm:gap-4 p-3 sm:p-4.5 transition-colors ${!n.is_read ? 'bg-maroon/3' : 'bg-white hover:bg-off-white/50'}`}>
                  <div className="shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5 sm:mb-1 gap-1.5 flex-wrap sm:flex-nowrap">
                      <p className={`m-0 text-xs sm:text-sm font-bold truncate ${!n.is_read ? 'text-text-main' : 'text-text-sub'}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] sm:text-xs text-text-muted font-medium pt-0.5">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    <p className="m-0 text-[11.5px] sm:text-xs text-text-sub leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button 
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="shrink-0 self-center w-6.5 h-6.5 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border border-maroon-border bg-maroon-light text-maroon cursor-pointer hover:bg-maroon hover:text-white transition-colors shadow-2xs ml-1"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) return content;
  return <StudentLayout mobileTitle="Notifications" backTo="/student/dashboard" activeTab="">{content}</StudentLayout>;
}
