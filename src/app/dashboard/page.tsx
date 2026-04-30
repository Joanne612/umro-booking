"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboardStats,
  subscribeToPendingConsumption,
  subscribeToApprovedConsumption,
  subscribeToPendingItemRequests,
  subscribeToPendingVehicles,
  subscribeToWaitingAsmanVehicles,
  subscribeToIncompleteZoom,
  subscribeToRescheduledBookings,
  acknowledgeReschedule,
  subscribeToUserBookings,
  getDriverByEmail,
  subscribeToAssignedTrips,
  updateBookingLink,
  BookingData,
  ItemRequest,
  VehicleBooking,
  DriverTrip
} from "@/lib/firebase/firestore";
import styles from "./dashboard.module.css";
import Link from "next/link";
import UpdateLinkModal from "@/components/UpdateLinkModal";

export default function DashboardMonitoring() {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [pendingItems, setPendingItems] = useState<{ id?: string, title: string, type: string, user: string, link?: string }[]>([]);
  const [incompleteZoomBookings, setIncompleteZoomBookings] = useState<BookingData[]>([]);
  const [rescheduledBookings, setRescheduledBookings] = useState<BookingData[]>([]);
  const [activeTrips, setActiveTrips] = useState<DriverTrip[]>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedBookingForLink, setSelectedBookingForLink] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let unsubs: (() => void)[] = [];

    const fetchStatsData = async () => {
      setLoading(true);
      try {
        const dashboardData = await getDashboardStats(user.uid, userRole || "user");
        setStats(dashboardData);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatsData();

    // REAL-TIME ACTION LISTS
    if (userRole === "staff_umum") {
        unsubs.push(subscribeToApprovedConsumption(data => {
            setPendingItems(prev => {
                const filtered = prev.filter(i => i.type !== "Konsumsi");
                return [...filtered, ...data.slice(0, 2).map(c => ({ id: c.id, title: c.title, type: "Konsumsi", user: c.userName, link: "/dashboard/approvals" }))];
            });
        }));
        unsubs.push(subscribeToPendingItemRequests(["approved"], data => {
            setPendingItems(prev => {
                const filtered = prev.filter(i => i.type !== "Barang");
                return [...filtered, ...data.slice(0, 2).map(i => ({ id: i.id, title: i.title, type: "Barang", user: i.userName, link: "/dashboard/approvals" }))];
            });
        }));
    } else if (userRole === "koordinator_driver") {
        unsubs.push(subscribeToPendingVehicles(data => {
            setPendingItems(data.slice(0, 4).map(v => ({ id: v.id, title: v.event, type: "Kendaraan", user: v.userName, link: "/dashboard/vehicles/approvals" })));
        }));
    } else if (userRole === "admin" || userRole === "asman") {
        unsubs.push(subscribeToPendingConsumption(data => {
            setPendingItems(prev => {
                const filtered = prev.filter(i => i.type !== "Konsumsi");
                return [...filtered, ...data.slice(0, 2).map(c => ({ id: c.id, title: c.title, type: "Konsumsi", user: c.userName, link: "/dashboard/approvals" }))];
            });
        }));
        unsubs.push(subscribeToPendingItemRequests(["pending"], data => {
            setPendingItems(prev => {
                const filtered = prev.filter(i => i.type !== "Barang");
                return [...filtered, ...data.slice(0, 2).map(i => ({ id: i.id, title: i.title, type: "Barang", user: i.userName, link: "/dashboard/approvals" }))];
            });
        }));
        unsubs.push(subscribeToWaitingAsmanVehicles(data => {
            setPendingItems(prev => {
                const filtered = prev.filter(i => i.type !== "Kendaraan");
                return [...filtered, ...data.slice(0, 2).map(v => ({ id: v.id, title: v.event, type: "Kendaraan", user: v.userName, link: "/dashboard/approvals" }))];
            });
        }));

        // Removed admin block from here
    } else if (userRole === "driver") {
        // Driver specific penugasan
        unsubs.push(subscribeToAssignedTrips(user.uid, user.email, data => {
            const active = data.filter(t => t.status === 'pending' || t.status === 'ongoing');
            setActiveTrips(active);
            
            setPendingItems(data.slice(0, 5).map(t => ({
                id: t.id,
                title: t.tripId || 'Trip',
                type: "Penugasan",
                user: t.status,
                link: "/dashboard/assigned-trips"
            })));
        }));
    } else {
        // Regular user activity
        unsubs.push(subscribeToUserBookings(user.uid, data => {
            setPendingItems(data.slice(0, 5).map(r => ({
                id: r.id,
                title: r.title,
                type: "Ruangan",
                user: r.status,
                link: "/dashboard/my-bookings"
            })));
        }));
    }
    
    // Zoom & Reschedule Notifications for Admin and Staff Umum
    if (userRole === "admin" || userRole === "staff_umum") {
        unsubs.push(subscribeToIncompleteZoom(data => {
            setIncompleteZoomBookings(data.slice(0, 10));
        }));
        unsubs.push(subscribeToRescheduledBookings(data => {
            setRescheduledBookings(data);
        }));
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [user, userRole]);

  if (loading) return <div style={{ padding: '2rem' }}>Memuat data monitoring...</div>;

  const maxUsage = stats?.roomUsage?.[0]?.count || 1;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Driver Specific: Active Trip Monitoring */}
      {userRole === "driver" && activeTrips.length > 0 && (
        <div className={styles.card} style={{ marginBottom: '2rem', borderLeft: '4px solid #00A2E9', background: '#F0F9FF', animation: 'slideDown 0.5s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369A1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🚕</span> Monitoring Penugasan Perjalanan
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#0C4A6E' }}>Terdapat {activeTrips.length} penugasan aktif yang perlu Anda tangani.</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {activeTrips.map((trip) => (
              <div key={trip.id} className={styles.actionItem} style={{ background: 'white', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem' }}>
                <div className={styles.actionInfo} style={{ width: '100%' }}>
                  <h4 style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{trip.destination || "Tujuan Belum Ditentukan"}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <p style={{ fontSize: '0.8125rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📍 <span style={{ fontWeight: 600 }}>{trip.vehicleType} • {trip.plateNumber}</span>
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      👥 <span>{trip.userName} • {trip.passengers} Penumpang</span>
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📅 <span>{trip.pickupTime} • {trip.pickupLocation}</span>
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/assigned-trips" style={{ width: '100%', textDecoration: 'none' }}>
                  <button 
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      background: '#00A2E9', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 'var(--radius-sm)', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'background 0.2s'
                    }}
                  >
                    Buka Detail Perjalanan
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Selamat Datang, {user?.displayName || "User"}!
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Berikut adalah ringkasan aktivitas UMRO untuk bulan ini.</p>
      </div>

      {/* Admin/Staff Specific: Zoom Link Monitoring */}
      {(userRole === "admin" || userRole === "staff_umum") && incompleteZoomBookings.length > 0 && (
        <div className={styles.card} style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)', background: '#F0F9FF', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369A1' }}>🌐 Monitoring Link Zoom</h3>
              <p style={{ fontSize: '0.875rem', color: '#0C4A6E' }}>Terdapat {incompleteZoomBookings.length} pemesanan Zoom yang belum memiliki link meeting.</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {incompleteZoomBookings.map((b) => (
              <div key={b.id} className={styles.actionItem} style={{ background: 'white', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem' }}>
                <div className={styles.actionInfo}>
                  <h4 style={{ color: 'var(--foreground)' }}>{b.title}</h4>
                  <p className={styles.actionMeta} style={{ margin: '0.25rem 0' }}>
                    📍 {b.roomName} &bull; 👤 {b.userName}
                  </p>
                  <p className={styles.actionMeta}>
                    📅 {new Date(b.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} &bull; 🕒 {b.startTime} - {b.endTime}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedBookingForLink(b);
                    setIsLinkModalOpen(true);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '0.6rem', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 'var(--radius-sm)', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Input Link Meeting
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin/Staff Specific: Reschedule Monitoring */}
      {(userRole === "admin" || userRole === "staff_umum") && rescheduledBookings.length > 0 && (
        <div className={styles.card} style={{ marginBottom: '2rem', borderLeft: '4px solid #F59E0B', background: '#FEF3C7', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#92400E' }}>⚠️ Perhatian: Jadwal Meeting Di-Reschedule</h3>
              <p style={{ fontSize: '0.875rem', color: '#B45309' }}>Terdapat {rescheduledBookings.length} pemesanan yang telah diubah jadwalnya. Pastikan Anda memperbarui jadwal di aplikasi terkait (jika menggunakan Zoom).</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {rescheduledBookings.map((b) => (
              <div key={b.id} className={styles.actionItem} style={{ background: 'white', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', border: '1px solid #FDE68A' }}>
                <div className={styles.actionInfo}>
                  <h4 style={{ color: 'var(--foreground)' }}>{b.title}</h4>
                  <p className={styles.actionMeta} style={{ margin: '0.25rem 0' }}>
                    📍 {b.roomName} &bull; 👤 {b.userName}
                  </p>
                  <p className={styles.actionMeta} style={{ color: '#EA580C', fontWeight: 600 }}>
                    Jadwal Baru: 📅 {new Date(b.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} &bull; 🕒 {b.startTime} - {b.endTime}
                  </p>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      await acknowledgeReschedule(b.id!);
                      setRescheduledBookings(prev => prev.filter(item => item.id !== b.id));
                    } catch (error) {
                      console.error("Gagal update status:", error);
                    }
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '0.6rem', 
                    background: '#F59E0B', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 'var(--radius-sm)', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Tandai Sudah Diupdate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modern Link Modal */}
      <UpdateLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedBookingForLink(null);
        }}
        booking={selectedBookingForLink}
        onSave={async (link) => {
          if (selectedBookingForLink?.id) {
            await updateBookingLink(selectedBookingForLink.id, link);
            setIncompleteZoomBookings(prev => prev.filter(item => item.id !== selectedBookingForLink.id));
          }
        }}
      />

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
              href={
                userRole === "koordinator_driver" ? "/dashboard/vehicles/approvals" :
                ["admin", "asman", "staff_umum"].includes(userRole || "") ? "/dashboard/approvals" : 
                "/dashboard/my-bookings"
              } 
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
