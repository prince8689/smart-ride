import React, { useState, useEffect } from 'react';
import { CalendarCheck, Eye, RefreshCw } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getAdminSubscriptions as getSubscriptions, updateSubscriptionStatus } from '../../api/admin.api';
import { formatDate, formatCurrency } from '../../utils/helpers';
import DataTable from '../../components/admin/DataTable';
import AdvancedSearch from '../../components/shared/AdvancedSearch';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/admin/ConfirmModal';

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedSub, setSelectedSub] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const fetchSubs = async (filters = {}) => {
    setIsLoading(true);
    try {
      const res = await getSubscriptions(filters);
      if (res.success) setSubscriptions(res.data);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleFilterChange = (filters) => {
    const apiFilters = {};
    if (filters.search) apiFilters.search = filters.search;
    if (filters.status && filters.status !== 'all') apiFilters.status = filters.status;
    fetchSubs(apiFilters);
  };

  const handleStatusChangeClick = (sub) => {
    setSelectedSub(sub);
    setNewStatus(sub.status);
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === selectedSub.status) {
      setStatusModalOpen(false);
      return;
    }
    setIsStatusUpdating(true);
    try {
      const res = await updateSubscriptionStatus(selectedSub.id, newStatus);
      if (res.success) {
        toast.success(`Subscription marked as ${newStatus}`);
        setStatusModalOpen(false);
        setIsDetailModalOpen(false);
        fetchSubs(); // Refresh list
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const columns = [
    { key: 'user.full_name', label: 'Passenger', sortable: true, render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.user?.full_name} src={row.user?.profile_photo} size="sm" />
        <div>
          <p className="font-bold">{row.user?.full_name}</p>
          <p className="text-xs text-navy-500">{row.user?.phone}</p>
        </div>
      </div>
    )},
    { key: 'plan.name', label: 'Plan', sortable: true, render: (row) => (
      <Badge color="blue">{row.plan?.name}</Badge>
    )},
    { key: 'route', label: 'Route', render: (row) => (
      <div className="text-xs">
        <span className="text-green-600 font-medium">{row.route?.pickup_city || 'City'}</span>
        <span className="mx-1 text-navy-300">→</span>
        <span className="text-red-600 font-medium">{row.route?.drop_city || 'City'}</span>
      </div>
    )},
    { key: 'driver', label: 'Driver', render: (row) => (
      row.driver ? (
        <span className="text-sm font-medium text-navy-900">{row.driver.full_name}</span>
      ) : (
        <Badge color="red" size="sm">Unassigned</Badge>
      )
    )},
    { key: 'dates', label: 'Period', render: (row) => (
      <div className="text-xs text-navy-600">
        <p>{formatDate(row.start_date)} to</p>
        <p>{formatDate(row.end_date)}</p>
      </div>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (row) => {
      const colors = { active: 'green', pending: 'yellow', expired: 'gray', cancelled: 'red' };
      return <Badge color={colors[row.status] || 'gray'}>{row.status.toUpperCase()}</Badge>;
    }},
    { key: 'actions', label: 'Actions', width: 'w-24', render: (row) => (
      <div className="flex gap-2">
        <button onClick={() => { setSelectedSub(row); setIsDetailModalOpen(true); }} className="p-1.5 text-navy-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="View Details">
          <Eye size={16} />
        </button>
        <button onClick={() => handleStatusChangeClick(row)} className="p-1.5 text-navy-500 hover:text-orange-600 hover:bg-orange-50 rounded" title="Change Status">
          <RefreshCw size={16} />
        </button>
      </div>
    )}
  ];

  const filtersConfig = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'expired', label: 'Expired' },
      { value: 'cancelled', label: 'Cancelled' }
    ]}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          Subscriptions
          <Badge color="blue">{subscriptions.length}</Badge>
        </h1>
      </div>

      <AdvancedSearch 
        placeholder="Search by passenger name or phone..." 
        onSearch={handleFilterChange} 
        filtersConfig={filtersConfig} 
      />

      <DataTable columns={columns} data={subscriptions} isLoading={isLoading} />

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Subscription Details" size="lg">
        {selectedSub && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-navy-50 p-4 rounded-xl border border-navy-100">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-2">Passenger</p>
                <div className="flex items-center gap-3">
                  <Avatar name={selectedSub.user?.full_name} src={selectedSub.user?.profile_photo} size="md" />
                  <div>
                    <p className="font-bold text-navy-900">{selectedSub.user?.full_name}</p>
                    <p className="text-xs text-navy-600">{selectedSub.user?.phone}</p>
                  </div>
                </div>
              </div>
              <div className="bg-navy-50 p-4 rounded-xl border border-navy-100">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-2">Driver Details</p>
                {selectedSub.driver ? (
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedSub.driver.full_name} src={selectedSub.driver.profile_photo} size="md" />
                    <div>
                      <p className="font-bold text-navy-900">{selectedSub.driver.full_name}</p>
                      <p className="text-xs text-navy-600">{selectedSub.driver.phone}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-red-600">No driver assigned</p>
                )}
              </div>
            </div>

            <div className="border border-navy-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-navy-50">
                <div>
                  <h3 className="font-bold text-lg text-navy-900">{selectedSub.plan?.name}</h3>
                  <p className="text-sm text-navy-500">{formatDate(selectedSub.start_date)} - {formatDate(selectedSub.end_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-navy-900">{formatCurrency(selectedSub.plan?.price)}</p>
                  <Badge color={selectedSub.status === 'active' ? 'green' : 'gray'} className="mt-1">{selectedSub.status.toUpperCase()}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-navy-500 uppercase mb-1">Pickup</p>
                  <p className="text-sm font-medium text-navy-900">{selectedSub.pickup_address}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-navy-500 uppercase mb-1">Drop</p>
                  <p className="text-sm font-medium text-navy-900">{selectedSub.drop_address}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-navy-500 uppercase mb-1">Time Slots</p>
                  <div className="flex gap-2">
                    {selectedSub.slots_selected?.map(s => <Badge key={s} color="blue" className="capitalize">{s}</Badge>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change Subscription Status">
        <div className="space-y-4">
          <p className="text-sm text-navy-600">Force changing status for subscription #<span className="font-mono">{selectedSub?.id.slice(0,8)}</span>.</p>
          
          <div>
            <label className="text-sm font-bold text-navy-900 block mb-2">New Status</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-navy-200 rounded-xl px-4 py-3 outline-none focus:border-primary-500 bg-white"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-xs border border-yellow-200">
            <strong>Warning:</strong> Changing status to Cancelled or Expired will automatically unassign the driver. Changing to Active will not auto-assign a driver.
          </div>

          <div className="flex gap-3 pt-4 border-t border-navy-100">
            <button className="flex-1 px-4 py-2 border border-navy-200 rounded-xl font-bold text-navy-600 hover:bg-navy-50" onClick={() => setStatusModalOpen(false)}>Cancel</button>
            <button className="flex-1 px-4 py-2 bg-primary-600 rounded-xl font-bold text-white hover:bg-primary-700" onClick={handleUpdateStatus} disabled={isStatusUpdating}>
              {isStatusUpdating ? 'Updating...' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminSubscriptions;
