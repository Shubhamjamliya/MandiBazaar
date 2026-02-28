import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration from environment variables with fallbacks for production
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDZOWhiIdZ32WLxh9z5jw9x_F9BsdLNCmE",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "mandibazaar-6c730.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mandibazaar-6c730",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "mandibazaar-6c730.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1009195769964",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:1009195769964:web:06129c5bee4687ad3ef849",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-NH1P7LMDDL",
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Initialize Firebase Cloud Messaging
let messaging: any = null;

if (app) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn("Firebase Messaging not supported in this browser:", error);
  }
}

export { messaging, getToken, onMessage };
export default app;
