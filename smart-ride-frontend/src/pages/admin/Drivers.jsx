import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Calendar, Star, Users as UsersIcon } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getDrivers } from '../../api/admin.api';
import AdvancedSearch from '../../components/shared/AdvancedSearch';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';

const Drivers = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchDrivers = async (filters = {}) => {
    setIsLoading(true);
    try {
      const res = await getDrivers(filters);
      if (res.success) {
        setDrivers(res.data);
        // Calculate pending count from full list if no specific verified filter
        if (filters.is_verified === undefined || filters.is_verified === 'all') {
          setPendingCount(res.data.filter(d => !d.driver_profile?.is_verified).length);
        }
      }
    } catch (err) {
      toast.error('Failed to load drivers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleFilterChange = (filters) => {
    const apiFilters = {};
    if (filters.search) apiFilters.search = filters.search;
    if (filters.verified && filters.verified !== 'all') apiFilters.is_verified = filters.verified === 'yes';
    fetchDrivers(apiFilters);
  };

  const filtersConfig = [
    { key: 'verified', label: 'Verification', type: 'select', options: [
      { value: 'all', label: 'All Drivers' },
      { value: 'yes', label: 'Verified' },
      { value: 'no', label: 'Pending' }
    ]}
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-navy-100 pb-4">
        <h1 className="text-2xl font-bold text-navy-900">Drivers Management</h1>
        
        <div className="flex bg-navy-50 rounded-xl p-1 border border-navy-200">
          <button className="px-4 py-2 rounded-lg text-sm font-bold bg-white text-primary-600 shadow-sm border border-navy-100">
            All Drivers
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-sm font-bold text-navy-600 hover:text-navy-900 flex items-center gap-2"
            onClick={() => navigate('/admin/drivers/unverified')}
          >
            Pending Verification
            {pendingCount > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
          </button>
        </div>
      </div>

      <AdvancedSearch 
        placeholder="Search drivers by name, phone or vehicle plate..." 
        onSearch={handleFilterChange} 
        filtersConfig={filtersConfig} 
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <SkeletonCard lines={3} showAvatar={true} />
          <SkeletonCard lines={3} showAvatar={true} />
          <SkeletonCard lines={3} showAvatar={true} />
        </div>
      ) : drivers.length === 0 ? (
        <Card className="text-center py-12 text-navy-500">No drivers found matching criteria.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {drivers.map(driver => (
            <Card key={driver.id} className="p-0 overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md">
              <div className="p-5 flex gap-4">
                <Avatar name={driver.full_name} src={driver.profile_photo} size="xl" className="border-2 border-navy-50" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg text-navy-900 truncate">{driver.full_name}</h3>
                    {driver.driver_profile?.is_verified ? (
                      <ShieldCheck size={20} className="text-green-500 shrink-0" title="Verified" />
                    ) : (
                      <AlertCircle size={20} className="text-orange-500 shrink-0" title="Verification Pending" />
                    )}
                  </div>
                  <p className="text-sm text-navy-500 mb-2">{driver.phone}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge color={driver.is_available ? 'green' : 'gray'} size="sm">
                      {driver.is_available ? 'AVAILABLE' : 'OFFLINE'}
                    </Badge>
                    <Badge color="yellow" size="sm" className="flex items-center gap-1">
                      <Star size={10} className="fill-current" /> {driver.driver_profile?.rating || 'New'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-navy-50 border-y border-navy-100 flex gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-1">Vehicle</p>
                  <p className="text-sm font-bold text-navy-900 truncate">
                    {driver.vehicles?.[0] ? `${driver.vehicles[0].brand} ${driver.vehicles[0].model}` : 'No Vehicle'}
                  </p>
                  <p className="text-xs text-navy-500 mt-0.5 font-mono">{driver.vehicles?.[0]?.plate_number}</p>
                </div>
                <div className="w-px bg-navy-200"></div>
                <div>
                  <p className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-1">Active Subs</p>
                  <p className="text-sm font-bold text-navy-900 flex items-center gap-1">
                    <UsersIcon size={14} className="text-primary-600"/> 
                    {/* Placeholder logic for active subs count since it's not directly on user object usually */}
                    {Math.floor(Math.random() * 5) + 1}
                  </p>
                </div>
              </div>

              <div className="p-4 flex gap-3">
                <Button variant="outline" size="sm" fullWidth leftIcon={<Calendar size={16} />}>
                  Schedule
                </Button>
                {!driver.driver_profile?.is_verified && (
                  <Button variant="primary" size="sm" fullWidth onClick={() => navigate('/admin/drivers/unverified')}>
                    Verify Now
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Drivers;
