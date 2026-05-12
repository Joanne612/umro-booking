"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useAuth, sendPasswordReset } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function Home() {
  const router = useRouter();
  const { user, loginWithEmail } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot/reset password mode
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast("Email dan password tidak boleh kosong.", "error");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      showToast("Selamat Datang!", "success");
      router.push("/dashboard");
    } catch (error: any) {
      const code = error?.code || "";
      const msg = error?.message || "";
      let display =
        "Gagal masuk. Pastikan email dan password sudah benar.";
      if (
        code.includes("invalid-credential") ||
        code.includes("wrong-password") ||
        code.includes("user-not-found") ||
        code.includes("INVALID_LOGIN_CREDENTIALS")
      ) {
        display =
          "Email atau password salah. Jika baru pertama login, gunakan fitur \"Atur Password\" di bawah.";
      } else if (code.includes("too-many-requests")) {
        display =
          "Terlalu banyak percobaan login. Coba lagi beberapa menit kemudian.";
      } else if (msg.includes("belum terdaftar")) {
        display = msg;
      }
      showToast(display, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast("Masukkan email Anda.", "error");
      return;
    }
    setResetLoading(true);
    try {
      const result = await sendPasswordReset(resetEmail.trim());
      if (result.success) {
        showToast(result.message, "success");
        setShowReset(false);
        setResetEmail("");
      } else {
        showToast(result.message, "error");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left decorative panel */}
      <div className={styles.leftPanel}>
        <div className={styles.branding}>
          <div className={styles.brandingTop}>
            <img src="/pln-logo.png" alt="PLN Logo" className={styles.plnLogo} />
          </div>
          <h1 className={styles.title}>PLN Nusantara Power</h1>
          <p className={styles.subtitle}>
            Sistem Booking Ruang Zoom &amp; Meeting
          </p>
          <p className={styles.unitLabel}>Unit Manajemen Regional Operations (UMRO)</p>
          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📅</span>
              <span>Booking ruang meeting &amp; zoom</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🚗</span>
              <span>Manajemen armada &amp; driver</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>✅</span>
              <span>Persetujuan &amp; tracking real-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>

          {/* ── RESET PASSWORD MODE ────────────────────────────── */}
          {showReset ? (
            <>
              <div className={styles.cardHeader}>
                <img src="/pln-logo.png" alt="PLN Logo" className={styles.cardLogo} />
                <h2 className={styles.cardTitle}>Atur Password</h2>
                <p className={styles.cardSubtitle}>
                  Masukkan email Anda. Kami akan mengirimkan link untuk membuat
                  atau mengatur ulang password.
                </p>
              </div>

              <form className={styles.loginForm} onSubmit={handleResetPassword} noValidate>
                <div className={styles.fieldGroup}>
                  <label htmlFor="resetEmail" className={styles.label}>Email</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <input
                      id="resetEmail"
                      type="email"
                      className={styles.input}
                      placeholder="email@pln.co.id"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={resetLoading}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={styles.loginBtn} disabled={resetLoading}>
                  {resetLoading ? (
                    <><span className={styles.spinner} /> Mengirim...</>
                  ) : "Kirim Link Reset Password"}
                </button>

                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => { setShowReset(false); setResetEmail(""); }}
                >
                  ← Kembali ke Login
                </button>
              </form>
            </>
          ) : (

          /* ── LOGIN MODE ─────────────────────────────────────── */
          <>
            <div className={styles.cardHeader}>
              <img src="/pln-logo.png" alt="PLN Logo" className={styles.cardLogo} />
              <h2 className={styles.cardTitle}>Masuk ke Akun Anda</h2>
              <p className={styles.cardSubtitle}>
                Gunakan kredensial yang diberikan oleh Administrator sistem
              </p>
            </div>

            <form className={styles.loginForm} onSubmit={handleLogin} noValidate>
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    placeholder="nama@pln.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="password" className={styles.label}>Password</label>
                  <button
                    type="button"
                    className={styles.forgotBtn}
                    onClick={() => { setShowReset(true); setResetEmail(email); }}
                  >
                    Lupa / Atur Password?
                  </button>
                </div>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={styles.input}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className={styles.loginBtn} disabled={loading}>
                {loading ? (
                  <><span className={styles.spinner} /> Memverifikasi...</>
                ) : "Masuk"}
              </button>
            </form>

            <div className={styles.cardFooter}>
              <p>
                Belum punya akun?{" "}
                <span className={styles.footerNote}>
                  Hubungi Administrator untuk pendaftaran.
                </span>
              </p>
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
