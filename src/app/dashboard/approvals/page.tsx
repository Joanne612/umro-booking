"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { 
  getPendingConsumptionBookings, 
  updateConsumptionStatus, 
  getWaitingAsmanVehicleBookings,
  updateVehicleBookingStatus,
  BookingData,
  VehicleBooking
} from "@/lib/firebase/firestore";
import styles from "../dashboard.module.css";

export default function ApprovalsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"consumption" | "vehicle">("consumption");
  const [consumptionBookings, setConsumptionBookings] = useState<BookingData[]>([]);
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Rejection State
  const [rejectingConsumption, setRejectingConsumption] = useState<BookingData | null>(null);
  const [rejectingVehicle, setRejectingVehicle] = useState<VehicleBooking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [consData, vehData] = await Promise.all([
        getPendingConsumptionBookings(),
        getWaitingAsmanVehicleBookings()
      ]);
      setConsumptionBookings(consData);
      setVehicleBookings(vehData);
    } catch (error: any) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveConsumption = async (bookingId: string) => {
    if (!user) return;
    setProcessingId(bookingId);
    try {
      await updateConsumptionStatus(
        bookingId, 
        "approved", 
        user.uid, 
        user.displayName || user.email || "Asman Umum"
      );
      showToast("Permintaan konsumsi berhasil disetujui.", "success");
      fetchData();
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveVehicle = async (bookingId: string) => {
    if (!user) return;
    setProcessingId(bookingId);
    try {
      await updateVehicleBookingStatus(
        bookingId, 
        "approved", 
        user.uid, 
        user.displayName || user.email || "Asman Umum"
      );
      showToast("Peminjaman kendaraan berhasil disetujui.", "success");
      fetchData();
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectingConsumption?.id || !rejectReason.trim()) return;
    
    setProcessingId(rejectingConsumption.id);
    try {
      await updateConsumptionStatus(
        rejectingConsumption.id, 
        "rejected", 
        user.uid, 
        user.displayName || user.email || "Asman Umum",
        rejectReason
      );
      showToast("Permintaan konsumsi telah ditolak.", "success");
      setRejectingConsumption(null);
      setRejectReason("");
      fetchData();
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectingVehicle?.id || !rejectReason.trim()) return;
    
    setProcessingId(rejectingVehicle.id);
    try {
      await updateVehicleBookingStatus(
        rejectingVehicle.id, 
        "rejected", 
        user.uid, 
        user.displayName || user.email || "Asman Umum",
        rejectReason
      );
      showToast("Peminjaman kendaraan telah ditolak.", "success");
      setRejectingVehicle(null);
      setRejectReason("");
      fetchData();
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (userRole !== "admin" && userRole !== "asman") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-muted)" }}>Halaman ini hanya dapat diakses oleh Asman Umum atau Admin.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Panel Persetujuan</h2>
        <p style={{ color: 'var(--text-muted)' }}>Kelola permintaan fasilitas (Konsumsi & Kendaraan) yang memerlukan keputusan Anda.</p>
      </div>

      {/* TABS */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.1rem'
      }}>
        <button 
          onClick={() => setActiveTab("consumption")}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            fontSize: '0.9375rem',
            fontWeight: activeTab === "consumption" ? 700 : 500,
            color: activeTab === "consumption" ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === "consumption" ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📦 Konsumsi ({consumptionBookings.length})
        </button>
        <button 
          onClick={() => setActiveTab("vehicle")}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            fontSize: '0.9375rem',
            fontWeight: activeTab === "vehicle" ? 700 : 500,
            color: activeTab === "vehicle" ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === "vehicle" ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🚗 Kendaraan ({vehicleBookings.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat permintaan...</div>
      ) : activeTab === "consumption" ? (
        consumptionBookings.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Semua Konsumsi Beres!</h3>
            <p style={{ color: 'var(--text-muted)' }}>Tidak ada permintaan konsumsi yang perlu diproses.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {consumptionBookings.map(booking => (
              <div key={booking.id} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(0,162,233,0.02)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{booking.division}</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{booking.title}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>📅 {booking.date}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>🕒 {booking.startTime} - {booking.endTime}</div>
                  </div>
                </div>
                <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Fasilitas:</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {booking.consumption?.snack && <span style={{ padding: '0.3rem 0.6rem', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>🍰 Snack</span>}
                      {booking.consumption?.lunch && <span style={{ padding: '0.3rem 0.6rem', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>🍱 Makan Siang</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Pemohon & Peserta:</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>👤 {booking.userName}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>👥 {booking.participants} Orang</div>
                  </div>
                  {booking.consumption?.notes && (
                    <div style={{ gridColumn: 'span 2', padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      " {booking.consumption.notes} "
                    </div>
                  )}
                </div>
                <div style={{ padding: '1rem 1.25rem', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button onClick={() => setRejectingConsumption(booking)} className="btn-secondary" style={{ padding: '0.5rem 1.25rem', border: '1px solid #EF4444', color: '#EF4444' }}>Tolak</button>
                  <button onClick={() => handleApproveConsumption(booking.id!)} className="btn-primary" style={{ padding: '0.5rem 1.5rem', background: '#10B981' }}>✓ Setujui</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ================= KENDARAAN ================= */
        vehicleBookings.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Semua Kendaraan Beres!</h3>
            <p style={{ color: 'var(--text-muted)' }}>Tidak ada pengajuan kendaraan yang perlu diproses.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {vehicleBookings.map(booking => (
              <div key={booking.id} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(16,185,129,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Divalidasi Oleh: {booking.validatedByName}</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Tujuan: {booking.destination}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>📅 {booking.date}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Durasi: {booking.duration} Hari</div>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>PEMOHON</label>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>👤 {booking.userName}</div>
                    <div style={{ fontSize: '0.8125rem' }}>📞 {booking.userPhone}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>PENJEMPUTAN</label>
                    <div style={{ fontSize: '0.8125rem' }}>🕒 {booking.pickupTime} WIB</div>
                    <div style={{ fontSize: '0.8125rem' }}>📍 {booking.pickupLocation}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#F0F9FF', borderRadius: 'var(--radius-md)', border: '1px solid #BAE6FD' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369A1' }}>INFO ARMADA (DARI UMUM)</label>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{booking.vehicleNotes}</div>
                  </div>
                </div>
                <div style={{ padding: '1rem 1.5rem', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button onClick={() => setRejectingVehicle(booking)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', border: '1px solid #EF4444', color: '#EF4444' }}>Tolak</button>
                  <button onClick={() => handleApproveVehicle(booking.id!)} className="btn-primary" style={{ padding: '0.6rem 2rem', background: '#10B981' }}>✓ Setujui Pinjaman</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* REJECTION MODALS */}
      {rejectingConsumption && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Tolak Konsumsi</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Berikan alasan mengapa permintaan konsumsi untuk kegiatan <b>"{rejectingConsumption.title}"</b> ditolak.</p>
            <form onSubmit={handleRejectConsumption}>
              <textarea required autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '100px', fontFamily: 'inherit', marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setRejectingConsumption(null); setRejectReason(""); }} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={processingId === rejectingConsumption.id} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{processingId === rejectingConsumption.id ? 'Memproses...' : 'Ya, Tolak'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectingVehicle && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Tolak Peminjaman Kendaraan</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Berikan alasan mengapa peminjaman kendaraan ke <b>"{rejectingVehicle.destination}"</b> ditolak.</p>
            <form onSubmit={handleRejectVehicle}>
              <textarea required autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '100px', fontFamily: 'inherit', marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setRejectingVehicle(null); setRejectReason(""); }} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={processingId === rejectingVehicle.id} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{processingId === rejectingVehicle.id ? 'Memproses...' : 'Ya, Tolak'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
