import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getUsers } from '../../api/admin.api';
import { formatDate } from '../../utils/helpers';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';

const AdminAccounts = () => {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdmins = async () => {
      setIsLoading(true);
      try {
        const res = await getUsers({ role: 'admin' });
        if (res.success) setAdmins(res.data);
      } catch (err) {
        toast.error('Failed to load admin accounts');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const columns = [
    { key: 'full_name', label: 'Admin', sortable: true, render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.full_name} src={row.profile_photo} size="sm" />
        <span className="font-bold">{row.full_name}</span>
      </div>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone' },
    { key: 'created_at', label: 'Created', sortable: true, render: (row) => formatDate(row.created_at) },
    { key: 'status', label: 'Status', render: (row) => (
      <Badge color={row.is_active ? 'green' : 'red'}>
        {row.is_active ? 'ACTIVE' : 'INACTIVE'}
      </Badge>
    )}
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-4 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <Shield size={24} className="text-primary-600" /> Admin Accounts
        </h1>
      </div>

      <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl flex items-center gap-3 mb-6">
        <Shield size={20} className="shrink-0 text-blue-500" />
        <p className="text-sm font-medium">To create a new Admin account, please go to the <strong>Users Management</strong> page and use the "Create Admin" button.</p>
      </div>

      <DataTable 
        columns={columns} 
        data={admins} 
        isLoading={isLoading} 
        emptyMessage="No admin accounts found."
      />
    </div>
  );
};

export default AdminAccounts;
