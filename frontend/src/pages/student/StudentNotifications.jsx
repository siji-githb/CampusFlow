import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import StudentLayout from '../../components/layout/StudentLayout';
import { Bell, CheckCircle, Info, AlertTriangle, Check } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/notificationService';

const M = {
  maroon: '#7B1A2A',
  textSub: '#57534E',
  textMuted: '#A8A29E',
  border: '#EAE7E2',
  white: '#FFFFFF',
  danger: '#DC2626',
  success: '#15803D',
};

export default function StudentNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications(token);
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [token]);

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

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color={M.success} />;
      case 'warning': return <AlertTriangle size={20} color={M.danger} />;
      default: return <Info size={20} color={M.textSub} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <StudentLayout mobileTitle="Notifications" backTo="/student/dashboard" activeTab="">
      <div className="bg-white min-h-[calc(100vh-140px)]">
        <div className="flex items-center justify-between p-4 border-b border-border bg-off-white">
          <h3 className="m-0 text-[16px] font-semibold text-text-main font-sans">All Notifications</h3>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[13px] text-maroon hover:text-maroon-dark bg-transparent border-none cursor-pointer font-semibold"
            >
              Mark all read
            </button>
          )}
        </div>
        
        <div>
          {loading ? (
            <div className="p-8 text-center text-text-muted text-[14px]">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center text-text-muted text-[14px]">
              <Bell size={32} className="mx-auto mb-3 opacity-50" />
              <p className="m-0">No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col pb-6">
              {notifications.map(n => (
                <div key={n.id} className={`flex gap-4 p-4 border-b border-border transition-colors ${!n.is_read ? 'bg-maroon/5' : 'bg-white'}`}>
                  <div className="shrink-0 mt-1">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <p className={`m-0 text-[14px] font-semibold truncate ${!n.is_read ? 'text-text-main' : 'text-text-sub'}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-text-muted pt-0.5">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="m-0 text-[13px] text-text-sub leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button 
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="shrink-0 self-center w-8 h-8 flex items-center justify-center rounded-full border border-maroon-border bg-maroon-light text-maroon cursor-pointer active:bg-maroon/20 ml-2"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
