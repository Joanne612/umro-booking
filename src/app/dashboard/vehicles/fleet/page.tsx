"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { 
  subscribeToFleet, 
  addFleetVehicle, 
  updateFleetVehicle, 
  deleteFleetVehicle, 
  FleetVehicle 
} from "@/lib/firebase/firestore";
import styles from "../../dashboard.module.css";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function FleetPage() {
  const { userRole } = useAuth();
  const { showToast } = useToast();
  
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; vehicleId: string | null }>({
    isOpen: false,
    vehicleId: null
  });

  const [formData, setFormData] = useState<Omit<FleetVehicle, "id" | "createdAt">>({
    name: "",
    plateNumber: "",
    fuelType: "Pertalite"
  });

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToFleet((data) => {
      setVehicles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      plateNumber: "",
      fuelType: "Pertalite"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (vehicle: FleetVehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      fuelType: vehicle.fuelType
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      if (editingVehicle?.id) {
        await updateFleetVehicle(editingVehicle.id, formData);
        showToast("Data armada berhasil diperbarui", "success");
      } else {
        await addFleetVehicle(formData);
        showToast("Armada baru berhasil ditambahkan", "success");
      }
      setShowModal(false);
    } catch (error: any) {
      showToast("Gagal menyimpan: " + error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, vehicleId: id });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.vehicleId) return;
    
    setProcessing(true);
    try {
      await deleteFleetVehicle(deleteConfirm.vehicleId);
      showToast("Data armada berhasil dihapus", "success");
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
    } finally {
      setProcessing(false);
      setDeleteConfirm({ isOpen: false, vehicleId: null });
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manajemen Data Armada</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola data kendaraan dinas, plat nomor, dan jenis bahan bakar.</p>
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
          + Tambah Armada
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Memuat data armada...</div>
      ) : vehicles.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Belum Ada Data Armada</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Silakan tambahkan data armada pertama Anda untuk mempermudah monitoring.</p>
          <button onClick={handleOpenAdd} className={styles.btnEdit} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', margin: '0 auto' }}>
            Tambah Sekarang
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {vehicles.map(vehicle => (
            <div key={vehicle.id} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '16px', 
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.1)'
                  }}>🚗</div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>{vehicle.name}</h3>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-muted)',
                      marginTop: '0.2rem',
                      fontWeight: 500
                    }}>
                      Armada Dinas
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleOpenEdit(vehicle)} title="Edit" style={{ background: '#F8FAFC', padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}>✏️</button>
                  <button onClick={() => vehicle.id && handleDelete(vehicle.id)} title="Hapus" style={{ background: '#FFF1F2', padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}>🗑️</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '14px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Plat Nomor</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 800, 
                    color: '#0F172A',
                    background: '#EDF2F7',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    display: 'inline-block',
                    whiteSpace: 'nowrap'
                  }}>{vehicle.plateNumber}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '14px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Bahan Bakar</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>⛽ {vehicle.fuelType}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH/EDIT */}
      {showModal && (
        <div className={styles.modalOverlay} style={{ zIndex: 5000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '480px', background: 'white', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>{editingVehicle ? 'Edit Data Armada' : 'Tambah Armada Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontWeight: 600, color: '#475569', marginBottom: '0.6rem' }}>Nama Kendaraan</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.3rem' }}>🚗</span>
                  <input 
                    required 
                    type="text" 
                    placeholder="Contoh: Toyota Avanza, Mitsubishi Xpander..." 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className={styles.textInput} 
                    style={{ paddingLeft: '3.2rem', height: '56px', borderRadius: '16px', fontSize: '1rem', border: '2px solid #F1F5F9' }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontWeight: 600, color: '#475569', marginBottom: '0.6rem' }}>Plat Nomor</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.3rem' }}>🆔</span>
                  <input 
                    required 
                    type="text" 
                    placeholder="Contoh: B 1234 ABC" 
                    value={formData.plateNumber} 
                    onChange={e => setFormData({...formData, plateNumber: e.target.value})} 
                    className={styles.textInput}
                    style={{ paddingLeft: '3.2rem', height: '56px', borderRadius: '16px', fontSize: '1rem', border: '2px solid #F1F5F9' }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontWeight: 600, color: '#475569', marginBottom: '0.6rem' }}>Jenis Bahan Bakar</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.3rem' }}>⛽</span>
                  <select 
                    required 
                    value={formData.fuelType} 
                    onChange={e => setFormData({...formData, fuelType: e.target.value})} 
                    className={styles.selectField}
                    style={{ paddingLeft: '3.2rem', height: '56px', borderRadius: '16px', fontSize: '1rem', border: '2px solid #F1F5F9', appearance: 'none' }}
                  >
                    <option value="Pertalite">Pertalite</option>
                    <option value="Pertamax">Pertamax</option>
                    <option value="Pertamax Turbo">Pertamax Turbo</option>
                    <option value="Solar / Bio Solar">Solar / Bio Solar</option>
                    <option value="Dexlite">Dexlite</option>
                    <option value="Pertamina Dex">Pertamina Dex</option>
                    <option value="Listrik">Listrik (EV)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  style={{ 
                    flex: 1, 
                    padding: '1rem', 
                    borderRadius: '16px', 
                    fontWeight: 700,
                    background: '#F8FAFC',
                    color: '#64748B',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={processing} 
                  style={{ 
                    flex: 1.5, 
                    padding: '1rem', 
                    borderRadius: '16px', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {processing ? 'Memproses...' : (editingVehicle ? 'Simpan Perubahan' : 'Tambah Armada')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, vehicleId: null })}
        onConfirm={handleExecuteDelete}
        title="Hapus Armada"
        message="Apakah Anda yakin ingin menghapus data armada ini? Tindakan ini akan menghapus data permanen dari sistem."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        type="danger"
        isLoading={processing}
      />
    </div>
  );
}
