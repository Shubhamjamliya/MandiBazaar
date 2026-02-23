import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import OrderChart from '../components/OrderChart';
import AlertCard from '../components/AlertCard';
import { getSellerDashboardStats, DashboardStats, NewOrder } from '../../../services/api/dashboardService';
import { getSellerProfile, toggleShopStatus } from '../../../services/api/auth/sellerAuthService';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newOrders, setNewOrders] = useState<NewOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, profileResponse] = await Promise.all([
          getSellerDashboardStats(),
          getSellerProfile()
        ]);

        if (statsResponse.success) {
          setStats(statsResponse.data.stats);
          setNewOrders(statsResponse.data.newOrders);
        } else {
          setError(statsResponse.message || 'Failed to fetch dashboard data');
        }

        if (profileResponse.success) {
          // Use nullish coalescing to default to true if isShopOpen is undefined
          const shopStatus = profileResponse.data.isShopOpen ?? true;
          console.log('Initial shop status from profile:', shopStatus, 'Raw value:', profileResponse.data.isShopOpen);
          setIsShopOpen(shopStatus);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleToggleShop = async () => {
    try {
      setStatusLoading(true);
      console.log('Toggle shop status - current state:', isShopOpen);
      const response = await toggleShopStatus();
      console.log('Toggle shop status - API response:', response);

      if (response.success) {
        setIsShopOpen(response.data.isShopOpen);
        // Show mobile toast notification
        setToastMessage(`Shop is now ${response.data.isShopOpen ? 'Open' : 'Closed'}`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error('Toggle failed - response not successful:', response);
        setToastMessage('Failed to toggle shop status');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error: any) {
      console.error('Failed to toggle shop status - error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setToastMessage('Error toggling shop status');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setStatusLoading(false);
    }
  };


  const getStatusBadgeClass = (status: NewOrder['status']) => {
    switch (status) {
      case 'Out For Delivery':
        return 'text-blue-800 bg-blue-100 border border-blue-400';
      case 'Received':
        return 'text-blue-600 bg-blue-50';
      case 'Payment Pending':
        return 'text-orange-600 bg-orange-50';
      case 'Cancelled':
        return 'text-red-600 bg-pink-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const totalPages = Math.ceil(newOrders.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const displayedOrders = newOrders.slice(startIndex, endIndex);

  // Icons for KPI cards
  const userIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );

  const categoryIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const subcategoryIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const productIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const ordersIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const completedOrdersIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7H18C19.1046 7 20 7.89543 20 9V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V9C4 7.89543 4.89543 7 6 7H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const pendingOrdersIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const cancelledOrdersIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 7L8 15M8 7L16 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7H18C19.1046 7 20 7.89543 20 9V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V9C4 7.89543 4.89543 7 6 7H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Alert icons
  const soldOutIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const lowStockIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9V15M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-green-700 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-8">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600">{error || 'Stats not available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 pt-6 pb-8 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <img src="/assets/logo/logo.png" alt="Mandi Bazaar" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Seller Dashboard</h1>
              <p className="text-xs text-green-100">Manage your store</p>
            </div>
          </div>
          
          {/* Notification Icon */}
          <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* 24/7 Support Badge and Shop Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
            <div className="relative">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
            <span className="text-xs font-semibold text-white">24/7 Support Available</span>
          </div>
          
          {/* Shop Toggle */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className={`text-xs font-semibold ${isShopOpen ? 'text-white' : 'text-red-200'}`}>
              {isShopOpen ? 'Shop Live' : 'Shop Closed'}
            </span>
            <button
              onClick={handleToggleShop}
              disabled={statusLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                isShopOpen ? 'bg-white' : 'bg-gray-400'
              } ${statusLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`${
                  isShopOpen ? 'translate-x-6 bg-green-500' : 'translate-x-1 bg-white'
                } inline-block h-4 w-4 transform rounded-full shadow-md transition-transform duration-300 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-4 -mt-4 space-y-4 pb-6">
      {/* Quick Stats Grid - Mobile App Style */}
      <div className="grid grid-cols-2 gap-3">
        {/* Products Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
            {productIcon}
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{stats.totalProduct}</div>
          <div className="text-xs text-gray-600 font-medium">Total Products</div>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
            {ordersIcon}
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{stats.totalOrders}</div>
          <div className="text-xs text-gray-600 font-medium">Total Orders</div>
        </div>

        {/* Completed Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
            {completedOrdersIcon}
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{stats.completedOrders}</div>
          <div className="text-xs text-gray-600 font-medium">Completed</div>
        </div>

        {/* Pending Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
            {pendingOrdersIcon}
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{stats.pendingOrders}</div>
          <div className="text-xs text-gray-600 font-medium">Pending</div>
        </div>
      </div>

      {/* Charts - Mobile Optimized */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <OrderChart 
            title={`${new Date().toLocaleString('default', { month: 'short' })} ${new Date().getFullYear()}`} 
            data={stats.dailyOrderData} 
            maxValue={Math.max(...stats.dailyOrderData.map(d => d.value), 5)} 
            height={250} 
          />
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <OrderChart 
            title={`Year ${new Date().getFullYear()}`} 
            data={stats.yearlyOrderData} 
            maxValue={Math.max(...stats.yearlyOrderData.map(d => d.value), 20)} 
            height={250} 
          />
        </div>
      </div>

      {/* Inventory Alerts - Mobile App Style */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sold Out Alert */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl shadow-md border border-pink-200 p-4 active:scale-95 transition-transform">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-2">
            {soldOutIcon}
          </div>
          <div className="text-2xl font-bold text-pink-900 mb-1">{stats.soldOutProducts}</div>
          <div className="text-xs font-medium text-pink-700">Sold Out</div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-md border border-yellow-200 p-4 active:scale-95 transition-transform">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-2">
            {lowStockIcon}
          </div>
          <div className="text-2xl font-bold text-yellow-900 mb-1">{stats.lowStockProducts}</div>
          <div className="text-xs font-medium text-yellow-700">Low Stock</div>
        </div>
      </div>

      {/* Recent Orders - Mobile App Style */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="text-base font-bold">Recent Orders</h2>
          </div>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{newOrders.length}</span>
        </div>

        {/* Orders List - Mobile Optimized */}
        <div className="divide-y divide-gray-100">
          {displayedOrders.map((order) => (
            <div key={order.id} className="p-4 active:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">#{order.id}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/seller/orders/${order.id}`)}
                  className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="View order"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{order.orderDate}</span>
                <span className="font-semibold text-gray-800">₹{order.amount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination - Mobile Optimized */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {startIndex + 1}-{Math.min(endIndex, newOrders.length)} of {newOrders.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentPage === 1
                ? 'text-gray-400 bg-gray-100'
                : 'text-gray-700 bg-white border border-gray-300 active:scale-95'
                }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs font-bold">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentPage === totalPages
                ? 'text-gray-400 bg-gray-100'
                : 'text-gray-700 bg-white border border-gray-300 active:scale-95'
                }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
          <div className={`${
            toastType === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-rose-600'
          } text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3`}>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              {toastType === 'success' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="font-semibold text-sm flex-1">{toastMessage}</span>
            <button 
              onClick={() => setShowToast(false)}
              className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

