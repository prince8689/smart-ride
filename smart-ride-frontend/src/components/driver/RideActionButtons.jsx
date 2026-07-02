import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, XCircle, Play } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { useDriverSocket } from '../../hooks/useDriverSocket';
import { markAttendance } from '../../api/driver.api';
import Button from '../ui/Button';

const RideActionButtons = ({ subscription, slot, attendanceStatus, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const { markArrived, startRide, completeRide } = useDriverSocket();
  
  // States to track local flow progress if attendance record doesn't exist yet
  // Flow: Idle -> Arrived -> Started -> Complete
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `rideState_${subscription.id}_${today}_${slot}`;

  // Flow: Idle -> Arrived -> Started -> Complete
  const [localState, setLocalState] = useState(() => {
    return localStorage.getItem(storageKey) || 'idle';
  });

  const updateState = (newState) => {
    setLocalState(newState);
    localStorage.setItem(storageKey, newState);
  };

  // If attendance is already marked, lock the buttons
  if (attendanceStatus === 'completed') {
    localStorage.removeItem(storageKey); // Clean up
    return (
      <Button variant="outline" size="sm" fullWidth disabled className="border-green-200 bg-green-50 text-green-700 opacity-100">
        <CheckCircle2 size={16} className="mr-2" /> Completed
      </Button>
    );
  }

  if (attendanceStatus === 'missed') {
    localStorage.removeItem(storageKey); // Clean up
    return (
      <Button variant="outline" size="sm" fullWidth disabled className="border-red-200 bg-red-50 text-red-700 opacity-100">
        <XCircle size={16} className="mr-2" /> Marked Missed
      </Button>
    );
  }

  // Action Handlers
  const handleMarkArrived = async () => {
    setLoading(true);
    try {
      await markArrived(subscription.id, 'pickup');
      updateState('arrived');
      toast.success('Passenger notified of your arrival');
    } catch (err) {
      toast.error('Failed to notify passenger');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async () => {
    setLoading(true);
    try {
      await startRide(subscription.id, slot);
      updateState('started');
      toast.success('Ride started');
    } catch (err) {
      toast.error('Failed to start ride');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    setLoading(true);
    try {
      // 1. Emit socket event
      await completeRide(subscription.id, slot);
      
      // 2. Call Attendance API
      const now = new Date().toISOString();
      const res = await markAttendance({
        subscription_id: subscription.id,
        date: new Date().toISOString().split('T')[0],
        slot: slot,
        status: 'completed',
        pickup_time: now, // Simplification: using now for both in this flow
        drop_time: now
      });
      
      if (res.success) {
        toast.success('Ride completed successfully');
        localStorage.removeItem(storageKey);
        if (onActionComplete) onActionComplete();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete ride');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMissed = async () => {
    setLoading(true);
    try {
      const res = await markAttendance({
        subscription_id: subscription.id,
        date: new Date().toISOString().split('T')[0],
        slot: slot,
        status: 'missed'
      });
      if (res.success) {
        toast('Marked as missed', { icon: '⚠️' });
        localStorage.removeItem(storageKey);
        if (onActionComplete) onActionComplete();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark missed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 w-full">
      {localState === 'idle' && (
        <>
          <Button size="sm" fullWidth onClick={handleMarkArrived} isLoading={loading} leftIcon={<MapPin size={16} />}>
            Mark Arrived
          </Button>
          <Button variant="danger" size="sm" onClick={handleMarkMissed} disabled={loading} className="px-3" title="Passenger no-show">
            <XCircle size={16} />
          </Button>
        </>
      )}

      {localState === 'arrived' && (
        <Button size="sm" fullWidth onClick={handleStartRide} isLoading={loading} className="bg-green-600 hover:bg-green-700 text-white border-green-600" leftIcon={<Play size={16} />}>
          Start Ride
        </Button>
      )}

      {localState === 'started' && (
        <Button size="sm" fullWidth onClick={handleCompleteRide} isLoading={loading} variant="primary" leftIcon={<CheckCircle2 size={16} />}>
          Complete Ride
        </Button>
      )}
    </div>
  );
};

export default RideActionButtons;
