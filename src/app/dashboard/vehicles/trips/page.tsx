"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getDriverTrips,
  subscribeToDriverTrips,
  addDriverTrip,
  updateDriverTrip,
  deleteDriverTrip,
  getDrivers,
  getDriverRates,
  getFleetVehicles,
  Driver,
  DriverTrip,
  DriverRate,
  FleetVehicle
} from "@/lib/firebase/firestore";
import styles from "../../dashboard.module.css";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function DriverTripsPage() {
  const { userRole } = useAuth();
  const { showToast } = useToast();

  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [rates, setRates] = useState<DriverRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<DriverTrip | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; tripId: string | null }>({
    isOpen: false,
    tripId: null
  });

  const [formData, setFormData] = useState<Omit<DriverTrip, "id" | "createdAt" | "tripId">>({
    driverId: "",
    driverName: "",
    driverEmail: "",
    driverUid: "",
    plateNumber: "",
    contact: "",
    vehicleType: "",
    sppd: "",
    tripType: "Perjalanan Dalam Kota",
    persekot: 0,
    status: "pending"
  });

  const [displayPersekot, setDisplayPersekot] = useState("0");

  useEffect(() => {
    fetchData();

    // Subscribe to real-time trip updates
    const unsubscribe = subscribeToDriverTrips((data) => {
      setTrips(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    // Statis data tetap di-fetch sekali (bisa diubah ke real-time jika perlu)
    const [driversData, ratesData, fleetData] = await Promise.all([
      getDrivers(),
      getDriverRates(),
      getFleetVehicles()
    ]);
    setDrivers(driversData);
    setFleet(fleetData);
    setRates(ratesData.filter(r => r.tripType === "Perjalanan Luar Kota"));
  };

  const handleDriverChange = (driverId: string) => {
    const selectedDriver = drivers.find(d => d.id === driverId);
    if (selectedDriver) {
      setFormData({
        ...formData,
        driverId: selectedDriver.id || "",
        driverName: selectedDriver.name,
        driverEmail: selectedDriver.email || "",
        driverUid: selectedDriver.uid || "",
        plateNumber: selectedDriver.plateNumber || formData.plateNumber,
        contact: selectedDriver.contact,
        vehicleType: selectedDriver.vehicleType || formData.vehicleType
      });
    } else {
      setFormData({
        ...formData,
        driverId: "",
        driverName: "",
        contact: ""
      });
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    const selectedVehicle = fleet.find(v => v.id === vehicleId);
    if (selectedVehicle) {
      setFormData({
        ...formData,
        vehicleType: selectedVehicle.name,
        plateNumber: selectedVehicle.plateNumber
      });
    }
  };

  const handlePersekotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = rawValue === "" ? 0 : parseInt(rawValue);
    setFormData({ ...formData, persekot: numericValue });
    setDisplayPersekot(numericValue.toLocaleString('id-ID'));
  };

  const handleOpenAdd = () => {
    setEditingTrip(null);
    setFormData({
      driverId: "",
      driverName: "",
      plateNumber: "",
      contact: "",
      vehicleType: "",
      sppd: "",
      tripType: "Perjalanan Dalam Kota",
      persekot: 0,
      status: "pending"
    });
    setDisplayPersekot("0");
    setShowModal(true);
  };

  const handleOpenEdit = (trip: DriverTrip) => {
    setEditingTrip(trip);
    setFormData({
      driverId: trip.driverId,
      driverName: trip.driverName,
      driverEmail: trip.driverEmail || "",
      driverUid: trip.driverUid || "",
      plateNumber: trip.plateNumber,
      contact: trip.contact,
      vehicleType: trip.vehicleType,
      sppd: trip.sppd,
      tripType: trip.tripType,
      persekot: trip.persekot,
      status: trip.status
    });
    setDisplayPersekot(trip.persekot.toLocaleString('id-ID'));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // Validasi Manual
    if (!formData.driverId) {
      showToast("Pilih driver terlebih dahulu", "error");
      return;
    }
    if (!formData.driverName || !formData.plateNumber || !formData.vehicleType) {
      showToast("Data driver tidak lengkap", "error");
      return;
    }
    // SPPD sekarang opsional sesuai permintaan user
    /* 
    if (formData.tripType === "Perjalanan Luar Kota" && !formData.sppd) {
      showToast("SPPD wajib diisi untuk perjalanan luar kota", "error");
      return;
    }
    */

    setProcessing(true);
    try {
      if (editingTrip?.id) {
        await updateDriverTrip(editingTrip.id, formData);
        showToast("Data perjalanan berhasil diperbarui", "success");
      } else {
        await addDriverTrip(formData);
        showToast("Perjalanan baru berhasil dicatat", "success");
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      showToast("Gagal menyimpan: " + error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, tripId: id });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.tripId) return;

    setProcessing(true);
    try {
      await deleteDriverTrip(deleteConfirm.tripId);
      showToast("Data berhasil dihapus", "success");
      fetchData();
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
    } finally {
      setProcessing(false);
      setDeleteConfirm({ isOpen: false, tripId: null });
    }
  };

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const filteredTrips = trips.filter(trip => {
    if (activeTab === "active") return trip.status === "pending" || trip.status === "ongoing";
    return trip.status === "completed";
  });

  const isViewOnly = userRole === "asman";
  const canManage = userRole === "admin" || userRole === "koordinator_driver";

  if (!canManage && !isViewOnly) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-muted)" }}>Halaman ini khusus untuk Koordinator Driver.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div className={styles.dashboardHeader} style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Monitoring Perjalanan</h2>
          <p style={{ color: 'var(--text-muted)' }}>Pantau progres driver dan armada secara real-time.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* TABS KOORDINATOR */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.25rem', borderRadius: '12px' }}>
            <button
              onClick={() => setActiveTab("active")}
              style={{
                padding: '0.6rem 1.25rem',
                border: 'none',
                borderRadius: '10px',
                background: activeTab === "active" ? 'white' : 'transparent',
                boxShadow: activeTab === "active" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === "active" ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              Aktif ({trips.filter(t => t.status !== 'completed').length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: '0.6rem 1.25rem',
                border: 'none',
                borderRadius: '10px',
                background: activeTab === "history" ? 'white' : 'transparent',
                boxShadow: activeTab === "history" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === "history" ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              Riwayat ({trips.filter(t => t.status === 'completed').length})
            </button>
          </div>

          {canManage && (
            <button onClick={handleOpenAdd} className={styles.btnEdit} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem' }}>
              + Catat Perjalanan
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Memuat data...</div>
      ) : filteredTrips.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{activeTab === 'active' ? '🚗' : '📂'}</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{activeTab === 'active' ? 'Tidak Ada Perjalanan Aktif' : 'Riwayat Kosong'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{activeTab === 'active' ? 'Semua tugas driver telah selesai atau belum ada tugas baru.' : 'Belum ada catatan riwayat perjalanan selesai.'}</p>
          {activeTab === 'active' && (
            <button onClick={handleOpenAdd} className={styles.btnEdit} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', margin: '0 auto' }}>
              Catat Sekarang
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredTrips.map(trip => (
            <div key={trip.id} className={styles.card} style={{ borderLeft: trip.tripType === "Perjalanan Luar Kota" ? '4px solid #F59E0B' : '4px solid #3B82F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>ID TRIP: {trip.tripId}</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{trip.driverName}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.15rem' }}>📞 {trip.contact}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '99px',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                    display: 'inline-block',
                    background: trip.status === 'pending' ? '#FEF2F2' : trip.status === 'ongoing' ? '#FFFBEB' : '#F0FDF4',
                    color: trip.status === 'pending' ? '#991B1B' : trip.status === 'ongoing' ? '#92400E' : '#166534',
                    border: `1px solid ${trip.status === 'pending' ? '#FCA5A5' : trip.status === 'ongoing' ? '#FCD34D' : '#86EFAC'}`
                  }}>
                    {trip.status === 'pending' ? 'Pending' : trip.status === 'ongoing' ? 'Ongoing' : 'Selesai'}
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEdit(trip)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="Edit">✏️</button>
                      <button onClick={() => trip.id && handleDelete(trip.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="Hapus">🗑️</button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#F8FAFC', padding: '0.6rem 0.8rem', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Kendaraan</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{trip.vehicleType} ({trip.plateNumber})</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.6rem 0.8rem', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Tipe</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: trip.tripType === "Perjalanan Luar Kota" ? '#F59E0B' : '#3B82F6' }}>{trip.tripType}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem', padding: '0 0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>SPPD:</span>
                  <span style={{ fontWeight: 600 }}>{trip.sppd || "-"}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Persekot:</span>
                  <span style={{ fontWeight: 800, color: '#059669' }}>Rp {trip.persekot.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* REALIZATION DATA FOR KOORDINATOR / ASMAN */}
              {trip.status === 'completed' && (
                <div style={{ margin: '1rem 0', padding: '1rem', background: '#F0F9FF', borderRadius: '12px', border: '1px solid #E0F2FE' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px solid #BAE6FD', paddingBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, color: '#0369A1' }}>📊 LAPORAN REALISASI</span>
                    <span style={{ fontWeight: 700, color: '#0369A1' }}>{trip.endKm ? (trip.endKm - (trip.startKm || 0)) : 0} KM</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: '#0369A1', fontSize: '0.65rem', display: 'block' }}>KM AWAL/AKHIR</span>
                      <span style={{ fontWeight: 600 }}>{trip.startKm || 0} / {trip.endKm || 0}</span>
                    </div>
                    <div>
                      <span style={{ color: '#0369A1', fontSize: '0.65rem', display: 'block' }}>TOTAL TOL</span>
                      <span style={{ fontWeight: 600 }}>Rp {trip.tolls?.reduce((a, b) => a + b, 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ gridColumn: 'span 2', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed #BAE6FD', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: '#0369A1' }}>BIAYA REALISASI:</span>
                      <span style={{ fontWeight: 800, color: '#0284C7' }}>Rp {trip.totalRealization?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* FOTO BUKTI REAL-TIME */}
                  {(trip.startKmPhotoUrl || trip.endKmPhotoUrl || (trip.tollPhotoUrls && trip.tollPhotoUrls.length > 0)) && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #BAE6FD' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: '0.5rem' }}>📸 Foto Bukti Driver</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {trip.startKmPhotoUrl && (
                          <a href={trip.startKmPhotoUrl} target="_blank" rel="noopener noreferrer">
                            <div style={{ position: 'relative' }}>
                              <img src={trip.startKmPhotoUrl} alt="Odometer Awal" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #BAE6FD', display: 'block' }} />
                              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(3,105,161,0.75)', color: 'white', fontSize: '0.45rem', fontWeight: 700, textAlign: 'center', borderRadius: '0 0 6px 6px', padding: '1px' }}>KM AWAL</span>
                            </div>
                          </a>
                        )}
                        {trip.endKmPhotoUrl && (
                          <a href={trip.endKmPhotoUrl} target="_blank" rel="noopener noreferrer">
                            <div style={{ position: 'relative' }}>
                              <img src={trip.endKmPhotoUrl} alt="Odometer Akhir" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #BAE6FD', display: 'block' }} />
                              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(3,105,161,0.75)', color: 'white', fontSize: '0.45rem', fontWeight: 700, textAlign: 'center', borderRadius: '0 0 6px 6px', padding: '1px' }}>KM AKHIR</span>
                            </div>
                          </a>
                        )}
                        {trip.tollPhotoUrls?.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <div style={{ position: 'relative' }}>
                              <img src={url} alt={`Struk Tol ${i + 1}`} style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #BAE6FD', display: 'block' }} />
                              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(3,105,161,0.75)', color: 'white', fontSize: '0.45rem', fontWeight: 700, textAlign: 'center', borderRadius: '0 0 6px 6px', padding: '1px' }}>TOL {i + 1}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.6rem', color: '#93C5FD', marginTop: '0.25rem' }}>Klik thumbnail untuk lihat foto penuh</p>
                    </div>
                  )}

                  {/* Jika tidak ada foto sama sekali */}
                  {!trip.startKmPhotoUrl && !trip.endKmPhotoUrl && (!trip.tollPhotoUrls || trip.tollPhotoUrls.length === 0) && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #BAE6FD', fontSize: '0.7rem', color: '#93C5FD', fontStyle: 'italic' }}>
                      Tidak ada foto bukti dilampirkan
                    </div>
                  )}
                </div>
              )}

              {/* Status ongoing: tampilkan foto KM Awal jika sudah ada */}
              {trip.status === 'ongoing' && trip.startKmPhotoUrl && (
                <div style={{ margin: '0.5rem 0 1rem', padding: '0.75rem', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FCD34D' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: '0.4rem' }}>📸 Foto Odometer Awal</div>
                  <a href={trip.startKmPhotoUrl} target="_blank" rel="noopener noreferrer">
                    <img src={trip.startKmPhotoUrl} alt="Odometer Awal" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #FCD34D' }} />
                  </a>
                  <p style={{ fontSize: '0.6rem', color: '#B45309', marginTop: '0.2rem' }}>Klik untuk lihat penuh</p>
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                🗓️ {trip.createdAt ? new Date(trip.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TRIP */}
      {showModal && (
        <div className={styles.modalOverlay} style={{ zIndex: 5000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '520px', background: 'white', borderRadius: 'var(--radius-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Catat Perjalanan</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Pilih Driver</label>
                <select
                  value={formData.driverId}
                  onChange={e => handleDriverChange(e.target.value)}
                  className={styles.selectField}
                >
                  <option value="">-- Pilih Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nama Driver</label>
                  <input type="text" value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} className={styles.textInput} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kontak</label>
                  <input type="text" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} className={styles.textInput} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Pilih Kendaraan</label>
                <select
                  onChange={e => handleVehicleChange(e.target.value)}
                  className={styles.selectField}
                >
                  <option value="">-- Pilih Armada --</option>
                  {fleet.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Jenis Kendaraan</label>
                  <input type="text" value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })} className={styles.textInput} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Plat Kendaraan</label>
                  <input type="text" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} className={styles.textInput} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Jenis Perjalanan</label>
                <select
                  value={formData.tripType}
                  onChange={e => setFormData({ ...formData, tripType: e.target.value as any })}
                  className={styles.selectField}
                >
                  <option value="Perjalanan Dalam Kota">Perjalanan Dalam Kota</option>
                  <option value="Perjalanan Luar Kota">Perjalanan Luar Kota</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} style={{ color: formData.tripType === "Perjalanan Dalam Kota" ? '#94a3b8' : 'inherit' }}>
                    SPPD {formData.tripType === "Perjalanan Dalam Kota" ? "(Hanya Luar Kota)" : "(Opsional)"}
                  </label>
                  <select
                    disabled={formData.tripType === "Perjalanan Dalam Kota"}
                    value={formData.sppd}
                    onChange={e => setFormData({ ...formData, sppd: e.target.value })}
                    className={styles.selectField}
                  >
                    <option value="">-- Pilih Kategori SPPD --</option>
                    {rates.map(rate => (
                      <option key={rate.id} value={`${rate.category} - ${rate.description}`}>
                        {rate.category} ({rate.description})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Persekot</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)' }}>Rp</span>
                    <input
                      type="text"
                      value={displayPersekot}
                      onChange={handlePersekotChange}
                      className={styles.textInput}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-md)', fontWeight: 600, background: '#F1F5F9', border: 'none', cursor: 'pointer' }}>Batal</button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleSubmit}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {processing ? 'Menyimpan...' : 'Simpan Perjalanan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, tripId: null })}
        onConfirm={handleExecuteDelete}
        title="Hapus Perjalanan"
        message="Apakah Anda yakin ingin menghapus catatan perjalanan ini? Data yang dihapus tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        type="danger"
        isLoading={processing}
      />
    </div>
  );
}