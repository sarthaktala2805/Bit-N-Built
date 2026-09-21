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

// Statically analyzable by Next.js compiler — values inlined at build time into client bundle.
// No dynamic process.env[key] lookups or server-only runtime env helpers.
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

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your Vercel Project Settings."
    );
  }
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}

export const getFirebaseDb = getFirebaseFirestore;

// Singleton instances accessed safely.
// During build prerendering or when unconfigured, guarded against throwing at import time.
let safeApp: FirebaseApp | undefined;
let safeAuth: Auth | undefined;
let safeDb: Firestore | undefined;

if (isFirebaseConfigured()) {
  try {
    safeApp = getFirebaseApp();
    safeAuth = getFirebaseAuth();
    safeDb = getFirebaseFirestore();
  } catch {
    // Non-blocking for static build prerender
  }
}

export const app: FirebaseApp = safeApp as FirebaseApp;
export const auth: Auth = safeAuth as Auth;
export const db: Firestore = safeDb as Firestore;
export const firestore: Firestore = db;



