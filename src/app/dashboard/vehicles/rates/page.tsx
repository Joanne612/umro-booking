"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { 
  getDriverRates, 
  addDriverRate, 
  updateDriverRate, 
  deleteDriverRate, 
  DriverRate 
} from "@/lib/firebase/firestore";
import styles from "../../dashboard.module.css";

export default function DriverRatesPage() {
  const { userRole } = useAuth();
  const { showToast } = useToast();
  
  const [rates, setRates] = useState<DriverRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<DriverRate | null>(null);
  const [processing, setProcessing] = useState(false);

  const [formData, setFormData] = useState<Omit<DriverRate, "id" | "createdAt" | "rateId">>({
    category: "",
    description: "",
    tripType: "Perjalanan Dalam Kota",
    coveredAreas: [],
    additionalDays: "",
    rate: 0,
    lodgingRate: 0
  });

  const [areaInput, setAreaInput] = useState("");
  const [displayRate, setDisplayRate] = useState("");
  const [displayLodgingRate, setDisplayLodgingRate] = useState("");

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    const data = await getDriverRates();
    setRates(data);
    setLoading(false);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = rawValue === "" ? 0 : parseInt(rawValue);
    
    setFormData({ ...formData, rate: numericValue });
    setDisplayRate(numericValue.toLocaleString('id-ID'));
  };

  const handleLodgingRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = rawValue === "" ? 0 : parseInt(rawValue);
    
    setFormData({ ...formData, lodgingRate: numericValue });
    setDisplayLodgingRate(numericValue.toLocaleString('id-ID'));
  };

  const handleOpenAdd = () => {
    setEditingRate(null);
    setFormData({
      category: "",
      description: "",
      tripType: "Perjalanan Dalam Kota",
      coveredAreas: [],
      additionalDays: "",
      rate: 0,
      lodgingRate: 0
    });
    setAreaInput("");
    setDisplayRate("0");
    setDisplayLodgingRate("0");
    setShowModal(true);
  };

  const handleOpenEdit = (rate: DriverRate) => {
    setEditingRate(rate);
    setFormData({
      category: rate.category,
      description: rate.description,
      tripType: rate.tripType,
      coveredAreas: rate.coveredAreas,
      additionalDays: rate.additionalDays,
      rate: rate.rate,
      lodgingRate: rate.lodgingRate || 0
    });
    setAreaInput(rate.coveredAreas.join(", "));
    setDisplayRate(rate.rate.toLocaleString('id-ID'));
    setDisplayLodgingRate((rate.lodgingRate || 0).toLocaleString('id-ID'));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const areas = areaInput.split(",").map(a => a.trim()).filter(a => a !== "");
      const payload = { ...formData, coveredAreas: areas };

      if (editingRate?.id) {
        await updateDriverRate(editingRate.id, payload);
        showToast("Tarif berhasil diperbarui", "success");
      } else {
        await addDriverRate(payload);
        showToast("Tarif baru berhasil ditambahkan", "success");
      }
      setShowModal(false);
      fetchRates();
    } catch (error: any) {
      showToast("Gagal menyimpan: " + error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tarif ini?")) return;
    
    try {
      await deleteDriverRate(id);
      showToast("Tarif berhasil dihapus", "success");
      fetchRates();
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tarif Operasional Driver</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola kategori, wilayah cakupan, dan besaran tarif operasional.</p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className={styles.btnEdit} 
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
          + Tambah Tarif
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Memuat data tarif...</div>
      ) : rates.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Belum Ada Data</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Silakan tambahkan kategori tarif operasional pertama Anda.</p>
          <button onClick={handleOpenAdd} className={styles.btnEdit} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', margin: '0 auto' }}>
            Tambah Sekarang
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {rates.map(rate => (
            <div key={rate.id} className={styles.card} style={{ borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID: {rate.rateId}</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{rate.category}</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {rate.tripType}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleOpenEdit(rate)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✏️</button>
                  <button onClick={() => rate.id && handleDelete(rate.id)} title="Hapus" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
                </div>
              </div>
              
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1 }}>
                {rate.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Uang Saku</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>Rp {rate.rate.toLocaleString('id-ID')}</div>
                </div>
                <div style={{ background: '#F0FDF4', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#16A34A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Penginapan</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16A34A' }}>Rp {(rate.lodgingRate || 0).toLocaleString('id-ID')}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>AREA CAKUPAN:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {rate.coveredAreas.length > 0 ? rate.coveredAreas.map((area, idx) => (
                    <span key={idx} style={{ padding: '0.2rem 0.6rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.7rem', background: 'white' }}>
                      {area}
                    </span>
                  )) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mencakup semua area</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tambahan Hari:</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>{rate.additionalDays}</span>
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
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{editingRate ? 'Edit Tarif' : 'Tambah Tarif'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kategori</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Cth: Kategori 1" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className={styles.textInput} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Deskripsi</label>
                <textarea 
                  required 
                  placeholder="Deskripsi kategori tarif..." 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className={styles.textInput} 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Jenis Perjalanan</label>
                <select 
                  required 
                  value={formData.tripType} 
                  onChange={e => setFormData({...formData, tripType: e.target.value as any})} 
                  className={styles.selectField}
                >
                  <option value="Perjalanan Dalam Kota">Perjalanan Dalam Kota</option>
                  <option value="Perjalanan Luar Kota">Perjalanan Luar Kota</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Uang Saku</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)' }}>Rp</span>
                    <input 
                      required 
                      type="text" 
                      value={displayRate} 
                      onChange={handleRateChange} 
                      className={styles.textInput} 
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tarif Penginapan</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)' }}>Rp</span>
                    <input 
                      required 
                      type="text" 
                      value={displayLodgingRate} 
                      onChange={handleLodgingRateChange} 
                      className={styles.textInput} 
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tambahan Hari</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Cth: 1 Hari" 
                  value={formData.additionalDays} 
                  onChange={e => setFormData({...formData, additionalDays: e.target.value})} 
                  className={styles.textInput} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Area Cakupan</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Pisahkan dengan koma (Cth: Malang, Batu)" 
                  value={areaInput} 
                  onChange={e => setAreaInput(e.target.value)} 
                  className={styles.textInput} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className={styles.btnCancel} 
                  style={{ 
                    flex: 1, 
                    padding: '0.7rem', 
                    borderRadius: 'var(--radius-md)', 
                    fontWeight: 600,
                    background: '#FFEEF3',
                    color: '#FF4757',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={processing} 
                  className={styles.btnEdit} 
                  style={{ 
                    flex: 1, 
                    padding: '0.7rem', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {processing ? 'Memproses...' : (editingRate ? 'Simpan' : 'Tambah')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
