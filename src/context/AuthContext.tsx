"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase/config";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  userRole: string;
  userName: string;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: "user",
  userName: "",
  loading: true,
  loginWithEmail: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const { loginUserWithEmailPassword, getUserInfo } = await import("@/lib/firebase/firestore");
          const role = await loginUserWithEmailPassword(currentUser.uid, currentUser.email || "");

          if (role === null) {
            // User has Firebase Auth account but no Firestore record.
            // This happens when migrating from Google OAuth (old system).
            // Auto-create their Firestore record to allow access, then
            // admin can assign proper role later.
            const { createUserInFirestore } = await import("@/lib/firebase/firestore");
            const emailLower = (currentUser.email || "").toLowerCase();
            await createUserInFirestore(
              currentUser.uid,
              currentUser.displayName || currentUser.email || "Pengguna",
              emailLower,
              "user"
            );
            // Re-fetch role after creation
            const { loginUserWithEmailPassword: recheck } = await import("@/lib/firebase/firestore");
            const newRole = await recheck(currentUser.uid, emailLower) || "user";
            setUserRole(newRole);
            setUserName(currentUser.displayName || currentUser.email || "Pengguna");
            setUser(currentUser);
            setLoading(false);
            return;
          }

          const userInfo = await getUserInfo(currentUser.uid);
          const name = userInfo?.name || currentUser.displayName || currentUser.email || "";

          setUserRole(role);
          console.log('DEBUG userRole:', JSON.stringify(role)); // tambahin ini sementara
          setUserName(name);
          setUser(currentUser);
        } catch (err) {
          console.error("Auth sync error:", err);
          setUser(null);
        }
      } else {
        setUser(null);
        setUserRole("user");
        setUserName("");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    if (!auth) {
      // Dev mock (no Firebase keys)
      setUser({ uid: "mock-uid", displayName: "Admin Mock", email, photoURL: null } as User);
      setUserRole("admin");
      setUserName("Admin Mock");
      return;
    }
    // signInWithEmailAndPassword fires onAuthStateChanged which handles
    // Firestore sync, role loading, and rejection if not registered.
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      setUserRole("user");
      setUserName("");
      return;
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, userName, loading, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Send password reset email ────────────────────────────────────────────────
// Works for email/password accounts. For Google-only accounts, the admin must
// recreate the account via the Create User panel, which will register the
// email+password provider properly.
export const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  if (!auth) return { success: false, message: "Firebase tidak tersedia." };
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: `Link reset password telah dikirim ke ${email}. Silakan cek inbox atau folder spam Anda.`,
    };
  } catch (err: any) {
    const code = err.code || "";
    let msg = "Gagal mengirim email reset.";
    if (code.includes("user-not-found")) {
      // Account doesn't exist in Firebase Auth with email/password provider
      // (may be Google-only account from old system)
      msg =
        "Email ini belum terdaftar di sistem autentikasi dengan password. " +
        "Hubungi Administrator untuk membuat ulang akun Anda melalui panel Admin.";
    } else if (code.includes("invalid-email")) {
      msg = "Format email tidak valid.";
    } else if (code.includes("too-many-requests")) {
      msg = "Terlalu banyak permintaan. Coba lagi nanti.";
    }
    return { success: false, message: msg };
  }
};

// ─── Admin helper: create a new user without disrupting admin session ─────────
export const adminCreateUser = async (
  name: string,
  email: string,
  password: string,
  role: "admin" | "asman" | "koordinator_driver" | "staff_umum" | "user" | "view" | "driver" = "user"
): Promise<{ success: boolean; message: string }> => {
  if (!auth) {
    return { success: false, message: "Firebase tidak tersedia." };
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === "mock-api-key") {
      console.log("Mock: create user", { name, email, role });
      return { success: true, message: "Akun berhasil dibuat (mode development)." };
    }

    // Use Firebase REST API so admin session is NOT affected
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errCode = data?.error?.message || "";
      let msg = "Gagal membuat akun.";
      if (errCode.includes("EMAIL_EXISTS")) msg = "Email sudah terdaftar dalam sistem.";
      else if (errCode.includes("WEAK_PASSWORD")) msg = "Password minimal 6 karakter.";
      else if (errCode.includes("INVALID_EMAIL")) msg = "Format email tidak valid.";
      return { success: false, message: msg };
    }

    const uid = data.localId;
    const { createUserInFirestore } = await import("@/lib/firebase/firestore");
    const assignedRole = await createUserInFirestore(uid, name, email, role);

    return {
      success: true,
      message: `Akun berhasil dibuat${assignedRole !== role ? ` (role otomatis: ${assignedRole} karena terdaftar sebagai driver)` : ""}.`,
    };
  } catch (err: any) {
    console.error("adminCreateUser error:", err);
    return { success: false, message: err.message || "Terjadi kesalahan sistem." };
  }
};
