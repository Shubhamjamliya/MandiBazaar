import { messaging, getToken, onMessage } from './firebase';
import { getAuthToken } from './api/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BO3Sg4gAQOyEZLqVAUSIGJQi5rVLqpUTgGxOEdCN23xLHqZ0k0Z54FlY_sZJXY1vUKeoJZKFCVhuUrbE7MANm30';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.mandibazaar.com/api/v1';

/**
 * Register service worker for Firebase messaging
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Service Worker registered:', registration);
            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            return null;
        }
    } else {
        console.warn('⚠️ Service Workers are not supported in this browser');
        return null;
    }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
}

/**
 * Request notification permission from user
 */
async function requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                return true;
            } else {
                console.log('❌ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }
    console.warn('⚠️ Notifications are not supported in this browser');
    return false;
}

/**
 * Get FCM token from Firebase
 */
async function getFCMToken(): Promise<string | null> {
    if (!messaging) {
        console.warn('⚠️ Firebase Messaging not initialized');
        return null;
    }

    try {
        const registration = await registerServiceWorker();
        if (!registration) {
            console.error('❌ Service Worker not registered');
            return null;
        }

        await registration.update(); // Update service worker

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('✅ FCM Token obtained:', token);
            return token;
        } else {
            console.log('❌ No FCM token available');
            return null;
        }
    } catch (error: any) {
        console.error('❌ Error getting FCM token:', error);
        return null;
    }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken(forceUpdate: boolean = false): Promise<string | null> {
    try {
        // Check if already registered for the correct project
        const TOKEN_KEY = 'fcm_token_mandibazaar_6c730';
        const savedToken = localStorage.getItem(TOKEN_KEY);

        // If old project token exists, remove it
        if (localStorage.getItem('fcm_token_web')) {
            localStorage.removeItem('fcm_token_web');
            forceUpdate = true;
        }

        if (savedToken && !forceUpdate) {
            console.log('ℹ️ FCM token already registered for current project');
            return savedToken;
        }

        // Request permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.warn('⚠️ Notification permission not granted');
            return null;
        }

        // Get token
        const token = await getFCMToken();
        if (!token) {
            console.error('❌ Failed to get FCM token');
            return null;
        }

        // Save to backend
        const authToken = getAuthToken();
        if (!authToken) {
            console.warn('⚠️ User not authenticated, skipping token registration');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/fcm-tokens/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                token: token,
                platform: 'web'
            })
        });

        if (response.ok) {
            localStorage.setItem(TOKEN_KEY, token);
            console.log('✅ FCM token registered with backend for project 6c730');
            return token;
        } else {
            const error = await response.json();
            console.error('❌ Failed to register token with backend:', error);
            return null;
        }
    } catch (error: any) {
        console.error('❌ Error registering FCM token:', error);
        return null;
    }
}

/**
 * Setup foreground notification handler
 */
export function setupForegroundNotificationHandler(handler?: (payload: any) => void): void {
    if (!messaging) {
        console.warn('⚠️ Firebase Messaging not initialized');
        return;
    }

    onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        // Show notification even when app is in focus
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = payload.notification?.title || payload.data?.title || 'New Notification';
            const body = payload.notification?.body || payload.data?.body || '';
            const notification = new Notification(title, {
                body: body,
                icon: payload.notification?.icon || payload.data?.icon || '/favicon.png',
                badge: '/favicon.png',
                tag: payload.data?.type || 'notification',
                requireInteraction: false,
                silent: false,
                data: payload.data
            });

            // Handle notification click
            notification.onclick = (event) => {
                event.preventDefault();
                const link = payload.data?.link || '/';
                window.focus();
                window.location.href = link;
                notification.close();
            };

            console.log('✅ Foreground notification displayed');
        }

        // Call custom handler
        if (handler) {
            handler(payload);
        }
    });
}

/**
 * Initialize push notifications
 */
export async function initializePushNotifications(): Promise<void> {
    try {
        await registerServiceWorker();
        console.log('✅ Push notifications initialized');
    } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
    }
}

/**
 * Remove FCM token from backend
 */
export async function removeFCMToken(): Promise<void> {
    try {
        const savedToken = localStorage.getItem('fcm_token_web');
        if (!savedToken) {
            return;
        }

        const authToken = getAuthToken();
        if (!authToken) {
            return;
        }

        await fetch(`${API_BASE_URL}/fcm-tokens/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                token: savedToken,
                platform: 'web'
            })
        });

        localStorage.removeItem('fcm_token_web');
        console.log('✅ FCM token removed');
    } catch (error) {
        console.error('❌ Error removing FCM token:', error);
    }
}
