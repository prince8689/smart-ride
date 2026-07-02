import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '../ui/Card';
import useCountAnimation from '../../hooks/useCountAnimation';

const StatsCard = ({ title, value, formatter, icon: Icon, color, trend, trendValue, onClick, isLoading }) => {
  const isNumber = typeof value === 'number' || !isNaN(Number(value));
  const animatedValue = useCountAnimation(isNumber ? Number(value) : 0);
  const displayValue = isNumber ? (formatter ? formatter(animatedValue) : animatedValue) : value;
  if (isLoading) {
    return (
      <Card className="animate-pulse flex items-center p-6 border border-navy-100">
        <div className="flex-1">
          <div className="h-4 bg-navy-100 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-navy-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-navy-50 rounded w-1/3"></div>
        </div>
        <div className="w-12 h-12 bg-navy-100 rounded-full shrink-0"></div>
      </Card>
    );
  }

  return (
    <Card 
      className={`relative p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-primary-200' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-navy-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-navy-900">{displayValue}</h3>
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-${color}-50 text-${color}-600`}>
            <Icon size={24} />
          </div>
        )}
      </div>

      {(trend === 'up' || trend === 'down') && trendValue && (
        <div className={`flex items-center gap-1 text-sm font-bold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span>{trendValue}</span>
          <span className="text-navy-400 font-medium ml-1">vs last month</span>
        </div>
      )}
    </Card>
  );
};

export default StatsCard;
