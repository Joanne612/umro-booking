"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  subscribeToDrivers,
  addDriver,
  updateDriver,
  deleteDriver,
  Driver
} from "@/lib/firebase/firestore";
import styles from "../../dashboard.module.css";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function DriversPage() {
  const { userRole } = useAuth();
  const { showToast } = useToast();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; driverId: string | null }>({
    isOpen: false,
    driverId: null
  });

  const [formData, setFormData] = useState<Omit<Driver, "id" | "createdAt">>({
    name: "",
    contact: "",
    email: ""
  });

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToDrivers((data) => {
      setDrivers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: "",
      contact: "",
      email: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      contact: driver.contact,
      email: driver.email || "",
      // Tetap simpan data lama jika ada, meskipun tidak muncul di form
      plateNumber: driver.plateNumber || "",
      vehicleType: driver.vehicleType || "",
      status: driver.status || "bertugas"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      if (editingDriver?.id) {
        await updateDriver(editingDriver.id, formData);
        showToast("Data driver berhasil diperbarui", "success");
      } else {
        await addDriver(formData);
        showToast("Driver baru berhasil ditambahkan", "success");
      }
      setShowModal(false);
    } catch (error: any) {
      showToast("Gagal menyimpan: " + error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, driverId: id });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.driverId) return;
    
    setProcessing(true);
    try {
      await deleteDriver(deleteConfirm.driverId);
      showToast("Data driver berhasil dihapus", "success");
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
    } finally {
      setProcessing(false);
      setDeleteConfirm({ isOpen: false, driverId: null });
    }
  };

  if (userRole !== "admin" && userRole !== "koordinator_driver") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-muted)" }}>Halaman ini hanya dapat diakses oleh Koordinator Driver atau Admin.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className={styles.dashboardHeader} style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manajemen Data Driver</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola data personel driver, kontak, dan armada yang digunakan.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Tambah Driver
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Memuat data driver...</div>
      ) : drivers.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Belum Ada Data</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Silakan tambahkan data driver pertama Anda.</p>
          <button onClick={handleOpenAdd} className={styles.btnEdit} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', margin: '0 auto' }}>
            Tambah Sekarang
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {drivers.map(driver => (
            <div key={driver.id} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}>👤</div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{driver.name}</h3>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.2rem'
                    }}>
                      Driver
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleOpenEdit(driver)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✏️</button>
                  <button onClick={() => driver.id && handleDelete(driver.id)} title="Hapus" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
                </div>
              </div>

              {(driver.plateNumber || driver.vehicleType) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  {driver.plateNumber && (
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Plat Nomor</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{driver.plateNumber}</div>
                    </div>
                  )}
                  {driver.vehicleType && (
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Jenis Armada</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{driver.vehicleType}</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: (driver.plateNumber || driver.vehicleType) ? '0.5rem' : 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F0F9FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem'
                  }}>📞</div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>KONTAK / WA</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{driver.contact}</div>
                  </div>
                </div>

                {driver.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#F0FDF4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem'
                    }}>📧</div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>EMAIL AKUN</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{driver.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH/EDIT */}
      {showModal && (
        <div className={styles.modalOverlay} style={{ zIndex: 5000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '480px', background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{editingDriver ? 'Edit Data Driver' : 'Tambah Driver Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>Nama Lengkap Driver</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.7 }}>👤</span>
                  <input
                    required
                    type="text"
                    placeholder="Nama lengkap driver..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={styles.textInput}
                    style={{ paddingLeft: '2.8rem', height: '52px', borderRadius: '12px' }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>Kontak / WhatsApp</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.7 }}>📞</span>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    className={styles.textInput}
                    style={{ paddingLeft: '2.8rem', height: '52px', borderRadius: '12px' }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>Email Akun Driver (Untuk Login)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.7 }}>📧</span>
                  <input
                    required
                    type="email"
                    placeholder="nama@gmail.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    className={styles.textInput}
                    style={{ paddingLeft: '2.8rem', height: '52px', borderRadius: '12px' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Akun dengan email ini akan otomatis mendapatkan akses khusus Driver saat berhasil login.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    background: '#FFEEF3',
                    color: '#FF4757',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
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
                  {processing ? 'Memproses...' : (editingDriver ? 'Simpan' : 'Tambah')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, driverId: null })}
        onConfirm={handleExecuteDelete}
        title="Hapus Data Driver"
        message="Apakah Anda yakin ingin menghapus data driver ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        type="danger"
        isLoading={processing}
      />
    </div>
  );
}
