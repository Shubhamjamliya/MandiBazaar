import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import {
  getSellerWalletBalance,
  getSellerWalletTransactions,
  requestSellerWithdrawal,
  getSellerWithdrawals,
  getSellerCommissions,
} from '../../../services/api/sellerWalletService';

type Tab = 'transactions' | 'withdrawals' | 'commissions';

export default function SellerWallet() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [balance, setBalance] = useState(0);
  const [holdBalance, setHoldBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any>({ commissions: [], total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'UPI'>('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transactionsRes, withdrawalsRes, commissionsRes] = await Promise.all([
        getSellerWalletBalance(),
        getSellerWalletTransactions(),
        getSellerWithdrawals(),
        getSellerCommissions(),
      ]);

      if (balanceRes.success) {
        setBalance(balanceRes.data.balance);
        setHoldBalance(balanceRes.data.holdBalance || 0);
      }
      if (transactionsRes.success) setTransactions(transactionsRes.data.transactions || []);
      if (withdrawalsRes.success) setWithdrawals(withdrawalsRes.data || []);
      if (commissionsRes.success) setCommissions(commissionsRes.data);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to load wallet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    try {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }

      if (amount > balance) {
        showToast('Insufficient balance', 'error');
        return;
      }

      setIsSubmitting(true);
      const response = await requestSellerWithdrawal(amount, paymentMethod);
      if (response.success) {
        showToast('Withdrawal request submitted successfully', 'success');
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        fetchWalletData();
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to request withdrawal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="m-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <p className="text-sm opacity-90 mb-1">Available to Withdraw</p>
        <h1 className="text-4xl font-bold mb-3">₹{balance.toFixed(2)}</h1>
        {holdBalance > 0 && (
          <div className="bg-white/15 rounded-lg px-3 py-2 mb-4">
            <p className="text-sm font-semibold">On Hold: ₹{holdBalance.toFixed(2)}</p>
            <p className="text-xs opacity-90">
              Earnings from COD orders. They become withdrawable after the delivery partner deposits the cash and admin approves it.
            </p>
          </div>
        )}
        <button
          onClick={() => setShowWithdrawModal(true)}
          className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-md"
        >
          Request Withdrawal
        </button>
      </motion.div>


      {/* Tabs */}
      <div className="bg-white mx-4 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'transactions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
              }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'withdrawals'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
              }`}
          >
            Withdrawals
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'commissions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
              }`}
          >
            Order Earnings
          </button>
        </div>

        <div className="p-4">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {(() => {
                const allItems = transactions;

                if (allItems.length === 0) {
                  return <p className="text-center text-gray-500 py-8">No transactions yet</p>;
                }

                return allItems.map((item: any) => (
                  <div key={item._id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.status === 'Pending' && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            On Hold
                          </span>
                        )}
                        {item.status === 'Completed' && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Success
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <p className={`font-bold text-lg ${item.type === 'Credit' ? 'text-green-600' : 'text-red-600'} ${item.status === 'Pending' ? 'opacity-60' : ''}`}>
                      {item.type === 'Credit' ? '+' : '-'}₹{item.amount.toFixed(2)}
                    </p>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No withdrawal requests yet</p>
              ) : (
                withdrawals.map((withdrawal: any) => (
                  <div key={withdrawal._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">₹{withdrawal.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-600">{withdrawal.paymentMethod}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${withdrawal.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : withdrawal.status === 'Approved'
                            ? 'bg-blue-100 text-blue-700'
                            : withdrawal.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        {withdrawal.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(withdrawal.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {withdrawal.remarks && (
                      <p className="text-xs text-gray-600 mt-2 italic">{withdrawal.remarks}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[11px] text-gray-500">Total Earned</p>
                  <p className="text-sm font-bold text-gray-900">₹{(commissions.total || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[11px] text-gray-500">Available</p>
                  <p className="text-sm font-bold text-green-600">₹{(commissions.paid || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[11px] text-gray-500">On Hold</p>
                  <p className="text-sm font-bold text-orange-600">₹{(commissions.pending || 0).toFixed(2)}</p>
                </div>
              </div>
              {!commissions.orders?.length ? (
                <p className="text-center text-gray-500 py-8">No order earnings yet</p>
              ) : (
                commissions.orders.map((order: any) => (
                  <div key={order.orderId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{order.orderNumber || String(order.orderId).slice(-8)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod || 'Online'} ·{' '}
                          {new Date(order.orderDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${order.status === 'On Hold'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                          }`}
                      >
                        {order.status === 'On Hold' ? 'On Hold' : 'Available'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Items Amount</span>
                        <span>₹{order.itemsAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Commission</span>
                        <span className="text-red-600">-₹{order.commissionAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1">
                        <span>Your Earning</span>
                        <span className="text-green-700">₹{order.netEarning.toFixed(2)}</span>
                      </div>
                    </div>
                    {order.status === 'On Hold' && (
                      <p className="text-[11px] text-orange-600 mt-2">
                        Cash is with the delivery partner. Will be available after admin approves the deposit.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {
        showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-4">Request Withdrawal</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: ₹{balance.toFixed(2)}</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  }}
                  className="flex-1 border border-gray-300 rounded-lg py-2.5 font-semibold hover:bg-gray-50 transition"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawRequest}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
}
