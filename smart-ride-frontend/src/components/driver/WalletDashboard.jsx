import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { getDriverWalletBalance, getDriverWalletTransactions } from '../../api/v2.api';
import toast from '../../utils/toastConfig';

const WalletDashboard = () => {
  const [balanceData, setBalanceData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, transRes] = await Promise.all([
        getDriverWalletBalance(),
        getDriverWalletTransactions(1, 20),
      ]);

      if (balanceRes.success) setBalanceData(balanceRes.data);
      if (transRes.success) setTransactions(transRes.data.transactions);
    } catch (err) {
      toast.error('Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
        <div className="h-64 bg-gray-200 rounded-2xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="wallet-dashboard">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl shadow-gray-900/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-300">Available Balance</h3>
          </div>
          <div className="text-4xl font-extrabold mb-6 tracking-tight">
            {formatCurrency(balanceData?.balance)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
              <p className="text-xs text-gray-400 mb-1">Total Earnings</p>
              <p className="font-semibold text-lg text-emerald-400">
                {formatCurrency(balanceData?.total_earned)}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
              <p className="text-xs text-gray-400 mb-1">Total Settled</p>
              <p className="font-semibold text-lg text-blue-400">
                {formatCurrency(balanceData?.total_settled)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800">Recent Transactions</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">Last 20</span>
        </div>

        <div className="divide-y divide-gray-50">
          {transactions.length > 0 ? (
            transactions.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-5 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    t.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.type === 'credit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 capitalize">
                      {t.type === 'credit' ? 'Payment Received' : 'Settlement'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-medium">Ref: {t.reference_id?.split('_')[0] || 'N/A'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${t.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 capitalize font-medium px-2 py-0.5 bg-gray-100 rounded-md inline-block">
                    {t.status}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-10 text-center flex flex-col items-center text-gray-500">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-medium text-gray-600">No transactions yet</p>
              <p className="text-sm mt-1">Your earnings will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard;
