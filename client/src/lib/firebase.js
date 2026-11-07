/**
 * Firebase Client & Firestore Setup for Real-Time Auction & Chat Sync.
 * Supports VITE_, NEXT_PUBLIC_, and FIREBASE_ environment variables,
 * with localStorage fallback override and safe initialization.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

function getFirebaseCredentials() {
  let stored = null;
  try {
    const raw = localStorage.getItem('sag_firebase_config');
    if (raw) stored = JSON.parse(raw);
  } catch {}

  const apiKey =
    stored?.apiKey ||
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    import.meta.env?.NEXT_PUBLIC_FIREBASE_API_KEY ||
    import.meta.env?.FIREBASE_API_KEY ||
    '';

  const authDomain =
    stored?.authDomain ||
    import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ||
    import.meta.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    import.meta.env?.FIREBASE_AUTH_DOMAIN ||
    '';

  const projectId =
    stored?.projectId ||
    import.meta.env?.VITE_FIREBASE_PROJECT_ID ||
    import.meta.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    import.meta.env?.FIREBASE_PROJECT_ID ||
    '';

  const storageBucket =
    stored?.storageBucket ||
    import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET ||
    import.meta.env?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    import.meta.env?.FIREBASE_STORAGE_BUCKET ||
    '';

  const messagingSenderId =
    stored?.messagingSenderId ||
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    import.meta.env?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    import.meta.env?.FIREBASE_MESSAGING_SENDER_ID ||
    '';

  const appId =
    stored?.appId ||
    import.meta.env?.VITE_FIREBASE_APP_ID ||
    import.meta.env?.NEXT_PUBLIC_FIREBASE_APP_ID ||
    import.meta.env?.FIREBASE_APP_ID ||
    '';

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

const config = getFirebaseCredentials();

export const isFirebaseConfigured = Boolean(
  config.apiKey &&
  config.projectId &&
  !config.apiKey.includes('YOUR_') &&
  !config.projectId.includes('YOUR_')
);

let appInstance = null;
let dbInstance = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getFirestore(appInstance);
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err.message);
  }
}

export const app = appInstance;
export const db = dbInstance;
export const firebaseConfig = config;

export function saveFirebaseCredentials(newConfig) {
  try {
    if (newConfig) {
      localStorage.setItem('sag_firebase_config', JSON.stringify(newConfig));
    } else {
      localStorage.removeItem('sag_firebase_config');
    }
  } catch {}
}
