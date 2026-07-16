"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getConsumptionHistory,
  updateConsumptionStatus,
  subscribeToConsumptionBookings,
  subscribeToWaitingAsmanVehicles,
  subscribeToVehicleHistory,
  acknowledgeVehicleBooking,
  updateVehicleBookingStatus,
  getItemRequestsByStatus,
  subscribeToPendingItemRequests,
  updateItemRequestStatus,
  subscribeToMaintenanceRequests,
  updateMaintenanceRequestStatus,
  BookingData,
  VehicleBooking,
  ItemRequest,
  MaintenanceRequest
} from "@/lib/firebase/firestore";
import VehicleApprovalCard from "@/components/VehicleApprovalCard";
import { exportConsumptionToPDF } from "@/lib/utils/consumptionExporter";
import styles from "../dashboard.module.css";

export default function ApprovalsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"consumption" | "vehicle" | "item" | "maintenance">("consumption");
  const [viewMode, setViewMode] = useState<"pending" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [consumptionBookings, setConsumptionBookings] = useState<BookingData[]>([]);
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection State
  const [rejectingConsumption, setRejectingConsumption] = useState<BookingData | null>(null);
  const [rejectingVehicle, setRejectingVehicle] = useState<VehicleBooking | null>(null);
  const [rejectingItem, setRejectingItem] = useState<ItemRequest | null>(null);
  const [rejectingMaint, setRejectingMaint] = useState<MaintenanceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isPastDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  // Subscriptions for Pending Mode (Always active for counts)
  useEffect(() => {
    if (viewMode !== "pending") return;
    
    setLoading(true);
    
    // 1. Consumption
    const consStatuses = userRole === "staff_umum" ? ["approved"] : ["pending"];
    const unsubCons = subscribeToConsumptionBookings(consStatuses, (data) => {
      setConsumptionBookings(data);
      if (activeTabRef.current === "consumption") setLoading(false);
    });

    // 2. Vehicle
    const unsubVeh = subscribeToWaitingAsmanVehicles((data) => {
      setVehicleBookings(data);
      if (activeTabRef.current === "vehicle") setLoading(false);
    });

    // 3. Item
    const itemStatuses = userRole === "staff_umum" ? ["approved"] : ["pending"];
    const unsubItem = subscribeToPendingItemRequests(itemStatuses, (data) => {
      setItemRequests(data);
      if (activeTabRef.current === "item") setLoading(false);
    });

    // 4. Maintenance
    const maintStatuses = ["pending", "in_progress"];
    const unsubMaint = subscribeToMaintenanceRequests(maintStatuses, (data) => {
      setMaintenanceRequests(data);
      if (activeTabRef.current === "maintenance") setLoading(false);
    });

    return () => {
      unsubCons();
      unsubVeh();
      unsubItem();
      unsubMaint();
    };
  }, [viewMode, userRole]); // Removed activeTab

  // Subscriptions for History Mode
  useEffect(() => {
    if (viewMode !== "history") return;
    
    setLoading(true);

    // Consumption History (Direct fetch as it's less frequent)
    getConsumptionHistory().then(data => {
      setConsumptionBookings(data);
      if (activeTabRef.current === "consumption") setLoading(false);
    });

    // Vehicle History
    const unsubVeh = subscribeToVehicleHistory((data) => {
      setVehicleBookings(data);
      if (activeTabRef.current === "vehicle") setLoading(false);
    });

    // Item History
    getItemRequestsByStatus(["completed", "rejected"]).then(data => {
      setItemRequests(data);
      if (activeTabRef.current === "item") setLoading(false);
    });

    // Maintenance History
    const unsubMaint = subscribeToMaintenanceRequests(["completed", "rejected"], (data) => {
      setMaintenanceRequests(data);
      if (activeTabRef.current === "maintenance") setLoading(false);
    });

    return () => {
      unsubVeh();
      unsubMaint();
    };
  }, [viewMode]); // Removed activeTab

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

  const filteredItems = useMemo(() => {
    return itemRequests.filter(req =>
      req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.division?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [itemRequests, searchQuery]);

  const filteredMaintenance = useMemo(() => {
    return maintenanceRequests.filter(m =>
      m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [maintenanceRequests, searchQuery]);

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
      await acknowledgeVehicleBooking(
        bookingId,
        user.uid,
        user.displayName || user.email || "Asman Umum"
      );
      showToast("Peminjaman kendaraan telah diketahui.", "success");
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
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveItem = async (requestId: string) => {
    if (!user) return;
    setProcessingId(requestId);
    try {
      if (userRole === "staff_umum") {
        await updateItemRequestStatus(requestId, "completed", user.uid, user.displayName || "Staff Umum");
        showToast("Permintaan barang berhasil ditandai selesai.", "success");
      } else {
        await updateItemRequestStatus(requestId, "approved", user.uid, user.displayName || user.email || "Asman Umum");
        showToast("Permintaan barang disetujui, diteruskan ke Staff Umum.", "success");
      }
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectingItem?.id || !rejectReason.trim()) return;

    setProcessingId(rejectingItem.id);
    try {
      await updateItemRequestStatus(
        rejectingItem.id,
        "rejected",
        user.uid,
        user.displayName || user.email || "Asman Umum",
        rejectReason
      );
      showToast("Permintaan barang telah ditolak.", "success");
      setRejectingItem(null);
      setRejectReason("");
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessMaintenance = async (id: string, newStatus: "in_progress" | "completed") => {
    if (!user) return;
    setProcessingId(id);
    try {
      await updateMaintenanceRequestStatus(id, newStatus, {
        staffProcessedBy: user.uid,
        staffProcessedByName: user.displayName || user.email || "Staff Umum",
        staffProcessedDate: new Date().toISOString(),
      });
      showToast(newStatus === "in_progress" ? "Pengerjaan telah dimulai." : "Laporan ditandai selesai.", "success");
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectingMaint?.id || !rejectReason.trim()) return;
    setProcessingId(rejectingMaint.id);
    try {
      await updateMaintenanceRequestStatus(rejectingMaint.id, "rejected", {
        rejectReason,
        staffProcessedBy: user.uid,
        staffProcessedByName: user.displayName || user.email || "Staff Umum",
        staffProcessedDate: new Date().toISOString(),
      });
      showToast("Laporan pemeliharaan telah ditolak.", "success");
      setRejectingMaint(null);
      setRejectReason("");
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
        <p style={{ color: 'var(--text-muted)' }}>Kelola permintaan fasilitas yang memerlukan perhatian Anda.</p>
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

          <button
            onClick={() => { setActiveTab("vehicle"); setViewMode("pending"); }}
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

          <button
            onClick={() => { setActiveTab("item" as any); setViewMode("pending"); }}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9375rem',
              fontWeight: activeTab === ("item" as any) ? 700 : 500,
              color: activeTab === ("item" as any) ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === ("item" as any) ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🛒 Barang ({itemRequests.length})
          </button>

          <button
            onClick={() => { setActiveTab("maintenance"); setViewMode("pending"); }}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9375rem',
              fontWeight: activeTab === "maintenance" ? 700 : 500,
              color: activeTab === "maintenance" ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === "maintenance" ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🔧 Pemeliharaan ({maintenanceRequests.length})
          </button>
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

          <div style={{ display: 'flex', gap: '0.75rem', flex: '1', maxWidth: '550px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1' }}>
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
                    {booking.ticketId && (
                      <div style={{ 
                        fontSize: '0.7rem', 
                        fontFamily: 'monospace', 
                        color: '#475569', 
                        marginBottom: '0.5rem', 
                        fontWeight: 700,
                        background: '#EEF2FF',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px dashed #C7D2FE',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <span>🎫</span> #{booking.ticketId}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {booking.division}
                      {booking.isHybrid && (
                        <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem' }}>🌐 HYBRID</span>
                      )}
                    </div>
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
                    isPastDate(booking.date) ? (
                      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#EF4444', fontStyle: 'italic', fontWeight: 600, marginLeft: 'auto'}}>Jadwal Telah Berlalu (Tidak Dapat Diproses)</span>
                      </div>
                    ) : (
                    <>
                        {(userRole === 'admin' || userRole === 'asman' || userRole === 'staff_umum') && (
                          <button 
                            onClick={() => exportConsumptionToPDF([booking])}
                            title="Cetak PDF Detail Agenda"
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              border: '1px solid #EF4444', 
                              color: '#EF4444', 
                              background: 'white',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginRight: 'auto'
                            }}
                          >
                            📄 PDF
                          </button>
                        )}
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
                    )
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                      {(userRole === 'admin' || userRole === 'asman' || userRole === 'staff_umum') && (
                        <button 
                          onClick={() => exportConsumptionToPDF([booking])}
                          title="Cetak PDF Detail Agenda"
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            border: '1px solid #EF4444', 
                            color: '#EF4444', 
                            background: 'white',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginRight: 'auto'
                          }}
                        >
                          📄 PDF
                        </button>
                      )}
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
      ) : activeTab === ("item" as any) ? (
        /* ================= BARANG ================= */
        filteredItems.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery ? '🔎' : (viewMode === 'pending' ? '📦' : '📂')}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {searchQuery ? 'Hasil tidak ditemukan' : (viewMode === 'pending' ? 'Semua Beres!' : 'Riwayat Kosong')}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : (viewMode === 'pending' ? 'Tidak ada permintaan barang yang perlu diproses.' : 'Belum ada riwayat permintaan barang.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredItems.map(req => {
              const getDomain = (url: string) => {
                try {
                  const domain = new URL(url).hostname.replace('www.', '');
                  return domain.charAt(0).toUpperCase() + domain.slice(1);
                } catch {
                  return "Tautan";
                }
              };

              return (
                <div key={req.id} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: viewMode === 'history' ? '#F8FAFC' : 'rgba(0,162,233,0.02)' }}>
                    <div>
                      {req.ticketId && (
                        <div style={{ 
                          fontSize: '0.7rem', 
                          fontFamily: 'monospace', 
                          color: '#475569', 
                          marginBottom: '0.5rem', 
                          fontWeight: 700,
                          background: '#EEF2FF',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px dashed #C7D2FE',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <span>🎫</span> #{req.ticketId}
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'block' }}>{req.category}</span>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{req.title}</h3>
                    </div>
                  </div>
                  
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'rgba(0,162,233,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-light)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nama Pemohon</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>: &nbsp;{req.userName}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fungsi/Bidang</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>: &nbsp;{req.division}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tanggal Pengajuan</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>: &nbsp;{new Date(req.createdAt?.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                      {req.description}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {req.purchaseLinks && req.purchaseLinks.map((link, i) => (
                          <a 
                            key={i} 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--primary)', 
                              textDecoration: 'none', 
                              background: 'white', 
                              border: '1px solid var(--primary-light)',
                              padding: '0.3rem 0.75rem', 
                              borderRadius: '99px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--primary-light)'}
                            onMouseOut={e => e.currentTarget.style.background = 'white'}
                          >
                            🔗 {getDomain(link)}
                          </a>
                        ))}
                        {(!req.purchaseLinks || req.purchaseLinks.length === 0) && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tidak ada tautan referensi.</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.25rem', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                    {viewMode === "pending" ? (
                      <>
                        {userRole !== "staff_umum" && (
                          <button onClick={() => setRejectingItem(req)} className="btn-secondary" style={{ padding: '0.5rem 1.25rem', border: '1px solid #EF4444', color: '#EF4444' }}>Tolak</button>
                        )}
                        <button
                          onClick={() => handleApproveItem(req.id!)}
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
                          background: req.status === 'completed' ? '#D1FAE5' : (req.status === 'approved' ? '#DCFCE7' : '#FEE2E2'),
                          color: req.status === 'completed' ? '#059669' : (req.status === 'approved' ? '#166534' : '#991B1B')
                        }}>
                          {req.status === 'completed' ? 'Selesai ✓' : (req.status === 'approved' ? 'Disetujui' : 'Ditolak ✗')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "maintenance" ? (
        /* ================= PEMELIHARAAN ================= */
        filteredMaintenance.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery ? '🔎' : (viewMode === 'pending' ? '🔧' : '📂')}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {searchQuery ? 'Hasil tidak ditemukan' : (viewMode === 'pending' ? 'Tidak Ada Laporan Aktif' : 'Riwayat Kosong')}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : (viewMode === 'pending' ? 'Tidak ada laporan pemeliharaan yang perlu ditangani.' : 'Belum ada riwayat laporan pemeliharaan.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {filteredMaintenance.map(m => {
              const PCOLOR: Record<string, string> = { Rendah:'#16a34a', Sedang:'#d97706', Tinggi:'#ea580c', Darurat:'#dc2626' };
              const PBG: Record<string, string>   = { Rendah:'#dcfce7', Sedang:'#fef3c7', Tinggi:'#ffedd5', Darurat:'#fee2e2' };
              const SMAP: Record<string, {l:string;bg:string;c:string}> = {
                pending:     {l:'⌛ Menunggu',          bg:'#FEF3C7', c:'#92400E'},
                in_progress: {l:'🔄 Sedang Dikerjakan', bg:'#DBEAFE', c:'#1E40AF'},
                completed:   {l:'✓ Selesai',            bg:'#D1FAE5', c:'#065F46'},
                rejected:    {l:'✗ Ditolak',            bg:'#FEE2E2', c:'#991B1B'},
              };
              const sc = SMAP[m.status] || SMAP.pending;
              const borderColor = m.status==='completed'?'#10B981':m.status==='in_progress'?'#3B82F6':m.status==='rejected'?'#EF4444':'#F59E0B';
              return (
                <div key={m.id} style={{ background:'white', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', borderLeft:`4px solid ${borderColor}` }}>
                  <div style={{ padding:'1.25rem', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', background: viewMode==='history'?'#F8FAFC':'rgba(0,162,233,0.02)' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      {m.ticketId && <div style={{ fontSize:'0.7rem', fontFamily:'monospace', color:'#475569', marginBottom:'0.4rem', fontWeight:700, background:'#EEF2FF', padding:'0.2rem 0.5rem', borderRadius:'4px', border:'1px dashed #C7D2FE', display:'inline-flex', alignItems:'center', gap:'0.3rem' }}><span>🎫</span> #{m.ticketId}</div>}
                      <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'0.3rem' }}>
                        <span style={{ fontSize:'0.65rem', padding:'0.2rem 0.6rem', borderRadius:'99px', fontWeight:700, textTransform:'uppercase', background:PBG[m.priority]||'#F1F5F9', color:PCOLOR[m.priority]||'#475569', border:`1px solid ${PCOLOR[m.priority]||'#CBD5E1'}` }}>{m.priority}</span>
                        <span style={{ fontSize:'0.65rem', padding:'0.2rem 0.6rem', borderRadius:'99px', fontWeight:700, background:'#F1F5F9', color:'#475569', border:'1px solid #E2E8F0' }}>{m.category}</span>
                      </div>
                      <h3 style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'0.25rem', wordBreak:'break-word' }}>{m.title}</h3>
                      <div style={{ fontSize:'0.8125rem', color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                        <div>📍 <b style={{ color:'var(--foreground)' }}>{m.location}</b></div>
                        <div>👤 {m.userName} &bull; 🏢 {m.division}</div>
                        <div>📅 {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-'}</div>
                      </div>
                    </div>
                    {userRole === 'asman' && (
                      <div style={{ display:'flex', alignItems:'center' }}>
                        <span style={{ padding:'0.35rem 0.8rem', borderRadius:'99px', fontSize:'0.75rem', fontWeight:700, background:sc.bg, color:sc.c }}>ℹ️ {sc.l}</span>
                      </div>
                    )}
                  </div>
                  {m.description && <div style={{ padding:'0.75rem 1.25rem', fontSize:'0.875rem', color:'#475569', borderTop:'1px solid var(--border)', background:'#F8FAFC', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{m.description.length>200?m.description.slice(0,200)+'…':m.description}</div>}
                  <div style={{ padding:'0.875rem 1.25rem', background:'#F8FAFC', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:'0.75rem', alignItems:'center' }}>
                    {userRole === 'staff_umum' && viewMode === 'pending' ? (
                      <>
                        <button onClick={() => setRejectingMaint(m)} style={{ padding:'0.5rem 1rem', border:'1px solid #EF4444', color:'#EF4444', background:'white', borderRadius:'var(--radius-md)', fontSize:'0.8125rem', fontWeight:700, cursor:'pointer' }}>Tolak</button>
                        {m.status === 'pending' && (
                          <button onClick={() => handleProcessMaintenance(m.id!, 'in_progress')} disabled={processingId===m.id} style={{ padding:'0.5rem 1.25rem', border:'none', background:'#3B82F6', color:'white', borderRadius:'var(--radius-md)', fontSize:'0.8125rem', fontWeight:700, cursor:'pointer' }}>{processingId===m.id?'Memproses...':'🔄 Mulai Kerjakan'}</button>
                        )}
                        {m.status === 'in_progress' && (
                          <button onClick={() => handleProcessMaintenance(m.id!, 'completed')} disabled={processingId===m.id} style={{ padding:'0.5rem 1.25rem', border:'none', background:'#059669', color:'white', borderRadius:'var(--radius-md)', fontSize:'0.8125rem', fontWeight:700, cursor:'pointer' }}>{processingId===m.id?'Memproses...':'✓ Tandai Selesai'}</button>
                        )}
                      </>
                    ) : (
                      <span style={{ padding:'0.35rem 0.8rem', borderRadius:'99px', fontSize:'0.75rem', fontWeight:700, background:sc.bg, color:sc.c }}>{sc.l}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= KENDARAAN ================= */
        // ... (existing vehicle logic)
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
                onReject={(b: VehicleBooking) => setRejectingVehicle(b)}
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

      {rejectingItem && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Tolak Permintaan Barang</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Berikan alasan mengapa permintaan barang <b>"{rejectingItem.title}"</b> ditolak.</p>
            <form onSubmit={handleRejectItem}>
              <textarea required autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '100px', fontFamily: 'inherit', marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setRejectingItem(null); setRejectReason(""); }} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={processingId === rejectingItem.id} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{processingId === rejectingItem.id ? 'Memproses...' : 'Ya, Tolak'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectingMaint && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Tolak Laporan Pemeliharaan</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Berikan alasan penolakan untuk laporan <b>"{rejectingMaint.title}"</b>.</p>
            <form onSubmit={handleRejectMaint}>
              <textarea required autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '100px', fontFamily: 'inherit', marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setRejectingMaint(null); setRejectReason(""); }} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={processingId === rejectingMaint.id} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{processingId === rejectingMaint.id ? 'Memproses...' : 'Ya, Tolak'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
