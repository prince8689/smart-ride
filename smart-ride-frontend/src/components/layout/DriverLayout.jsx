import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, ClipboardCheck, IndianRupee, User, LogOut, Menu, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useDriverSocket } from '../../hooks/useDriverSocket';
import { updateProfile } from '../../api/driver.api';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const DriverLayout = ({ children, pageTitle }) => {
  const { user, logoutUser, updateUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { goOnline, goOffline } = useDriverSocket();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(user?.driver_profile?.is_available || user?.is_available || false);
  const [isToggling, setIsToggling] = useState(false);

  React.useEffect(() => {
    if (user?.driver_profile) {
      setIsOnline(user.driver_profile.is_available || false);
    } else if (user?.is_available !== undefined) {
      setIsOnline(user.is_available);
    }
  }, [user]);

  const navLinks = [
    { name: 'Dashboard', path: '/driver', icon: LayoutDashboard },
    { name: 'Passengers', path: '/driver/passengers', icon: Users },
    { name: 'Live Map', path: '/driver/map', icon: MapPin },
    { name: 'Attendance', path: '/driver/attendance', icon: ClipboardCheck },
    { name: 'Earnings', path: '/driver/earnings', icon: IndianRupee },
    { name: 'Profile', path: '/driver/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logoutUser();
  };

  const toggleOnlineStatus = async () => {
    setIsToggling(true);
    const newStatus = !isOnline;
    try {
      const res = await updateProfile({ is_available: newStatus });
      if (res.success) {
        setIsOnline(newStatus);
        if (user) {
          updateUser({
            ...user,
            driver_profile: {
              ...user.driver_profile,
              is_available: newStatus
            }
          });
        }
        
        if (newStatus) {
          goOnline();
          toast.success('You are now Online');
        } else {
          goOffline();
          toast('You are now Offline', { icon: '🌙' });
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-50 flex">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="hidden md:flex w-64 bg-navy-900 flex-col fixed inset-y-0 z-40"
      >
        <div className="p-6 flex flex-col items-center border-b border-navy-800">
          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white mb-4">
            <Car size={24} />
          </div>
          <h2 className="text-white font-bold text-xl mb-1">Smart Ride</h2>
          
          <Avatar name={user?.full_name} src={user?.profile_photo} size="md" className="mt-4 mb-2 border-2 border-primary-500" />
          <h3 className="text-white font-medium text-sm text-center">{user?.full_name}</h3>
          <Badge color="primary" className="mt-1 mb-4">Driver</Badge>

          {/* Online Toggle */}
          <div className="w-full bg-navy-800 rounded-xl p-3 flex items-center justify-between">
            <span className={`text-sm font-bold ${isOnline ? 'text-green-400' : 'text-navy-400'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <button 
              onClick={toggleOnlineStatus}
              disabled={isToggling}
              className={`w-12 h-6 rounded-full relative transition-colors ${isOnline ? 'bg-green-500' : 'bg-navy-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isOnline ? 'right-1' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/driver'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${isActive 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'text-navy-300 hover:bg-navy-800 hover:text-white'}
              `}
            >
              <link.icon size={20} />
              <span className="flex-1">{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-navy-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Top Header */}
        <header className="bg-white border-b border-navy-100 h-16 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-navy-600 hover:bg-navy-50 rounded-lg">
              <Menu size={24} />
            </button>
            <span className="font-bold text-navy-900">Smart Ride Driver</span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <h1 className="text-xl font-bold text-navy-900">{pageTitle}</h1>
            <Badge color={isOnline ? 'green' : 'gray'} className="ml-2">
              {isOnline ? '● Online' : '○ Offline'}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-navy-600 hover:bg-navy-50 rounded-full">
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden md:block border-l border-navy-200 h-8 mx-2"></div>
            <button onClick={() => navigate('/driver/profile')} className="hidden md:flex items-center gap-2 hover:bg-navy-50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-navy-200">
              <Avatar name={user?.full_name} src={user?.profile_photo} size="sm" />
              <span className="text-sm font-medium text-navy-700">{user?.full_name ? user.full_name.split(' ')[0] : 'Driver'}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 pb-safe z-40">
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { path: '/driver', icon: LayoutDashboard },
            { path: '/driver/passengers', icon: Users },
            { path: '/driver/map', icon: MapPin },
            { path: '/driver/attendance', icon: ClipboardCheck },
            { path: '/driver/earnings', icon: IndianRupee },
          ].map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/driver'}
              className={({ isActive }) => `
                flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all
                ${isActive ? 'text-primary-600' : 'text-navy-400 hover:text-navy-600'}
              `}
            >
              <link.icon size={24} />
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile Side Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-white z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-navy-100 bg-navy-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.full_name} src={user?.profile_photo} size="lg" />
                    <div>
                      <h3 className="font-bold text-navy-900 line-clamp-1">{user?.full_name}</h3>
                      <Badge color="primary">Driver</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-3 flex items-center justify-between border border-navy-100 shadow-sm">
                  <span className={`text-sm font-bold ${isOnline ? 'text-green-500' : 'text-navy-400'}`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                  <button 
                    onClick={toggleOnlineStatus}
                    disabled={isToggling}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isOnline ? 'bg-green-500' : 'bg-navy-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${isOnline ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/driver'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium
                      ${isActive 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-navy-600 hover:bg-navy-50'}
                    `}
                  >
                    <link.icon size={22} />
                    <span className="flex-1">{link.name}</span>
                  </NavLink>
                ))}
              </div>

              <div className="p-4 border-t border-navy-100">
                <Button variant="danger" fullWidth leftIcon={<LogOut size={20} />} onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper Icon
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);

export default DriverLayout;
