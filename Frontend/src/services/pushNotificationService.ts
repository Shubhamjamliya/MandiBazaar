import { messaging, getToken, onMessage } from './firebase';
import { API_BASE_URL, getAuthToken } from './api/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BO3Sg4gAQOyEZLqVAUSIGJQi5rVLqpUTgGxOEdCN23xLHqZ0k0Z54FlY_sZJXY1vUKeoJZKFCVhuUrbE7MANm30';

declare global {
    interface Window {
        setNativeFcmToken?: (token: string) => Promise<boolean>;
        FlutterFCM?: {
            postMessage?: (message: string) => void;
        };
        webkit?: {
            messageHandlers?: {
                flutterFcm?: {
                    postMessage?: (message: { type: string }) => void;
                };
            };
        };
    }
}

function getProjectId(): string {
    return import.meta.env.VITE_FIREBASE_PROJECT_ID || 'default_project';
}

function getTokenStorageKey(): string {
    return `fcm_token_${getProjectId().replace(/-/g, '_')}`;
}

function getLegacyTokenKeys(): string[] {
    return ['fcm_token_web', 'fcm_token_mandibazaar_6c730'];
}

function isEmbeddedWebView(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const ua = navigator.userAgent || '';
    return /; wv\)|\bwv\b|WebView|Flutter/i.test(ua);
}

function getPushPlatform(): 'web' | 'mobile' {
    return isEmbeddedWebView() ? 'mobile' : 'web';
}

function isValidServiceWorkerRegistration(
    registration: ServiceWorkerRegistration | null,
): registration is ServiceWorkerRegistration {
    return !!registration &&
        typeof registration === 'object' &&
        typeof registration.update === 'function' &&
        typeof registration.unregister === 'function' &&
        typeof registration.showNotification === 'function';
}

async function saveTokenToBackend(token: string, platform: 'web' | 'mobile'): Promise<boolean> {
    const authToken = getAuthToken();
    if (!authToken) {
        console.warn('User not authenticated, skipping token registration');
        return false;
    }

    const response = await fetch(`${API_BASE_URL}/fcm-tokens/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
            token,
            platform,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        console.error('Failed to register token with backend:', error || response.statusText);
        return false;
    }

    localStorage.setItem(getTokenStorageKey(), token);
    return true;
}

async function requestNativeFcmTokenFromHost(): Promise<void> {
    try {
        if (window.FlutterFCM?.postMessage) {
            window.FlutterFCM.postMessage(JSON.stringify({ type: 'REQUEST_FCM_TOKEN' }));
            return;
        }

        if (window.webkit?.messageHandlers?.flutterFcm?.postMessage) {
            window.webkit.messageHandlers.flutterFcm.postMessage({ type: 'REQUEST_FCM_TOKEN' });
        }
    } catch (error) {
        console.warn('Failed to request native FCM token from host app:', error);
    }
}

export function registerNativeFcmBridge(): void {
    if (typeof window === 'undefined' || window.setNativeFcmToken) {
        return;
    }

    window.setNativeFcmToken = async (token: string): Promise<boolean> => {
        if (!token) {
            console.warn('Native FCM bridge received empty token');
            return false;
        }

        const saved = await saveTokenToBackend(token, 'mobile');
        if (saved) {
            console.log('Native mobile FCM token registered with backend');
        }
        return saved;
    };
}

/**
 * Register service worker for Firebase messaging
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (isEmbeddedWebView()) {
        console.log('Embedded WebView detected, skipping browser service worker registration for FCM');
        return null;
    }

    if ('serviceWorker' in navigator) {
        try {
            const swVersion = 'v2';
            const swVersionKey = 'fcm_sw_version';
            const currentVersion = localStorage.getItem(swVersionKey);

            if (currentVersion !== swVersion) {
                console.log(`Service Worker version changed (${currentVersion} -> ${swVersion}), clearing stale registrations...`);
                const existingRegistrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of existingRegistrations) {
                    await reg.unregister();
                    console.log('Unregistered stale service worker:', reg.scope);
                }
                localStorage.setItem(swVersionKey, swVersion);
            }

            const firebaseConfigStr = new URLSearchParams({
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
                appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
                measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
            }).toString();

            const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${firebaseConfigStr}`, {
                updateViaCache: 'none',
            });
            console.log('Service Worker registered:', registration);

            if (!isValidServiceWorkerRegistration(registration)) {
                console.warn('Service worker registration is not Firebase-compatible in this environment');
                return null;
            }

            await registration.update();
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }

    console.warn('Service Workers are not supported in this browser');
    return null;
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
                console.log('Notification permission granted');
                return true;
            }

            console.log('Notification permission denied');
            return false;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    console.warn('Notifications are not supported in this browser');
    return false;
}

/**
 * Get FCM token from Firebase
 */
async function getFCMToken(): Promise<string | null> {
    if (!messaging) {
        console.warn('Firebase Messaging not initialized');
        return null;
    }

    try {
        const registration = await registerServiceWorker();
        if (!registration) {
            console.warn('Browser FCM is unavailable in this environment');
            return null;
        }

        if (!isValidServiceWorkerRegistration(registration)) {
            console.warn('Invalid service worker registration for Firebase Messaging');
            return null;
        }

        await registration.update();

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.log('FCM Token obtained:', token);
            return token;
        }

        console.log('No FCM token available');
        return null;
    } catch (error: any) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken(forceUpdate: boolean = false): Promise<string | null> {
    try {
        registerNativeFcmBridge();

        const platform = getPushPlatform();
        const tokenKey = getTokenStorageKey();
        const savedToken = localStorage.getItem(tokenKey);

        if (getLegacyTokenKeys().some((key) => localStorage.getItem(key))) {
            getLegacyTokenKeys().forEach((key) => localStorage.removeItem(key));
            forceUpdate = true;

            if (!isEmbeddedWebView() && 'serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.unregister();
                }
            }
        }

        if (savedToken && !forceUpdate) {
            console.log('FCM token found in local storage. Syncing with backend for current user...');
            try {
                await saveTokenToBackend(savedToken, platform);
            } catch (err) {
                console.error('Failed to sync token with backend', err);
            }
            return savedToken;
        }

        if (platform === 'mobile') {
            console.log('Embedded mobile app detected. Waiting for native FCM token from host app.');
            await requestNativeFcmTokenFromHost();
            return null;
        }

        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.warn('Notification permission not granted');
            return null;
        }

        const token = await getFCMToken();
        if (!token) {
            console.error('Failed to get FCM token');
            return null;
        }

        const saved = await saveTokenToBackend(token, 'web');
        if (saved) {
            console.log(`FCM token registered with backend for project ${getProjectId()}`);
            return token;
        }

        return null;
    } catch (error: any) {
        console.error('Error registering FCM token:', error);
        return null;
    }
}

/**
 * Setup foreground notification handler
 */
export function setupForegroundNotificationHandler(handler?: (payload: any) => void): (() => void) | void {
    if (!messaging) {
        console.warn('Firebase Messaging not initialized');
        return;
    }

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);

        if ('Notification' in window && Notification.permission === 'granted') {
            const title = payload.notification?.title || payload.data?.title || 'New Notification';
            const body = payload.notification?.body || payload.data?.body || '';
            const options = {
                body,
                icon: payload.notification?.icon || payload.data?.icon || '/favicon.png',
                badge: '/favicon.png',
                tag: payload.data?.orderId || payload.data?.type || 'notification',
                requireInteraction: true,
                silent: false,
                data: payload.data,
            };

            if ('serviceWorker' in navigator && !isEmbeddedWebView()) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, options)
                        .then(() => console.log('Foreground notification displayed via Service Worker'))
                        .catch((err) => {
                            console.warn('Failed to show notification via SW, falling back to Notification:', err);
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
                console.log('Foreground notification displayed via standard Notification');
            }
        }

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
        registerNativeFcmBridge();
        await registerServiceWorker();
        console.log('Push notifications initialized');
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
}

/**
 * Remove FCM token from backend
 */
export async function removeFCMToken(): Promise<void> {
    try {
        const savedToken = localStorage.getItem(getTokenStorageKey());
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
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                token: savedToken,
                platform: getPushPlatform(),
            }),
        });

        localStorage.removeItem(getTokenStorageKey());
        getLegacyTokenKeys().forEach((key) => localStorage.removeItem(key));
        console.log('FCM token removed');
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
}
