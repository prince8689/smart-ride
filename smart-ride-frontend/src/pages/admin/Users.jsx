import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, MoreVertical, Copy, CheckCircle2 } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getUsers, getUserDetails, updateUserStatus, createAdmin, deleteUser } from '../../api/admin.api';
import { formatDate } from '../../utils/helpers';
import AdvancedSearch from '../../components/shared/AdvancedSearch';
import DataTable from '../../components/admin/DataTable';
import ConfirmModal from '../../components/admin/ConfirmModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailData, setUserDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState({ user: null, action: '' });
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [generatedPwd, setGeneratedPwd] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();

  const fetchUsers = async (filters = {}) => {
    setIsLoading(true);
    try {
      const res = await getUsers(filters);
      if (res.success) setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFilterChange = (filters) => {
    const apiFilters = {};
    if (filters.search) apiFilters.search = filters.search;
    if (filters.role && filters.role !== 'all') apiFilters.role = filters.role;
    if (filters.status && filters.status !== 'all') apiFilters.is_active = filters.status === 'active';
    fetchUsers(apiFilters);
  };

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    try {
      const res = await getUserDetails(user.id);
      if (res.success) setUserDetailData(res.data);
    } catch (err) {
      toast.error('Failed to load user details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    setIsStatusUpdating(true);
    try {
      const isActive = statusAction.action === 'activate';
      const res = await updateUserStatus(statusAction.user.id, { is_active: isActive });
      if (res.success) {
        toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
        setUsers(users.map(u => u.id === statusAction.user.id ? { ...u, is_active: isActive } : u));
        setIsStatusModalOpen(false);
        if (selectedUser?.id === statusAction.user.id) {
          setSelectedUser({ ...selectedUser, is_active: isActive });
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const openStatusConfirm = (user, action) => {
    setStatusAction({ user, action });
    setIsStatusModalOpen(true);
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setGeneratedPwd(pwd);
    setValue('password', pwd);
  };

  const copyPwd = () => {
    navigator.clipboard.writeText(generatedPwd);
    toast.success('Password copied to clipboard');
  };

  const onAdminSubmit = async (data) => {
    try {
      const res = await createAdmin(data);
      if (res.success) {
        toast.success('Admin created successfully');
        setIsAdminModalOpen(false);
        reset();
        setGeneratedPwd('');
        fetchUsers(); // Refresh list
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create admin');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const res = await deleteUser(selectedUser.id);
      if (res.success) {
        toast.success('User permanently deleted');
        setIsDeleteModalOpen(false);
        setIsDetailModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { key: 'full_name', label: 'User', sortable: true, render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.full_name} src={row.profile_photo} size="sm" />
        <span className="font-bold">{row.full_name}</span>
      </div>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role', render: (row) => (
      <Badge color={row.role === 'admin' ? 'red' : row.role === 'driver' ? 'purple' : 'blue'}>
        {row.role}
      </Badge>
    )},
    { key: 'is_active', label: 'Status', render: (row) => (
      <button 
        onClick={(e) => { e.stopPropagation(); openStatusConfirm(row, row.is_active ? 'deactivate' : 'activate'); }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${row.is_active ? 'bg-green-500' : 'bg-red-500'}`}
      >
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${row.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    )},
    { key: 'created_at', label: 'Joined', sortable: true, render: (row) => formatDate(row.created_at) },
    { key: 'actions', label: '', width: 'w-10', render: (row) => (
      <button className="p-1 hover:bg-navy-50 rounded-lg text-navy-400 hover:text-navy-900" onClick={(e) => { e.stopPropagation(); openUserDetails(row); }}>
        <MoreVertical size={18} />
      </button>
    )}
  ];

  const filtersConfig = [
    { key: 'role', label: 'Role', type: 'select', options: [
      { value: 'all', label: 'All Roles' },
      { value: 'user', label: 'Commuter' },
      { value: 'driver', label: 'Driver' },
      { value: 'admin', label: 'Admin' }
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]}
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          Users Management
          <Badge color="blue">{users.length}</Badge>
        </h1>
        <Button leftIcon={<Shield size={18} />} onClick={() => setIsAdminModalOpen(true)}>
          Create Admin
        </Button>
      </div>

      <AdvancedSearch 
        placeholder="Search users by name, email or phone..." 
        onSearch={handleFilterChange} 
        filtersConfig={filtersConfig} 
      />

      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
        <DataTable 
          columns={columns} 
          data={users} 
          onRowClick={openUserDetails}
        />
      )}

      {/* User Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-navy-50 rounded-xl">
              <Avatar name={selectedUser.full_name} src={selectedUser.profile_photo} size="xl" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-navy-900">{selectedUser.full_name}</h2>
                <p className="text-navy-600">{selectedUser.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge color={selectedUser.role === 'admin' ? 'red' : selectedUser.role === 'driver' ? 'purple' : 'blue'}>
                    {selectedUser.role.toUpperCase()}
                  </Badge>
                  <Badge color={selectedUser.is_active ? 'green' : 'red'}>
                    {selectedUser.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
                <div className="flex gap-2">
                  <Button 
                    variant={selectedUser.is_active ? 'danger' : 'primary'}
                    onClick={() => openStatusConfirm(selectedUser, selectedUser.is_active ? 'deactivate' : 'activate')}
                  >
                    {selectedUser.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  {selectedUser.id !== currentUser.id && (
                    <Button 
                      variant="danger"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      Delete Permanently
                    </Button>
                  )}
                </div>
            </div>

            {isDetailLoading ? (
              <div className="py-12 flex justify-center text-navy-400 font-medium animate-pulse">Loading detailed data...</div>
            ) : userDetailData ? (
              <div className="border border-navy-100 rounded-xl overflow-hidden">
                <div className="flex border-b border-navy-100 bg-navy-50 overflow-x-auto">
                  {['Overview', selectedUser.role === 'user' ? 'Subscriptions' : 'Driver Info', 'Complaints'].filter(Boolean).map(tab => (
                    <button key={tab} className="px-4 py-3 text-sm font-bold border-b-2 border-primary-600 text-primary-600 whitespace-nowrap">
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="p-4">
                  {/* Simplification: Just rendering overview for now to keep size manageable */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-navy-400 uppercase mb-1">Phone Number</p>
                      <p className="font-medium text-navy-900">{selectedUser.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-400 uppercase mb-1">Joined Date</p>
                      <p className="font-medium text-navy-900">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    {selectedUser.role === 'user' && (
                      <>
                        <div>
                          <p className="text-xs font-bold text-navy-400 uppercase mb-1">Total Subscriptions</p>
                          <p className="font-medium text-navy-900">{userDetailData.subscriptions?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-navy-400 uppercase mb-1">Total Spent</p>
                          <p className="font-medium text-green-600">₹{userDetailData.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Status Confirm Modal */}
      <ConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusUpdate}
        isLoading={isStatusUpdating}
        title={`${statusAction.action === 'activate' ? 'Activate' : 'Deactivate'} User`}
        message={`Are you sure you want to ${statusAction.action} ${statusAction.user?.full_name}? ${statusAction.action === 'deactivate' ? 'They will not be able to log in.' : ''}`}
        confirmLabel={`Yes, ${statusAction.action}`}
        confirmVariant={statusAction.action === 'activate' ? 'primary' : 'danger'}
        requireTyping={statusAction.action === 'deactivate' ? 'DEACTIVATE' : undefined}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        isLoading={isDeleting}
        title="Permanently Delete User"
        message={`Are you absolutely sure you want to delete ${selectedUser?.full_name}? This will remove all associated data including profiles, payments, subscriptions, and complaints. This action cannot be undone.`}
        confirmLabel="Yes, Delete Permanently"
        confirmVariant="danger"
        requireTyping="DELETE"
      />

      {/* Create Admin Modal */}
      <Modal isOpen={isAdminModalOpen} onClose={() => { setIsAdminModalOpen(false); reset(); setGeneratedPwd(''); }} title="Create Admin Account">
        <form onSubmit={handleSubmit(onAdminSubmit)} className="space-y-4">
          <Input label="Full Name" {...register('full_name', { required: 'Required' })} error={errors.full_name?.message} />
          <Input label="Email" type="email" {...register('email', { required: 'Required' })} error={errors.email?.message} />
          <Input label="Phone Number" {...register('phone', { required: 'Required' })} error={errors.phone?.message} />
          
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1">Password</label>
            <div className="flex gap-2">
              <Input 
                className="flex-1 mb-0" 
                type="text" 
                readOnly 
                {...register('password', { required: 'Generate a password' })} 
                placeholder="Click generate"
                error={errors.password?.message}
              />
              <Button type="button" variant="outline" onClick={generatePassword} className="shrink-0">Generate</Button>
            </div>
            {generatedPwd && (
              <div className="mt-2 bg-green-50 text-green-800 p-2 rounded flex justify-between items-center text-sm border border-green-200">
                <span className="font-mono font-bold tracking-wider">{generatedPwd}</span>
                <button type="button" onClick={copyPwd} className="text-green-600 hover:text-green-900"><Copy size={16} /></button>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsAdminModalOpen(false)}>Cancel</Button>
            <Button type="submit" fullWidth isLoading={isSubmitting}>Create Admin</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
