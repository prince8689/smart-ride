import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, CalendarCheck } from 'lucide-react';
import { markV2Attendance, getV2TodayAttendance, getV2AttendanceHistory } from '../../api/v2.api';
import toast from '../../utils/toastConfig';

/**
 * AttendanceWidget — Shows today's attendance and weekly history.
 */
const AttendanceWidget = () => {
  const [todayStatus, setTodayStatus] = useState(null); // null = not marked
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [weekHistory, setWeekHistory] = useState([]);

  const fetchData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        getV2TodayAttendance(),
        getV2AttendanceHistory(new Date().toISOString().substring(0, 7)),
      ]);

      if (todayRes.success && todayRes.data) {
        setTodayStatus(todayRes.data.status);
      }

      if (historyRes.success && historyRes.data?.records) {
        // Get last 7 records
        setWeekHistory(historyRes.data.records.slice(0, 7));
      }
    } catch (err) {
      // Silently handle — attendance tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMark = async (status) => {
    setIsMarking(true);
    try {
      const res = await markV2Attendance({ status });
      if (res.success) {
        setTodayStatus(status);
        toast.success(`Marked as ${status === 'ready' ? 'Ready ✅' : 'Unavailable ❌'}`);
      } else {
        toast.error(res.message || 'Failed to mark attendance');
      }
    } catch (err) {
      if (err.message?.includes('already marked') || err.message?.includes('409')) {
        toast.error('Attendance already marked for today');
      } else {
        toast.error(err.message || 'Failed to mark attendance');
      }
    } finally {
      setIsMarking(false);
    }
  };

  const statusColors = {
    ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    unavailable: 'bg-red-100 text-red-700 border-red-200',
    auto_unavailable: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const statusIcons = {
    ready: <CheckCircle2 className="w-4 h-4" />,
    unavailable: <XCircle className="w-4 h-4" />,
    auto_unavailable: <Clock className="w-4 h-4" />,
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-gray-800">Today's Attendance</h3>
        </div>
        <div className="h-16 animate-pulse bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
      id="attendance-widget"
    >
      <div className="flex items-center gap-2 mb-4">
        <CalendarCheck className="w-5 h-5 text-blue-500" />
        <h3 className="font-bold text-gray-800">Today's Attendance</h3>
      </div>

      {/* Current Status or Action Buttons */}
      {todayStatus ? (
        <div className={`flex items-center gap-2 p-3 rounded-xl border ${statusColors[todayStatus]}`}>
          {statusIcons[todayStatus]}
          <span className="font-semibold capitalize">{todayStatus.replace('_', ' ')}</span>
          <span className="text-xs ml-auto opacity-70">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      ) : (
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleMark('ready')}
            disabled={isMarking}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-md shadow-emerald-100"
          >
            <CheckCircle2 className="w-5 h-5" />
            Mark Ready
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleMark('unavailable')}
            disabled={isMarking}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all shadow-md shadow-red-100"
          >
            <XCircle className="w-5 h-5" />
            Unavailable
          </motion.button>
        </div>
      )}

      {/* Week History */}
      {weekHistory.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">This Week</p>
          <div className="flex gap-1.5">
            {weekHistory.map((record, i) => {
              const date = new Date(record.date);
              const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'narrow' });
              const bgColor = record.status === 'ready' ? 'bg-emerald-400'
                : record.status === 'unavailable' ? 'bg-red-400'
                : 'bg-amber-400';

              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center`} title={record.status}>
                    <span className="text-white text-[10px] font-bold">{dayLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AttendanceWidget;
