"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase/config";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  userRole: string;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: "user",
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        import("@/lib/firebase/firestore").then(async ({ syncUserToFirestore }) => {
          const role = await syncUserToFirestore(currentUser);
          setUserRole(role || "user");
          setUser(currentUser);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) {
      console.warn("Firebase config missing. Simulating login locally...");
      // Simulate successful login dynamically for UI viewing without keys
      setUser({
        uid: "mock-user-123",
        displayName: "Pegawai PLN (Mock)",
        email: "pegawai.pln@gmail.com",
        photoURL: "https://ui-avatars.com/api/?name=P+P&background=00A2E9&color=fff",
      } as User);
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
