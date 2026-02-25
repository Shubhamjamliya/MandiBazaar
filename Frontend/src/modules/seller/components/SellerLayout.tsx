import { ReactNode, useState, useCallback } from 'react';
import SellerHeader from './SellerHeader';
import SellerSidebar from './SellerSidebar';
import SellerBottomNavbar from './SellerBottomNavbar';
import { useSellerSocket, SellerNotification } from '../hooks/useSellerSocket';
import SellerNotificationAlert from './SellerNotificationAlert';

interface SellerLayoutProps {
  children: ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<SellerNotification | null>(null);

  const handleNotificationReceived = useCallback((notification: SellerNotification) => {
    setActiveNotification(notification);
  }, []);

  useSellerSocket(handleNotificationReceived);

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  const closeNotification = () => {
    setActiveNotification(null);
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 relative">
      {/* Real-time Notification Alert */}
      <SellerNotificationAlert
        notification={activeNotification}
        onClose={closeNotification}
      />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[45] lg:hidden animate-fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Fixed */}
      <div
        className={`fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out border-r border-teal-600/20 shadow-2xl lg:shadow-none w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <SellerSidebar onClose={closeSidebar} />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 w-full ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'
          }`}
      >
        {/* Header */}
        <SellerHeader onMenuClick={openSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-neutral-50 pb-20 lg:pb-6">
          {children}
        </main>

        {/* Bottom Navbar for Mobile */}
        <SellerBottomNavbar onMenuClick={isSidebarOpen ? closeSidebar : openSidebar} isSidebarOpen={isSidebarOpen} />
      </div>
    </div>
  );
}

