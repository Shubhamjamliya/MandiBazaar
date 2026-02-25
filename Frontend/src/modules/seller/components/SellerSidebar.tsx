import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

interface SubMenuItem {
  label: string;
  path: string;
  icon: JSX.Element;
}

interface MenuItem {
  label: string;
  path: string;
  hasSubmenu?: boolean;
  submenuItems?: SubMenuItem[];
  icon?: JSX.Element;
}

interface SellerSidebarProps {
  onClose?: () => void;
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", path: "/seller" },
  { label: "Orders", path: "/seller/orders" },
  { label: "Category", path: "/seller/category" },
  { label: "SubCategory", path: "/seller/subcategory" },
  {
    label: "Product",
    path: "/seller/product",
    hasSubmenu: true,
    submenuItems: [
      {
        label: "Add new Product",
        path: "/seller/product/add",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
            <line x1="16" y1="12" x2="8" y2="12"></line>
            <line x1="12" y1="16" x2="12" y2="8"></line>
          </svg>
        ),
      },
      {
        label: "Taxes",
        path: "/seller/product/taxes",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            {/* Three stacked coin piles */}
            <ellipse cx="12" cy="18" rx="4" ry="2"></ellipse>
            <ellipse cx="12" cy="14" rx="3.5" ry="1.8"></ellipse>
            <ellipse cx="12" cy="10" rx="3" ry="1.5"></ellipse>
            {/* Percentage sign on top pile */}
            <circle cx="9" cy="9" r="1" fill="currentColor"></circle>
            <line x1="7" y1="7" x2="11" y2="11" strokeWidth="2"></line>
            <circle cx="15" cy="11" r="1" fill="currentColor"></circle>
          </svg>
        ),
      },
      {
        label: "Product List",
        path: "/seller/product/list",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            {/* Two checkmarks */}
            <polyline points="9 12 11 14 15 10"></polyline>
            <polyline points="9 16 11 18 15 14"></polyline>
          </svg>
        ),
      },
      {
        label: "Stock Management",
        path: "/seller/product/stock",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        ),
      },
    ],
  },
  {
    label: "Wallet",
    path: "/seller/wallet",
  },
  {
    label: "Reports",
    path: "/seller/reports",
    hasSubmenu: true,
    submenuItems: [
      {
        label: "Sales Report",
        path: "/seller/reports/sales",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        ),
      },
    ],
  },
  { label: "Return", path: "/seller/return" },
  {
    label: "Account Settings",
    path: "/seller/account-settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    label: "Logout",
    path: "/seller/logout-action", // We'll handle this in the component
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
];

export default function SellerSidebar({ onClose }: SellerSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const isActive = (path: string) => {
    if (path === "/seller") {
      return (
        location.pathname === "/seller" || location.pathname === "/seller/"
      );
    }
    return location.pathname.startsWith(path);
  };

  const isSubmenuActive = (submenuItems?: SubMenuItem[]) => {
    if (!submenuItems) return false;
    return submenuItems.some(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(item.path + "/")
    );
  };

  const handleNavigation = (path: string) => {
    if (path === "/seller/logout-action") {
      logout();
      navigate("/seller/login");
      return;
    }
    navigate(path);
    // Close sidebar on mobile after navigation
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const toggleMenu = (path: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const isExpanded = (path: string) => {
    return (
      expandedMenus.has(path) ||
      isSubmenuActive(
        menuItems.find((item) => item.path === path)?.submenuItems
      )
    );
  };

  return (
    <aside className="w-64 bg-teal-700 h-screen flex flex-col">
      {/* Close button */}
      <div className="flex justify-end p-4 border-b border-teal-600">
        <button
          onClick={onClose}
          className="p-2 text-teal-100 hover:text-white transition-colors"
          aria-label="Close menu">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <nav className="flex-1 py-4 sm:py-6 overflow-y-auto">
        <ul className="space-y-1 px-2 sm:px-4">
          {menuItems.map((item) => {
            const expanded = isExpanded(item.path);
            const active =
              isActive(item.path) || isSubmenuActive(item.submenuItems);

            return (
              <li key={item.path}>
                <button
                  onClick={() => {
                    if (item.hasSubmenu && item.submenuItems) {
                      toggleMenu(item.path);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-left transition-colors ${active
                    ? "bg-teal-600 text-white"
                    : "text-teal-100 hover:bg-teal-600/50 hover:text-white"
                    }`}>
                  <div className="flex items-center gap-2">
                    {item.icon && (
                      <span className="flex-shrink-0">{item.icon}</span>
                    )}
                    <span className="text-xs sm:text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                  {item.hasSubmenu && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform ${expanded ? "rotate-180" : ""
                        } ${active ? "text-white" : "text-teal-200"}`}>
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                {item.hasSubmenu && item.submenuItems && expanded && (
                  <ul className="mt-1 space-y-1 ml-4">
                    {item.submenuItems.map((subItem) => {
                      const subActive =
                        location.pathname === subItem.path ||
                        location.pathname.startsWith(subItem.path + "/");
                      return (
                        <li key={subItem.path}>
                          <button
                            onClick={() => handleNavigation(subItem.path)}
                            className={`w-full flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-left transition-colors ${subActive
                              ? "bg-teal-500 text-white"
                              : "text-teal-100 hover:bg-teal-600/50 hover:text-white"
                              }`}>
                            <span className="flex-shrink-0">
                              {subItem.icon}
                            </span>
                            <span className="text-xs sm:text-sm font-medium">
                              {subItem.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
