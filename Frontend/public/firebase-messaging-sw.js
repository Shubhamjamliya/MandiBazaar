// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const urlParams = new URL(location).searchParams;

// Firebase configuration (Production credentials)
const firebaseConfig = {
    apiKey: urlParams.get('apiKey') || 'AIzaSyAheFx12XK5fPg0NnXuR-w6gXHxWvdGOlM',
    authDomain: urlParams.get('authDomain') || 'mandibazaar-4817a.firebaseapp.com',
    projectId: urlParams.get('projectId') || 'mandibazaar-4817a',
    storageBucket: urlParams.get('storageBucket') || 'mandibazaar-4817a.firebasestorage.app',
    messagingSenderId: urlParams.get('messagingSenderId') || '774530696489',
    appId: urlParams.get('appId') || '1:774530696489:web:493042b38f91c57aab2338',
    measurementId: urlParams.get('measurementId') || 'G-BB2ZY97ZS7'
};

// Force the new service worker to take over immediately
self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] Service worker installing, forcing skipWaiting...');
    self.skipWaiting();
});

// Claim all clients immediately on activation
self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] Service worker activated, claiming clients...');
    event.waitUntil(clients.claim());
});

// ALWAYS handle push events manually to guarantee delivery
// We attach this before Firebase initializes so it runs first!
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event intercepted manually!');
    
    // Stop Firebase SDK from processing this event to prevent conflicting handlers
    // which cause the "This site has been updated in the background" error
    event.stopImmediatePropagation();

    let data = {};
    let title = '🔔 Mandi Bazaar';
    let body = 'You have a new notification';
    let icon = '/favicon.png';
    let link = '/';

    try {
        if (event.data) {
            data = event.data.json();
            console.log('[firebase-messaging-sw.js] Parsed push data:', data);

            // Extract from standard FCM payload structure
            if (data.notification) {
                title = data.notification.title || title;
                body = data.notification.body || body;
                icon = data.notification.icon || icon;
            } 
            
            // Extract from data payload
            if (data.data) {
                title = data.data.title || title;
                body = data.data.body || body;
                icon = data.data.icon || icon;
                link = data.data.link || data.data.click_action || link;
            }

            // FCM also carries the click target outside the data payload
            if (link === '/' && data.fcmOptions && data.fcmOptions.link) {
                link = data.fcmOptions.link;
            }
        }
    } catch (e) {
        console.warn('[firebase-messaging-sw.js] Could not parse push data:', e);
    }

    // A new delivery task must stay in the tray until the partner acts on it,
    // and must never replace an earlier task that is still waiting.
    const payloadData = data.data || {};
    const isNewOrder = payloadData.eventType === 'new-order';
    const tag = payloadData.orderId
        || payloadData.notificationId
        || 'mandi-bazaar-' + Date.now();

    const notificationOptions = {
        body: body,
        icon: icon,
        badge: '/favicon.png',
        data: { ...payloadData, link: link },
        tag: tag,
        renotify: true,
        requireInteraction: isNewOrder,
        vibrate: isNewOrder ? [200, 100, 200, 100, 200] : undefined
    };

    const promiseChain = self.registration.showNotification(title, notificationOptions);
    event.waitUntil(promiseChain);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked', event);

    event.notification.close();

    const data = event.notification.data || {};
    const rawLink = data.link || data.click_action || '/';
    // Always resolve against this origin: an already-open client is matched by URL,
    // and openWindow/navigate need a full URL to land on the right screen.
    const targetUrl = new URL(rawLink, self.location.origin).href;
    const targetPath = new URL(targetUrl).pathname;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
            for (const client of clientList) {
                let clientPath = '';
                try {
                    clientPath = new URL(client.url).pathname;
                } catch (e) {
                    clientPath = client.url;
                }

                // Already on the right screen - just bring it to the front.
                if (clientPath === targetPath) {
                    return 'focus' in client ? client.focus() : undefined;
                }

                // App is open somewhere else: focus it and route it to the order.
                if ('focus' in client) {
                    const focused = await client.focus().catch(() => client);
                    const target = focused || client;

                    // navigate() only works on clients this worker controls; when it
                    // is unavailable or rejected, ask the app to route itself instead.
                    if ('navigate' in target) {
                        try {
                            await target.navigate(targetUrl);
                            return;
                        } catch (e) {
                            console.warn('[firebase-messaging-sw.js] client.navigate failed:', e);
                        }
                    }

                    try {
                        target.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl, path: targetPath, data: data });
                    } catch (e) {
                        console.warn('[firebase-messaging-sw.js] postMessage failed:', e);
                    }
                    return;
                }
            }

            // App is not open at all.
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Initialize Firebase in service worker (Needed for getToken to work in the frontend)
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

