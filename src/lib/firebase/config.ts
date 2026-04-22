import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
};

// Protect against crashing if env variables are missing locally
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.error("Firebase init failed:", e);
}

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// Enable persistence
if (db && typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Persistence failed: Multiple tabs open.");
    } else if (err.code === "unimplemented") {
      console.warn("Persistence not supported by this browser.");
    }
  });
}

export { app, auth, db };

