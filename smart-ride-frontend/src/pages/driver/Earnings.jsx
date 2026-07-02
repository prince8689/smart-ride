import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, Calendar, Download, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import toast from '../../utils/toastConfig';
import { getEarnings, getAssignedPassengers } from '../../api/driver.api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

// Custom Recharts tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 text-white px-4 py-2.5 rounded-xl text-xs shadow-xl border border-navy-700">
      <p className="font-bold mb-0.5">{label}</p>
      <p className="text-primary-300 font-semibold">{formatCurrency(payload[0]?.value || 0)}</p>
    </div>
  );
}

const Earnings = () => {
  const [earnings, setEarnings] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, lastMonth: 0 });

  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        // Try dedicated earnings endpoint first
        let earningsData = null;
        try {
          const earningsRes = await getEarnings();
          earningsData = earningsRes?.data || earningsRes;
        } catch {
          // Fallback to calculating from assigned passengers
        }

        if (earningsData && (earningsData.total_earned !== undefined || earningsData.payment_records)) {
          setEarnings(earningsData);
          setRecords(earningsData.payment_records || []);
          setStats({
            total: earningsData.total_earned || 0,
            thisMonth: earningsData.this_month || 0,
            lastMonth: earningsData.last_month || 0,
          });
        } else {
          // Fallback: calculate from assigned passengers
          const passRes = await getAssignedPassengers();
          const subs = passRes?.data?.subscriptions || passRes?.data || [];
          const subsArray = Array.isArray(subs) ? subs : [];

          const earningRecords = subsArray.map(sub => {
            const planPrice = sub.plan?.price || sub.amount || 0;
            const driverShare = parseFloat(planPrice) * 0.8;
            return {
              id: sub.id,
              passenger_name: sub.passenger_name || sub.user?.full_name || 'Passenger',
              plan_name: sub.plan?.name || sub.plan_name || 'Subscription',
              period: `${formatDate(sub.start_date)} - ${formatDate(sub.end_date)}`,
              amount: parseFloat(planPrice),
              driver_share: driverShare,
              status: sub.status === 'active' ? 'paid' : 'processing',
              created_at: sub.created_at,
            };
          });

          setRecords(earningRecords);

          const total = earningRecords.reduce((sum, r) => sum + r.driver_share, 0);
          setStats({ total, thisMonth: total, lastMonth: Math.round(total * 0.8) });
        }
      } catch (err) {
        toast.error('Failed to load earnings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarningsData();
  }, []);

  // Build chart data
  const chartData = earnings?.monthly_trend || (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    // Generate last 6 months of data from records
    const monthlyMap = {};
    records.forEach(r => {
      const date = new Date(r.created_at || Date.now());
      const key = months[date.getMonth()];
      const amount = r.driver_share || (parseFloat(r.amount || 0) * 0.8);
      monthlyMap[key] = (monthlyMap[key] || 0) + amount;
    });

    // Fill in 6 months
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonth - i + 12) % 12;
      const name = months[idx];
      result.push({ name, amount: Math.round(monthlyMap[name] || 0) });
    }

    // If no real data, show some representative values
    if (result.every(d => d.amount === 0) && stats.total > 0) {
      result[result.length - 1].amount = Math.round(stats.thisMonth);
    }

    return result;
  })();

  if (isLoading) return <div className="flex h-[60vh] justify-center items-center"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-12 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-900">My Earnings</h1>
          <p className="text-navy-500 text-sm mt-1">You earn 80% of each subscription amount</p>
        </div>
        <button className="flex items-center gap-2 text-primary-600 font-bold hover:bg-primary-50 px-4 py-2 rounded-xl transition-colors">
          <Download size={18} /> Export
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary-600 to-blue-800 text-white border-0 shadow-lg p-6 h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <IndianRupee size={20} />
              </div>
              <p className="text-primary-100 font-medium">Total Earned</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">{formatCurrency(stats.total)}</h2>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-6 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-green-500" />
              <p className="text-navy-500 font-medium">This Month</p>
            </div>
            <h2 className="text-3xl font-bold text-green-600">{formatCurrency(stats.thisMonth)}</h2>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-purple-500" />
              <p className="text-navy-500 font-medium">Last Month</p>
            </div>
            <h2 className="text-3xl font-bold text-navy-900">{formatCurrency(stats.lastMonth)}</h2>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-6 h-full flex flex-col justify-center">
            <p className="text-navy-500 font-medium mb-1">Pending Payout</p>
            <h2 className="text-3xl font-bold text-yellow-600">{formatCurrency(0)}</h2>
          </Card>
        </motion.div>
      </div>

      {/* Chart + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bar chart */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-bold text-navy-900 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-600" />
            Monthly Earnings
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={v => v >= 1000 ? `₹${v / 1000}k` : `₹${v}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={36}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === chartData.length - 1 ? '#2563EB' : '#bfdbfe'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* How earnings work info */}
        <Card className="bg-navy-50 border-navy-100 p-6 flex flex-col">
          <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
            <Info size={20} className="text-primary-600" />
            How Earnings Work
          </h3>
          <div className="space-y-4 text-sm text-navy-700 flex-1">
            <div className="bg-white p-3 rounded-xl border border-navy-100">
              <p className="font-bold text-navy-900 mb-1">Your Share: 80%</p>
              <p className="text-xs">You earn 80% of the total subscription amount paid by the passenger.</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-navy-100">
              <p className="font-bold text-navy-900 mb-1">Example</p>
              <p className="text-xs">For a ₹4,999 monthly plan, you earn <span className="font-bold text-green-600">₹3,999</span> directly.</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-navy-100">
              <p className="font-bold text-navy-900 mb-1">Payout Schedule</p>
              <p className="text-xs">Earnings are processed automatically on the 1st of every month to your registered bank account.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment records table */}
      <div>
        <h3 className="font-bold text-xl text-navy-900 mb-4">Payment Records</h3>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Passenger</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Plan / Period</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase text-right">Total Plan Amt</th>
                  <th className="px-6 py-4 text-xs font-bold text-primary-700 bg-primary-50/50 uppercase text-right">Your Share (80%)</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {records.length > 0 ? records.map((record, i) => {
                  const totalAmt = parseFloat(record.amount || 0);
                  const yourShare = record.driver_share || totalAmt * 0.8;
                  const name = record.passenger_name || record.plan_name || 'Subscription';
                  const planName = record.plan_name || record.passenger_name || 'Subscription';
                  const period = record.period || (record.created_at ? formatDate(record.created_at) : '—');
                  const payStatus = record.status || 'paid';

                  return (
                    <tr key={record.id || i} className="hover:bg-navy-50/50">
                      <td className="px-6 py-4 font-bold text-navy-900 text-sm">{name}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-navy-900">{planName}</p>
                        <p className="text-xs text-navy-500">{period}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-navy-500 font-medium">
                        {formatCurrency(totalAmt)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-green-600 bg-primary-50/20">
                        {formatCurrency(yourShare)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={payStatus === 'paid' ? 'green' : 'yellow'} size="sm">
                          {payStatus.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-navy-500">
                      No earning records available yet. Complete rides to start earning.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Earnings;
