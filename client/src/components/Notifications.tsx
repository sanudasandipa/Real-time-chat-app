import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';
import socketService from '../services/socket';
import toastService from '../services/toast';
import './Notifications.css';

interface Notification {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profilePic?: string;
  };
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    chatId?: string;
    messageId?: string;
  };
}

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Fetch initial unread count
    fetchUnreadCount();

    // Set up socket listeners
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('new-notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toastService.info(`${notification.title}: ${notification.message}`);
      });

      socket.on('notifications-read', (data: any) => {
        setUnreadCount(data.unreadCount);
        if (data.notificationIds.length === 0) {
          // Mark all as read
          setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        } else {
          // Mark specific notifications as read
          setNotifications(prev => prev.map(notif => 
            data.notificationIds.includes(notif._id) 
              ? { ...notif, isRead: true } 
              : notif
          ));
        }
      });

      socket.on('notification-deleted', (data: any) => {
        setNotifications(prev => prev.filter(notif => notif._id !== data.notificationId));
        setUnreadCount(data.unreadCount);
      });

      socket.on('notifications-cleared', () => {
        setNotifications([]);
        setUnreadCount(0);
      });
    }

    return () => {
      if (socket) {
        socket.off('new-notification');
        socket.off('notifications-read');
        socket.off('notification-deleted');
        socket.off('notifications-cleared');
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications(1, 20);
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toastService.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async (notificationIds?: string[]) => {
    try {
      await notificationAPI.markAsRead(notificationIds);
      // Socket event will handle the UI update
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toastService.error('Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationAPI.deleteNotification(id);
      // Socket event will handle the UI update
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toastService.error('Failed to delete notification');
    }
  };

  const clearAll = async () => {
    try {
      await notificationAPI.clearAll();
      // Socket event will handle the UI update
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toastService.error('Failed to clear notifications');
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return 'bi-chat-dots';
      case 'friend_request':
        return 'bi-person-plus';
      case 'friend_accept':
        return 'bi-person-check';
      case 'group_invite':
        return 'bi-people';
      case 'group_mention':
        return 'bi-at';
      default:
        return 'bi-bell';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-dropdown" ref={dropdownRef}>
      <div className="notifications-header">
        <h3>Notifications</h3>
        <div className="notifications-actions">
          {unreadCount > 0 && (
            <button
              className="mark-all-read-btn"
              onClick={() => markAsRead()}
              title="Mark all as read"
            >
              <i className="bi bi-check2-all"></i>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              className="clear-all-btn"
              onClick={clearAll}
              title="Clear all"
            >
              <i className="bi bi-trash"></i>
            </button>
          )}
        </div>
      </div>

      <div className="notifications-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-bell-slash"></i>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => !notification.isRead && markAsRead([notification._id])}
              >
                <div className="notification-icon">
                  <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                </div>
                
                <div className="notification-content">
                  <div className="notification-header">
                    <h4>{notification.title}</h4>
                    <span className="notification-time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                </div>

                {!notification.isRead && (
                  <div className="unread-indicator"></div>
                )}

                <button
                  className="delete-notification-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification._id);
                  }}
                  title="Delete notification"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
