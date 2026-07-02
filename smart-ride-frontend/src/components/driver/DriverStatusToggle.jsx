import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

/**
 * DriverStatusToggle — Online/Offline toggle switch with real-time socket updates.
 */
const DriverStatusToggle = ({ routeId, initialStatus = 'offline' }) => {
  const { socket } = useSocket();
  const [status, setStatus] = useState(initialStatus);
  const [isToggling, setIsToggling] = useState(false);

  const isOnline = status === 'online';

  useEffect(() => {
    if (socket) {
      // Listen for status confirmation from server
      socket.on('driver:status_updated', (data) => {
        if (data.status) setStatus(data.status);
      });

      return () => {
        socket.off('driver:status_updated');
      };
    }
  }, [socket]);

  const toggleStatus = async () => {
    const newStatus = isOnline ? 'offline' : 'online';
    setIsToggling(true);

    try {
      // Update via socket
      if (socket) {
        socket.emit('driver:update_status', {
          status: newStatus,
          reason: `Driver toggled to ${newStatus}`,
        });
      }

      // Also update via REST API if routeId provided
      if (routeId) {
        const { updateDriverRouteStatus } = await import('../../api/v2.api');
        await updateDriverRouteStatus(routeId, { status: newStatus });
      }

      setStatus(newStatus);
    } catch (err) {
      console.error('Toggle status error:', err);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
        isOnline
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-gray-50 border-gray-200'
      }`}
      id="driver-status-toggle"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-100' : 'bg-gray-200'}`}>
          {isOnline ? (
            <Wifi className="w-5 h-5 text-emerald-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-gray-500" />
          )}
        </div>
        <div>
          <p className={`font-bold ${isOnline ? 'text-emerald-700' : 'text-gray-700'}`}>
            {isOnline ? 'You are Online' : 'You are Offline'}
          </p>
          <p className="text-xs text-gray-500">
            {isOnline ? 'Accepting rides & visible to passengers' : 'Not visible to passengers'}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        type="button"
        onClick={toggleStatus}
        disabled={isToggling}
        className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isOnline
            ? 'bg-emerald-500 focus:ring-emerald-400'
            : 'bg-gray-300 focus:ring-gray-400'
        } ${isToggling ? 'opacity-50' : ''}`}
      >
        <motion.div
          animate={{ x: isOnline ? 26 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
        />
      </button>
    </motion.div>
  );
};

export default DriverStatusToggle;
