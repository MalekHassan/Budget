import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { onUnreadCountChange } from '../firebase/firestore';
import { NotificationList } from './NotificationList';
import './NotificationBell.css';

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onUnreadCountChange(user.uid, (count) => {
      setUnreadCount(count);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <NotificationList onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}
