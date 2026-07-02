import React, { useState, useEffect } from 'react';
import { getPendingManualPayments, approveManualPayment } from '../../api/payment.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { CheckCircle, Eye } from 'lucide-react';

export default function PendingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const res = await getPendingManualPayments();
      setPayments(res.data || []);
    } catch (err) {
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Are you sure you want to approve this payment? This will activate the user's subscription.")) return;
    
    try {
      setProcessingId(id);
      await approveManualPayment(id);
      toast.success('Payment approved and subscription activated!');
      setPayments(prev => prev.filter(p => p.id !== id));
      setSelectedPayment(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve payment');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Pending Payments</h1>
        <p className="text-gray-500">Review and approve manual UPI payments submitted by users.</p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>No pending payments at the moment.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {payments.map(payment => (
              <Card key={payment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPayment(payment)}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-navy-900">{payment.user_name}</h3>
                    <p className="text-sm text-gray-500">{payment.user_phone}</p>
                    <p className="text-sm font-medium mt-1">Package: <span className="capitalize">{payment.plan_type}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(payment.created_at)}</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={(e) => { e.stopPropagation(); setSelectedPayment(payment); }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div>
            {selectedPayment ? (
              <Card title="Payment Details" className="sticky top-6">
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">User Name</span>
                    <span className="font-medium">{selectedPayment.user_name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium">{selectedPayment.user_phone}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-primary-600">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Plan Type</span>
                    <span className="font-medium capitalize">{selectedPayment.plan_type}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Start Date</span>
                    <span className="font-medium">{formatDate(selectedPayment.start_date)}</span>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-gray-500 mb-1">Pickup Address</p>
                    <p className="font-medium bg-gray-50 p-2 rounded">{selectedPayment.pickup_address}</p>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-gray-500 mb-1">Drop Address</p>
                    <p className="font-medium bg-gray-50 p-2 rounded">{selectedPayment.drop_address}</p>
                  </div>

                  <div className="pt-4 border-t mt-4">
                    <p className="text-gray-500 mb-2 font-bold">Payment Receipt</p>
                    {selectedPayment.payment_receipt_url ? (
                      <a href={selectedPayment.payment_receipt_url} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={selectedPayment.payment_receipt_url} 
                          alt="Payment Receipt" 
                          className="w-full h-auto rounded-lg border object-contain max-h-64 cursor-zoom-in hover:opacity-90"
                        />
                      </a>
                    ) : (
                      <div className="bg-gray-100 text-center py-6 rounded text-gray-400">No Receipt Uploaded</div>
                    )}
                  </div>

                  <div className="pt-4">
                    <Button 
                      fullWidth 
                      variant="primary" 
                      isLoading={processingId === selectedPayment.id}
                      onClick={() => handleApprove(selectedPayment.id)}
                    >
                      Approve Payment
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12 text-gray-400">
                  <Eye className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>Select a payment to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
