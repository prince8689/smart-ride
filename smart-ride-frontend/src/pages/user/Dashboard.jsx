import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, CreditCard, Clock, MapPin, Plus, FileText, HelpCircle, Car, User } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import { getMySubscriptions } from '../../api/subscription.api';
import { getMyPayments } from '../../api/payment.api';
import { formatCurrency, calculateDaysLeft } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';
import RenewalBanner from '../../components/shared/RenewalBanner';
import { SkeletonStats, SkeletonCard } from '../../components/ui/Skeleton';
import useCountAnimation from '../../hooks/useCountAnimation';
import EmptyState from '../../components/ui/EmptyState';

const AnimatedStat = ({ value, isNumber, formatter }) => {
  const animatedValue = useCountAnimation(isNumber ? Number(value) : 0);
  if (!isNumber) return value;
  return formatter ? formatter(animatedValue) : animatedValue;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    activeSub: null,
    totalSpent: 0,
    recentPayments: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, paymentsRes] = await Promise.all([
          getMySubscriptions(),
          getMyPayments()
        ]);

        const activeSub = subsRes.success && Array.isArray(subsRes.data) 
          ? subsRes.data.find(s => s.status === 'active')
          : null;
        
        let totalSpent = 0;
        let recentPayments = [];
        if (paymentsRes.success && paymentsRes.data && Array.isArray(paymentsRes.data.payments)) {
          const successful = paymentsRes.data.payments.filter(p => p.status === 'success');
          totalSpent = successful.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          recentPayments = paymentsRes.data.payments.slice(0, 3);
        }

        setData({ activeSub, totalSpent, recentPayments });
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const [driverLocation, setDriverLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const { getActiveDriverLocation } = require('../../api/user.api');

  useEffect(() => {
    let interval;
    if (isTracking && data.activeSub?.driver) {
      const fetchLocation = async () => {
        try {
          const res = await getActiveDriverLocation();
          if (res.success && res.data) {
            setDriverLocation(res.data);
          }
        } catch (error) {
          console.error('Failed to fetch driver location');
        }
      };
      fetchLocation();
      interval = setInterval(fetchLocation, 10000);
    }
    return () => clearInterval(interval);
  }, [isTracking, data.activeSub]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SkeletonStats />
        <SkeletonCard lines={4} showAvatar={true} />
      </div>
    );
  }

  const { activeSub, totalSpent, recentPayments } = data;
  const daysLeft = activeSub ? calculateDaysLeft(activeSub.end_date) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-800 rounded-2xl p-6 md:p-8 flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {getGreeting()}, {user?.full_name ? user.full_name.split(' ')[0] : 'User'}! 👋
          </h1>
          <p className="text-primary-100">Here's your commute overview</p>
        </div>
        <div className="hidden sm:block relative z-10 text-white opacity-80">
          <Car size={80} strokeWidth={1} />
        </div>
      </div>

      {activeSub && <RenewalBanner subscription={activeSub} />}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Subscriptions', value: activeSub ? 1 : 0, isNumber: true, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Next Pickup', value: activeSub ? '8:00 AM' : 'None', isNumber: false, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Total Spent', value: totalSpent, isNumber: true, formatter: formatCurrency, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Days Remaining', value: daysLeft, isNumber: true, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-100' },
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

      {/* Active Subscription Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy-900">Active Commute</h2>
          <Link to="/dashboard/subscriptions" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View All
          </Link>
        </div>

        {activeSub ? (
          <Card className="border-l-4 border-l-primary-600 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <Badge color="green">ACTIVE</Badge>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 md:gap-12">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-navy-900 mb-4">{activeSub.plan?.name || 'Subscription'}</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0"></div>
                    <div>
                      <p className="text-xs text-navy-500 font-medium">PICKUP</p>
                      <p className="text-sm font-medium text-navy-900 line-clamp-1">{activeSub.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0"></div>
                    <div>
                      <p className="text-xs text-navy-500 font-medium">DROP</p>
                      <p className="text-sm font-medium text-navy-900 line-clamp-1">{activeSub.drop_address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {activeSub.slots_selected?.includes('morning') && <Badge color="blue">Morning</Badge>}
                  {activeSub.slots_selected?.includes('evening') && <Badge color="blue">Evening</Badge>}
                </div>
              </div>

              <div className="flex-1 border-t md:border-t-0 md:border-l border-navy-100 pt-4 md:pt-0 md:pl-8 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-navy-900 mb-3">Your Driver</h4>
                  {activeSub.driver ? (
                    <div className="flex items-center gap-3 bg-navy-50 p-3 rounded-xl">
                      <Avatar name={activeSub.driver.full_name} src={activeSub.driver.profile_photo} />
                      <div>
                        <p className="font-bold text-navy-900 text-sm">{activeSub.driver.full_name}</p>
                        <p className="text-xs text-navy-500">{activeSub.driver.vehicle?.brand} {activeSub.driver.vehicle?.model} • {activeSub.driver.vehicle?.plate_number}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-navy-500 italic bg-navy-50 p-3 rounded-xl">
                      <Spinner size="sm" /> Assigning driver...
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-navy-500">Days Remaining</span>
                    <span className="text-primary-600">{daysLeft} days</span>
                  </div>
                  <div className="w-full bg-navy-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-600 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (daysLeft/30)*100))}%` }}></div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="primary" fullWidth onClick={() => setIsTracking(!isTracking)}>
                    {isTracking ? 'Stop Tracking' : 'Track Driver'}
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => navigate('/dashboard/subscriptions')}>
                    Details
                  </Button>
                </div>
                {isTracking && driverLocation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-sm font-bold text-blue-900 mb-1">Live Status</p>
                    <p className="text-xs text-blue-800">
                      Coordinates: {driverLocation.current_lat}, {driverLocation.current_lng}
                    </p>
                    <a href={`https://www.google.com/maps?q=${driverLocation.current_lat},${driverLocation.current_lng}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline mt-2 block">
                      Open in Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center p-8 border-dashed border-2 border-navy-200">
            <EmptyState 
              variant="no-subscription" 
              action={{ label: 'Browse Plans', onClick: () => navigate('/dashboard/book') }}
            />
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Plus, label: 'New Subscription', path: '/dashboard/book' },
              { icon: User, label: 'My Profile', path: '/dashboard/profile' },
              { icon: FileText, label: 'Invoices', path: '/dashboard/payments' },
              { icon: HelpCircle, label: 'Report Issue', path: '/dashboard/complaints' },
            ].map((action, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-navy-100 cursor-pointer flex flex-col items-center justify-center gap-3 hover:border-primary-200 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                  <action.icon size={24} />
                </div>
                <span className="text-sm font-medium text-navy-900">{action.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Payments */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-navy-900">Recent Payments</h2>
            <Link to="/dashboard/payments" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <Card className="p-0 overflow-hidden">
            {recentPayments.length > 0 ? (
              <div className="divide-y divide-navy-100">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-navy-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-navy-100 text-navy-600 rounded-full flex items-center justify-center shrink-0">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy-900">Smart Ride Subscription</p>
                        <p className="text-xs text-navy-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-navy-900">{formatCurrency(payment.amount)}</p>
                      <Badge color={payment.status === 'success' ? 'green' : payment.status === 'failed' ? 'red' : 'yellow'} size="sm">
                        {payment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState variant="no-payments" size="sm" />
            )}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
