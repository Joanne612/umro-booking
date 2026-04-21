"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getPendingConsumptionBookings,
  getApprovedConsumptionBookings,
  getConsumptionHistory,
  updateConsumptionStatus,
  subscribeToWaitingAsmanVehicles,
  subscribeToVehicleHistory,
  updateVehicleBookingStatus,
  BookingData,
  VehicleBooking
} from "@/lib/firebase/firestore";
import VehicleApprovalCard from "@/components/VehicleApprovalCard";
import styles from "../dashboard.module.css";

export default function ApprovalsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"consumption" | "vehicle">("consumption");
  const [viewMode, setViewMode] = useState<"pending" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");

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
      if (viewMode === "pending") {
        if (userRole === "staff_umum") {
          const approvedCons = await getApprovedConsumptionBookings();
          setConsumptionBookings(approvedCons);
        } else {
          const consData = await getPendingConsumptionBookings();
          setConsumptionBookings(consData);
        }
      } else {
        const consData = await getConsumptionHistory();
        setConsumptionBookings(consData);
      }
    } catch (error: any) {
      showToast("Gagal memuat data konsumsi: " + error.message, "error");
    } finally {
      if (activeTab === "consumption") setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  // Real-time Vehicle Subscription
  useEffect(() => {
    if (activeTab !== "vehicle") return;
    
    setLoading(true);
    let unsubscribe: () => void;

    if (viewMode === "pending") {
      unsubscribe = subscribeToWaitingAsmanVehicles((data) => {
        setVehicleBookings(data);
        setLoading(false);
      });
    } else {
      unsubscribe = subscribeToVehicleHistory((data) => {
        setVehicleBookings(data);
        setLoading(false);
      });
    }
    
    return () => unsubscribe?.();
  }, [viewMode, activeTab]);

  // Combined Search Filtering
  const filteredConsumption = useMemo(() => {
    return consumptionBookings.filter(b =>
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.division?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [consumptionBookings, searchQuery]);

  const filteredVehicles = useMemo(() => {
    return vehicleBookings.filter(b =>
      b.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.validatedByName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vehicleBookings, searchQuery]);

  const handleApproveConsumption = async (bookingId: string) => {
    if (!user) return;
    setProcessingId(bookingId);
    try {
      if (userRole === "staff_umum") {
        await updateConsumptionStatus(bookingId, "completed", user.uid, user.displayName || "Staff Umum");
        showToast("Konsumsi berhasil ditandai selesai.", "success");
      } else {
        await updateConsumptionStatus(
          bookingId,
          "approved",
          user.uid,
          user.displayName || user.email || "Asman Umum"
        );
        showToast("Permintaan konsumsi berhasil disetujui, diteruskan ke Staff Umum.", "success");
      }
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

  if (userRole !== "admin" && userRole !== "asman" && userRole !== "staff_umum") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-muted)" }}>Halaman ini hanya dapat diakses oleh Asman/Staff Umum atau Admin.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Panel Persetujuan</h2>
        <p style={{ color: 'var(--text-muted)' }}>Kelola permintaan fasilitas (Konsumsi & Kendaraan) yang memerlukan keputusan Anda.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* TOP TABS (CATEGORY) */}
        <div style={{
          display: 'flex',
          gap: '1rem',
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

          {(userRole === "asman" || userRole === "admin" || userRole === "staff_umum") && (
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
          )}
        </div>

        {/* CONTROLS (MODE & SEARCH) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewMode("pending")}
              style={{
                padding: '0.5rem 1.25rem',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                background: viewMode === "pending" ? 'white' : 'transparent',
                boxShadow: viewMode === "pending" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: viewMode === "pending" ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              {userRole === 'staff_umum' ? 'Antrean Kelola' : 'Perlu Diproses'}
            </button>
            <button
              onClick={() => setViewMode("history")}
              style={{
                padding: '0.5rem 1.25rem',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                background: viewMode === "history" ? 'white' : 'transparent',
                boxShadow: viewMode === "history" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: viewMode === "history" ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              Riwayat (Selesai)
            </button>
          </div>

          <div style={{ position: 'relative', flex: '1', maxWidth: '350px' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Cari kegiatan, pemohon, atau ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
      ) : activeTab === "consumption" ? (
        filteredConsumption.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery ? '🔎' : (viewMode === 'pending' ? '🎉' : '📂')}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {searchQuery ? 'Hasil tidak ditemukan' : (viewMode === 'pending' ? 'Semua Konsumsi Beres!' : 'Riwayat Kosong')}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : (viewMode === 'pending' ? 'Tidak ada permintaan konsumsi yang perlu diproses.' : 'Belum ada riwayat konsumsi yang tersimpan.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredConsumption.map(booking => (
              <div key={booking.id} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: viewMode === 'history' ? '#F8FAFC' : 'rgba(0,162,233,0.02)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{booking.division}</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{booking.title}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>📅 {new Date(booking.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>🕒 {booking.startTime} - {booking.endTime}</div>
                  </div>
                </div>
                <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {booking.consumption?.morningSnack && <span style={{ padding: '0.2rem 0.5rem', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700 }}>🍰 Snack Pagi</span>}
                      {booking.consumption?.lunch && <span style={{ padding: '0.2rem 0.5rem', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700 }}>🍱 Makan Siang</span>}
                      {booking.consumption?.afternoonSnack && <span style={{ padding: '0.2rem 0.5rem', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700 }}>🍰 Snack Sore</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Lokasi & Pemohon:</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>📍 {booking.roomName}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>👤 {booking.userName} ({booking.participants} Orang)</div>
                  </div>
                  {booking.consumption?.notes && (
                    <div style={{ gridColumn: 'span 2', padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      " {booking.consumption.notes} "
                    </div>
                  )}
                </div>
                <div style={{ padding: '1rem 1.25rem', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                  {viewMode === "pending" ? (
                    <>
                      {userRole !== "staff_umum" && (
                        <button onClick={() => setRejectingConsumption(booking)} className="btn-secondary" style={{ padding: '0.5rem 1.25rem', border: '1px solid #EF4444', color: '#EF4444' }}>Tolak</button>
                      )}
                      <button
                        onClick={() => handleApproveConsumption(booking.id!)}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1.5rem', background: userRole === 'staff_umum' ? '#059669' : '#10B981' }}
                      >
                        {userRole === 'staff_umum' ? '✓ Mark Selesai' : '✓ Setujui'}
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: booking.consumption?.status === 'completed' ? '#D1FAE5' : (booking.consumption?.status === 'approved' ? '#DCFCE7' : '#FEE2E2'),
                        color: booking.consumption?.status === 'completed' ? '#059669' : (booking.consumption?.status === 'approved' ? '#166534' : '#991B1B')
                      }}>
                        {booking.consumption?.status === 'completed' ? 'Selesai ✓' : (booking.consumption?.status === 'approved' ? 'Disetujui' : 'Ditolak ✗')}
                      </span>
                      {booking.consumption?.status === 'rejected' && booking.consumption.rejectReason && (
                        <div style={{ fontSize: '0.75rem', color: '#991B1B', fontStyle: 'italic' }}>
                          Ket: {booking.consumption.rejectReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ================= KENDARAAN ================= */
        filteredVehicles.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery ? '🔎' : (viewMode === 'pending' ? '🚗' : '📂')}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {searchQuery ? 'Hasil tidak ditemukan' : (viewMode === 'pending' ? 'Semua Kendaraan Beres!' : 'Riwayat Kosong')}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : (viewMode === 'pending' ? 'Tidak ada pengajuan kendaraan yang perlu diproses.' : 'Belum ada riwayat pengajuan kendaraan.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredVehicles.map(booking => (
              <VehicleApprovalCard 
                key={booking.id}
                booking={booking}
                viewMode={viewMode}
                userRole={userRole}
                processingId={processingId}
                onApprove={handleApproveVehicle}
                onReject={(b) => setRejectingVehicle(b)}
              />
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
