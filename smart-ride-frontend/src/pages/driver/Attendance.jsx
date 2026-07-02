import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, CheckCircle2, XCircle, Clock,
  ChevronLeft, ChevronRight, List, Sun, Moon
} from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getAttendance, markAttendance, getAssignedPassengers } from '../../api/driver.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatDate } from '../../utils/helpers';

const STATUS_CONFIG = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'green', bg: 'bg-green-100', text: 'text-green-700' },
  missed:    { label: 'Missed',    icon: XCircle,      color: 'red',   bg: 'bg-red-100',   text: 'text-red-700' },
  pending:   { label: 'Pending',   icon: Clock,        color: 'yellow',bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

// ------- Mark Attendance Modal -------
function MarkModal({ isOpen, onClose, onSubmit, passenger, slot, existingRecord }) {
  const [status, setStatus] = useState('completed');
  const [pickupTime, setPickupTime] = useState('');
  const [dropTime, setDropTime] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      setStatus(existingRecord?.status || 'completed');
      setPickupTime(existingRecord?.pickup_time?.slice(11, 16) || '');
      setDropTime(existingRecord?.drop_time?.slice(11, 16) || '');
    }
  }, [isOpen, existingRecord]);

  async function handleSubmit() {
    if (!passenger) return;
    setLoading(true);
    try {
      await onSubmit({
        subscription_id: passenger.id,
        date: today,
        slot,
        status,
        pickup_time: status === 'completed' && pickupTime
          ? `${today}T${pickupTime}:00` : undefined,
        drop_time: status === 'completed' && dropTime
          ? `${today}T${dropTime}:00` : undefined,
      });
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  }

  const passengerName = passenger?.passenger_name || passenger?.user?.full_name || 'Passenger';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark ${slot === 'morning' ? 'Morning' : 'Evening'} Attendance`}
      size="sm"
    >
      <div className="space-y-5">
        {/* Passenger info */}
        {passenger && (
          <div className="bg-navy-50 rounded-xl p-3 text-sm border border-navy-100">
            <p className="font-bold text-navy-900">{passengerName}</p>
            <p className="text-navy-500 text-xs mt-0.5">{passenger.pickup_address || ''}</p>
          </div>
        )}

        {/* Status selection */}
        <div>
          <p className="text-sm font-bold text-navy-700 mb-2">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {['completed', 'missed'].map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  status === s
                    ? s === 'completed'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-red-400 bg-red-50 text-red-700'
                    : 'border-navy-200 text-navy-500 hover:border-navy-300'
                }`}
              >
                {s === 'completed'
                  ? <><CheckCircle2 size={16} /> Completed</>
                  : <><XCircle size={16} /> Missed</>
                }
              </button>
            ))}
          </div>
        </div>

        {/* Time inputs (only for completed) */}
        <AnimatePresence>
          {status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <label className="block text-xs font-bold text-navy-600 mb-1">Pickup Time</label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                  className="w-full border border-navy-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-600 mb-1">Drop Time</label>
                <input
                  type="time"
                  value={dropTime}
                  onChange={e => setDropTime(e.target.value)}
                  className="w-full border border-navy-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-colors"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth isLoading={loading} onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ------- Calendar View -------
function CalendarView({ attendance, month, year }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getRecordsForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.filter(a => a.date?.startsWith(dateStr));
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* Day header row */}
      <div className="grid grid-cols-7 bg-navy-50 border-b border-navy-100">
        {dayNames.map(d => (
          <div key={d} className="py-3 text-center text-xs font-bold text-navy-500 uppercase">{d}</div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells before the 1st */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2 border border-navy-50 bg-navy-50/30 h-20 md:h-24" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const records = getRecordsForDay(day);
          const isToday = isCurrentMonth && today.getDate() === day;
          const isFuture = isCurrentMonth && day > today.getDate();
          const morningRecord = records.find(r => r.slot === 'morning');
          const eveningRecord = records.find(r => r.slot === 'evening');
          const hasCompleted = records.some(r => r.status === 'completed');
          const hasMissed = records.some(r => r.status === 'missed');

          return (
            <div
              key={`day-${day}`}
              className={`p-2 border border-navy-50 h-20 md:h-24 flex flex-col transition-colors ${
                isToday ? 'bg-primary-50 border-primary-200' :
                isFuture ? 'bg-navy-50/20 text-navy-300' :
                'bg-white hover:bg-navy-50'
              }`}
            >
              <span className={`text-sm font-bold mb-auto ${
                isToday ? 'text-primary-600' :
                isFuture ? 'text-navy-300' : 'text-navy-900'
              }`}>
                {day}
              </span>

              <div className="space-y-1">
                {/* Morning slot indicator */}
                {morningRecord && (
                  <div className="flex items-center gap-1 text-[10px] font-medium">
                    <div className={`w-1.5 h-1.5 rounded-full ${morningRecord.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="truncate w-full text-navy-600">Mor</span>
                  </div>
                )}

                {/* Evening slot indicator */}
                {eveningRecord && (
                  <div className="flex items-center gap-1 text-[10px] font-medium">
                    <div className={`w-1.5 h-1.5 rounded-full ${eveningRecord.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="truncate w-full text-navy-600">Eve</span>
                  </div>
                )}

                {/* Summary dots for small screens */}
                {records.length > 0 && !morningRecord && !eveningRecord && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasCompleted && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    {hasMissed && <div className="w-2 h-2 rounded-full bg-red-400" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 border-t border-navy-100 bg-navy-50/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-xs text-navy-500 font-medium">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-xs text-navy-500 font-medium">Missed</span>
        </div>
      </div>
    </Card>
  );
}

// ------- Main Attendance Component -------
const Attendance = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [viewMode, setViewMode] = useState('calendar');
  const [attendance, setAttendance] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markModal, setMarkModal] = useState(null); // { passenger, slot }

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [attRes, passRes] = await Promise.all([
        getAttendance({ month: month + 1, year }),
        getAssignedPassengers()
      ]);
      // Handle different API response shapes
      const attData = attRes?.data?.attendance || attRes?.data || attRes || [];
      setAttendance(Array.isArray(attData) ? attData : []);

      const passData = passRes?.data?.subscriptions || passRes?.data || passRes || [];
      setPassengers(Array.isArray(passData) ? passData : []);
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleMarkAttendance(data) {
    await markAttendance(data);
    toast.success('Attendance marked successfully');
    fetchData();
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    const nextDate = new Date(year, month + 1, 1);
    if (nextDate <= new Date()) {
      if (month === 11) { setMonth(0); setYear(y => y + 1); }
      else setMonth(m => m + 1);
    }
  }

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const summary = {
    total: attendance.length,
    completed: attendance.filter(a => a.status === 'completed').length,
    missed: attendance.filter(a => a.status === 'missed').length,
    pending: attendance.filter(a => a.status === 'pending').length,
  };

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-900">Attendance Tracker</h1>
          <p className="text-navy-500 text-sm mt-1">Track your daily ride attendance</p>
        </div>

        {/* View toggle */}
        <div className="flex bg-white rounded-xl border border-navy-200 p-1">
          <button
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'calendar' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50'
            }`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon size={14} /> Calendar
          </button>
          <button
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'list' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50'
            }`}
            onClick={() => setViewMode('list')}
          >
            <List size={14} /> List
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-navy-100 shadow-sm">
        <button onClick={prevMonth} className="p-2 hover:bg-navy-50 rounded-full text-navy-600 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-navy-900">{monthName}</h2>
        <button
          onClick={nextMonth}
          disabled={month === today.getMonth() && year === today.getFullYear()}
          className="p-2 hover:bg-navy-50 rounded-full text-navy-600 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: summary.total, colorClass: 'text-navy-900', bgClass: '' },
          { label: 'Completed', value: summary.completed, colorClass: 'text-green-700', bgClass: 'bg-green-50/50 border-green-100', icon: CheckCircle2 },
          { label: 'Missed', value: summary.missed, colorClass: 'text-red-700', bgClass: 'bg-red-50/50 border-red-100', icon: XCircle },
          { label: 'Pending', value: summary.pending, colorClass: 'text-yellow-700', bgClass: 'bg-yellow-50/50 border-yellow-100', icon: Clock },
        ].map(s => (
          <Card key={s.label} className={`text-center p-4 ${s.bgClass}`}>
            <p className={`${s.colorClass} text-sm font-medium mb-1 flex items-center justify-center gap-1`}>
              {s.icon && <s.icon size={14} />} {s.label}
            </p>
            <p className={`text-2xl font-bold ${s.colorClass}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Content: Calendar or List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : attendance.length === 0 && viewMode === 'list' ? (
        <EmptyState
          icon={CalendarIcon}
          title="No attendance records"
          description={`No rides recorded in ${new Date(year, month).toLocaleString('default', { month: 'long' })}.`}
          className="bg-white py-16"
        />
      ) : viewMode === 'calendar' ? (
        <CalendarView attendance={attendance} month={month} year={year} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Passenger</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Slot</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Timings</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {[...attendance].sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => {
                  const config = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
                  const passengerName = record.passenger_name
                    || record.subscription?.user?.full_name
                    || `Sub #${(record.subscription_id || '').toString().slice(0, 6)}`;
                  return (
                    <tr key={record.id} className="hover:bg-navy-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-navy-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-navy-900">{passengerName}</td>
                      <td className="px-6 py-4">
                        <Badge color="blue" size="sm" className="capitalize">
                          {record.slot === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-navy-600">
                        {record.status === 'completed' ? (
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {record.pickup_time || '--'} to {record.drop_time || '--'}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={config.color} size="sm">
                          {config.label.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mark Today's Attendance */}
      {passengers.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold text-lg text-navy-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-primary-600" />
            Mark Today's Attendance
          </h3>
          <div className="space-y-2">
            {passengers.map(p => {
              const name = p.passenger_name || p.user?.full_name || 'Passenger';
              const hasMorning = p.morning_slot !== false;
              const hasEvening = p.evening_slot !== false;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3 border-b border-navy-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-900 truncate">{name}</p>
                    {p.pickup_address && (
                      <p className="text-xs text-navy-500 truncate mt-0.5">{p.pickup_address}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {hasMorning && (
                      <button
                        onClick={() => setMarkModal({ passenger: p, slot: 'morning' })}
                        className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-2 rounded-xl font-bold transition-colors border border-orange-100"
                      >
                        <Sun size={13} /> Morning
                      </button>
                    )}
                    {hasEvening && (
                      <button
                        onClick={() => setMarkModal({ passenger: p, slot: 'evening' })}
                        className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl font-bold transition-colors border border-indigo-100"
                      >
                        <Moon size={13} /> Evening
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Mark Attendance Modal */}
      <MarkModal
        isOpen={!!markModal}
        onClose={() => setMarkModal(null)}
        onSubmit={handleMarkAttendance}
        passenger={markModal?.passenger}
        slot={markModal?.slot}
      />
    </div>
  );
};

export default Attendance;
