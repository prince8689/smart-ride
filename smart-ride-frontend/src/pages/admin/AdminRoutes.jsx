import React, { useState, useEffect } from 'react';
import toast from '../../utils/toastConfig';
import { getAllDriverRoutes } from '../../api/admin.api';
import DataTable from '../../components/admin/DataTable';
import FilterBar from '../../components/admin/FilterBar';
import Badge from '../../components/ui/Badge';

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoutes = async (filters = {}) => {
    setIsLoading(true);
    try {
      const res = await getAllDriverRoutes(filters);
      if (res.success) setRoutes(res.data.routes || []);
    } catch (err) {
      toast.error('Failed to load driver routes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const columns = [
    { key: 'driver', label: 'Driver Info', render: r => (
      <div>
        <p className="font-bold text-navy-900">{r.full_name}</p>
        <p className="text-xs text-navy-500">{r.phone}</p>
      </div>
    )},
    { key: 'locations', label: 'Path', render: r => (
      <div className="text-xs space-y-1">
        <p className="truncate w-40" title={r.start_address}><span className="text-green-500 font-bold">P:</span> {r.start_address}</p>
        <p className="truncate w-40" title={r.end_address}><span className="text-red-500 font-bold">D:</span> {r.end_address}</p>
      </div>
    )},
    { key: 'metrics', label: 'Metrics', render: r => (
      <div className="text-xs text-navy-600">
        <p>{r.total_distance} km</p>
        <p>{r.estimated_duration} mins</p>
      </div>
    )},
    { key: 'times', label: 'Timings', render: r => (
      <div className="text-xs text-navy-600">
        <p>M: {r.morning_time}</p>
        <p>E: {r.evening_time || 'N/A'}</p>
      </div>
    )},
    { key: 'vehicle', label: 'Vehicle', render: r => (
      <div className="text-xs text-navy-600 capitalize">
        <p className="font-bold">{r.vehicle_type}</p>
        <p>{r.vehicle_capacity} seats</p>
      </div>
    )},
    { key: 'status', label: 'Status', render: r => (
      <Badge color={r.status === 'active' ? 'green' : 'gray'}>{r.status}</Badge>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Routes Management</h1>
      </div>

      <FilterBar filters={[]} onChange={(f) => fetchRoutes(f)} />

      <DataTable columns={columns} data={routes} isLoading={isLoading} />
    </div>
  );
};

export default AdminRoutes;
