import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, IndianRupee, AlertCircle, Car, ShieldCheck, Clock, UserX, Megaphone, MessageSquare } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getDashboardStats } from '../../api/admin.api';
import { useAdminSocket } from '../../hooks/useAdminSocket';
import { formatCurrency, timeAgo } from '../../utils/helpers';
import StatsCard from '../../components/admin/StatsCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import MapWrapper from '../../components/map/MapWrapper';
import { SkeletonStats, SkeletonChart } from '../../components/ui/Skeleton';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

const RevenueChart = lazy(() => import('../../components/admin/RevenueChart'));
const StatusChart = lazy(() => import('../../components/admin/StatusChart'));

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { recentActivity, onlineDrivers, isConnected } = useAdminSocket();
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartType, setChartType] = useState('area'); // area | line | bar

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Auto refresh 30s
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#94A3B8'];

  // Real data integration placeholder
  const revenueData = [
    { name: 'Jan', amount: 0, transactions: 0 },
    { name: 'Feb', amount: 0, transactions: 0 },
    { name: 'Mar', amount: 0, transactions: 0 },
    { name: 'Apr', amount: 0, transactions: 0 },
    { name: 'May', amount: 0, transactions: 0 },
    { name: 'Jun', amount: stats?.today_revenue || 0, transactions: 0 },
  ];

  const subStatusData = [
    { name: 'Active', value: stats?.active_subscriptions || 0 },
    { name: 'Pending', value: stats?.pending_subscriptions || 0 },
    { name: 'Cancelled', value: 0 },
    { name: 'Expired', value: 0 },
  ];

  // CustomTooltip is now in RevenueChart

  return (
    <div className="space-y-6">
      {isLoading ? (
        <React.Fragment>
          <SkeletonStats />
          <SkeletonStats />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SkeletonChart />
            </div>
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
      {/* Pending Driver Alert */}
      {stats?.unverified_pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm animate-pulse-light mb-6">
          <div className="flex items-center gap-3 text-yellow-800 mb-4 sm:mb-0">
            <AlertCircle size={24} className="text-yellow-600 shrink-0" />
            <div>
              <p className="font-bold text-yellow-900">Pending Driver Verifications</p>
              <p className="text-sm">There are {stats.unverified_pending} new driver profile(s) waiting for your review.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/admin/drivers/unverified')} className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 whitespace-nowrap">
            Review Now
          </Button>
        </div>
      )}

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          isLoading={isLoading} title="Total Users" value={stats?.total_users || 0} icon={Users} color="blue" 
          trend={stats?.user_growth_percent && Math.abs(stats.user_growth_percent) > 0.01 ? (stats.user_growth_percent > 0 ? 'up' : 'down') : null} 
          trendValue={stats?.user_growth_percent && Math.abs(stats.user_growth_percent) > 0.01 ? `${Math.abs(stats.user_growth_percent).toFixed(1)}%` : null} 
        />
        <StatsCard 
          isLoading={isLoading} title="Active Subscriptions" value={stats?.active_subscriptions || 0} icon={CalendarCheck} color="green" 
        />
        <StatsCard 
          isLoading={false} title="Today's Revenue" value={stats?.today_revenue || 0} formatter={formatCurrency} icon={IndianRupee} color="primary" 
          trend={stats?.revenue_growth_percent && Math.abs(stats.revenue_growth_percent) > 0.01 ? (stats.revenue_growth_percent > 0 ? 'up' : 'down') : null}
          trendValue={stats?.revenue_growth_percent && Math.abs(stats.revenue_growth_percent) > 0.01 ? `${Math.abs(stats.revenue_growth_percent).toFixed(1)}%` : null}
        />
        <StatsCard 
          isLoading={isLoading} title="Open Complaints" value={stats?.open_complaints || 0} icon={AlertCircle} color="red" 
          onClick={() => navigate('/admin/complaints')}
        />
        
        <StatsCard isLoading={isLoading} title="Total Drivers" value={stats?.total_drivers || 0} icon={Car} color="purple" />
        <StatsCard isLoading={isLoading} title="Verified Drivers" value={stats?.verified_drivers || 0} icon={ShieldCheck} color="green" />
        <StatsCard 
          isLoading={isLoading} title="Unverified Pending" value={stats?.unverified_pending || 0} icon={Clock} color="orange" 
          onClick={() => navigate('/admin/drivers/unverified')}
        />
        <StatsCard 
          isLoading={isLoading} title="Unassigned Subs" value={stats?.unassigned_active || 0} icon={UserX} color="red" 
          onClick={() => navigate('/admin/subscriptions/unassigned')}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Charts (Takes 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <Card className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-navy-900">Revenue Overview</h3>
              <div className="flex bg-navy-50 rounded-lg p-1 border border-navy-100">
                {['line', 'area', 'bar'].map(t => (
                  <button key={t} onClick={() => setChartType(t)} className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-colors ${chartType === t ? 'bg-white shadow-sm text-primary-600' : 'text-navy-500 hover:text-navy-900'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[250px] md:h-[300px] w-full">
              <ErrorBoundary>
                <Suspense fallback={<SkeletonChart />}>
                  <RevenueChart data={revenueData} type={chartType} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </Card>

          {/* Bottom row of left column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-navy-900 mb-4">Subscription Status</h3>
              <div className="h-[200px] relative">
                <ErrorBoundary>
                  <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>}>
                    <StatusChart data={subStatusData} />
                  </Suspense>
                </ErrorBoundary>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-36px]">
                  <span className="text-2xl font-bold text-navy-900">{stats?.total_subscriptions || 0}</span>
                  <span className="text-[10px] text-navy-500 font-bold uppercase">Total</span>
                </div>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-navy-100 bg-navy-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Quick Actions</h3>
              </div>
              <div className="p-2 space-y-2 flex-1 flex flex-col justify-center">
                <Button variant="outline" fullWidth className="justify-between bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" onClick={() => navigate('/admin/drivers/unverified')}>
                  <span className="flex items-center gap-2"><Clock size={18}/> Verify Drivers</span>
                  {stats?.unverified_pending > 0 && <Badge color="orange">{stats.unverified_pending}</Badge>}
                </Button>
                <Button variant="outline" fullWidth className="justify-between bg-red-50 border-red-200 text-red-700 hover:bg-red-100" onClick={() => navigate('/admin/subscriptions/unassigned')}>
                  <span className="flex items-center gap-2"><UserX size={18}/> Assign Drivers</span>
                  {stats?.unassigned_active > 0 && <Badge color="red">{stats.unassigned_active}</Badge>}
                </Button>
                <Button variant="outline" fullWidth className="justify-between bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" onClick={() => navigate('/admin/complaints')}>
                  <span className="flex items-center gap-2"><MessageSquare size={18}/> View Complaints</span>
                  {stats?.open_complaints > 0 && <Badge color="blue">{stats.open_complaints}</Badge>}
                </Button>
                <Button variant="primary" fullWidth className="justify-between" onClick={() => navigate('/admin/broadcast')}>
                  <span className="flex items-center gap-2"><Megaphone size={18}/> Send Broadcast</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column - Activity & Map */}
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-navy-100 bg-navy-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-navy-900">Live Activity Feed</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <div className={`w-2 h-2 rounded-full bg-green-500 ${isConnected ? 'animate-pulse' : ''}`}></div>
                Live
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {recentActivity.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-navy-400 text-sm">
                  Waiting for new events...
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3 items-start animate-fade-in">
                    <div className="shrink-0 mt-1">
                      {activity.type === 'subscription' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                      {activity.type === 'payment' && <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>}
                      {activity.type === 'complaint' && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900">{activity.message}</p>
                      <p className="text-xs text-navy-400 mt-0.5">{timeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Mini Live Map */}
          <Card className="p-0 overflow-hidden h-[300px] flex flex-col">
            <div className="p-3 border-b border-navy-100 bg-navy-50 flex justify-between items-center shrink-0 z-10">
              <h3 className="text-sm font-bold text-navy-900">Online Drivers Map</h3>
              <Badge color="green" size="sm">{onlineDrivers.length} Online</Badge>
            </div>
            <div className="flex-1 relative bg-navy-100">
              {/* Very simple placeholder for mini map due to complexity of initializing multiple map instances.
                  In full implementation, this uses MapWrapper + custom map rendering markers from onlineDrivers array */}
              <div className="absolute inset-0 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgwLCAwLCAwLCAwLjEpIi8+PC9zdmc+')]">
                {onlineDrivers.length === 0 ? (
                  <span className="bg-white/80 px-3 py-1 rounded-full text-xs font-bold text-navy-500">No active drivers to show</span>
                ) : (
                  <div className="relative w-full h-full p-4">
                    {/* Simulated random placement of markers based on ID for demo purposes if real lat/lng missing */}
                    {onlineDrivers.map((d, i) => (
                      <div key={d.id} className="absolute flex flex-col items-center animate-bounce" style={{ 
                        top: d.lat ? `${((d.lat - 18)/(22-18))*100}%` : `${20 + (i * 15)}%`, 
                        left: d.lng ? `${((d.lng - 72)/(78-72))*100}%` : `${30 + (i * 20)}%` 
                      }}>
                        <div className="w-3 h-3 bg-primary-600 rounded-full border-2 border-white shadow-md"></div>
                        <span className="bg-white text-[8px] font-bold px-1 rounded shadow-sm mt-1 truncate max-w-[60px]">{d.name || 'Driver'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
      </React.Fragment>
      )}
    </div>
  );
};

export default AdminDashboard;
