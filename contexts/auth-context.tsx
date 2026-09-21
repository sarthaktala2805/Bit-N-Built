"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  AuthError,
} from "firebase/auth";
import { auth, getFirebaseAuth } from "@/lib/firebase";
import { useEventStore } from "@/store/event-store";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGuestOrganizer: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getActiveAuth(): Auth | null {
  if (typeof getFirebaseAuth === "function") {
    const instance = getFirebaseAuth();
    if (instance) return instance;
  }
  // Allow test runners with custom mock objects (vi.mock) while avoiding the uninitialized proxy
  if (auth && !(auth as unknown as { __isProxy?: boolean }).__isProxy) {
    return auth;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Persistent auth state listener — refreshing the browser keeps the user signed in
  useEffect(() => {
    const isLocalOrg =
      typeof window !== "undefined" &&
      localStorage.getItem("stagex_local_organizer_active") === "true";

    const localOrganizerUser = {
      uid: "organizer_local_master",
      email: "organizer@stagex.ai",
      displayName: "StageX Organizer",
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: "",
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => "token",
      getIdTokenResult: async () => ({
        token: "token",
        authTime: "0",
        issuedAtTime: "0",
        expirationTime: "0",
        signInProvider: "custom",
        claims: {},
      }),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      providerId: "custom",
    } as unknown as User;

    const authInstance = getActiveAuth();
    if (!authInstance) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "StageX AI: Firebase Auth is not initialized. Ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are configured in Vercel."
        );
      }
      if (isLocalOrg) {
        setUser(localOrganizerUser);
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else if (isLocalOrg) {
        setUser(localOrganizerUser);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signInEmail = async (email: string, password: string) => {
    const authInstance = getActiveAuth();
    if (!authInstance) {
      throw new Error(
        "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your Vercel Project Settings."
      );
    }
    try {
      await signInWithEmailAndPassword(authInstance, email, password);
    } catch (err: unknown) {
      const code = (err as AuthError)?.code;
      // If user is not found, automatically register them as an organizer so they are never blocked
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        try {
          await createUserWithEmailAndPassword(authInstance, email, password);
          return;
        } catch (signupErr) {
          throw signupErr;
        }
      }
      throw err;
    }
  };

  const signUpEmail = async (email: string, password: string) => {
    const authInstance = getActiveAuth();
    if (!authInstance) {
      throw new Error(
        "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your Vercel Project Settings."
      );
    }
    await createUserWithEmailAndPassword(authInstance, email, password);
  };

  const signInGoogle = async () => {
    const authInstance = getActiveAuth();
    if (!authInstance) {
      throw new Error(
        "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your Vercel Project Settings."
      );
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(authInstance, provider);
  };

  const signInGuestOrganizer = async () => {
    try {
      // Create local persistent organizer session
      if (typeof window !== "undefined") {
        localStorage.setItem("stagex_local_organizer_active", "true");
      }
      const localOrganizerUser = {
        uid: "organizer_local_master",
        email: "organizer@stagex.ai",
        displayName: "StageX Organizer",
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: "",
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => "token",
        getIdTokenResult: async () => ({
          token: "token",
          authTime: "0",
          issuedAtTime: "0",
          expirationTime: "0",
          signInProvider: "custom",
          claims: {},
        }),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
        providerId: "custom",
      } as unknown as User;

      setUser(localOrganizerUser);
      setLoading(false);
    } catch (err) {
      console.warn("Guest organizer sign in error:", err);
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("stagex_local_organizer_active");
      }
    } catch {
      // ignore
    }
    useEventStore.getState().clearState();
    try {
      const authInstance = getActiveAuth();
      if (authInstance) {
        await signOut(authInstance);
      }
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInEmail,
        signUpEmail,
        signInGoogle,
        signInGuestOrganizer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Human-readable Firebase error messages
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (
      error.message.includes("NEXT_PUBLIC_FIREBASE_") ||
      error.message.includes("Firebase Auth is not initialized")
    ) {
      return error.message;
    }
  }
  const code = (error as AuthError)?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked":
      "Pop-up was blocked by your browser. Please allow pop-ups for this site.",
    "auth/cancelled-popup-request": "Sign-in cancelled.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/user-disabled": "This account has been disabled.",
  };
  return (
    map[code] ||
    (error instanceof Error ? error.message : "Authentication failed. Please try again.")
  );
}
