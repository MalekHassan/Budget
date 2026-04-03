import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../firebase/firestore';
import type { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, X } from 'lucide-react';
import './NotificationList.css';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

export function NotificationList({ onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  const fetchItems = async (isLoadMore = false) => {
    if (!user) return;
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await getNotifications(user.uid, { 
        limit: 10, 
        lastVisibleId: isLoadMore ? lastId! : undefined 
      });
      
      setNotifications(prev => isLoadMore ? [...prev, ...res.notifications] : res.notifications);
      setHasMore(res.hasMore);
      setLastId(res.lastVisibleId);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    // Navigate to Month Detail page if monthKey is provided
    if (notif.monthKey) {
      const parts = notif.monthKey.split('_');
      if (parts.length >= 3) {
        navigate(`/monthly?month=${parts[2]}&year=${parts[1]}`);
        onClose();
      }
    }
  };

  return (
    <div className="notification-list-panel glass-card">
      <div className="notification-list-header">
        <h3>Notifications</h3>
        <div className="notification-list-actions">
          <button onClick={handleMarkAllRead} className="notification-action-btn" title="Mark all as read">
            <CheckCircle2 size={18} />
          </button>
          <button onClick={onClose} className="notification-action-btn" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notification-list-content">
        {loading && <p className="notification-loading">Loading...</p>}
        {!loading && notifications.length === 0 && (
           <p className="notification-empty">No notifications yet</p>
        )}
        {!loading && notifications.map((notif) => (
          <div 
            key={notif.id} 
            className={`notification-item ${!notif.read ? 'unread' : ''}`}
            onClick={() => handleNotificationClick(notif)}
          >
            <div className="notification-item-content">
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
              {notif.details && <p className="notification-details">{notif.details}</p>}
              <span className="notification-time">
                {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
              </span>
            </div>
            {!notif.read && <div className="notification-unread-dot" />}
          </div>
        ))}
        {hasMore && (
          <button 
            className="notification-load-more" 
            onClick={() => fetchItems(true)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load Mode'}
          </button>
        )}
      </div>
    </div>
  );
}
