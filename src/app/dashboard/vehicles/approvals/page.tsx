"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  subscribeToPendingVehicles,
  subscribeToVehicleHistory,
  validateVehicleBooking,
  updateVehicleBookingStatus,
  updateVehicleNotes,
  getDrivers,
  getFleetVehicles,
  getDriverRates,
  VehicleBooking,
  Driver,
  FleetVehicle,
  DriverRate
} from "@/lib/firebase/firestore";
import VehicleApprovalCard from "@/components/VehicleApprovalCard";
import styles from "../../dashboard.module.css";

export default function VehicleApprovalsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<"pending" | "history">("pending");
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data for Selection
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);

  // Approval State
  const [approvingBooking, setApprovingBooking] = useState<VehicleBooking | null>(null);
  const [vehicleNotes, setVehicleNotes] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  
  // Trip Details State
  const [rates, setRates] = useState<DriverRate[]>([]);
  const [tripType, setTripType] = useState<"Perjalanan Dalam Kota" | "Perjalanan Luar Kota">("Perjalanan Dalam Kota");
  const [sppd, setSppd] = useState("");
  const [sppdCost, setSppdCost] = useState(0);
  const [lodgingCost, setLodgingCost] = useState(0);
  const [displaySppdCost, setDisplaySppdCost] = useState("0");
  const [persekot, setPersekot] = useState(0);
  const [displayPersekot, setDisplayPersekot] = useState("0");
  const [selectedCity, setSelectedCity] = useState("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Edit State
  const [editingBooking, setEditingBooking] = useState<VehicleBooking | null>(null);
  const [editNotes, setEditNotes] = useState("");

  // Rejection State
  const [rejectingBooking, setRejectingBooking] = useState<VehicleBooking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const loadSelectionData = async () => {
      const [driversData, fleetData, ratesData] = await Promise.all([
        getDrivers(),
        getFleetVehicles(),
        getDriverRates()
      ]);
      setDrivers(driversData);
      setFleet(fleetData);
      setRates(ratesData);
    };
    loadSelectionData();
  }, []);

  const handlePersekotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = rawValue === "" ? 0 : parseInt(rawValue);
    setPersekot(numericValue);
    setDisplayPersekot(numericValue.toLocaleString('id-ID'));
  };

  const filteredRates = useMemo(() => {
    return rates.filter(r => r.tripType === "Perjalanan Luar Kota");
  }, [rates]);

  useEffect(() => {
    setLoading(true);
    let unsubscribe: () => void;

    if (viewMode === "pending") {
      unsubscribe = subscribeToPendingVehicles((data) => {
        setBookings(data);
        setLoading(false);
      });
    } else {
      unsubscribe = subscribeToVehicleHistory((data) => {
        setBookings(data);
        setLoading(false);
      });
    }

    return () => unsubscribe?.();
  }, [viewMode]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b =>
      b.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vehicleNotes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.event?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [bookings, searchQuery]);
  
  useEffect(() => {
    if (tripType === "Perjalanan Dalam Kota") {
      setSppd("");
      setSppdCost(0);
      setLodgingCost(0);
      setDisplaySppdCost("0");
      setAvailableCities([]);
      setSelectedCity("");
    }
  }, [tripType]);

  const handleSelectionChange = (driverId: string, vehicleId: string) => {
    setSelectedDriverId(driverId);
    setSelectedVehicleId(vehicleId);

    const driver = drivers.find(d => d.id === driverId);
    const vehicle = fleet.find(v => v.id === vehicleId);

    if (driver && vehicle) {
      setVehicleNotes(`${vehicle.name} (${vehicle.plateNumber})\nDriver: ${driver.name} (${driver.contact})`);
    } else if (driver) {
      setVehicleNotes(`Driver: ${driver.name} (${driver.contact})`);
    } else if (vehicle) {
      setVehicleNotes(`${vehicle.name} (${vehicle.plateNumber})`);
    }
  };

  const handleSppdChange = (val: string) => {
    setSppd(val);
    if (!val) {
      setSppdCost(0);
      setDisplaySppdCost("0");
      setAvailableCities([]);
      setSelectedCity("");
      return;
    }
    // Find rate
    const selectedRate = rates.find(r => `${r.category} - ${r.description}` === val);
    if (selectedRate) {
      setSppdCost(selectedRate.rate);
      const rateLodging = selectedRate.lodgingRate || (selectedRate as any).lodgingCost || 0;
      setLodgingCost(rateLodging);
      setDisplaySppdCost(selectedRate.rate.toLocaleString('id-ID'));
      const areas = selectedRate.coveredAreas || [];
      setAvailableCities(areas);
      // Auto-select if only one city
      if (areas.length === 1) {
        setSelectedCity(areas[0]);
      } else {
        setSelectedCity("");
      }
    }
  };

  const handleDisplaySppdCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setSppdCost(Number(val) || 0);
    setDisplaySppdCost(val ? Number(val).toLocaleString('id-ID') : "");
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !approvingBooking?.id || !vehicleNotes.trim()) {
      return showToast("Mohon masukkan informasi kendaraan dan driver.", "warning");
    }

    setProcessingId(approvingBooking.id);
    try {
      // Find specialized data
      const driver = drivers.find(d => d.id === selectedDriverId);
      const vehicle = fleet.find(v => v.id === selectedVehicleId);
      
      const assignmentData = driver && vehicle ? {
        driverId: driver.id!,
        driverName: driver.name,
        driverEmail: driver.email || "",
        driverUid: driver.uid || "",
        driverPhone: driver.contact || "",
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.name,
        tripType: tripType,
        sppd: sppd,
        sppdCost: sppdCost,
        lodgingCost: lodgingCost,
        persekot: persekot,
        city: selectedCity
      } : undefined;

      await validateVehicleBooking(
        approvingBooking.id,
        user.uid,
        user.displayName || user.email || "Koordinator Driver",
        vehicleNotes,
        assignmentData
      );

      showToast("Pengajuan berhasil divalidasi dan diteruskan ke Asman Umum.", "success");
      setApprovingBooking(null);
      setVehicleNotes("");
      setSelectedDriverId("");
      setSelectedVehicleId("");
      setSppd("");
      setSppdCost(0);
      setLodgingCost(0);
      setDisplaySppdCost("0");
      setPersekot(0);
      setDisplayPersekot("0");
      setTripType("Perjalanan Dalam Kota");
      setSelectedCity("");
      setAvailableCities([]);
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBooking?.id || !editNotes.trim()) return;

    setProcessingId(editingBooking.id);
    try {
      await updateVehicleNotes(editingBooking.id, editNotes);
      showToast("Informasi armada berhasil diperbarui.", "success");
      setEditingBooking(null);
      setEditNotes("");
    } catch (error: any) {
      showToast("Gagal merubah data: " + error.message, "error");
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
        user.displayName || user.email || "Koordinator Driver",
        rejectReason
      );
      showToast("Pengajuan kendaraan telah ditolak.", "success");
      setRejectingBooking(null);
      setRejectReason("");
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (userRole !== "admin" && userRole !== "koordinator_driver") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Akses Terbatas (Koordinator Driver)</h2>
        <p style={{ color: "var(--text-muted)" }}>Halaman ini hanya dapat diakses oleh Koordinator Driver atau Admin.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Persetujuan Peminjaman Kendaraan</h2>
        <p style={{ color: 'var(--text-muted)' }}>Daftar pengajuan operasional kendaraan yang memerlukan validasi armada & driver.</p>
      </div>

      {/* TABS & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
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
            Antrean / Perlu Diproses
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
            Riwayat
          </button>
        </div>

        <div style={{ position: 'relative', flex: '1', maxWidth: '350px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Cari tujuan, pemohon, atau driver..."
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

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
      ) : filteredBookings.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery ? '🔎' : '✅'}</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{searchQuery ? 'Hasil tidak ditemukan' : 'Semua Beres!'}</h3>
          <p style={{ color: 'var(--text-muted)' }}>{searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Tidak ada pengajuan kendaraan yang perlu diproses.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {filteredBookings.map(booking => (
            <VehicleApprovalCard 
              key={booking.id}
              booking={booking}
              viewMode={viewMode}
              userRole={userRole}
              processingId={processingId}
              onApprove={(id) => setApprovingBooking(booking)}
              onReject={(b) => setRejectingBooking(b)}
              onEdit={(b) => { setEditingBooking(b); setEditNotes(b.vehicleNotes || ""); }}
            />
          ))}
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approvingBooking && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '480px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0F172A' }}>Validasi & Teruskan</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem' }}>Pilih armada dan driver untuk penugasan ini.</p>
            
            <form onSubmit={handleApproveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Pilih Armada</label>
                  <select 
                    value={selectedVehicleId} 
                    onChange={(e) => handleSelectionChange(selectedDriverId, e.target.value)}
                    className={styles.selectField}
                  >
                    <option value="">-- Pilih Armada --</option>
                    {fleet.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Pilih Driver</label>
                  <select 
                    value={selectedDriverId} 
                    onChange={(e) => handleSelectionChange(e.target.value, selectedVehicleId)}
                    className={styles.selectField}
                  >
                    <option value="">-- Pilih Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Informasi Penugasan (Preview)</label>
                <textarea 
                  required 
                  value={vehicleNotes} 
                  onChange={(e) => setVehicleNotes(e.target.value)} 
                  placeholder="Cth: Toyota Avanza (B 1234 ABC), Driver: Pak Budi" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #E2E8F0', minHeight: '80px', fontSize: '0.9rem' }} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Jenis Perjalanan</label>
                <select
                  value={tripType}
                  onChange={e => setTripType(e.target.value as any)}
                  className={styles.selectField}
                >
                  <option value="Perjalanan Dalam Kota">Perjalanan Dalam Kota</option>
                  <option value="Perjalanan Luar Kota">Perjalanan Luar Kota</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} style={{ color: tripType === "Perjalanan Dalam Kota" ? '#94a3b8' : 'inherit' }}>
                    SPPD {tripType === "Perjalanan Dalam Kota" ? "(Hanya Luar Kota)" : ""}
                  </label>
                  <select
                    disabled={tripType === "Perjalanan Dalam Kota"}
                    value={sppd}
                    onChange={e => handleSppdChange(e.target.value)}
                    className={styles.selectField}
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {filteredRates.map(rate => (
                      <option key={rate.id} value={`${rate.category} - ${rate.description}`}>
                        {rate.category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nominal SPPD</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rp</span>
                    <input
                      type="text"
                      readOnly
                      value={displaySppdCost}
                      className={styles.textInput}
                      style={{ paddingLeft: '2.5rem', background: '#F8FAFC', color: 'var(--primary)' }}
                    />
                  </div>
                </div>
              </div>

              {sppd && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Uang Saku (Makan)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>Rp {sppdCost.toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Uang Penginapan</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>Rp {lodgingCost.toLocaleString('id-ID')}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} style={{ color: !sppd ? '#94a3b8' : 'inherit' }}>Kota Penugasan</label>
                  <select
                    disabled={!sppd}
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className={styles.selectField}
                  >
                    <option value="">-- Pilih Kota --</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Uang Persekot (Opsional)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rp</span>
                    <input
                      type="text"
                      value={displayPersekot}
                      onChange={handlePersekotChange}
                      className={styles.textInput}
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setApprovingBooking(null); setVehicleNotes(""); setSelectedDriverId(""); setSelectedVehicleId(""); }} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={!!processingId} style={{ flex: 1.5, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#10B981', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                  {processingId === approvingBooking.id ? 'Memproses...' : '✓ Validasi & Teruskan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingBooking && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Edit Info Armada</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Perbarui informasi kendaraan atau driver (perubahan akan langsung terlihat oleh Asman).</p>
            <form onSubmit={handleEditSubmit}>
              <textarea required autoFocus value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '120px', fontFamily: 'inherit', marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setEditingBooking(null); setEditNotes(""); }} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={!!processingId} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{processingId === editingBooking.id ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingBooking && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Alasan Penolakan</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Berikan alasan penolakan untuk pengajuan ke <b>"{rejectingBooking.destination}"</b>.</p>
            <form onSubmit={handleReject}>
              <textarea required autoFocus value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '100px', fontFamily: 'inherit', marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setRejectingBooking(null); setRejectReason(""); }} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={!!processingId} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Tolak Pengajuan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
