import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, XCircle, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getUnverifiedDrivers, verifyDriver, rejectDriver } from '../../api/admin.api';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/admin/ConfirmModal';
import Modal from '../../components/ui/Modal';

const UnverifiedDrivers = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const res = await getUnverifiedDrivers();
      if (res.success) setDrivers(res.data);
    } catch (err) {
      toast.error('Failed to load pending verifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async () => {
    setIsActionLoading(true);
    try {
      const res = await verifyDriver(selectedDriver.id);
      if (res.success) {
        toast.success(`${selectedDriver.full_name} has been verified`);
        setVerifyModalOpen(false);
        setDrivers(prev => prev.filter(d => d.id !== selectedDriver.id));
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.length < 10) {
      toast.error('Please provide a detailed reason (min 10 chars)');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await rejectDriver(selectedDriver.id, { reason: rejectReason });
      if (res.success) {
        toast.success(`Profile rejected. Notification sent to driver.`);
        setRejectModalOpen(false);
        setRejectReason('');
        setDrivers(prev => prev.filter(d => d.id !== selectedDriver.id));
      }
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-navy-100 pb-4">
        <h1 className="text-2xl font-bold text-navy-900">Drivers Management</h1>
        
        <div className="flex bg-navy-50 rounded-xl p-1 border border-navy-200">
          <button 
            className="px-4 py-2 rounded-lg text-sm font-bold text-navy-600 hover:text-navy-900"
            onClick={() => navigate('/admin/drivers')}
          >
            All Drivers
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-bold bg-white text-orange-600 shadow-sm border border-orange-100 flex items-center gap-2">
            Pending Verification
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{drivers.length}</span>
          </button>
        </div>
      </div>

      {drivers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0 text-orange-500" />
          <p className="font-medium text-sm">Review {drivers.length} driver profiles. Verified drivers can immediately start receiving subscriptions.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : drivers.length === 0 ? (
        <EmptyState 
          icon={CheckCircle2} 
          title="All Caught Up!" 
          description="There are no pending driver verifications at the moment."
          className="bg-white py-16 border border-navy-100 rounded-xl shadow-sm"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {drivers.map(driver => (
            <Card key={driver.id} className="p-6 flex flex-col border-orange-100 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <Avatar name={driver.full_name} src={driver.profile_photo} size="xl" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-navy-900 mb-1">{driver.full_name}</h3>
                  <p className="text-sm text-navy-600">{driver.email} • {driver.phone}</p>
                  <Badge color="orange" className="mt-2">Pending Review</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                <div className="bg-navy-50 p-3 rounded-xl border border-navy-100">
                  <p className="text-xs font-bold text-navy-400 flex items-center gap-1 mb-2">
                    <FileText size={14}/> License Details
                  </p>
                  <p className="font-mono font-bold text-navy-900 tracking-wider text-sm">{driver.license_number}</p>
                  <p className="text-xs text-navy-500 mt-1">Exp: {driver.license_expiry}</p>
                  {driver.license_image && (
                    <a href={driver.license_image} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">View License</a>
                  )}
                </div>
                
                <div className="bg-navy-50 p-3 rounded-xl border border-navy-100">
                  <p className="text-xs font-bold text-navy-400 flex items-center gap-1 mb-2">
                    <ShieldCheck size={14}/> Aadhar Details
                  </p>
                  <p className="font-mono font-bold text-navy-900 tracking-wider text-sm">{driver.aadhar_number}</p>
                  {driver.aadhar_image && (
                    <a href={driver.aadhar_image} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">View Aadhar</a>
                  )}
                </div>

                <div className="bg-navy-50 p-3 rounded-xl border border-navy-100">
                  <p className="text-xs font-bold text-navy-400 flex items-center gap-1 mb-2">
                    <FileText size={14}/> PAN Details
                  </p>
                  <p className="font-mono font-bold text-navy-900 tracking-wider text-sm">{driver.pan_card_number}</p>
                  {driver.pan_card_image && (
                    <a href={driver.pan_card_image} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">View PAN</a>
                  )}
                </div>

                <div className="bg-navy-50 p-3 rounded-xl border border-navy-100">
                  <p className="text-xs font-bold text-navy-400 mb-2">Bank & Experience</p>
                  <p className="text-navy-900 text-sm"><span className="font-bold">A/C:</span> {driver.bank_account_number}</p>
                  <p className="text-navy-900 text-sm"><span className="font-bold">Exp:</span> {driver.experience_years} Years</p>
                </div>

                {driver.vehicles?.[0] && (
                  <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-500 uppercase mb-2">Primary Vehicle</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-navy-900">{driver.vehicles[0].brand} {driver.vehicles[0].model}</p>
                        <p className="text-xs text-navy-600 mt-0.5">{driver.vehicles[0].color} • {driver.vehicles[0].year} • {driver.vehicles[0].seating_capacity} Seats</p>
                      </div>
                      <span className="bg-white border border-navy-200 px-3 py-1 rounded text-sm font-bold font-mono text-navy-900 shadow-sm">
                        {driver.vehicles[0].plate_number}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-navy-100 mt-auto">
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => { setSelectedDriver(driver); setRejectModalOpen(true); }}
                >
                  <XCircle size={18} className="mr-2" /> Reject
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
                  onClick={() => { setSelectedDriver(driver); setVerifyModalOpen(true); }}
                >
                  <CheckCircle2 size={18} className="mr-2" /> Verify Driver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        onConfirm={handleVerify}
        isLoading={isActionLoading}
        title="Approve Driver Verification"
        message={`Are you sure you want to verify ${selectedDriver?.full_name}? Once verified, they will be able to receive assignments and use the driver app fully.`}
        confirmLabel="Verify Driver"
        confirmVariant="primary" // Assuming primary is blue/green enough, or can extend ConfirmModal to take custom bg class
      />

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Driver Profile">
        <div className="space-y-4">
          <p className="text-sm text-navy-600">
            Rejecting <span className="font-bold text-navy-900">{selectedDriver?.full_name}</span>. They will be notified via email/SMS to correct their details.
          </p>
          
          <div>
            <label className="text-sm font-bold text-navy-900 block mb-2">Reason for rejection <span className="text-red-500">*</span></label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-navy-200 rounded-xl p-3 outline-none focus:border-red-500 min-h-[100px] text-sm"
              placeholder="E.g., Document image is blurry, License expired, etc."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {['Documents unclear', 'Invalid license', 'Vehicle not eligible', 'Name mismatch'].map(suggestion => (
              <button 
                key={suggestion}
                onClick={() => setRejectReason(suggestion)}
                className="bg-navy-50 hover:bg-navy-100 text-navy-600 text-xs px-3 py-1.5 rounded-full transition-colors border border-navy-200"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-navy-100">
            <Button variant="outline" fullWidth onClick={() => setRejectModalOpen(false)} disabled={isActionLoading}>Cancel</Button>
            <Button variant="danger" fullWidth onClick={handleReject} isLoading={isActionLoading}>Submit Rejection</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UnverifiedDrivers;
