"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
        <div className={styles.sidebarHeader}>
          <img src="/pln-logo.png" alt="PLN Logo" style={{ width: '40px', height: 'auto' }} />
          <div className={styles.headerText}>
            <h2>UMRO Booking</h2>
            <p>PT PLN Nusantara Power</p>
          </div>
        </div>

        <nav className={styles.navLinks}>
          <Link href="/dashboard" className={`${styles.navItem} ${pathname === "/dashboard" ? styles.active : ""}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" /></svg>
            Dashboard
          </Link>

          <Link href="/dashboard/booking" className={`${styles.navItem} ${pathname === "/dashboard/booking" ? styles.active : ""}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Booking Layanan
          </Link>

          {userRole !== "view" && (
            <Link href="/dashboard/my-bookings" className={`${styles.navItem} ${pathname === "/dashboard/my-bookings" ? styles.active : ""}`}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Riwayat Booking
            </Link>
          )}

          {/* Approval Link for Asman, Admin, and Staff Umum */}
          {(userRole === "asman" || userRole === "admin" || userRole === "staff_umum") && (
            <Link href="/dashboard/approvals" className={`${styles.navItem} ${pathname === "/dashboard/approvals" ? styles.active : ""}`}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Panel Persetujuan
            </Link>
          )}

          {(userRole === "koordinator_driver" || userRole === "admin") && (
            <Link href="/dashboard/vehicles/approvals" className={`${styles.navItem} ${pathname === "/dashboard/vehicles/approvals" ? styles.active : ""}`}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Persetujuan Driver
            </Link>
          )}

          <Link href="/dashboard/profile" className={`${styles.navItem} ${pathname === "/dashboard/profile" ? styles.active : ""}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Profil Pengguna
          </Link>

          {/* Admin link hidden conditionally for non-admin roles */}
          {userRole === "admin" && (
            <Link href="/dashboard/admin" className={`${styles.navItem} ${pathname.startsWith("/dashboard/admin") ? styles.active : ""}`}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Admin Panel
            </Link>
          )}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.avatar}>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--primary)' }}></div>
            )}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.displayName || "Pengguna UMRO"}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Keluar">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className={styles.menuToggle}
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className={styles.pageTitle}>
              {pathname === '/dashboard' ? 'Monitoring & Laporan' :
                pathname === '/dashboard/booking' ? 'Layanan Terpadu UMRO' :
                  pathname === '/dashboard/my-bookings' ? 'Riwayat Booking' :
                    pathname === '/dashboard/profile' ? 'Pengaturan Profil' :
                      pathname === '/dashboard/approvals' ? 'Panel Persetujuan' :
                        pathname === '/dashboard/vehicles' ? 'Peminjaman Kendaraan' :
                          pathname === '/dashboard/item-requests' ? 'Permintaan Barang' :
                            pathname === '/dashboard/vehicles/approvals' ? 'Persetujuan Driver & Armada' :
                              'Admin Panel'}
            </h1>
          </div>
        </header>
        <div className={styles.contentScroll}>
          {children}
        </div>
      </main>
    </div>
  );
}
