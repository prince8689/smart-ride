import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '../utils/constants';

export function useAdminSocket() {
  const { socket, isConnected } = useSocket();
  const [liveStats, setLiveStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [onlineDrivers, setOnlineDrivers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.ADMIN_STATS_UPDATE, (stats) => {
      setLiveStats(stats);
      if (stats.online_drivers) {
        setOnlineDrivers(stats.online_drivers);
      }
    });

    socket.on(SOCKET_EVENTS.ADMIN_NEW_SUBSCRIPTION, (data) => {
      setRecentActivity(prev => [{
        id: Date.now().toString(),
        type: 'subscription',
        message: `New subscription from ${data.user_name}`,
        amount: data.amount,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]);
    });

    socket.on(SOCKET_EVENTS.ADMIN_NEW_COMPLAINT, (data) => {
      setRecentActivity(prev => [{
        id: Date.now().toString(),
        type: 'complaint',
        message: `Complaint from ${data.user_name}: ${data.subject}`,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]);
    });

    socket.on(SOCKET_EVENTS.ADMIN_DRIVER_STATUS, (data) => {
      if (data.status === 'online') {
        setOnlineDrivers(prev => {
          const exists = prev.find(d => d.id === data.driverProfileId);
          if (exists) return prev;
          return [...prev, { id: data.driverProfileId, lat: data.lat, lng: data.lng, name: data.name }];
        });
      } else {
        setOnlineDrivers(prev => prev.filter(d => d.id !== data.driverProfileId));
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.ADMIN_STATS_UPDATE);
      socket.off(SOCKET_EVENTS.ADMIN_NEW_SUBSCRIPTION);
      socket.off(SOCKET_EVENTS.ADMIN_NEW_COMPLAINT);
      socket.off(SOCKET_EVENTS.ADMIN_DRIVER_STATUS);
    };
  }, [socket]);

  const sendBroadcast = useCallback((message, target) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.ADMIN_BROADCAST, { message, target });
    }
  }, [socket, isConnected]);

  return { liveStats, recentActivity, onlineDrivers, sendBroadcast, isConnected };
}
