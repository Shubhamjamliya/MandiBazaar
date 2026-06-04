import { messaging, getToken, onMessage } from './firebase';
import { API_BASE_URL, getAuthToken } from './api/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BO3Sg4gAQOyEZLqVAUSIGJQi5rVLqpUTgGxOEdCN23xLHqZ0k0Z54FlY_sZJXY1vUKeoJZKFCVhuUrbE7MANm30';

/**
 * Register service worker for Firebase messaging
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
        try {
            // Force unregister any stale service workers first
            const SW_VERSION = 'v2'; // Bump this to force SW update
            const SW_VERSION_KEY = 'fcm_sw_version';
            const currentVersion = localStorage.getItem(SW_VERSION_KEY);

            if (currentVersion !== SW_VERSION) {
                console.log(`🔄 Service Worker version changed (${currentVersion} -> ${SW_VERSION}), clearing stale registrations...`);
                const existingRegistrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of existingRegistrations) {
                    await reg.unregister();
                    console.log('🗑️ Unregistered stale service worker:', reg.scope);
                }
                localStorage.setItem(SW_VERSION_KEY, SW_VERSION);
            }

            const firebaseConfigStr = new URLSearchParams({
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
                appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
                measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
            }).toString();

            const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${firebaseConfigStr}`, {
                updateViaCache: 'none' // Never use cached SW
            });
            console.log('✅ Service Worker registered:', registration);

            // Force update check
            registration.update();

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
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'default_project';
        const TOKEN_KEY = `fcm_token_${projectId.replace(/-/g, '_')}`;
        const savedToken = localStorage.getItem(TOKEN_KEY);

        // If old project token exists, remove it and force reset
        if (localStorage.getItem('fcm_token_web') || localStorage.getItem('fcm_token_mandibazaar_6c730')) {
            localStorage.removeItem('fcm_token_web');
            localStorage.removeItem('fcm_token_mandibazaar_6c730');
            forceUpdate = true;
            
            // Unregister old service workers to clear cached sender IDs
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.unregister();
                }
            }
        }

        if (savedToken && !forceUpdate) {
            console.log('ℹ️ FCM token found in local storage. Syncing with backend for current user...');
            const authToken = getAuthToken();
            if (authToken) {
                try {
                    await fetch(`${API_BASE_URL}/fcm-tokens/save`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            token: savedToken,
                            platform: 'web'
                        })
                    });
                } catch (err) {
                    console.error('Failed to sync token with backend', err);
                }
            }
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
            console.log(`✅ FCM token registered with backend for project ${projectId}`);
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
export function setupForegroundNotificationHandler(handler?: (payload: any) => void): (() => void) | void {
    if (!messaging) {
        console.warn('⚠️ Firebase Messaging not initialized');
        return;
    }

    return onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        // Show notification even when app is in focus
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = payload.notification?.title || payload.data?.title || 'New Notification';
            const body = payload.notification?.body || payload.data?.body || '';
            const options = {
                body: body,
                icon: payload.notification?.icon || payload.data?.icon || '/favicon.png',
                badge: '/favicon.png',
                tag: payload.data?.orderId || payload.data?.type || 'notification',
                requireInteraction: true,
                silent: false,
                data: payload.data
            };

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, options)
                        .then(() => console.log('✅ Foreground notification displayed via Service Worker'))
                        .catch((err) => {
                            console.warn('⚠️ Failed to show notification via SW, falling back to new Notification:', err);
                            const notification = new Notification(title, options);
                            notification.onclick = (event) => {
                                event.preventDefault();
                                const link = payload.data?.link || '/';
                                window.focus();
                                window.location.href = link;
                                notification.close();
                            };
                        });
                }).catch(() => {
                    const notification = new Notification(title, options);
                    notification.onclick = (event) => {
                        event.preventDefault();
                        const link = payload.data?.link || '/';
                        window.focus();
                        window.location.href = link;
                        notification.close();
                    };
                });
            } else {
                const notification = new Notification(title, options);
                notification.onclick = (event) => {
                    event.preventDefault();
                    const link = payload.data?.link || '/';
                    window.focus();
                    window.location.href = link;
                    notification.close();
                };
                console.log('✅ Foreground notification displayed via standard Notification');
            }
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
