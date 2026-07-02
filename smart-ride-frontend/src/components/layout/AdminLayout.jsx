import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BarChart3, Activity, Users, Car, CalendarCheck, 
  MapPin, Tag, MessageSquare, Megaphone, Shield, LogOut, Menu, ChevronLeft, Settings, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useAdminSocket } from '../../hooks/useAdminSocket';
import Avatar from '../ui/Avatar';

const AdminLayout = ({ children, pageTitle, breadcrumb }) => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const { liveStats } = useAdminSocket();

  const handleLogout = async () => {
    await logoutUser();
  };

  const navGroups = [
    {
      label: 'OVERVIEW',
      links: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'System Health', path: '/admin/health', icon: Activity },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
        { name: 'Queries', path: '/admin/queries', icon: MessageSquare },
        { name: 'Broadcast', path: '/admin/broadcast', icon: Megaphone },
        { name: 'Admin Accounts', path: '/admin/admins', icon: Shield },
      ]
    },
    {
      label: 'MANAGEMENT',
      links: [
        { name: 'Users', path: '/admin/users', icon: Users },
        { name: 'Drivers', path: '/admin/drivers', icon: Car },
        { name: 'Subscriptions', path: '/admin/subscriptions', icon: CalendarCheck },
        { name: 'Routes', path: '/admin/routes', icon: MapPin },
        { name: 'Plans', path: '/admin/plans', icon: Tag },
        { name: 'Driver Assignment', path: '/admin/subscriptions/unassigned', icon: Car },
        { name: 'Payments (Pending)', path: '/admin/pending-payments', icon: CalendarCheck },
      ]
    },
    {
      label: 'SUPPORT',
      links: [
        { name: 'Complaints', path: '/admin/complaints', icon: MessageSquare, badge: liveStats?.pending_complaints || 0, badgeColor: 'bg-red-500' },
        { name: 'Broadcasts', path: '/admin/broadcast', icon: Megaphone },
      ]
    },
    {
      label: 'SETTINGS',
      links: [
        { name: 'Price Config', path: '/admin/pricing', icon: Calculator },
        { name: 'Admin Accounts', path: '/admin/admins', icon: Shield },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 288 }}
        className="hidden md:flex bg-white border-r border-navy-100 flex-col fixed inset-y-0 z-40 transition-all duration-300"
      >
        <div className="p-4 flex items-center justify-between border-b border-navy-100 h-16 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
              <Shield size={22} />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold text-navy-900 whitespace-nowrap tracking-wide">Smart Ride Admin</span>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg hidden md:block shrink-0"
          >
            <ChevronLeft size={20} className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
              {!isSidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.links.map((link) => {
                  const isActive = location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path));
                  return (
                    <div key={link.path}>
                      <NavLink
                        to={link.path}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 transition-all font-medium text-sm
                          ${isSidebarCollapsed ? 'justify-center rounded-xl' : 'rounded-l-xl'}
                          ${isActive 
                            ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600' 
                            : 'text-navy-500 hover:bg-gray-100'}
                        `}
                        title={isSidebarCollapsed ? link.name : ''}
                      >
                        <link.icon size={20} className={isActive ? 'text-primary-600' : ''} />
                        {!isSidebarCollapsed && <span className="flex-1 whitespace-nowrap">{link.name}</span>}
                        {!isSidebarCollapsed && link.badge > 0 && (
                          <span className={`${link.badgeColor || 'bg-primary-500'} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                            {link.badge}
                          </span>
                        )}
                        {isSidebarCollapsed && link.badge > 0 && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                      </NavLink>
                      
                      {/* Sub-items handling (hardcoded for specific active paths for simplicity) */}
                      {!isSidebarCollapsed && isActive && link.path === '/admin/drivers' && (
                        <div className="ml-8 mt-1 space-y-1 border-l-2 border-navy-100 pl-2">
                          <NavLink to="/admin/drivers/unverified" className={({isActive}) => `flex items-center justify-between px-3 py-2 text-sm rounded-lg ${isActive ? 'bg-orange-50 text-orange-700 font-bold' : 'text-navy-500 hover:bg-gray-100'}`}>
                            <span>Unverified</span>
                            {liveStats?.unverified_drivers > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{liveStats.unverified_drivers}</span>}
                          </NavLink>
                        </div>
                      )}
                      {!isSidebarCollapsed && isActive && link.path === '/admin/subscriptions' && (
                        <div className="ml-8 mt-1 space-y-1 border-l-2 border-navy-100 pl-2">
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-navy-100">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <Avatar name={user?.full_name} src={user?.profile_photo} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-navy-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-red-500 font-bold">Administrator</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm
              ${isSidebarCollapsed ? 'justify-center w-full' : 'px-4 w-full'}
            `}
            title={isSidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main 
        className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300"
        style={{ marginLeft: isSidebarCollapsed ? '80px' : '288px' }} // md: only via CSS media queries normally, handling inline for simplicity here, assuming desktop view primarily. For actual responsive we use classes.
      >
        {/* Top Header */}
        <header className="bg-white border-b border-navy-100 h-16 flex items-center justify-between px-4 sticky top-0 z-30 ml-0 md:ml-0 transition-all duration-300">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-navy-600 hover:bg-navy-50 rounded-lg">
              <Menu size={24} />
            </button>
            <Shield size={24} className="text-primary-600" />
          </div>

          <div className="hidden md:flex items-center text-sm">
            <span className="text-navy-400">Admin</span>
            <span className="mx-2 text-navy-300">/</span>
            <span className="font-bold text-navy-900">{breadcrumb || pageTitle}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Stats Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-green-700">{liveStats?.online_drivers_count ?? liveStats?.online_drivers?.length ?? 0} Online Drivers</span>
            </div>

            <div className="border-l border-navy-200 h-8 mx-1 hidden sm:block"></div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 hover:bg-navy-50 p-1 pr-2 rounded-full transition-colors border border-transparent hover:border-navy-200"
              >
                <Avatar name={user?.full_name} src={user?.profile_photo} size="sm" />
                <span className="text-sm font-bold text-navy-700 hidden sm:block">{user?.full_name ? user.full_name.split(' ')[0] : 'Admin'}</span>
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-navy-100 py-1 z-50">
                    <div className="px-4 py-2 border-b border-navy-50 mb-1">
                      <p className="text-sm font-bold text-navy-900">{user?.full_name}</p>
                      <p className="text-xs text-navy-500">{user?.email}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <div className="md:hidden mb-4">
            <h1 className="text-2xl font-bold text-navy-900">{pageTitle}</h1>
          </div>
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
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
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 flex items-center justify-between border-b border-navy-100 bg-navy-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                    <Shield size={22} />
                  </div>
                  <div>
                    <span className="font-bold text-navy-900 block">Smart Ride Admin</span>
                    <span className="text-xs text-red-500 font-bold">Administrator</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
                {navGroups.map((group, i) => (
                  <div key={i}>
                    <p className="px-4 text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="space-y-1">
                      {group.links.map(link => (
                        <NavLink
                          key={link.path}
                          to={link.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                            ${isActive ? 'bg-primary-50 text-primary-600' : 'text-navy-600 hover:bg-gray-100'}
                          `}
                        >
                          <link.icon size={20} className={location.pathname === link.path ? 'text-primary-600' : ''} />
                          <span className="flex-1">{link.name}</span>
                          {link.badge > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{link.badge}</span>}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-navy-100">
                <button onClick={handleLogout} className="flex items-center gap-3 py-3 px-4 w-full text-red-500 hover:bg-red-50 rounded-xl font-bold">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Dynamic margins for desktop responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
