import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../../../context/ToastContext";
import {
  getDeliveryWalletBalance,
  getDeliveryWalletTransactions,
  requestDeliveryWithdrawal,
  getDeliveryWithdrawals,
  getDeliveryCommissions,
  createSettleCashOrder,
  verifySettleCash,
} from "../../../services/api/deliveryWalletService";

type Tab = "transactions" | "withdrawals" | "commissions";

export default function DeliveryWallet() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [balance, setBalance] = useState(0);
  const [cashCollected, setCashCollected] = useState(0);
  const [cashLimit, setCashLimit] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any>({
    commissions: [],
    total: 0,
    paid: 0,
    pending: 0,
  });
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Bank Transfer" | "UPI">(
    "Bank Transfer",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transactionsRes, withdrawalsRes, commissionsRes] =
        await Promise.all([
          getDeliveryWalletBalance(),
          getDeliveryWalletTransactions(),
          getDeliveryWithdrawals(),
          getDeliveryCommissions(),
        ]);

      if (balanceRes.success) {
        setBalance(balanceRes.data.balance);
        setCashCollected(balanceRes.data.cashCollected || 0);
        setCashLimit(balanceRes.data.cashLimit || 0);
        setProfile(balanceRes.data.profile);
      }
      if (transactionsRes.success)
        setTransactions(transactionsRes.data.transactions || []);
      if (withdrawalsRes.success) setWithdrawals(withdrawalsRes.data || []);
      if (commissionsRes.success) setCommissions(commissionsRes.data);
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to load wallet data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    try {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
      }

      if (amount > balance) {
        showToast("Insufficient balance", "error");
        return;
      }

      setIsSubmitting(true);
      const response = await requestDeliveryWithdrawal(amount, paymentMethod);
      if (response.success) {
        showToast("Withdrawal request submitted successfully", "success");
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        fetchWalletData();
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to request withdrawal",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSettleCash = async () => {
    try {
      const amount = parseFloat(settleAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
      }

      if (amount > cashCollected + 0.01) {
        showToast("Amount cannot exceed cash owed", "error");
        return;
      }

      setIsSubmitting(true);

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) {
        showToast("Razorpay SDK failed to load", "error");
        return;
      }

      const orderRes = await createSettleCashOrder(amount);
      if (!orderRes.success) {
        showToast(orderRes.message || "Failed to initiate payment", "error");
        return;
      }

      const options = {
        key: orderRes.data.razorpayKey,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Mandi Bazaar",
        description: "Cash Settlement",
        order_id: orderRes.data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await verifySettleCash({
              amount,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            if (verifyRes.success) {
              showToast("Cash settled successfully", "success");
              setShowSettleModal(false);
              setSettleAmount("");
              fetchWalletData();
            }
          } catch (e: any) {
            showToast(e.response?.data?.message || "Verification failed", "error");
          }
        },
        prefill: {
          name: profile?.name || "",
          contact: profile?.mobile || "",
          email: profile?.email || "",
        },
        theme: { color: "#16a34a" },
        modal: {
          ondismiss: () => {
            showToast("Payment cancelled", "info");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to settle cash",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="m-4 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-green-100 text-sm font-medium">
              Available Balance
            </p>
            <div className="bg-green-400/30 p-2 rounded-xl">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold mb-6">
            ₹{balance.toFixed(2)}
          </h1>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full bg-white text-green-700 py-3.5 rounded-xl font-bold hover:bg-green-50 transition-all shadow-md active:scale-[0.98]">
            Request Withdrawal
          </button>
        </div>
        {/* Decorative background circle */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-green-400/20 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Cash Liability Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-100 text-sm font-medium">Cash in Hand (Owed to Platform)</p>
            </div>
            <h2 className="text-3xl font-extrabold">₹{cashCollected.toFixed(2)}</h2>
            <p className="text-xs text-red-100 mt-1">Cash Limit: ₹{cashLimit.toFixed(2)}</p>
            {/* Limit Progress Bar */}
            <div className="w-full bg-red-900/50 rounded-full h-1.5 mt-3 mb-1">
              <div
                className="bg-white h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((cashCollected / cashLimit) * 100, 100)}%` }}>
              </div>
            </div>
            {cashCollected >= cashLimit && (
              <p className="text-xs font-bold text-yellow-300 mt-1">⚠️ Cash limit reached! You cannot receive new orders.</p>
            )}
          </div>
          <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => {
                setSettleAmount(cashCollected.toFixed(2));
                setShowSettleModal(true);
              }}
              disabled={cashCollected <= 0}
              className="w-full sm:w-auto bg-white text-red-700 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              Pay Platform
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-red-400/20 rounded-full blur-2xl"></div>
      </motion.div>

      {/* Commission Summary */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Total Earned</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{commissions.total?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Paid</p>
          <p className="text-lg font-bold text-green-600">
            ₹{commissions.paid?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Pending</p>
          <p className="text-lg font-bold text-orange-600">
            ₹{commissions.pending?.toFixed(2) || "0.00"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white mx-4 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "transactions"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-600"
              }`}>
            Transactions
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "withdrawals"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-600"
              }`}>
            Withdrawals
          </button>
          <button
            onClick={() => setActiveTab("commissions")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "commissions"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-600"
              }`}>
            Commissions
          </button>
        </div>

        <div className="p-4">
          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No transactions yet
                </p>
              ) : (
                transactions.map((txn: any) => (
                  <div
                    key={txn._id}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {txn.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p
                      className={`font-bold text-lg ${txn.type === "Credit" ? "text-green-600" :
                        txn.type === "Cash_Collected" ? "text-red-500" :
                          txn.type === "Cash_Settlement" ? "text-blue-500" :
                            "text-red-600"
                        }`}>
                      {txn.type === "Credit" || txn.type === "Cash_Settlement" ? "+" : "-"}₹
                      {txn.amount.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === "withdrawals" && (
            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No withdrawal requests yet
                </p>
              ) : (
                withdrawals.map((withdrawal: any) => (
                  <div
                    key={withdrawal._id}
                    className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">
                          ₹{withdrawal.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {withdrawal.paymentMethod}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${withdrawal.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : withdrawal.status === "Approved"
                            ? "bg-blue-100 text-blue-700"
                            : withdrawal.status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                        {withdrawal.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(withdrawal.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                    {withdrawal.remarks && (
                      <p className="text-xs text-gray-600 mt-2 italic">
                        {withdrawal.remarks}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === "commissions" && (
            <div className="space-y-3">
              {commissions.commissions?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No commissions yet
                </p>
              ) : (
                commissions.commissions?.map((comm: any) => (
                  <div key={comm.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          Delivery Commission
                        </p>
                        <p className="text-xs text-gray-600">
                          Rate: {comm.rate}%
                        </p>
                      </div>
                      <p className="font-bold text-green-600">
                        ₹{comm.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Order Amount: ₹{comm.orderAmount.toFixed(2)}</span>
                      <span>
                        {new Date(comm.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Request Withdrawal</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: ₹{balance.toFixed(2)}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount("");
                }}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 font-semibold hover:bg-gray-50 transition"
                disabled={isSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleWithdrawRequest}
                className="flex-1 bg-green-600 text-white rounded-lg py-2.5 font-semibold hover:bg-green-700 transition disabled:opacity-50"
                disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settle Cash Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Settle Cash</h2>
            <p className="text-sm text-gray-600 mb-4">
              Pay the collected COD cash to the platform to continue receiving orders.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter amount"
                  max={cashCollected}
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total owed: ₹{cashCollected.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSettleModal(false);
                  setSettleAmount("");
                }}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 font-semibold hover:bg-gray-50 transition"
                disabled={isSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleSettleCash}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 font-semibold hover:bg-red-700 transition disabled:opacity-50 flex justify-center items-center"
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                ) : (
                  "Proceed to Pay"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
