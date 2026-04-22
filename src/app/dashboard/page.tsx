"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboardStats,
  getPendingConsumptionBookings,
  getApprovedConsumptionBookings,
  getItemRequestsByStatus,
  getPendingVehicleBookings,
  getWaitingAsmanVehicleBookings,
  getMyRecentActivity,
  BookingData,
  ItemRequest,
  VehicleBooking
} from "@/lib/firebase/firestore";
import styles from "./dashboard.module.css";
import Link from "next/link";

export default function DashboardMonitoring() {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [pendingItems, setPendingItems] = useState<{ id: string, title: string, type: string, user: string, link?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const dashboardData = await getDashboardStats(user.uid, userRole || "user");
        setStats(dashboardData);

        // Fetch small summary for "Needs Action" or "My Requests"
        let list: any[] = [];
        if (["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole || "")) {
          if (userRole === "staff_umum") {
            const cons = await getApprovedConsumptionBookings();
            cons.slice(0, 2).forEach(c => list.push({ id: c.id, title: c.title, type: "Konsumsi", user: c.userName, link: "/dashboard/approvals" }));
            
            const items = await getItemRequestsByStatus(["approved"]);
            items.slice(0, 2).forEach(i => list.push({ id: i.id, title: i.title, type: "Barang", user: i.userName, link: "/dashboard/approvals" }));
          } else if (userRole === "koordinator_driver") {
            const vehicles = await getPendingVehicleBookings();
            vehicles.slice(0, 4).forEach(v => list.push({ id: v.id, title: v.event, type: "Kendaraan", user: v.userName, link: "/dashboard/approvals" }));
          } else {
            // Admin or Asman
            const cons = await getPendingConsumptionBookings();
            cons.slice(0, 2).forEach(c => list.push({ id: c.id, title: c.title, type: "Konsumsi", user: c.userName, link: "/dashboard/approvals" }));
            
            const items = await getItemRequestsByStatus(["pending"]);
            items.slice(0, 2).forEach(i => list.push({ id: i.id, title: i.title, type: "Barang", user: i.userName, link: "/dashboard/approvals" }));

            const vehicles = await getWaitingAsmanVehicleBookings();
            vehicles.slice(0, 2).forEach(v => list.push({ id: v.id, title: v.event, type: "Kendaraan", user: v.userName, link: "/dashboard/approvals" }));
          }
        } else {
          // Regular users see their own recent activity
          const recent = await getMyRecentActivity(user.uid);
          list = recent.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            user: r.status, // Map status to 'user' field for display in Meta
            link: "/dashboard/my-bookings"
          }));
        }
        setPendingItems(list);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userRole]);

  if (loading) return <div style={{ padding: '2rem' }}>Memuat data monitoring...</div>;

  const maxUsage = stats?.roomUsage?.[0]?.count || 1;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Selamat Datang, {user?.displayName || "User"}!
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Berikut adalah ringkasan aktivitas UMRO untuk bulan ini.</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>
            {["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole || "") ? "Total Booking (Global)" : "Riwayat Booking (Bulan Ini)"}
          </div>
          <div className={styles.statsValue}>
            {["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole || "") ? (stats?.totalBookingsMonth || 0) : (stats?.userBookingsMonth || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pertemuan Meeting & Zoom</div>
        </div>

        <div className={styles.statsCard} style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className={styles.statsLabel}>
            {userRole === "staff_umum" ? "Perlu Diproses" : 
             ["admin", "asman", "koordinator_driver"].includes(userRole || "") ? "Perlu Persetujuan" : "Pemesanan Tertunda"}
          </div>
          <div className={styles.statsValue} style={{ color: '#F59E0B' }}>{stats?.pendingTotal || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Konsumsi, Barang & Kendaraan</div>
        </div>

      </div>

      {/* Usage & Actions Section */}
      <div className={styles.roomUsageSection}>
        {/* Physical Room Usage Statistics */}
        <div className={styles.roomUsageCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Statistik Penggunaan Ruangan Fisik</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bulan Ini</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats?.roomUsage?.map((room: any) => (
              <div key={room.roomId} className={styles.roomUsageItem}>
                <div className={styles.roomUsageHeader}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{room.roomName}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{room.count} Booking</span>
                </div>
                <div className={styles.usageBarBg}>
                  <div
                    className={styles.usageBarFill}
                    style={{ width: `${(room.count / maxUsage) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {(!stats?.roomUsage || stats.roomUsage.length === 0) && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Belum ada data penggunaan ruangan.</p>
            )}
          </div>
        </div>

        {/* Needs Action or Recent Activity Widget */}
        <div className={styles.roomUsageCard} style={{ background: '#F8FAFC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {userRole === "staff_umum" ? "Tugas Perlu Diproses" :
               ["admin", "asman", "koordinator_driver"].includes(userRole || "") ? "Perlu Persetujuan" : "Aktivitas Terbaru"}
            </h3>
            <Link 
              href={["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole || "") ? "/dashboard/approvals" : "/dashboard/my-bookings"} 
              style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Lihat Semua
            </Link>
          </div>

          <div className={styles.actionList}>
            {pendingItems.length > 0 ? pendingItems.map((item) => (
              <div key={item.id} className={styles.actionItem}>
                <div className={styles.actionInfo}>
                  <h4>{item.title}</h4>
                  <div className={styles.actionMeta}>
                    {item.type} • <span style={{ 
                      textTransform: 'capitalize',
                      color: item.user === 'pending' ? '#F59E0B' : 
                             item.user === 'approved' || item.user === 'active' ? '#10B981' : 
                             item.user === 'rejected' ? '#EF4444' : 'var(--text-muted)'
                    }}>{item.user}</span>
                  </div>
                </div>
                <Link href={item.link || "/dashboard"}>
                  <button style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'white',
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>Detail</button>
                </Link>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole || "") ? "Tidak ada persetujuan mendesak." : "Belum ada aktivitas terbaru."}
              </div>
            )}

            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole || "") ? (
                  <><strong>Tips:</strong> Anda dapat menyetujui atau memproses permintaan secara mendetail di Panel Persetujuan.</>
                ) : (
                  <><strong>Info:</strong> Status pemesanan Anda akan diperbarui secara otomatis setelah divalidasi oleh petugas.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
