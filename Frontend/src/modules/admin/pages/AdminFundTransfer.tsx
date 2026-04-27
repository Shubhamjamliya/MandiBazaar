import { useEffect, useState } from 'react';
import { getDeliveryBoys } from '../../../services/api/admin/adminDeliveryService';
import { createFundTransfer, getWalletTransactions } from '../../../services/api/admin/adminWalletService';

interface FundTransfer {
  id: string;
  name: string;
  amount: number;
  type: 'Credit' | 'Debit';
  message: string;
  date: string;
}

interface Seller {
  _id: string;
  sellerName: string;
  storeName: string;
}

export default function AdminFundTransfer() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [sellers, setSellers] = useState<Seller[]>([]);

  const [fundTransfers, setFundTransfers] = useState<FundTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferBoyId, setTransferBoyId] = useState('');
  const [transferType, setTransferType] = useState<'Credit' | 'Debit'>('Credit');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRemark, setTransferRemark] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredTransfers = fundTransfers.filter(transfer =>
    transfer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.id.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredTransfers.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const displayedTransfers = filteredTransfers.slice(startIndex, endIndex);

  const handleExport = () => {
    alert('Export functionality will be implemented here');
  };

  const handleClearDate = () => {
    setFromDate('');
    setToDate('');
  };

  useEffect(() => {
    const fetchDeliveryBoys = async () => {
      try {
        const response = await getDeliveryBoys({ status: 'Active' });
        if (response.success && response.data) {
          setSellers(
            response.data.map((boy) => ({
              _id: boy._id,
              sellerName: boy.name,
              storeName: boy.name,
            }))
          );
        }
      } catch (err) {
        setError('Failed to load delivery boys');
      }
    };

    fetchDeliveryBoys();
  }, []);

  useEffect(() => {
    const fetchFundTransfers = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          userType: 'DELIVERY_BOY',
          type: selectedMethod === 'all' ? undefined : selectedMethod,
          page: 1,
          limit: 200,
        };

        const response = await getWalletTransactions(params);
        if (response.success && response.data) {
          const mapped = response.data
            .filter((item: any) => {
              if (!['Credit', 'Debit'].includes(item.type)) return false;
              if (selectedDeliveryBoy === 'all') return true;
              return item.userId === selectedDeliveryBoy;
            })
            .map((item: any) => {
            return {
              id: item._id,
              name: item.userName || 'Unknown',
              amount: item.amount,
              type: item.type,
              message: item.description || 'Admin fund transfer',
              date: new Date(item.createdAt).toLocaleDateString('en-IN'),
            };
          });
          setFundTransfers(mapped);
        } else {
          setFundTransfers([]);
        }
      } catch (err) {
        setError('Failed to load fund transfers');
        setFundTransfers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFundTransfers();
  }, [selectedDeliveryBoy, selectedMethod, fromDate, toDate]);

  const deliveryBoys = [
    'All Delivery Boy',
    ...sellers.map((boy) => boy.sellerName || boy.storeName || boy._id),
  ];

  const methods = ['All', 'Credit', 'Debit'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-teal-600 px-4 sm:px-6 py-4 rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-white text-lg sm:text-2xl font-semibold">View Delivery Boy Fund Transfer</h1>
        <button
          onClick={() => {
            setTransferBoyId(sellers[0]?._id || '');
            setShowTransferModal(true);
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Fund Transfer
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-700 whitespace-nowrap">Filter by Delivery Boy:</label>
                  <select
                    value={selectedDeliveryBoy}
                    onChange={(e) => {
                      setSelectedDeliveryBoy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-full sm:min-w-[200px]"
                  >
                    {deliveryBoys.map((boy) => {
                      const deliveryBoy = sellers.find((s) => s.sellerName === boy || s.storeName === boy);
                      const value = boy === 'All Delivery Boy' ? 'all' : deliveryBoy?._id || boy;
                      return (
                        <option key={value} value={value}>
                          {boy}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-700 whitespace-nowrap">Type:</label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => {
                      setSelectedMethod(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-full sm:min-w-[120px]"
                  >
                    {methods.map((method) => (
                      <option key={method} value={method === 'All' ? 'all' : method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={handleExport}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-700 whitespace-nowrap">Search:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search description..."
                    className="px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-full sm:min-w-[200px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mb-3">
                <label className="text-sm text-neutral-700 whitespace-nowrap">From - To Date:</label>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative w-full">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="text"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-full min-w-0"
                    />
                  </div>
                  <span className="text-neutral-500">-</span>
                  <div className="relative w-full">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
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
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-full min-w-0"
                    />
                  </div>
                  <button
                    onClick={handleClearDate}
                    className="px-3 py-2 bg-neutral-700 hover:bg-neutral-800 text-white rounded text-sm transition-colors w-full sm:w-auto"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700">Per Page:</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden p-4 space-y-3">
          {displayedTransfers.length === 0 ? (
            <div className="text-center text-sm text-neutral-500 py-6">
              {loading ? 'Loading data...' : (error || 'No data available')}
            </div>
          ) : (
            displayedTransfers.map((transfer) => (
              <div key={transfer.id} className="border border-neutral-200 rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-900">#{transfer.id.slice(-6)}</div>
                  <div className="text-xs text-neutral-500">{transfer.date}</div>
                </div>
                <div className="mt-2 text-sm font-medium text-neutral-900">{transfer.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transfer.type === 'Credit'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {transfer.type}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">₹{transfer.amount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-neutral-600 mt-2">{transfer.message}</div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full min-w-[900px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-2">
                    ID
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Delivery Boy
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-2">
                    amount (₹)
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('message')}
                >
                  <div className="flex items-center gap-2">
                    Description
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {displayedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                    {loading ? 'Loading data...' : (error || 'No data available in table')}
                  </td>
                </tr>
              ) : (
                displayedTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">{transfer.id}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">{transfer.name}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">₹{transfer.amount.toFixed(2)}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transfer.type === 'Credit'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {transfer.type}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">{transfer.message}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">{transfer.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTransfers.length)} of {filteredTransfers.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${currentPage === 1 || totalPages === 0
                ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              aria-label="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${currentPage === totalPages || totalPages === 0
                ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              aria-label="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-semibold">Add Fund Transfer</h2>
              <button
                onClick={() => setShowTransferModal(false)}
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
                  value={transferBoyId}
                  onChange={(e) => setTransferBoyId(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a delivery boy</option>
                  {sellers.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.sellerName || boy.storeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Type*</label>
                  <select
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value as 'Credit' | 'Debit')}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Amount* (₹)</label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Enter amount"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Description / Message</label>
                <textarea
                  value={transferRemark}
                  onChange={(e) => setTransferRemark(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm min-h-[90px]"
                  placeholder="e.g. Fuel allowance, Cash reconciliation"
                />
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 border border-neutral-300 rounded-lg py-2.5 text-sm font-semibold"
                  disabled={transferSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const amount = Number(transferAmount);
                    if (!transferBoyId || !amount || amount <= 0) return;
                    setTransferSubmitting(true);
                    try {
                      const res = await createFundTransfer({
                        userType: 'DELIVERY_BOY',
                        userId: transferBoyId,
                        amount,
                        type: transferType,
                        description: transferRemark || 'Admin fund transfer',
                      });
                      if (res.success) {
                        setShowTransferModal(false);
                        setTransferAmount('');
                        setTransferRemark('');
                        setCurrentPage(1);
                      }
                    } finally {
                      setTransferSubmitting(false);
                    }
                  }}
                  className="flex-1 bg-teal-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
                  disabled={transferSubmitting}
                >
                  {transferSubmitting ? 'Saving...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-neutral-500 py-4">
        Copyright 2025. Developed By{' '}
        <a href="#" className="text-teal-600 hover:text-teal-700">
          Mandi Bazaar - 20 Minute App
        </a>
      </div>
    </div>
  );
}


