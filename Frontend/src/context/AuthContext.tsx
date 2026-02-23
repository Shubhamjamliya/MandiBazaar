import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  getUserData,
  getAuthToken,
  removeAuthToken,
  setAuthToken,
} from "../services/api/config";

interface User {
  id: string;
  userType?: "Admin" | "Seller" | "Customer" | "Delivery";
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state synchronously from localStorage based on current path
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedToken = getAuthToken();
    const storedUser = getUserData();
    return !!(storedToken && storedUser);
  });

  const [user, setUser] = useState<User | null>(() => {
    return getUserData();
  });

  const [token, setToken] = useState<string | null>(() => {
    return getAuthToken();
  });

  // Function to refresh state from current path's storage
  const refreshAuthState = () => {
    const storedToken = getAuthToken();
    const storedUser = getUserData();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setIsAuthenticated(true);
    } else {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Effect to sync state if path changes (handles same-tab navigation between modules)
  useEffect(() => {
    // Check path changes every 500ms since we are outside BrowserRouter
    const interval = setInterval(() => {
      const currentToken = getAuthToken();
      // Only update state if the token for the current path category doesn't match current state
      if (currentToken !== token) {
        refreshAuthState();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [token]);

  // Initial sync and external storage change listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("authToken") || e.key?.includes("userData")) {
        refreshAuthState();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    // This will use the prefixed storage based on current URL
    setAuthToken(newToken, userData);

    // Register FCM token for push notifications after successful login
    import("../services/pushNotificationService").then(({ registerFCMToken }) => {
      registerFCMToken(true)
        .then(() => {
          // Send test notification after successful token registration
          const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

          fetch(`${apiUrl}/fcm-tokens/test`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          })
            .then(response => response.json())
            .then(data => {
              console.log('✅ Test notification sent:', data);
              if (data.success) {
                console.log(`📬 Notification sent to ${data.details?.totalTokens} device(s)`);
              }
            })
            .catch(error => {
              console.error('❌ Failed to send test notification:', error);
            });
        })
        .catch((error) => {
          console.error("Failed to register FCM token:", error);
        });
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    // This will only remove the token/user for the current module path
    removeAuthToken();

    // Remove FCM token on logout
    import("../services/pushNotificationService").then(({ removeFCMToken }) => {
      removeFCMToken().catch((error) => {
        console.error("Failed to remove FCM token:", error);
      });
    });
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    // Update storage for current module
    setAuthToken(token || "", userData);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        updateUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
