import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, X } from 'lucide-react';
import Button from '../ui/Button';

export default function RenewalBanner({ subscription }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!subscription) return;

    // Check if dismissed in this session
    const dismissedKey = `sr_renewal_dismissed_${subscription.id}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setIsVisible(false);
      return;
    }

    const daysRemaining = calculateDaysLeft(subscription.end_date);
    if (daysRemaining <= 7 && daysRemaining >= 0) {
      setIsVisible(true);
    }
  }, [subscription]);

  const calculateDaysLeft = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(`sr_renewal_dismissed_${subscription.id}`, 'true');
  };

  if (!isVisible || !subscription) return null;

  const daysLeft = calculateDaysLeft(subscription.end_date);
  
  let urgencyClass = '';
  let icon = <Clock size={24} className="text-yellow-600 shrink-0" />;
  let title = 'Renew soon';
  let desc = `Your subscription for ${subscription.route?.name} expires in ${daysLeft} days.`;

  if (daysLeft === 1) {
    urgencyClass = 'bg-red-50 border-red-200 border-2 animate-pulse-border ring-2 ring-red-500/20';
    icon = <AlertTriangle size={24} className="text-red-600 shrink-0 animate-bounce" />;
    title = 'EXPIRES TOMORROW';
    desc = `Last day! Your subscription for ${subscription.route?.name} expires tomorrow.`;
  } else if (daysLeft <= 3) {
    urgencyClass = 'bg-orange-50 border-orange-200';
    icon = <AlertTriangle size={24} className="text-orange-600 shrink-0" />;
    title = `Expires in ${daysLeft} days`;
    desc = `Your subscription for ${subscription.route?.name} is expiring soon.`;
  } else {
    urgencyClass = 'bg-yellow-50 border-yellow-200';
  }

  return (
    <div className={`rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden animate-in slide-in-from-top-4 ${urgencyClass}`}>
      <button onClick={handleDismiss} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>

      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-full shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className={`font-bold ${daysLeft === 1 ? 'text-red-700' : daysLeft <= 3 ? 'text-orange-700' : 'text-yellow-800'}`}>
            {title}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
        </div>
      </div>

      <div className="w-full sm:w-auto shrink-0">
        <Button 
          variant={daysLeft <= 3 ? 'primary' : 'outline'} 
          size="sm" 
          fullWidth
          className={daysLeft <= 3 ? 'animate-pulse' : 'bg-white'}
          onClick={() => navigate('/dashboard/book')}
        >
          Renew Now
        </Button>
      </div>
    </div>
  );
}
