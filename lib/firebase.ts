// StageX AI — Firebase Client Singleton
// Authentication (Email/Password + Google) & Cloud Firestore.
// Direct, robust singleton pattern matching Firebase Web SDK standards.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  return trimmed === "" ? undefined : trimmed;
}

export const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

/**
 * Validates presence of minimum required Firebase public credentials.
 * Does not expose secret values.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/**
 * Diagnostic helper reporting configuration presence as PRESENT or MISSING.
 * Never prints actual secret values.
 */
export function getFirebaseConfigStatus(): Record<string, "PRESENT" | "MISSING"> {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey ? "PRESENT" : "MISSING",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain ? "PRESENT" : "MISSING",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId ? "PRESENT" : "MISSING",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket ? "PRESENT" : "MISSING",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId ? "PRESENT" : "MISSING",
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId ? "PRESENT" : "MISSING",
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured."
    );
  }
  cachedApp = initializeApp(firebaseConfig);
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  const appInstance = getFirebaseApp();
  cachedAuth = getAuth(appInstance);
  return cachedAuth;
}

export function getFirebaseFirestore(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }
  const appInstance = getFirebaseApp();
  cachedDb = getFirestore(appInstance);
  return cachedDb;
}

export const getFirebaseDb = getFirebaseFirestore;

// Robust singletons initialized when configuration is present.
// When unconfigured during build prerender, values are undefined and guarded by isFirebaseConfigured().
export const app: FirebaseApp = (isFirebaseConfigured() ? getFirebaseApp() : undefined) as unknown as FirebaseApp;
export const auth: Auth = (isFirebaseConfigured() ? getFirebaseAuth() : undefined) as unknown as Auth;
export const db: Firestore = (isFirebaseConfigured() ? getFirebaseFirestore() : undefined) as unknown as Firestore;
export const firestore: Firestore = db;


