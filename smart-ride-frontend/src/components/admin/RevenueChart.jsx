// ========== FILE: src/components/admin/RevenueChart.jsx ==========
import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy-900 text-white p-3 rounded-lg shadow-xl border border-navy-700">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-primary-300 font-bold">{formatCurrency(payload[0].value)}</p>
        {payload[1] && <p className="text-xs text-navy-300 mt-1">{payload[1].value} transactions</p>}
      </div>
    );
  }
  return null;
};

const RevenueChart = ({ data, type }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center w-full h-full text-navy-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === 'area' ? (
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => `₹${v/1000}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area yAxisId="left" type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
        </AreaChart>
      ) : type === 'bar' ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => `₹${v/1000}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={v => `₹${v/1000}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};

export default RevenueChart;
// ========== END ==========
