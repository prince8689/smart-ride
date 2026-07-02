import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Calendar, Download, TrendingUp, Users, Car } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getRevenueAnalytics, getSubscriptionAnalytics, getDriverAnalytics } from '../../api/admin.api';
import { formatCurrency } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { SkeletonChart } from '../../components/ui/Skeleton';

const Analytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6m'); // 1m, 3m, 6m, 1y

  const [metrics, setMetrics] = useState({ total_revenue: 0, mrr: 0, avg_order_value: 0, refund_rate: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [planData, setPlanData] = useState([]);
  
  const [subscriptionStatusData, setSubscriptionStatusData] = useState([]);
  const [subStats, setSubStats] = useState({ active: 0, cancelled: 0, total: 0 });
  
  const [driverAttendanceData, setDriverAttendanceData] = useState([
    { name: '90-100%', drivers: 0 },
    { name: '70-89%', drivers: 0 },
    { name: '50-69%', drivers: 0 },
    { name: '<50%', drivers: 0 },
  ]);
  const [topDrivers, setTopDrivers] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [revRes, subRes, drvRes] = await Promise.all([
          getRevenueAnalytics({ range: dateRange }),
          getSubscriptionAnalytics({ range: dateRange }),
          getDriverAnalytics()
        ]);
        
        if (revRes.success && revRes.data) {
          setRevenueData(revRes.data.monthly_trend || []);
          
          const fillColors = { 'monthly': '#2563EB', 'quarterly': '#8B5CF6', 'yearly': '#10B981', 'half_yearly': '#F59E0B' };
          setPlanData((revRes.data.by_plan_type || []).map(p => ({
            name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
            value: parseFloat(p.value),
            fill: fillColors[p.name] || '#2563EB'
          })));
          
          if (revRes.data.metrics) setMetrics(revRes.data.metrics);
        }
        
        if (subRes.success && subRes.data) {
          setSubscriptionStatusData(subRes.data.monthly_trend || []);
          if (subRes.data.stats) setSubStats(subRes.data.stats);
        }
        
        if (drvRes.success && drvRes.data) {
          setTopDrivers(drvRes.data.top_drivers || []);
          
          const dist = { '90-100%': 0, '70-89%': 0, '50-69%': 0, '<50%': 0 };
          (drvRes.data.top_drivers || []).forEach(d => {
             const rate = parseFloat(d.attendance_rate);
             if (rate >= 90) dist['90-100%']++;
             else if (rate >= 70) dist['70-89%']++;
             else if (rate >= 50) dist['50-69%']++;
             else dist['<50%']++;
          });
          setDriverAttendanceData([
            { name: '90-100%', drivers: dist['90-100%'] },
            { name: '70-89%', drivers: dist['70-89%'] },
            { name: '50-69%', drivers: dist['50-69%'] },
            { name: '<50%', drivers: dist['<50%'] },
          ]);
        }
      } catch (err) {
        toast.error('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [dateRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-900 text-white p-3 rounded-lg shadow-xl text-sm border border-navy-700">
          <p className="font-bold mb-2 pb-2 border-b border-navy-700">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="flex justify-between gap-4 mb-1">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">{entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const retention = subStats.total > 0 ? Math.round(((parseInt(subStats.active) || 0) / (parseInt(subStats.total) || 1)) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-navy-100 shadow-sm">
        <h1 className="text-2xl font-bold text-navy-900">Analytics Dashboard</h1>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-navy-50 rounded-lg p-1 border border-navy-200">
            {[
              { id: '1m', label: '1M' },
              { id: '3m', label: '3M' },
              { id: '6m', label: '6M' },
              { id: '1y', label: '1Y' }
            ].map(range => (
              <button 
                key={range.id}
                onClick={() => { setIsLoading(true); setDateRange(range.id); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dateRange === range.id ? 'bg-white shadow-sm text-primary-600' : 'text-navy-500 hover:text-navy-900'}`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download size={16} />}>Export PDF</Button>
        </div>
      </div>

      {/* SECTION 1: Revenue Analytics */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-navy-100 pb-2">
          <TrendingUp size={24} className="text-green-600" /> Revenue Analytics
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-l-primary-600">
            <p className="text-xs font-bold text-navy-400 uppercase">Total Revenue</p>
            <p className="text-2xl font-black text-navy-900 mt-1">{formatCurrency(metrics.total_revenue || 0)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-xs font-bold text-navy-400 uppercase">Monthly Rec. Revenue</p>
            <p className="text-2xl font-black text-navy-900 mt-1">{formatCurrency(metrics.mrr || 0)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-xs font-bold text-navy-400 uppercase">Avg Order Value</p>
            <p className="text-2xl font-black text-navy-900 mt-1">{formatCurrency(metrics.avg_order_value || 0)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-red-500">
            <p className="text-xs font-bold text-navy-400 uppercase">Refund Rate</p>
            <p className="text-2xl font-black text-navy-900 mt-1">{metrics.refund_rate || 0}%</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <h3 className="font-bold text-navy-900 mb-6">Revenue Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-bold text-navy-900 mb-6">Revenue by Plan Type</h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {planData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 2: Subscriptions Analytics */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-navy-100 pb-2">
          <Users size={24} className="text-blue-600" /> Subscription Analytics
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-navy-900 mb-6">Subscription Growth</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionStatusData} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Legend />
                  <Bar dataKey="active" stackId="a" fill="#10B981" />
                  <Bar dataKey="pending" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="cancelled" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-navy-900 mb-8 self-start w-full text-left">Retention Rate</h3>
            
            {/* Simple CSS Gauge */}
            <div className="relative w-48 h-24 overflow-hidden mb-4">
              <div className="absolute w-48 h-48 border-[24px] border-navy-100 rounded-full box-border top-0 left-0"></div>
              <div className="absolute w-48 h-48 border-[24px] border-primary-600 rounded-full box-border top-0 left-0 border-b-transparent border-l-transparent transition-all duration-1000" style={{ transform: `rotate(${45 + (retention * 1.8)}deg)` }}></div>
            </div>
            
            <h2 className="text-5xl font-black text-navy-900 mb-2">{retention}%</h2>
            <p className="text-navy-500 font-medium">of users renewed their subscription this month.</p>
          </Card>
        </div>
      </section>

      {/* SECTION 3: Driver Performance */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-navy-100 pb-2">
          <Car size={24} className="text-purple-600" /> Driver Performance
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <h3 className="font-bold text-navy-900 mb-6">Attendance Rate Distribution</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverAttendanceData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} width={80} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="drivers" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-navy-100 bg-navy-50">
              <h3 className="font-bold text-navy-900">Top Drivers (This Month)</h3>
            </div>
            <div className="divide-y divide-navy-50 max-h-[300px] overflow-y-auto">
              {topDrivers.length > 0 ? topDrivers.map((driver, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-navy-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-primary-700 font-bold">
                      {driver.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <p className="font-bold text-navy-900 text-sm">{driver.full_name}</p>
                      <p className="text-xs text-navy-500">{driver.total_rides || 0} rides • {driver.rating || 0} ★</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{driver.attendance_rate || 0}%</p>
                    <p className="text-xs text-navy-500">Attendance</p>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center text-navy-400">No top drivers data available</div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Analytics;
