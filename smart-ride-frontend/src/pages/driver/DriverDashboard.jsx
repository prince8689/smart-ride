import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, CalendarCheck, Star, MapPin, Phone, RefreshCw, ClipboardCheck, User, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from '../../utils/toastConfig';
import { getAssignedPassengers, getAttendance, getEarnings, getDashboardStats } from '../../api/driver.api';
import { useAuth } from '../../hooks/useAuth';
import { useDriverSocket } from '../../hooks/useDriverSocket';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import RideActionButtons from '../../components/driver/RideActionButtons';
import { SkeletonStats, SkeletonCard } from '../../components/ui/Skeleton';
import useCountAnimation from '../../hooks/useCountAnimation';

const AnimatedStat = ({ value, isNumber, formatter }) => {
  const animatedValue = useCountAnimation(isNumber ? Number(value) : 0);
  if (!isNumber) return value;
  return formatter ? formatter(animatedValue) : animatedValue;
};

const DriverDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { isConnected, goOnline } = useDriverSocket();
  
  const [isLoading, setIsLoading] = useState(true);
  const [passengers, setPassengers] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [stats, setStats] = useState({ activePass: 0, todayRides: 0, monthRides: 0, rating: 4.8 });

  const isOnline = user?.driver_profile?.is_available || user?.is_available || false;

  const fetchData = async () => {
    try {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [passRes, attRes, earningsRes, statsRes] = await Promise.all([
        getAssignedPassengers(),
        getAttendance({ month: currentMonth, year: currentYear }),
        getEarnings(),
        getDashboardStats()
      ]);

      let newStats = { activePass: 0, todayRides: 0, monthRides: 0, rating: 4.8, earningsThisMonth: 0 };

      if (statsRes && statsRes.success) {
        newStats.rating = statsRes.data.rating;
        newStats.activePass = statsRes.data.active_passengers;
      }

      if (earningsRes && earningsRes.success) {
        newStats.earningsThisMonth = earningsRes.data.this_month || 0;
      }

      if (passRes && passRes.success) {
        const normalizedData = (passRes.data || []).map(p => ({
          id: p.subscription_id,
          pickup_address: p.pickup_address,
          drop_address: p.drop_address,
          pickup_lat: p.pickup_lat,
          pickup_lng: p.pickup_lng,
          drop_lat: p.drop_lat,
          drop_lng: p.drop_lng,
          start_date: p.start_date,
          end_date: p.end_date,
          slots_selected: [p.morning_slot ? 'morning' : null, p.evening_slot ? 'evening' : null].filter(Boolean),
          user: {
            full_name: p.passenger_name || '',
            phone: p.passenger_phone || '',
            email: p.passenger_email || ''
          },
          route: {
             morning_pickup_time: p.morning_pickup_time,
             evening_pickup_time: p.evening_pickup_time
          },
          plan: {
             name: p.route_name || 'Standard Plan'
          }
        }));
        setPassengers(normalizedData);
        newStats.activePass = normalizedData.length;
      }
      
      if (attRes && attRes.success) {
        const monthAttendance = attRes.data.attendance || [];
        const todayAttendanceData = monthAttendance.filter(a => a.date && a.date.substring(0, 10) === todayString);
        
        setTodayAttendance(todayAttendanceData);
        
        const completedToday = todayAttendanceData.filter(a => a.status === 'completed').length;
        const completedMonth = monthAttendance.filter(a => a.status === 'completed').length;
        
        newStats.todayRides = completedToday;
        newStats.monthRides = completedMonth;
      }

      setStats(prev => ({ ...prev, ...newStats }));
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAttendanceStatus = (subId, slot) => {
    const record = todayAttendance.find(a => a.subscription_id === subId && a.slot === slot);
    return record ? record.status : null; // 'completed' | 'missed' | null
  };

  const currentHour = new Date().getHours();
  const activeSlot = currentHour < 14 ? 'morning' : 'evening';

  const schedulePassengers = passengers.filter(p => p.slots_selected?.includes(activeSlot));

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SkeletonStats />
        <SkeletonCard lines={3} showAvatar={true} />
        <SkeletonCard lines={3} showAvatar={true} />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Online Status Banner */}
      {!isOnline ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-yellow-800">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
            <p className="font-medium">You are offline. Go online to receive assignments and share location.</p>
          </div>
          <Button size="sm" onClick={() => navigate('/driver/profile')} className="shrink-0 bg-green-600 hover:bg-green-700 text-white border-green-600">
            Go Online Now
          </Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-800">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <p className="font-medium text-sm md:text-base">You are online and available for rides.</p>
          {!isConnected && <span className="text-xs ml-auto text-red-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Socket disconnected</span>}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Passengers', value: stats.activePass, isNumber: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: "Today's Rides", value: stats.todayRides, isNumber: true, icon: Car, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'This Month', value: stats.monthRides, isNumber: true, icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'My Rating', value: stats.rating, isNumber: true, formatter: v => `${v}★`, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        ].map((stat, i) => (
          <Card key={i} className="flex items-center gap-4 p-4 md:p-6">
            <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-navy-500 text-xs md:text-sm font-medium">{stat.label}</p>
              <p className="text-lg md:text-xl font-bold text-navy-900">
                <AnimatedStat value={stat.value} isNumber={stat.isNumber} formatter={stat.formatter} />
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Schedule */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              Today's Schedule
              <Badge color="blue" size="sm" className="capitalize">{activeSlot} Shift</Badge>
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchData} leftIcon={<RefreshCw size={16} />}>Refresh</Button>
          </div>

          {schedulePassengers.length === 0 ? (
            <Card className="text-center p-12 border-dashed border-2">
              <div className="w-16 h-16 bg-navy-50 text-navy-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
              </div>
              <p className="text-navy-500">No passengers assigned for this shift.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedulePassengers.map((sub, i) => (
                <motion.div 
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar name={sub.user?.full_name} src={sub.user?.profile_photo} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between md:justify-start gap-3 mb-1">
                          <h3 className="font-bold text-navy-900 truncate">{sub.user?.full_name}</h3>
                          <a href={`tel:${sub.user?.phone}`} className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center md:hidden">
                            <Phone size={14} />
                          </a>
                        </div>
                        
                        <div className="space-y-1 mb-2">
                          <div className="flex items-start gap-2 text-xs text-navy-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                            <span className="truncate">{sub.pickup_address}</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-navy-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                            <span className="truncate">{sub.drop_address}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Badge color="gray" size="sm">
                            <Clock size={12} className="mr-1 inline" /> 
                            {activeSlot === 'morning' ? sub.route?.morning_pickup_time : sub.route?.evening_pickup_time}
                          </Badge>
                          <a href={`tel:${sub.user?.phone}`} className="text-xs font-medium text-primary-600 hover:underline hidden md:flex items-center gap-1">
                            <Phone size={12} /> {sub.user?.phone}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-64 shrink-0 pt-3 border-t md:border-t-0 md:border-l border-navy-100 md:pl-4">
                      <RideActionButtons 
                        subscription={sub} 
                        slot={activeSlot}
                        attendanceStatus={getAttendanceStatus(sub.id, activeSlot)}
                        onActionComplete={fetchData}
                      />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Right Sidebar Widgets */}
        <section className="space-y-6">
          <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
            <h3 className="text-navy-300 text-sm font-bold uppercase tracking-wider mb-2">Earnings Overview</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">₹{stats.earningsThisMonth || 0}</span>
              <span className="text-navy-400 text-sm ml-2">this month</span>
            </div>
            
            {/* Simple CSS Mini Chart */}
            <div className="flex items-end gap-2 h-16 pt-2 border-t border-navy-700 mt-4">
              {[40, 70, 45, 90].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                  <div className="w-full bg-primary-600 rounded-t-sm transition-all group-hover:bg-primary-400" style={{ height: `${h}%` }}></div>
                  <span className="text-[10px] text-navy-400 mt-1">W{i+1}</span>
                </div>
              ))}
            </div>
            
            <Button variant="ghost" fullWidth className="mt-4 text-primary-300 hover:text-white hover:bg-navy-700" onClick={() => navigate('/driver/earnings')}>
              View Detailed Earnings
            </Button>
          </Card>

          <Card>
            <h3 className="font-bold text-navy-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MapPin, label: 'Live Map', path: '/driver/map', color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: Users, label: 'Passengers', path: '/driver/passengers', color: 'text-green-600', bg: 'bg-green-50' },
                { icon: ClipboardCheck, label: 'Attendance', path: '/driver/attendance', color: 'text-purple-600', bg: 'bg-purple-50' },
                { icon: User, label: 'Profile', path: '/driver/profile', color: 'text-orange-600', bg: 'bg-orange-50' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-navy-200 transition-all ${action.bg}`}
                >
                  <action.icon size={20} className={`${action.color} mb-2`} />
                  <span className="text-xs font-bold text-navy-900">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default DriverDashboard;
