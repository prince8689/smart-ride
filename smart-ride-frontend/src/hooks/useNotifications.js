import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '../utils/constants';
import toast from '../utils/toastConfig';

export const useNotifications = () => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 5));
      toast(data.message, {
        icon: '🔔',
      });
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_COUNT, (data) => {
      setUnreadCount(data.count);
    });

    return () => {
      socket.off(SOCKET_EVENTS.NEW_NOTIFICATION);
      socket.off(SOCKET_EVENTS.NOTIFICATION_COUNT);
    };
  }, [socket]);

  const markRead = (notificationId) => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.MARK_READ, { notification_id: notificationId });
    }
  };

  const markAllRead = () => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.MARK_READ, { all: true });
    }
  };

  return { notifications, unreadCount, markRead, markAllRead };
};
