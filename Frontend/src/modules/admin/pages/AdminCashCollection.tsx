import { useState, useEffect } from "react";
import {
  getCashCollections,
  createCashCollection,
  approveCashCollection,
  rejectCashCollection,
  type CashCollection,
  type CashCollectionSummary,
  type CreateCashCollectionData,
} from "../../../services/api/admin/adminDeliveryService";
import { getDeliveryBoys } from "../../../services/api/admin/adminDeliveryService";
import { useAuth } from "../../../context/AuthContext";

export default function AdminCashCollection() {
  const { isAuthenticated, token } = useAuth();
  const [cashCollections, setCashCollections] = useState<CashCollection[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formDeliveryBoyId, setFormDeliveryBoyId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formRemark, setFormRemark] = useState('');
  const [totalEntries, setTotalEntries] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [pendingSummary, setPendingSummary] = useState<CashCollectionSummary>({ pendingCount: 0, pendingAmount: 0 });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CashCollection | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch delivery boys and cash collections on component mount
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch delivery boys for the dropdown
        const deliveryBoysResponse = await getDeliveryBoys({
          status: "Active",
          limit: 100,
        });
        if (deliveryBoysResponse.success) {
          setDeliveryBoys(deliveryBoysResponse.data);
        }

        // Fetch cash collections
        const params: any = {
          page: currentPage,
          limit: entriesPerPage,
        };

        if (selectedDeliveryBoy !== "all") {
          params.deliveryBoyId = selectedDeliveryBoy;
        }

        if (fromDate) {
          params.fromDate = fromDate;
        }

        if (toDate) {
          params.toDate = toDate;
        }

        if (searchTerm) {
          params.search = searchTerm;
        }

        if (selectedMethod !== "all") {
          params.paymentMethod = selectedMethod.toLowerCase();
        }

        if (selectedStatus !== "all") {
          params.status = selectedStatus;
        }

        const cashResponse = await getCashCollections(params);

        if (cashResponse.success) {
          setCashCollections(cashResponse.data);
          setTotalEntries((cashResponse as any).pagination?.total || cashResponse.data.length);
          if ((cashResponse as any).summary) {
            setPendingSummary((cashResponse as any).summary);
          }
        } else {
          setError("Failed to load cash collections");
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(
          err.response?.data?.message ||
          "Failed to load data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    isAuthenticated,
    token,
    currentPage,
    entriesPerPage,
    selectedDeliveryBoy,
    fromDate,
    toDate,
    searchTerm,
    selectedMethod,
    selectedStatus,
    reloadKey,
  ]);

  const handleApprove = async (collection: CashCollection) => {
    if (processingId) return;
    const confirmed = window.confirm(
      `Approve ₹${collection.amount.toFixed(2)} cash handover from ${collection.deliveryBoyName}?\n\nConfirm only if you have actually received this cash.`
    );
    if (!confirmed) return;

    try {
      setProcessingId(collection._id);
      setError(null);
      setSuccessMessage(null);
      const response = await approveCashCollection(collection._id);
      if (!response.success) {
        setError(response.message || "Failed to approve cash handover");
        return;
      }
      setSuccessMessage(
        `Approved ₹${collection.amount.toFixed(2)} from ${collection.deliveryBoyName}. Remaining cash in hand: ₹${(response.data?.deliveryBoyCashCollected ?? 0).toFixed(2)}`
      );
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to approve cash handover");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget || processingId) return;
    try {
      setProcessingId(rejectTarget._id);
      setError(null);
      setSuccessMessage(null);
      const response = await rejectCashCollection(rejectTarget._id, rejectReason.trim() || undefined);
      if (!response.success) {
        setError(response.message || "Failed to reject cash handover");
        return;
      }
      setSuccessMessage(`Rejected ₹${rejectTarget.amount.toFixed(2)} handover from ${rejectTarget.deliveryBoyName}.`);
      setRejectTarget(null);
      setRejectReason("");
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reject cash handover");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: CashCollection["status"]) => {
    const styles: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      Pending: "Pending Approval",
      Approved: "Approved",
      Rejected: "Rejected",
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.Approved}`}>
        {labels[status] || status}
      </span>
    );
  };

  const renderActions = (collection: CashCollection) => {
    if (collection.status !== "Pending") {
      return (
        <div className="text-xs text-neutral-500">
          {collection.reviewedBy ? `by ${collection.reviewedBy}` : "-"}
          {collection.status === "Rejected" && collection.rejectionReason && (
            <div className="text-red-600 mt-0.5">Reason: {collection.rejectionReason}</div>
          )}
        </div>
      );
    }
    const busy = processingId === collection._id;
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleApprove(collection)}
          disabled={!!processingId}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50">
          {busy ? "..." : "Approve"}
        </button>
        <button
          onClick={() => {
            setRejectTarget(collection);
            setRejectReason("");
          }}
          disabled={!!processingId}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50">
          Reject
        </button>
      </div>
    );
  };

  const renderSettledOrders = (collection: CashCollection) => {
    if (collection.status !== "Approved" || !collection.settledOrders?.length) return null;
    return (
      <div className="text-[11px] text-neutral-500 mt-1">
        Settled: {collection.settledOrders
          .map((s) => `#${s.orderNumber || s.orderId?.slice(-6)} (₹${s.amount.toFixed(2)})`)
          .join(", ")}
      </div>
    );
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Note: Filtering is done server-side, so we just use the cashCollections as is
  const displayedCollections = cashCollections;

  // For pagination display (simplified - in real app, this would come from API)
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;

  const handleAddCollection = async () => {
    setFormDeliveryBoyId(deliveryBoys[0]?._id || '');
    setFormAmount('');
    setFormRemark('');
    setShowAddModal(true);
  };

  const handleSubmitCollection = async () => {
    const amount = Number(formAmount);
    if (!formDeliveryBoyId || !amount || amount <= 0) {
      setError('Delivery boy and amount are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload: CreateCashCollectionData = {
        deliveryBoyId: formDeliveryBoyId,
        amount,
        remark: formRemark || undefined,
      };

      const response = await createCashCollection(payload);
      if (!response.success) {
        setError(response.message || 'Failed to add cash collection');
        return;
      }

      setShowAddModal(false);
      setCurrentPage(1);
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add cash collection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "Delivery Boy",
      "Amount Collected",
      "Method",
      "Collected By",
      "Remark",
      "Date",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...cashCollections.map((collection) =>
        [
          collection._id.slice(-6),
          `"${collection.deliveryBoyName}"`,
          collection.amount.toFixed(2),
          `"${getMethodLabel(collection.paymentMethod)}"`,
          `"${collection.collectedBy || ""}"`,
          `"${collection.remark || ""}"`,
          new Date(collection.collectedAt).toLocaleDateString(),
          collection.status,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cash_collections_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearDate = () => {
    setFromDate("");
    setToDate("");
  };

  const methods = ["All", "Cash", "Online"];
  const getMethodLabel = (method: string) => {
    if (method === "cash") return "Cash Deposit by Cash";
    if (method === "HDFC" || method === "razorpay") {
      return "Cash Deposit by Online";
    }
    return method;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-teal-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h1 className="text-white text-lg sm:text-2xl font-semibold">
          Delivery Boy Cash Collection List
        </h1>
        <button
          onClick={handleAddCollection}
          className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Cash Collection
        </button>
      </div>

      {pendingSummary.pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-sm text-yellow-900">
            <span className="font-semibold">{pendingSummary.pendingCount}</span> cash handover
            {pendingSummary.pendingCount > 1 ? " requests" : " request"} waiting for approval (₹
            {pendingSummary.pendingAmount.toFixed(2)})
          </div>
          {selectedStatus !== "Pending" && (
            <button
              onClick={() => {
                setSelectedStatus("Pending");
                setCurrentPage(1);
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-xs font-semibold">
              Show Pending
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex justify-between gap-2">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="font-bold">×</button>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 px-5 py-4">
              <h2 className="text-white text-lg font-semibold">Reject Cash Handover</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-neutral-700">
                Reject ₹{rejectTarget.amount.toFixed(2)} from <span className="font-semibold">{rejectTarget.deliveryBoyName}</span>?
                The amount will stay in the delivery boy's cash in hand.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                placeholder="Reason (e.g. Cash not received)"
              />
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 border border-neutral-300 rounded-lg py-2.5 text-sm font-semibold"
                disabled={!!processingId}>
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
                disabled={!!processingId}>
                {processingId ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-semibold">Add Cash Collection</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:bg-white/10 rounded-full p-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Select Delivery Boy*</label>
                <select
                  value={formDeliveryBoyId}
                  onChange={(e) => setFormDeliveryBoyId(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a delivery boy</option>
                  {deliveryBoys.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Amount* (₹)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Enter amount"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Remark</label>
                <textarea
                  value={formRemark}
                  onChange={(e) => setFormRemark(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm min-h-[90px]"
                  placeholder="Optional remark"
                />
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-neutral-300 rounded-lg py-2.5 text-sm font-semibold"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCollection}
                  className="flex-1 bg-teal-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Collection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Filters */}
        <div className="p-3 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col gap-3">
            {/* Left Side Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {/* From - To Date */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-neutral-700">
                  From Date
                </label>
                <div className="relative">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    type="text"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-neutral-700">To Date</label>
                <div className="relative">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    type="text"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-neutral-700">Delivery Boy</label>
                <select
                  value={selectedDeliveryBoy}
                  onChange={(e) => {
                    setSelectedDeliveryBoy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                  <option value="all">All Delivery Boys</option>
                  {deliveryBoys.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-neutral-700">Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                  {methods.map((method) => (
                    <option
                      key={method}
                      value={method === "All" ? "all" : method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-neutral-700">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                  <option value="all">All</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-700">Per Page</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-neutral-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <button
                onClick={handleClearDate}
                className="px-3 py-2 bg-neutral-700 hover:bg-neutral-800 text-white rounded text-xs transition-colors">
                Clear Dates
              </button>

              <button
                onClick={handleExport}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-2 transition-colors">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-700">Search</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search"
                  className="px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden p-3 space-y-3">
          {displayedCollections.length === 0 ? (
            <div className="text-center text-sm text-neutral-500 py-6">No data available</div>
          ) : (
            displayedCollections.map((collection) => (
              <div key={collection._id} className="border border-neutral-200 rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-900">#{collection._id.slice(-6)}</div>
                  <div className="text-xs text-neutral-500">{new Date(collection.collectedAt).toLocaleDateString()}</div>
                </div>
                <div className="mt-2 text-sm font-medium text-neutral-900">{collection.deliveryBoyName}</div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="text-xs text-neutral-500">Collected</div>
                  <div className="text-xs font-semibold text-neutral-900">₹{collection.amount.toFixed(2)}</div>
                  <div className="text-xs text-neutral-500">Method</div>
                  <div className="text-xs font-semibold text-neutral-900">{getMethodLabel(collection.paymentMethod)}</div>
                  <div className="text-xs text-neutral-500">Collected By</div>
                  <div className="text-xs font-semibold text-neutral-900">{collection.collectedBy || "-"}</div>
                  <div className="text-xs text-neutral-500">Status</div>
                  <div>{getStatusBadge(collection.status)}</div>
                </div>
                {collection.remark && (
                  <div className="text-xs text-neutral-600 mt-2">Remark: {collection.remark}</div>
                )}
                {renderSettledOrders(collection)}
                <div className="mt-3">{renderActions(collection)}</div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-2">
                    Id
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-2">
                    Name
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                >
                  Collected By
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-2">
                    Amount
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                >
                  Method
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("remark")}>
                  <div className="flex items-center gap-2">
                    Remark
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("dateTime")}>
                  <div className="flex items-center gap-2">
                    Date Time
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {displayedCollections.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                    No data available in table
                  </td>
                </tr>
              ) : (
                displayedCollections.map((collection) => (
                  <tr key={collection._id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">
                      {collection._id.slice(-6)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      {collection.deliveryBoyName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {collection.collectedBy || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      ₹{collection.amount.toFixed(2)}
                      {renderSettledOrders(collection)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {getMethodLabel(collection.paymentMethod)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {collection.remark || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {new Date(collection.collectedAt).toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm">
                      {getStatusBadge(collection.status)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm">
                      {renderActions(collection)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {totalEntries === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(endIndex, totalEntries)} of{" "}
            {totalEntries} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${currentPage === 1 || totalPages === 0
                ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                : "text-neutral-700 hover:bg-neutral-50"
                }`}
              aria-label="Previous page">
              <svg
                width="16"
                height="16"
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
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${currentPage === totalPages || totalPages === 0
                ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                : "text-neutral-700 hover:bg-neutral-50"
                }`}
              aria-label="Next page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-neutral-800 text-white text-center text-sm py-4">
        Copyright 2025. Developed By{" "}
        <a href="#" className="text-blue-400 hover:text-blue-300">
          Mandi Bazaar - Quick Delivery App
        </a>
      </div>
    </div>
  );
}

