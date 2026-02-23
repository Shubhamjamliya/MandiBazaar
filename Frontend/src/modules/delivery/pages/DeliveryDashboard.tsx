import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DeliveryHeader from "../components/DeliveryHeader";
import SummaryBar from "../components/SummaryBar";
import DashboardCard from "../components/DashboardCard";
import DeliveryBottomNav from "../components/DeliveryBottomNav";
import { getDashboardStats } from "../../../services/api/delivery/deliveryService";
import { useDeliveryStatus } from "../context/DeliveryStatusContext";

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { isOnline, sellersInRangeCount, locationError } = useDeliveryStatus();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Icons for dashboard cards (Keep existing SVGs)
  const pendingOrderIcon = (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 17H4L5 12H19L20 17H22M2 17C2 18.1046 2.89543 19 4 19C5.10457 19 6 18.1046 6 17M2 17C2 15.8954 2.89543 15 4 15C5.10457 15 6 15.8954 6 17M22 17C22 18.1046 21.1046 19 20 19C18.8954 19 18 18.1046 18 17M22 17C22 15.8954 21.1046 15 20 15C18.8954 15 18 15.8954 18 17M6 17H18M5 12L4 7H2M20 12L21 7H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M8 10H10M12 10H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );

  const allOrderIcon = (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 17H4L5 12H19L20 17H22M2 17C2 18.1046 2.89543 19 4 19C5.10457 19 6 18.1046 6 17M2 17C2 15.8954 2.89543 15 4 15C5.10457 15 6 15.8954 6 17M22 17C22 18.1046 21.1046 19 20 19C18.8954 19 18 18.1046 18 17M22 17C22 15.8954 21.1046 15 20 15C18.8954 15 18 15.8954 18 17M6 17H18M5 12L4 7H2M20 12L21 7H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="7"
        y="5"
        width="10"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <rect
        x="8"
        y="3"
        width="8"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  const returnOrderIcon = (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  const returnItemIcon = (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12L7 8M3 12L7 16M3 12H21M21 12L17 8M21 12L17 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  const dailyCollectionIcon = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M6 10H18M6 14H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9 17L11 19L15 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  const cashBalanceIcon = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M6 10H18M6 14H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="16"
        cy="12"
        r="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  const earningIcon = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M6 10H18M6 14H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 12H20M18 10V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-green-700 font-semibold">Loading Dashboard...</p>
        </div>
        <DeliveryBottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center pb-20 p-8">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600">{error}</p>
        </div>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 pb-20">
      {/* Header */}
      <DeliveryHeader />

      <div className="px-4 py-4 space-y-4">
        {/* Daily Collection & Cash Balance Bar */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-green-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  {dailyCollectionIcon}
                </div>
                <span className="text-xs text-gray-600 font-medium">Daily Collection</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹ {stats?.dailyCollection?.toLocaleString("en-IN") || "0"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  {cashBalanceIcon}
                </div>
                <span className="text-xs text-gray-600 font-medium">Cash Balance</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹ {stats?.cashBalance?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <div
          onClick={() => navigate("/delivery/wallet")}
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg active:scale-95 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-xs font-medium">Available Wallet Balance</p>
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <svg
                width="18"
                height="18"
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
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold">
              ₹ {stats?.walletBalance?.toFixed(2) || "0.00"}
            </p>
            <div className="flex items-center gap-1 text-green-100 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full">
              View Details
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Real-time Seller Radius Indicator */}
        <div
          onClick={() => isOnline && navigate("/delivery/sellers-in-range")}
          className={`p-4 rounded-2xl border shadow-md transition-all active:scale-95 ${isOnline ? "bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${isOnline ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400"}`}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <h3
                  className={`text-sm font-bold ${isOnline ? "text-teal-900" : "text-gray-500"}`}>
                  {isOnline ? "Active Service Areas" : "Offline"}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {isOnline
                    ? `You are in ${sellersInRangeCount} seller radius`
                    : "Go online to track service areas"}
                </p>
              </div>
            </div>
            {isOnline && (
              <div className="flex items-center gap-2 bg-teal-100 px-3 py-2 rounded-xl">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                <span className="text-xl font-bold text-teal-600">
                  {sellersInRangeCount}
                </span>
              </div>
            )}
          </div>
          {locationError && isOnline && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {locationError}
            </div>
          )}
        </div>

        {/* Dashboard Cards Grid - Mobile App Style */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => navigate("/delivery/orders/pending")}
            className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
              {pendingOrderIcon}
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{stats?.pendingOrders || 0}</div>
            <div className="text-xs text-gray-600 font-medium">Today's Pending</div>
          </div>
          
          <div
            onClick={() => navigate("/delivery/orders/all")}
            className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
              {allOrderIcon}
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{stats?.allOrders || 0}</div>
            <div className="text-xs text-gray-600 font-medium">Today's All Order</div>
          </div>
          
          <div
            onClick={() => navigate("/delivery/orders/return")}
            className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
              {returnOrderIcon}
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{stats?.returnOrders || 0}</div>
            <div className="text-xs text-gray-600 font-medium">Return Orders</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-md p-4 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
              {returnItemIcon}
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{stats?.returnItems || 0}</div>
            <div className="text-xs text-gray-600 font-medium">Return Items</div>
          </div>
        </div>

        {/* Today's Earning & Total Earning */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-green-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  {earningIcon}
                </div>
                <span className="text-xs text-gray-600 font-medium">Today's Earning</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹ {stats?.todayEarning || 0}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  {cashBalanceIcon}
                </div>
                <span className="text-xs text-gray-600 font-medium">Total Earning</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹ {stats?.totalEarning?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </div>

        {/* Today's Pending Order Section */}
        <div className="mt-2">
          <h2 className="text-gray-900 text-lg font-bold mb-3 px-1">
            Today's Pending Orders
          </h2>
          {stats?.pendingOrdersList && stats.pendingOrdersList.length > 0 ? (
            <div className="space-y-3">
              {stats.pendingOrdersList.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 active:scale-95 transition-transform"
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-gray-900 font-bold text-sm">
                        {order.orderId}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        {order.customerName}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === "Ready for pickup"
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                    {order.address}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <p className="text-gray-900 font-bold text-lg">
                      ₹ {order.totalAmount}
                    </p>
                    {order.estimatedDeliveryTime && (
                      <div className="flex items-center gap-1 text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-lg">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        ETA: {order.estimatedDeliveryTime}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 min-h-[200px] flex flex-col items-center justify-center shadow-md border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No pending orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <DeliveryBottomNav />
    </div>
  );
}
