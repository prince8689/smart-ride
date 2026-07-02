import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getAdminComplaints, respondToComplaint } from '../../api/admin.api';
import { formatDate, timeAgo } from '../../utils/helpers';
import DataTable from '../../components/admin/DataTable';
import FilterBar from '../../components/admin/FilterBar';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [responseStatus, setResponseStatus] = useState('in_progress');
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const fetchComplaints = async (filters = {}) => {
    setIsLoading(true);
    try {
      const res = await getAdminComplaints(filters);
      if (res.success) setComplaints(res.data);
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const openRespond = (complaint) => {
    setSelectedComplaint(complaint);
    setResponseStatus(complaint.status === 'open' ? 'in_progress' : complaint.status);
    setResponseText(complaint.admin_response || '');
    setIsModalOpen(true);
  };

  const handleRespond = async () => {
    if (!responseText.trim() || responseText.length < 10) {
      toast.error('Response must be at least 10 characters');
      return;
    }
    setIsResponding(true);
    try {
      const res = await respondToComplaint(selectedComplaint.id, {
        status: responseStatus,
        admin_response: responseText
      });
      if (res.success) {
        toast.success('Response sent successfully');
        setIsModalOpen(false);
        setComplaints(complaints.map(c => c.id === selectedComplaint.id ? { ...c, status: responseStatus, admin_response: responseText } : c));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit response');
    } finally {
      setIsResponding(false);
    }
  };

  const stats = {
    open: complaints.filter(c => c.status === 'open').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const columns = [
    { key: 'user.full_name', label: 'User', sortable: true, render: r => (
      <div className="flex items-center gap-3">
        <Avatar name={r.user?.full_name} src={r.user?.profile_photo} size="sm" />
        <span className="font-bold">{r.user?.full_name}</span>
      </div>
    )},
    { key: 'subject', label: 'Subject', render: r => <span className="font-medium text-navy-900 truncate block w-48">{r.subject}</span> },
    { key: 'status', label: 'Status', sortable: true, render: r => {
      const colors = { open: 'red', in_progress: 'yellow', resolved: 'green', closed: 'gray' };
      return <Badge color={colors[r.status] || 'gray'}>{r.status.replace('_', ' ').toUpperCase()}</Badge>;
    }},
    { key: 'created_at', label: 'Submitted', sortable: true, render: r => (
      <div className="text-xs">
        <p className="font-medium">{formatDate(r.created_at)}</p>
        <p className="text-navy-400">{timeAgo(r.created_at)}</p>
      </div>
    )},
    { key: 'actions', label: 'Action', align: 'right', render: r => (
      <Button size="sm" variant={r.status === 'open' ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); openRespond(r); }}>
        Respond
      </Button>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <MessageSquare size={24} className="text-primary-600" /> Complaints
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={24} className="text-red-500" />
          <div><p className="text-sm font-bold text-red-800">Open</p><p className="text-2xl font-black text-red-600">{stats.open}</p></div>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center gap-3">
          <Clock size={24} className="text-yellow-600" />
          <div><p className="text-sm font-bold text-yellow-800">In Progress</p><p className="text-2xl font-black text-yellow-600">{stats.in_progress}</p></div>
        </div>
        <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={24} className="text-green-500" />
          <div><p className="text-sm font-bold text-green-800">Resolved</p><p className="text-2xl font-black text-green-600">{stats.resolved}</p></div>
        </div>
        <div className="bg-navy-50 border border-navy-100 p-4 rounded-xl flex items-center gap-3">
          <MessageSquare size={24} className="text-navy-500" />
          <div><p className="text-sm font-bold text-navy-800">Total</p><p className="text-2xl font-black text-navy-600">{complaints.length}</p></div>
        </div>
      </div>

      <FilterBar 
        filters={[{ key: 'status', label: 'Status', type: 'select', defaultValue: 'all', options: [
          { value: 'open', label: 'Open' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' }
        ]}]} 
        onChange={(f) => fetchComplaints(f)} 
      />

      <DataTable columns={columns} data={complaints} isLoading={isLoading} onRowClick={openRespond} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Complaint Details" size="lg">
        {selectedComplaint && (
          <div className="flex flex-col md:flex-row gap-6 h-full max-h-[70vh]">
            {/* Left: Complaint Info */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-xl">
                <Avatar name={selectedComplaint.user?.full_name} src={selectedComplaint.user?.profile_photo} size="md" />
                <div>
                  <p className="font-bold text-navy-900">{selectedComplaint.user?.full_name}</p>
                  <p className="text-xs text-navy-500">{selectedComplaint.user?.email} • {selectedComplaint.user?.phone}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-navy-400 uppercase mb-1">Subject</p>
                <p className="font-bold text-navy-900 text-lg">{selectedComplaint.subject}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-navy-400 uppercase mb-1">Description</p>
                <div className="bg-white border border-navy-100 p-4 rounded-xl text-sm text-navy-700 whitespace-pre-wrap">
                  {selectedComplaint.description}
                </div>
              </div>

              {selectedComplaint.subscription_id && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm">
                  <span className="font-bold text-blue-800">Related to Subscription: </span>
                  <span className="font-mono text-blue-600">#{selectedComplaint.subscription_id.slice(0,8)}</span>
                </div>
              )}
            </div>

            {/* Right: Response Area */}
            <div className="flex-1 flex flex-col bg-navy-50 rounded-xl p-4 border border-navy-100">
              <h3 className="font-bold text-navy-900 mb-4">Admin Response</h3>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-sm font-bold text-navy-700 block mb-1">Update Status</label>
                  <select 
                    value={responseStatus} 
                    onChange={(e) => setResponseStatus(e.target.value)}
                    className="w-full border border-navy-200 rounded-lg p-2 outline-none focus:border-primary-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-navy-700 block mb-1">Response Message</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full border border-navy-200 rounded-lg p-3 outline-none focus:border-primary-500 min-h-[120px] text-sm"
                    placeholder="Type response to user..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    "We are investigating this issue.",
                    "The issue has been resolved.",
                    "Please contact support for further assistance."
                  ].map(tmpl => (
                    <button 
                      key={tmpl}
                      onClick={() => setResponseText(tmpl)}
                      className="bg-white hover:bg-primary-50 text-navy-600 text-[10px] font-bold px-2 py-1 rounded border border-navy-200 transition-colors"
                    >
                      {tmpl.substring(0,20)}...
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-navy-200">
                <Button fullWidth onClick={handleRespond} isLoading={isResponding}>
                  Submit Response & Notify
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminComplaints;
