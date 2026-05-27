import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

export let firebaseInitializationError: string | null = null;

export function initializeFirebaseAdmin() {
    if (firebaseInitialized) {
        return;
    }

    try {
        let credential;

        let envCredentials = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_CREDENTIALS;
        let base64Credentials = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        
        if (base64Credentials) {
            console.log('🔧 Using Base64 encoded Firebase credentials from environment variable');
            const decodedJson = Buffer.from(base64Credentials, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(decodedJson);
            
            // Fix private_key if it contains escaped newlines
            if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            
            credential = admin.credential.cert(serviceAccount);
        }
        else if (envCredentials) {
            console.log('🔧 Using Firebase credentials from environment variable');

            // Clean up the string to ensure it is valid JSON
            envCredentials = envCredentials.trim();
            if (envCredentials.startsWith("'") && envCredentials.endsWith("'")) {
                envCredentials = envCredentials.substring(1, envCredentials.length - 1);
            }
            if (envCredentials.startsWith('"') && envCredentials.endsWith('"')) {
                envCredentials = envCredentials.substring(1, envCredentials.length - 1);
            }

            const serviceAccount = JSON.parse(envCredentials);

            // Fix private_key if it contains escaped newlines
            if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            credential = admin.credential.cert(serviceAccount);
        }
        // Fall back to service account file (development)
        else {
            console.log('🔧 Using Firebase credentials from file (development mode)');
            // Use path.resolve to get absolute path from project root
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.resolve(process.cwd(), 'config', 'firebase-service-account.json');

            console.log(`📂 Looking for service account at: ${serviceAccountPath}`);
            const serviceAccount = require(serviceAccountPath);
            credential = admin.credential.cert(serviceAccount);
        }

        admin.initializeApp({
            credential: credential
        });

        firebaseInitialized = true;
        firebaseInitializationError = null;
        console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error: any) {
        firebaseInitializationError = error.message;
        console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
        console.log('⚠️  Push notifications will not work until Firebase is properly configured');
    }
}

/**
 * Send push notification to multiple FCM tokens
 * @param tokens - Array of FCM tokens
 * @param payload - Notification payload
 */
export async function sendPushNotification(
    tokens: string[],
    payload: {
        title: string;
        body: string;
        data?: { [key: string]: string };
        icon?: string;
    }
) {
    if (!firebaseInitialized) {
        const errorMsg = 'Firebase Admin not initialized. Skipping notification send.';
        console.error('❌ ' + errorMsg);
        const error = new Error(errorMsg);
        (error as any).code = 'FIREBASE_NOT_INITIALIZED';
        (error as any).failureCount = tokens ? tokens.length : 0;
        throw error;
    }

    try {
        const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0);

        if (validTokens.length === 0) {
            console.log('No valid tokens provided for notification');
            return {
                successCount: 0,
                failureCount: 0,
                responses: []
            };
        }

        const message: any = {
            tokens: validTokens,
            notification: {
                title: payload.title,
                body: payload.body
            },
            data: {
                ...(payload.data || {}),
                ...(payload.icon && { icon: payload.icon })
            },
            webpush: {
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: payload.icon || '/favicon.png',
                    badge: '/favicon.png',
                    tag: payload.data?.type || 'default',
                    requireInteraction: false
                },
                fcm_options: {
                    link: payload.data?.link || '/'
                }
            }
        };

        // sendEachForMulticast expects tokens as a property of the message object
        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`✅ Successfully sent: ${response.successCount} messages`);
        if (response.failureCount > 0) {
            console.log(`⚠️  Failed: ${response.failureCount} messages`);
        }

        // Log individual failures for debugging
        if (response.failureCount > 0 && response.responses && response.responses.length > 0) {
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success && resp.error) {
                    const errorCode = (resp.error as any).code || 'UNKNOWN';
                    const errorMsg = (resp.error as any).message || 'Unknown error';
                    console.error(`  Token ${idx}: [${errorCode}] ${errorMsg}`);
                }
            });
        }

        return response;
    } catch (error: any) {
        console.error('❌ Error sending push notification:', error.message);
        throw error;
    }
}

/**
 * Send notification to a specific user by fetching their tokens from database
 * @param userId - User ID
 * @param userType - Type of user (Customer, Admin, Seller, Delivery)
 * @param payload - Notification payload
 * @param includeMobile - Whether to include mobile tokens
 */
export async function sendNotificationToUser(
    userId: string,
    userType: 'Customer' | 'Admin' | 'Seller' | 'Delivery',
    payload: {
        title: string;
        body: string;
        data?: { [key: string]: string };
        icon?: string;
    },
    includeMobile: boolean = true
): Promise<any> {
    try {
        // Dynamically import the appropriate model
        let UserModel: any;
        switch (userType) {
            case 'Customer':
                UserModel = (await import('../models/Customer')).default;
                break;
            case 'Admin':
                UserModel = (await import('../models/Admin')).default;
                break;
            case 'Seller':
                UserModel = (await import('../models/Seller')).default;
                break;
            case 'Delivery':
                UserModel = (await import('../models/Delivery')).default;
                break;
            default:
                throw new Error(`Invalid user type: ${userType}`);
        }

        const user = await UserModel.findById(userId).exec();

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Collect tokens
        let tokens: string[] = [];

        if (user.fcmTokens && user.fcmTokens.length > 0) {
            tokens = [...tokens, ...user.fcmTokens];
        }

        if (includeMobile && user.fcmTokenMobile && user.fcmTokenMobile.length > 0) {
            tokens = [...tokens, ...user.fcmTokenMobile];
        }

        // Remove duplicates
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return;
        }

        console.log(`📤 Sending notification to ${uniqueTokens.length} device(s) for user ${userId}`);

        // Send notification
        let response;
        try {
            response = await sendPushNotification(uniqueTokens, payload);
        } catch (pushError: any) {
            console.error(`📡 Push send error for user ${userId}:`, pushError.message);
            throw pushError;
        }

        if (!response) {
            console.warn(`📡 No response from push service for user ${userId}`);
            return undefined;
        }

        // Clean up invalid tokens
        if (response.failureCount > 0 && response.responses && Array.isArray(response.responses)) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success && uniqueTokens[idx]) {
                    // Check if error is due to invalid token
                    const errorCode = (resp.error as any)?.code;
                    const errorMsg = (resp.error as any)?.message;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/mismatched-credential' ||
                        errorMsg?.includes('SenderId mismatch')) {
                        invalidTokens.push(uniqueTokens[idx]);
                        console.warn(`🗑️  Invalid token removed: ${uniqueTokens[idx].substring(0, 20)}...`);
                    }
                }
            });

            // Remove invalid tokens from database
            if (invalidTokens.length > 0) {
                console.log(`🗑️  Removing ${invalidTokens.length} invalid token(s) from database`);
                user.fcmTokens = user.fcmTokens?.filter((t: string) => !invalidTokens.includes(t)) || [];
                user.fcmTokenMobile = user.fcmTokenMobile?.filter((t: string) => !invalidTokens.includes(t)) || [];
                await user.save();
                console.log(`✅ Cleaned up invalid tokens for user ${userId}`);
            }
        }

        return response;
    } catch (error: any) {
        console.error('❌ Error sending notification to user:', error.message);
        // Return the error so the caller knows what failed
        return { error: error.message || 'Unknown push notification error' };
    }
}

export default admin;
