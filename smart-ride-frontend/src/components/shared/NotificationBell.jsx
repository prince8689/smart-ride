import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { timeAgo } from '../../utils/helpers';
import EmptyState from '../ui/EmptyState';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { notifications, unreadCount, markRead } = useNotifications();
  const dropdownRef = useRef(null);
  const prevUnreadCount = useRef(unreadCount);
  const [isShaking, setIsShaking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update time every minute for "time ago"
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Shake animation when new unread notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = (id) => {
    markRead(id);
    setIsOpen(false);
    // Determine path based on app context (user, driver, admin)
    // Could use a more robust way, but fallback to dashboard for now
    const path = window.location.pathname;
    if (path.includes('/admin')) navigate('/admin/dashboard');
    else if (path.includes('/driver')) navigate('/driver/dashboard');
    else navigate('/dashboard/notifications');
  };

  const shakeVariants = {
    initial: { rotate: 0 },
    shake: {
      rotate: [0, -15, 15, -15, 15, 0],
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  };

  const badgeVariants = {
    initial: { scale: 1 },
    pop: { scale: [1, 1.3, 1], transition: { duration: 0.3 } }
  };

  const getBorderColor = (type) => {
    switch(type) {
      case 'success': return 'border-l-green-500';
      case 'warning': return 'border-l-yellow-500';
      case 'error': return 'border-l-red-500';
      default: return 'border-l-primary-500';
    }
  };

  return (
    <div className={isMobile ? '' : 'relative'} ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        variants={shakeVariants}
        initial="initial"
        animate={isShaking ? 'shake' : 'initial'}
        className="relative p-2 text-navy-600 hover:text-navy-900 hover:bg-navy-50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Bell size={24} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              variants={badgeVariants}
              initial="pop"
              animate="initial"
              className={`absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm
                ${unreadCount > 9 ? 'px-1.5 h-4.5 rounded-full min-w-[18px]' : 'w-4.5 h-4.5 rounded-full'}
              `}
              style={{ minWidth: unreadCount > 9 ? '20px' : '18px', height: '18px' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={isMobile ? { opacity: 0, y: -20 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { opacity: 0, y: -20 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`
              ${isMobile 
                ? 'fixed top-16 left-4 right-4 z-[100] max-h-[80vh]' 
                : 'absolute right-0 mt-2 w-80 z-50'
              } 
              bg-white rounded-2xl shadow-xl border border-navy-100 overflow-hidden flex flex-col
            `}
          >
            <div className="p-4 border-b border-navy-100 flex justify-between items-center bg-navy-50 shrink-0">
              <h3 className="font-bold text-navy-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1" style={{ maxHeight: isMobile ? 'calc(80vh - 110px)' : '320px' }}>
              {notifications.length === 0 ? (
                <EmptyState variant="no-notifications" size="sm" />
              ) : (
                <div className="flex flex-col">
                  {notifications.slice(0, 5).map((notif, idx) => (
                    <div 
                      key={notif.id || idx}
                      onClick={() => handleNotificationClick(notif.id)}
                      className={`p-4 border-b border-navy-50 hover:bg-navy-50 cursor-pointer transition-colors border-l-4 
                        ${getBorderColor(notif.type)}
                        ${!notif.is_read ? 'bg-[#EFF6FF]' : 'bg-white'}
                      `}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-navy-900 line-clamp-1 pr-2">
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full mt-1.5 shrink-0 shadow-sm" />
                        )}
                      </div>
                      <p className="text-sm text-navy-600 mb-2 line-clamp-2 leading-relaxed">{notif.message}</p>
                      <span className="text-xs font-medium text-navy-400">
                        {timeAgo(notif.created_at || notif.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-3 border-t border-navy-100 text-center bg-navy-50 shrink-0">
                <button 
                  onClick={() => handleNotificationClick()}
                  className="text-sm font-bold text-primary-600 hover:text-primary-800 transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
