"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserBookings, cancelBooking, BookingData } from "@/lib/firebase/firestore";
import { useToast } from "@/context/ToastContext";
import styles from "../dashboard.module.css";

export default function MyBookingsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (user) {
      const data = await getUserBookings(user.uid);
      setBookings(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleCancel = async (id: string | undefined) => {
    if (!id) return;
    if (confirm("Apakah Anda yakin ingin membatalkan booking ini?")) {
      try {
        await cancelBooking(id);
        showToast("Booking berhasil dibatalkan.", "success");
        fetchBookings(); // Refresh data
      } catch (error: any) {
        showToast("Gagal membatalkan booking: " + error.message, "error");
      }
    }
  };

  if (loading) return <div>Memuat data history...</div>;

  if (userRole === "view") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>👤</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          Maaf, role <b>Hanya Lihat (View)</b> tidak memiliki riwayat booking pribadi karena tidak memiliki izin untuk memesan ruangan.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Daftar Booking Saya</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Riwayat seluruh jadwal ruangan yang pernah Anda ajukan</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {bookings.length === 0 ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Anda belum pernah membuat booking.
          </div>
        ) : (
          bookings.map(booking => (
            <div key={booking.id} className={styles.card} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              opacity: booking.status === 'cancelled' ? 0.6 : 1,
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {booking.title}
                  {booking.status === 'cancelled' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#FEE2E2', color: '#EF4444', borderRadius: 'var(--radius-sm)' }}>Dibatalkan</span>}
                  {booking.status === 'active' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#D1FAE5', color: '#10B981', borderRadius: 'var(--radius-sm)' }}>Aktif</span>}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <b>{booking.roomName}</b> &bull; {booking.date} &bull; {booking.startTime} - {booking.endTime}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Divisi: {booking.division}</p>
              </div>

              {booking.status === 'active' && (
                <button
                  onClick={() => handleCancel(booking.id)}
                  style={{ padding: '0.5rem 1rem', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Batalkan
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
