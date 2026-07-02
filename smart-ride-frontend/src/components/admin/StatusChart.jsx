// ========== FILE: src/components/admin/StatusChart.jsx ==========
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#94A3B8'];

const StatusChart = ({ data }) => {
  if (!data || data.length === 0 || data.every(d => !d.value)) {
    return <div className="flex items-center justify-center w-full h-full text-navy-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry, index) => <Cell key={`cell-\${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusChart;
// ========== END ==========
