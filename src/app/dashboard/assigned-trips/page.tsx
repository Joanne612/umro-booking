"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getDriverByEmail,
  subscribeToAssignedTrips,
  updateDriverTrip,
  DriverTrip
} from "@/lib/firebase/firestore";
import styles from "../dashboard.module.css";
import { uploadToCloudinary, validateImageFile } from "../../../lib/cloudinary";

export default function AssignedTripsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [kmModal, setKmModal] = useState<{ isOpen: boolean, trip: DriverTrip | null, type: 'start' | 'end' } | null>(null);

  // States for realization form
  const [kmValue, setKmValue] = useState("");
  const [tolls, setTolls] = useState<string[]>([""]);
  const [fuelCost, setFuelCost] = useState("");
  const [parkingCost, setParkingCost] = useState("");
  const [otherCost, setOtherCost] = useState("");

  const [processingStatus, setProcessingStatus] = useState(false);

  // States untuk foto bukti
  const [startKmPhoto, setStartKmPhoto] = useState<File | null>(null);
  const [startKmPhotoPreview, setStartKmPhotoPreview] = useState<string>("");
  const [endKmPhoto, setEndKmPhoto] = useState<File | null>(null);
  const [endKmPhotoPreview, setEndKmPhotoPreview] = useState<string>("");
  const [tollPhotos, setTollPhotos] = useState<File[]>([]);
  const [tollPhotoPreviews, setTollPhotoPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const startKmPhotoRef = useRef<HTMLInputElement>(null);
  const endKmPhotoRef = useRef<HTMLInputElement>(null);
  const tollPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToAssignedTrips(user.uid, user.email, (data) => {
      setTrips(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenKmModal = (trip: DriverTrip, type: 'start' | 'end') => {
    setKmModal({ isOpen: true, trip, type });
    // Reset foto states
    setStartKmPhoto(null); setStartKmPhotoPreview("");
    setEndKmPhoto(null); setEndKmPhotoPreview("");
    setTollPhotos([]); setTollPhotoPreviews([]);
    setUploadProgress(0);

    if (type === 'start') {
      setKmValue(String(trip.startKm || ""));
      setTolls([""]);
      setFuelCost("");
      setParkingCost("");
      setOtherCost("");
    } else {
      setKmValue(String(trip.endKm || ""));
      setTolls(trip.tolls && trip.tolls.length > 0 ? trip.tolls.map(String) : [""]);
      setFuelCost(trip.fuelCost ? String(trip.fuelCost) : "");
      setParkingCost(trip.parkingCost ? String(trip.parkingCost) : "");
      setOtherCost(trip.otherCost ? String(trip.otherCost) : "");
    }
  };

  // Handler pilih foto KM Awal
  const handleStartKmPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { showToast(err, "error"); return; }
    setStartKmPhoto(file);
    setStartKmPhotoPreview(URL.createObjectURL(file));
  };

  // Handler pilih foto KM Akhir
  const handleEndKmPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { showToast(err, "error"); return; }
    setEndKmPhoto(file);
    setEndKmPhotoPreview(URL.createObjectURL(file));
  };

  // Handler pilih foto Struk Tol (bisa multiple)
  const handleTollPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      const err = validateImageFile(file);
      if (err) { showToast(err, "error"); return; }
    }
    const combined = [...tollPhotos, ...files];
    setTollPhotos(combined);
    setTollPhotoPreviews(combined.map(f => URL.createObjectURL(f)));
  };

  const handleRemoveTollPhoto = (idx: number) => {
    const newFiles = tollPhotos.filter((_, i) => i !== idx);
    const newPreviews = tollPhotoPreviews.filter((_, i) => i !== idx);
    setTollPhotos(newFiles);
    setTollPhotoPreviews(newPreviews);
  };

  const handleAddToll = () => setTolls([...tolls, ""]);
  const handleTollChange = (index: number, val: string) => {
    const newTolls = [...tolls];
    newTolls[index] = val.replace(/[^0-9]/g, "");
    setTolls(newTolls);
  };
  const handleRemoveToll = (index: number) => {
    if (tolls.length > 1) {
      setTolls(tolls.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const numericKmVal = Number(kmValue) || 0;
  const totalKm = kmModal?.trip?.startKm ? (numericKmVal - kmModal.trip.startKm) : 0;
  const totalToll = tolls.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const totalRealization = totalToll +
    (Number(fuelCost) || 0) +
    (Number(parkingCost) || 0) +
    (Number(otherCost) || 0) +
    (kmModal?.trip?.sppdCost || 0);

  const handleConfirmKm = async (isDraft: boolean = false) => {
    if (!kmModal || !kmModal.trip?.id) return;

    // KM Awal validation
    if (kmModal.type === 'start' && (!kmValue || isNaN(Number(kmValue)))) {
      showToast("Mohon masukkan angka KM Awal yang valid", "warning");
      return;
    }

    // KM Akhir validation (only if submitting)
    if (!isDraft && kmModal.type === 'end') {
      if (!kmValue || isNaN(Number(kmValue))) {
        showToast("Mohon masukkan angka KM Akhir yang valid", "warning");
        return;
      }
      if (Number(kmValue) < (kmModal.trip.startKm || 0)) {
        showToast("KM Akhir tidak boleh lebih kecil dari KM Awal (" + kmModal.trip.startKm + ")", "error");
        return;
      }
    }

    setProcessingStatus(true);
    setIsUploading(false);
    try {
      const updates: any = {};

      if (kmModal.type === 'start') {
        updates.status = 'ongoing';
        updates.startKm = Number(kmValue);

        // Upload foto odometer awal jika ada
        if (startKmPhoto) {
          setIsUploading(true);
          setUploadProgress(0);
          const result = await uploadToCloudinary(startKmPhoto, "umro-booking/odometer", (p: number) => setUploadProgress(p));
          updates.startKmPhotoUrl = result.url;
          setIsUploading(false);
        }
      } else {
        updates.status = isDraft ? 'ongoing' : 'completed';
        updates.endKm = kmValue ? Number(kmValue) : (kmModal.trip.endKm || 0);
        updates.tolls = tolls.map(t => Number(t) || 0).filter(t => t > 0);
        updates.fuelCost = Number(fuelCost) || 0;
        updates.parkingCost = Number(parkingCost) || 0;
        updates.otherCost = Number(otherCost) || 0;
        updates.sppdCost = kmModal.trip.sppdCost || 0;
        updates.totalRealization = totalRealization;

        // Upload foto odometer akhir
        if (endKmPhoto) {
          setIsUploading(true);
          setUploadProgress(0);
          const result = await uploadToCloudinary(endKmPhoto, "umro-booking/odometer", (p: number) => setUploadProgress(p));
          updates.endKmPhotoUrl = result.url;
          setIsUploading(false);
        }

        // Upload foto struk tol (bisa multiple)
        if (tollPhotos.length > 0) {
          setIsUploading(true);
          const uploadedUrls: string[] = [];
          for (let i = 0; i < tollPhotos.length; i++) {
            setUploadProgress(0);
            const result = await uploadToCloudinary(tollPhotos[i], "umro-booking/toll-receipts", (p: number) =>
              setUploadProgress(Math.round(((i / tollPhotos.length) + p / 100 / tollPhotos.length) * 100))
            );
            uploadedUrls.push(result.url);
          }
          updates.tollPhotoUrls = uploadedUrls;
          setIsUploading(false);
        }
      }

      await updateDriverTrip(kmModal.trip.id, updates);

      const successMsg = kmModal.type === 'start'
        ? "Perjalanan dimulai!"
        : (isDraft ? "Draft laporan disimpan!" : "Tugas berhasil diselesaikan!");

      showToast(successMsg, "success");
      setKmModal(null);
    } catch (error: any) {
      showToast("Gagal memproses: " + error.message, "error");
    } finally {
      setProcessingStatus(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredTrips = trips.filter(trip => {
    if (activeTab === "active") return trip.status === "pending" || trip.status === "ongoing";
    return trip.status === "completed";
  });

  if (loading) return <div style={{ padding: '2rem' }}>Memuat data penugasan...</div>;

  return (
    <div style={{ paddingBottom: '3rem', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Penugasan Saya</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola tugas operasional armada anda.</p>
        </div>

        <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.25rem', borderRadius: '12px' }}>
          <button
            onClick={() => setActiveTab("active")}
            style={{
              padding: '0.5rem 1rem',
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
            Tugas Aktif ({trips.filter(t => t.status !== 'completed').length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: '0.5rem 1rem',
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
            Riwayat Selesai ({trips.filter(t => t.status === 'completed').length})
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {filteredTrips.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 2rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{activeTab === 'active' ? '🎉' : '📂'}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {activeTab === 'active' ? 'Semua Tugas Selesai' : 'Belum Ada Riwayat'}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'active' ? 'Belum ada penugasan baru untuk Anda saat ini.' : 'Daftar tugas yang telah Anda selesaikan akan muncul di sini.'}
            </p>
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div key={trip.id} className={styles.card} style={{
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                background: trip.status === 'pending' ? '#FEF2F2' : trip.status === 'ongoing' ? '#FFFBEB' : '#F0FDF4',
                margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>{trip.status === 'pending' ? '🔔' : trip.status === 'ongoing' ? '🚗' : '✅'}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: trip.status === 'pending' ? '#991B1B' : trip.status === 'ongoing' ? '#92400E' : '#166534'
                  }}>
                    {trip.status === 'pending' ? 'Menunggu' : trip.status === 'ongoing' ? 'Ongoing' : 'Selesai'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{trip.tripId}</span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.25rem' }}>📍 Detail Tujuan & Penjemputan</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>{trip.destination || "-"}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ opacity: 0.7 }}>🕒 Jam:</span>
                  <span style={{ fontWeight: 700 }}>{trip.pickupTime || "--:--"} WIB</span>
                  <span style={{ opacity: 0.7 }}>🏠 Lokasi:</span>
                  <span style={{ fontWeight: 600 }}>{trip.pickupLocation || "-"}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>👤 Pemohon / PIC</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{trip.userName || "-"}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.1rem' }}>{trip.userPhone ? `📞 ${trip.userPhone}` : "📞 -"}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', background: '#F0F9FF', borderRadius: '12px', border: '1px solid #E0F2FE' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Penumpang</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{trip.passengers || 0} Orang</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#F0F9FF', borderRadius: '12px', border: '1px solid #E0F2FE' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Tipe Perjalanan</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{trip.tripOption || "-"}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Kegiatan / Acara</div>
                <div style={{ padding: '0.75rem', background: '#F1F5F9', borderRadius: '10px', fontSize: '0.85rem', fontStyle: 'italic', color: '#475569' }}>
                  "{trip.event || "Tidak ada keterangan"}"
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', borderTop: '1px dashed #E2E8F0', paddingTop: '1.25rem' }}>
                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>KM Perjalanan</div>
                  <div style={{ fontSize: '0.75rem' }}>Mulai: <span style={{ fontWeight: 700 }}>{trip.startKm || "-"}</span></div>
                  <div style={{ fontSize: '0.75rem' }}>Akhir: <span style={{ fontWeight: 700 }}>{trip.endKm || "-"}</span></div>
                  {trip.endKm && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.1rem', color: 'var(--primary)', fontWeight: 800 }}>Total: {trip.endKm - (trip.startKm || 0)} KM</div>
                  )}
                </div>
                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Kendaraan</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{trip.vehicleType}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{trip.plateNumber}</div>
                </div>
              </div>

              {trip.status === 'completed' && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F0FDF4', borderRadius: '16px', border: '1px solid #DCFCE7' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid #BBF7D0', paddingBottom: '0.25rem' }}>💰 Realisasi Biaya</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#166534' }}>Total Tol:</span>
                      <span style={{ fontWeight: 600 }}>Rp {trip.tolls?.reduce((a, b) => a + b, 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#166534' }}>BBM:</span>
                      <span style={{ fontWeight: 600 }}>Rp {trip.fuelCost?.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#166534' }}>Persekot Driver:</span>
                      <span style={{ fontWeight: 600 }}>Rp {trip.persekot.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed #BBF7D0', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 800, color: '#166534' }}>Total Realisasi:</span>
                      <span style={{ fontWeight: 800, color: '#059669' }}>Rp {trip.totalRealization?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Foto Bukti */}
                  {(trip.startKmPhotoUrl || trip.endKmPhotoUrl || (trip.tollPhotoUrls && trip.tollPhotoUrls.length > 0)) && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #BBF7D0' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.5rem' }}>📸 Foto Bukti</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {trip.startKmPhotoUrl && (
                          <a href={trip.startKmPhotoUrl} target="_blank" rel="noopener noreferrer" title="Odometer Awal">
                            <img src={trip.startKmPhotoUrl} alt="Odometer Awal" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #BBF7D0' }} />
                          </a>
                        )}
                        {trip.endKmPhotoUrl && (
                          <a href={trip.endKmPhotoUrl} target="_blank" rel="noopener noreferrer" title="Odometer Akhir">
                            <img src={trip.endKmPhotoUrl} alt="Odometer Akhir" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #BBF7D0' }} />
                          </a>
                        )}
                        {trip.tollPhotoUrls?.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" title={`Struk Tol ${i + 1}`}>
                            <img src={url} alt={`Struk Tol ${i + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #BBF7D0' }} />
                          </a>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#86EFAC', marginTop: '0.3rem' }}>Klik foto untuk lihat ukuran penuh</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                {trip.status === 'pending' && (
                  <button
                    onClick={() => handleOpenKmModal(trip, 'start')}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '16px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(0, 162, 233, 0.3)'
                    }}
                  >
                    <span>▶️</span> Mulai Perjalanan
                  </button>
                )}
                {trip.status === 'ongoing' && (
                  <button
                    onClick={() => handleOpenKmModal(trip, 'end')}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '16px',
                      background: '#10B981',
                      color: 'white',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <span>🏁</span> Selesaikan Tugas
                  </button>
                )}
                {trip.status === 'completed' && (
                  <div style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '16px',
                    background: '#F1F5F9',
                    color: '#64748B',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>🌟</span> Selesai pada {trip.createdAt ? new Date(trip.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {kmModal?.isOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
          <div className={styles.modalContent} style={{ maxWidth: kmModal.type === 'end' ? '500px' : '400px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>{kmModal.type === 'start' ? '🚗' : '🏁'}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>
              {kmModal.type === 'start' ? 'Catat KM Awal' : 'Realisasi Perjalanan'}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem', textAlign: 'center' }}>
              {kmModal.type === 'start' ? 'Mohon masukkan KM speedometer saat mulai.' : 'Mohon lengkapi perincian biaya perjalanan anda.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  KM {kmModal.type === 'start' ? 'Awal' : 'Akhir'} Perjalanan
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={kmValue}
                  onChange={(e) => setKmValue(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.25rem', fontWeight: 800, borderRadius: '12px', border: '2px solid var(--primary)', textAlign: 'center' }}
                />
                {kmModal.type === 'end' && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>KM Awal: <b>{kmModal.trip?.startKm}</b></span>
                    <span>Total: <b style={{ color: 'var(--primary)' }}>{totalKm} KM</b></span>
                  </div>
                )}
              </div>

              {/* FOTO ODOMETER */}
              <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                  📸 Foto Odometer {kmModal.type === 'start' ? 'Awal' : 'Akhir'} <span style={{ fontWeight: 400, textTransform: 'none', color: '#94A3B8' }}>(opsional)</span>
                </label>

                {/* Input tersembunyi */}
                <input
                  ref={kmModal.type === 'start' ? startKmPhotoRef : endKmPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={kmModal.type === 'start' ? handleStartKmPhoto : handleEndKmPhoto}
                />

                {(kmModal.type === 'start' ? startKmPhotoPreview : endKmPhotoPreview) ? (
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <img
                      src={kmModal.type === 'start' ? startKmPhotoPreview : endKmPhotoPreview}
                      alt="Preview odometer"
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--primary)' }}
                    />
                    <button
                      onClick={() => {
                        if (kmModal.type === 'start') { setStartKmPhoto(null); setStartKmPhotoPreview(""); }
                        else { setEndKmPhoto(null); setEndKmPhotoPreview(""); }
                      }}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => (kmModal.type === 'start' ? startKmPhotoRef : endKmPhotoRef).current?.click()}
                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px dashed #CBD5E1', background: 'white', cursor: 'pointer', color: '#64748B', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📷</span> Ambil / Pilih Foto Odometer
                  </button>
                )}
              </div>

              {kmModal.type === 'end' && (
                <>
                  <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biaya Tol</label>
                      <button onClick={handleAddToll} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}>+ Tambah Tol</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tolls.map((toll, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rp</span>
                            <input
                              type="text"
                              value={toll ? Number(toll).toLocaleString('id-ID') : ""}
                              onChange={(e) => handleTollChange(idx, e.target.value)}
                              placeholder="0"
                              style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                            />
                          </div>
                          {tolls.length > 1 && (
                            <button onClick={() => handleRemoveToll(idx)} style={{ background: '#FEE2E2', border: 'none', color: '#EF4444', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                      Total Tol: Rp {totalToll.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Biaya BBM (Opsional)</label>
                      <input type="number" value={fuelCost} onChange={e => setFuelCost(e.target.value)} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Biaya Parkir (Opsional)</label>
                      <input type="number" value={parkingCost} onChange={e => setParkingCost(e.target.value)} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Biaya SPPD (Dari Koordinator)</label>
                      <div style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{kmModal.trip?.sppd || "-"}</span>
                        <span style={{ color: 'var(--primary)' }}>Rp {kmModal.trip?.sppdCost?.toLocaleString('id-ID') || "0"}</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Biaya Lainnya (Opsional)</label>
                      <input type="number" value={otherCost} onChange={e => setOtherCost(e.target.value)} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }} />
                    </div>
                  </div>

                  {/* FOTO STRUK TOL */}
                  <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        🧾 Foto Struk Tol <span style={{ fontWeight: 400, textTransform: 'none', color: '#94A3B8' }}>(opsional)</span>
                      </label>
                      <button
                        onClick={() => tollPhotoRef.current?.click()}
                        style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}
                      >+ Tambah Foto</button>
                    </div>
                    <input
                      ref={tollPhotoRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleTollPhotos}
                    />
                    {tollPhotoPreviews.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {tollPhotoPreviews.map((src, idx) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <img
                              src={src}
                              alt={`Struk tol ${idx + 1}`}
                              style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                            />
                            <button
                              onClick={() => handleRemoveTollPhoto(idx)}
                              style={{ position: 'absolute', top: '3px', right: '3px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}
                            >✕</button>
                          </div>
                        ))}
                        <button
                          onClick={() => tollPhotoRef.current?.click()}
                          style={{ height: '80px', borderRadius: '8px', border: '2px dashed #CBD5E1', background: 'white', cursor: 'pointer', color: '#94A3B8', fontSize: '1.5rem' }}
                        >+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => tollPhotoRef.current?.click()}
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px dashed #CBD5E1', background: 'white', cursor: 'pointer', color: '#64748B', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>🧾</span> Ambil / Pilih Foto Struk Tol
                      </button>
                    )}
                  </div>

                  <div style={{ background: 'var(--primary)', padding: '1.25rem', borderRadius: '20px', color: 'white', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>Total Biaya Realisasi</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Rp {totalRealization.toLocaleString('id-ID')}</div>
                  </div>
                </>
              )}
            </div>

            {/* PROGRESS BAR UPLOAD */}
            {isUploading && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#0369A1' }}>
                  <span>⬆️ Mengupload foto...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#E0F2FE', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', borderRadius: '99px', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setKmModal(null)}
                  style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                {kmModal.type === 'end' && (
                  <button
                    onClick={() => handleConfirmKm(true)}
                    disabled={processingStatus}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '16px',
                      border: '1px solid var(--primary)',
                      background: '#F0F9FF',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      cursor: processingStatus ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {processingStatus ? '...' : 'Simpan Draft'}
                  </button>
                )}
              </div>

              <button
                onClick={() => handleConfirmKm(false)}
                disabled={processingStatus || (kmModal.type === 'start' && !kmValue)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: kmModal.type === 'start' ? 'var(--primary)' : '#10B981',
                  color: 'white',
                  fontWeight: 800,
                  cursor: (processingStatus || (kmModal.type === 'start' && !kmValue)) ? 'not-allowed' : 'pointer',
                  opacity: (processingStatus || (kmModal.type === 'start' && !kmValue)) ? 0.6 : 1,
                  boxShadow: kmModal.type === 'start' ? '0 4px 12px rgba(0, 162, 233, 0.2)' : '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
              >
                {processingStatus ? 'Memproses...' : (kmModal.type === 'start' ? 'Kirim' : 'Selesaikan Tugas')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}