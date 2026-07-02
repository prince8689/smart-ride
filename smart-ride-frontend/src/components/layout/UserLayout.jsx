import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Plus, CreditCard, Bell, MessageSquare, User, LogOut, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const UserLayout = ({ children, pageTitle }) => {
  const { user, logoutUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRideStartedModal, setShowRideStartedModal] = useState(false);
  const [rideStartedData, setRideStartedData] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    const handleRideStarted = (data) => {
      setRideStartedData(data);
      setShowRideStartedModal(true);
    };

    socket.on(SOCKET_EVENTS.RIDE_STARTED, handleRideStarted);

    return () => {
      socket.off(SOCKET_EVENTS.RIDE_STARTED, handleRideStarted);
    };
  }, [socket]);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Subscriptions', path: '/dashboard/subscriptions', icon: CalendarCheck },
    { name: 'Book a Ride', path: '/dashboard/book', icon: Plus, isPrimary: true },
    { name: 'Payments', path: '/dashboard/payments', icon: CreditCard },
    { name: 'Notifications', path: '/dashboard/notifications', icon: Bell, badge: unreadCount },
    { name: 'Complaints', path: '/dashboard/complaints', icon: MessageSquare },
    { name: 'Profile', path: '/dashboard/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="min-h-screen bg-navy-50 flex">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="hidden md:flex w-64 bg-gradient-to-b from-navy-900 to-gray-900 flex-col fixed inset-y-0 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.1)] border-r border-white/5"
      >
        <div className="p-6 flex flex-col items-center border-b border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="w-14 h-14 bg-gradient-to-tr from-primary-600 to-blue-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-4 shadow-lg shadow-primary-500/30 transform rotate-3 relative z-10">
            <div className="transform -rotate-3">SR</div>
          </div>
          <h2 className="text-white font-bold text-xl mb-1 tracking-wide relative z-10">Smart Ride</h2>
          <Avatar name={user?.full_name} src={user?.profile_photo} size="md" className="mt-4 mb-2 border-2 border-primary-500 shadow-md relative z-10" />
          <h3 className="text-white font-medium text-sm text-center relative z-10">{user?.full_name}</h3>
          <span className="text-xs bg-primary-500/20 text-primary-200 px-3 py-1 rounded-full mt-2 border border-primary-500/30 font-semibold backdrop-blur-sm relative z-10">
            Commuter
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/dashboard'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm group relative overflow-hidden
                ${isActive 
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25' 
                  : link.isPrimary 
                    ? 'bg-white/5 text-primary-300 hover:bg-primary-600 hover:text-white border border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/20' 
                    : 'text-navy-300 hover:bg-white/10 hover:text-white hover:translate-x-1.5'}
              `}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-md transition-transform duration-300 ${window.location.pathname === link.path || (link.path==='/dashboard' && window.location.pathname==='/dashboard') ? 'scale-y-100' : 'scale-y-0'}`}></div>
              <link.icon size={20} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="flex-1">{link.name}</span>
              {link.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
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
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              SR
            </div>
            <span className="font-bold text-navy-900">Smart Ride</span>
          </div>

          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-navy-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/notifications')} className="relative p-2 text-navy-600 hover:bg-navy-50 rounded-full">
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden md:block border-l border-navy-200 h-8 mx-2"></div>
            <button onClick={() => navigate('/dashboard/profile')} className="hidden md:flex items-center gap-2 hover:bg-navy-50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-navy-200">
              <Avatar name={user?.full_name} src={user?.profile_photo} size="sm" />
              <span className="text-sm font-medium text-navy-700">{user?.full_name ? user.full_name.split(' ')[0] : 'User'}</span>
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
            { path: '/dashboard', icon: LayoutDashboard },
            { path: '/dashboard/subscriptions', icon: CalendarCheck },
            { path: '/dashboard/book', icon: Plus, isPrimary: true },
            { path: '/dashboard/payments', icon: CreditCard },
            { path: '/dashboard/profile', icon: User },
          ].map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/dashboard'}
              className={({ isActive }) => `
                flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all
                ${isActive ? 'text-primary-600' : 'text-navy-400 hover:text-navy-600'}
                ${link.isPrimary ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700 hover:text-white -mt-5 h-16 w-16 border-4 border-navy-50' : ''}
              `}
            >
              <link.icon size={link.isPrimary ? 28 : 24} />
              {link.badge > 0 && !link.isPrimary && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile Side Menu (Overlay) */}
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
                <div className="flex items-center gap-4 mb-4">
                  <Avatar name={user?.full_name} src={user?.profile_photo} size="lg" />
                  <div>
                    <h3 className="font-bold text-navy-900">{user?.full_name}</h3>
                    <p className="text-sm text-navy-500">{user?.email}</p>
                  </div>
                </div>
                <Badge color="primary">Commuter</Badge>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/dashboard'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium
                      ${isActive 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-navy-600 hover:bg-navy-50'}
                    `}
                  >
                    <link.icon size={22} className={link.isPrimary ? 'text-primary-600' : ''} />
                    <span className="flex-1">{link.name}</span>
                    {link.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {link.badge > 9 ? '9+' : link.badge}
                      </span>
                    )}
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

      {/* Ride Started Confirmation Modal */}
      <AnimatePresence>
        {showRideStartedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-navy-900 text-center mb-2">Ride Started!</h2>
              <p className="text-navy-600 text-center mb-6">
                {rideStartedData?.message || 'Your driver has started the ride.'} <br/> 
                Are you in the cab?
              </p>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  fullWidth 
                  onClick={() => setShowRideStartedModal(false)}
                >
                  No, I'm not
                </Button>
                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={() => setShowRideStartedModal(false)}
                  className="bg-green-600 hover:bg-green-700 border-green-600"
                >
                  Yes, I'm in
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserLayout;
