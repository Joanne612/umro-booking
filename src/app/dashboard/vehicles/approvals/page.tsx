"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getPendingVehicleBookings, validateVehicleBooking, updateVehicleBookingStatus, VehicleBooking } from "@/lib/firebase/firestore";
import styles from "../../dashboard.module.css";

export default function VehicleApprovalsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Approval State
  const [approvingBooking, setApprovingBooking] = useState<VehicleBooking | null>(null);
  const [vehicleNotes, setVehicleNotes] = useState("");

  // Rejection State
  const [rejectingBooking, setRejectingBooking] = useState<VehicleBooking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPendingVehicleBookings();
      setBookings(data);
    } catch (error: any) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !approvingBooking?.id || !vehicleNotes.trim()) {
      return showToast("Mohon masukkan informasi kendaraan dan driver.", "warning");
    }

    setProcessingId(approvingBooking.id);
    try {
      await validateVehicleBooking(
        approvingBooking.id, 
        user.uid, 
        user.displayName || user.email || "Petugas Umum",
        vehicleNotes
      );
      showToast("Pengajuan berhasil divalidasi dan diteruskan ke Asman Umum.", "success");
      setApprovingBooking(null);
      setVehicleNotes("");
      fetchData();
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectingBooking?.id || !rejectReason.trim()) return;
    
    setProcessingId(rejectingBooking.id);
    try {
      await updateVehicleBookingStatus(
        rejectingBooking.id, 
        "rejected", 
        user.uid, 
        user.displayName || user.email || "Petugas Umum",
        rejectReason
      );
      showToast("Pengajuan kendaraan telah ditolak.", "success");
      setRejectingBooking(null);
      setRejectReason("");
      fetchData();
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (userRole !== "admin" && userRole !== "umum") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Akses Terbatas (Umum)</h2>
        <p style={{ color: "var(--text-muted)" }}>Halaman ini hanya dapat diakses oleh Role Umum atau Admin.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Persetujuan Peminjaman Kendaraan</h2>
        <p style={{ color: 'var(--text-muted)' }}>Daftar pengajuan operasional kendaraan yang menunggu validasi Anda.</p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data pengajuan...</div>
      ) : bookings.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Semua Pengajuan Selesai</h3>
          <p style={{ color: 'var(--text-muted)' }}>Tidak ada pengajuan kendaraan yang perlu diproses saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {bookings.map(booking => (
            <div key={booking.id} className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '1.25rem', background: 'rgba(0,162,233,0.03)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Tujuan Ke:</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{booking.destination}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{new Date(booking.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Durasi: {booking.duration} Hari</div>
                </div>
              </div>

              {/* Grid Content */}
              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>PEMOHON / PIC</label>
                  <div style={{ fontWeight: 600 }}>👤 {booking.userName}</div>
                  <div style={{ fontSize: '0.875rem' }}>📞 {booking.userPhone}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>PENJEMPUTAN</label>
                  <div style={{ fontWeight: 600 }}>🕒 {booking.pickupTime} WIB</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.4 }}>📍 {booking.pickupLocation}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>DETAIL PERJALANAN</label>
                  <div style={{ fontSize: '0.875rem' }}>🔁 Tipe: <b>{booking.tripType === 'pp' ? 'Pulang Pergi' : 'Sekali Jalan'}</b></div>
                  <div style={{ fontSize: '0.875rem' }}>👥 Penumpang: <b>{booking.passengers} Orang</b></div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>ACARA / KEGIATAN</label>
                  <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    {booking.event}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '1rem 1.5rem', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  onClick={() => setRejectingBooking(booking)}
                  disabled={!!processingId}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid #EF4444', 
                    color: '#EF4444', 
                    background: 'white', 
                    fontWeight: 600, 
                    cursor: 'pointer'
                  }}
                >
                  Tolak
                </button>
                <button 
                  onClick={() => setApprovingBooking(booking)}
                  disabled={!!processingId}
                  style={{ 
                    padding: '0.75rem 2rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: 'none', 
                    background: '#10B981', 
                    color: 'white', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  ✓ Validasi & Teruskan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APPROVAL MODAL WITH NOTES */}
      {approvingBooking && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Validasi & Teruskan</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Masukkan detail kendaraan (Tipe Mobil, No. Plat) dan Driver untuk diteruskan ke Asman Umum.
            </p>
            
            <form onSubmit={handleApproveSubmit}>
              <textarea 
                required
                autoFocus
                value={vehicleNotes}
                onChange={(e) => setVehicleNotes(e.target.value)}
                placeholder="Cth: Toyota Avanza (B 1234 ABC), Driver: Pak Budi (0812...)"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  minHeight: '120px',
                  fontFamily: 'inherit',
                  marginBottom: '1.5rem'
                }}
              />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => { setApprovingBooking(null); setVehicleNotes(""); }}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={!!processingId}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#10B981', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  {processingId === approvingBooking.id ? 'Memproses...' : '✓ Validasi & Teruskan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingBooking && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Alasan Penolakan (Kendaraan)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Berikan alasan penolakan untuk pengajuan ke <b>"{rejectingBooking.destination}"</b>.
            </p>
            
            <form onSubmit={handleReject}>
              <textarea 
                required
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Cth: Kendaraan sudah penuh terpakai / Maintenance rutin."
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                  marginBottom: '1.5rem'
                }}
              />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => { setRejectingBooking(null); setRejectReason(""); }}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={!!processingId}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Tolak Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
