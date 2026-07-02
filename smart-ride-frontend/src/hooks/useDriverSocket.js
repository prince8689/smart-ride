import { useCallback } from 'react';
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '../utils/constants';

export function useDriverSocket() {
  const { socket, isConnected } = useSocket();

  const updateLocation = useCallback((lat, lng) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, { lat, lng });
    }
  }, [socket, isConnected]);

  const markArrived = useCallback((subscriptionId, locationType) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.DRIVER_ARRIVED, {
        subscription_id: subscriptionId,
        location_type: locationType
      });
    }
  }, [socket, isConnected]);

  const startRide = useCallback((subscriptionId, slot) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.RIDE_STARTED, {
        subscription_id: subscriptionId,
        slot
      });
    }
  }, [socket, isConnected]);

  const completeRide = useCallback((subscriptionId, slot) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.RIDE_COMPLETED, {
        subscription_id: subscriptionId,
        slot
      });
    }
  }, [socket, isConnected]);

  const sendETA = useCallback((subscriptionId, etaMinutes) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.RIDE_ETA_UPDATE, {
        subscription_id: subscriptionId,
        eta_minutes: etaMinutes
      });
    }
  }, [socket, isConnected]);

  const goOnline = useCallback(() => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.DRIVER_ONLINE);
    }
  }, [socket, isConnected]);

  const goOffline = useCallback(() => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.DRIVER_OFFLINE);
    }
  }, [socket, isConnected]);

  return { updateLocation, markArrived, startRide, completeRide, sendETA, goOnline, goOffline, isConnected };
}
