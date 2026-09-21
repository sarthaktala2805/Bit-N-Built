// StageX AI — Firebase Client Singleton
// Authentication (Email/Password + Google) & Cloud Firestore.
// No Admin SDK, no server secrets.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Safe singleton — prevents duplicate initialization on Next.js hot reload,
// SSR, static analysis, and Vercel build prerendering.

/**
 * Validates whether the minimum required Firebase configuration is present.
 * Prevents initializing Firebase with undefined/empty credentials during build or SSR.
 */
export function isFirebaseConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return Boolean(
    key &&
      typeof key === "string" &&
      key.trim() !== "" &&
      project &&
      typeof project === "string" &&
      project.trim() !== ""
  );
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

/**
 * Returns the initialized FirebaseApp singleton, or null if configuration is missing.
 * Prevents eager evaluation during Next.js static build / export.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) {
    return cachedApp;
  }
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }
  if (!isFirebaseConfigured()) {
    return null;
  }
  cachedApp = initializeApp(firebaseConfig);
  return cachedApp;
}

/**
 * Returns the Firebase Auth instance, or null if Firebase is not configured.
 * Safely avoids initializing Auth during build/SSR.
 */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }
  const appInstance = getFirebaseApp();
  if (!appInstance) {
    return null;
  }
  cachedAuth = getAuth(appInstance);
  return cachedAuth;
}

/**
 * Returns the Cloud Firestore instance, or null if Firebase is not configured.
 */
export function getFirebaseDb(): Firestore | null {
  if (cachedDb) {
    return cachedDb;
  }
  const appInstance = getFirebaseApp();
  if (!appInstance) {
    return null;
  }
  cachedDb = getFirestore(appInstance);
  return cachedDb;
}

// Backwards-compatible Proxied exports for existing imports and test mocks.
// Property accesses during build or without credentials safely return undefined without crashing.
export const app: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(target, prop, receiver) {
    const instance = getFirebaseApp();
    if (!instance) {
      if (typeof window === "undefined") return undefined;
      throw new Error(
        "Firebase App is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are configured."
      );
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export const auth: Auth = new Proxy({} as Auth, {
  get(target, prop, receiver) {
    const instance = getFirebaseAuth();
    if (!instance) {
      if (typeof window === "undefined") return undefined;
      throw new Error(
        "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured."
      );
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export const db: Firestore = new Proxy(Object.create(Firestore.prototype), {
  get(target, prop, receiver) {
    const instance = getFirebaseDb();
    if (!instance) {
      if (typeof window === "undefined") return undefined;
      throw new Error(
        "Cloud Firestore is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is configured."
      );
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export const firestore: Firestore = db;

