import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Base API URL - adjust based on your backend URL
// Temporary fix: Use production URL if environment variable is not set correctly
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // Check if we're in production (Vercel)
  const isProduction = window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('mandibazaar.com');

  // If in production and env var is not set or malformed, use production URL
  if (isProduction && (!envUrl || envUrl.includes('VITE_API_BASE_URL='))) {
    console.warn('⚠️ Environment variable not set correctly, using hardcoded production URL');
    return "https://mandibazzar.onrender.com/api/v1";
  }

  return envUrl || "http://localhost:5000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

// Debug: Log the API URL to console
console.log('🔍 API_BASE_URL:', API_BASE_URL);
console.log('🔍 import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔍 hostname:', window.location.hostname);

// Socket.io base URL - extract from API_BASE_URL by removing /api/v1
// Socket connections need the base server URL without the API path
export const getSocketBaseURL = (): string => {
  // Use VITE_API_URL if explicitly set (for socket connections)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Check if we're in production
  const isProduction = window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('mandibazaar.com');

  // Otherwise, extract base URL from VITE_API_BASE_URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

  // If in production and env var is malformed, use production URL
  if (isProduction && apiBaseUrl.includes('VITE_API_BASE_URL=')) {
    return "https://mandibazzar.onrender.com";
  }

  // Remove /api/v1 or /api from the end
  const socketUrl = apiBaseUrl.replace(/\/api\/v\d+$|\/api$/, '');

  return socketUrl || "http://localhost:5000";
};

// Helper to determine user type based on current URL path
const getUserTypeFromPath = (): string => {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/seller")) return "seller";
  if (path.startsWith("/delivery")) return "delivery";
  return "user";
};

// Token management helpers with support for multiple simultaneous logins
const AUTH_TOKEN_KEY = "authToken";
const USER_DATA_KEY = "userData";

const getPrefixedKey = (baseKey: string) => {
  const userType = getUserTypeFromPath();
  return `${userType}_${baseKey}`;
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Dynamically get the token for the current context (admin/seller/user/delivery)
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: any) => {
    // Only handle 401 (Unauthorized) for auto-logout
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes("/auth/");
      const hadToken = error.config?.headers?.Authorization;

      if (!isAuthEndpoint && hadToken) {
        const currentPath = window.location.pathname;

        if (currentPath.includes("/login") || currentPath.includes("/signup")) {
          return Promise.reject(error);
        }

        const apiUrl = error.config?.url || "";
        let redirectPath = "/login";

        if (currentPath.includes("/admin/") || apiUrl.includes("/admin/")) {
          redirectPath = "/admin/login";
        } else if (
          currentPath.includes("/seller/") ||
          apiUrl.includes("/seller/") ||
          apiUrl.includes("/sellers")
        ) {
          redirectPath = "/seller/login";
        } else if (
          currentPath.includes("/delivery/") ||
          apiUrl.includes("/delivery/")
        ) {
          redirectPath = "/delivery/login";
        }

        removeAuthToken();
        window.location.href = redirectPath;
      }
    }
    return Promise.reject(error);
  }
);

// Token management helpers
export const setAuthToken = (token: string, userData?: any) => {
  localStorage.setItem(getPrefixedKey(AUTH_TOKEN_KEY), token);
  if (userData) {
    localStorage.setItem(getPrefixedKey(USER_DATA_KEY), JSON.stringify(userData));
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(getPrefixedKey(AUTH_TOKEN_KEY));
};

export const getUserData = (): any | null => {
  const data = localStorage.getItem(getPrefixedKey("userData"));
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const removeAuthToken = () => {
  localStorage.removeItem(getPrefixedKey(AUTH_TOKEN_KEY));
  localStorage.removeItem(getPrefixedKey(USER_DATA_KEY));
};

export default api;
