"use client";

import { useEffect, useState } from "react";
import { createItemRequest, updateItemRequest, ItemRequest } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import styles from "../app/dashboard/dashboard.module.css";

interface ItemRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: ItemRequest | null;
}

export default function ItemRequestModal({ isOpen, onClose, onSuccess, editItem }: ItemRequestModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    category: "Permintaan ATK" as ItemRequest["category"],
    title: "",
    division: "",
    description: "",
    purchaseLinks: [] as string[],
  });

  const [currentLink, setCurrentLink] = useState("");

  useEffect(() => {
    if (isOpen && editItem) {
      setFormData({
        category: editItem.category,
        title: editItem.title,
        division: editItem.division,
        description: editItem.description,
        purchaseLinks: editItem.purchaseLinks || [],
      });
    } else if (isOpen && !editItem) {
      // Reset if not editing
      setFormData({
        category: "Permintaan ATK",
        title: "",
        division: "",
        description: "",
        purchaseLinks: [],
      });
    }
  }, [isOpen, editItem]);

  if (!isOpen) return null;

  const handleAddLink = () => {
    if (!currentLink.trim()) return;
    if (!currentLink.startsWith("http")) {
      return showToast("Tautan harus diawali dengan http:// atau https://", "warning");
    }
    setFormData({
      ...formData,
      purchaseLinks: [...formData.purchaseLinks, currentLink.trim()]
    });
    setCurrentLink("");
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = [...formData.purchaseLinks];
    newLinks.splice(index, 1);
    setFormData({ ...formData, purchaseLinks: newLinks });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showToast("Sesi habis, silakan login kembali.", "error");

    if (!formData.title.trim() || !formData.description.trim() || !formData.division.trim()) {
      return showToast("Mohon lengkapi semua field yang wajib diisi.", "warning");
    }

    setLoading(true);
    try {
      if (editItem && editItem.id) {
        await updateItemRequest(editItem.id, {
          category: formData.category,
          title: formData.title,
          division: formData.division,
          description: formData.description,
          purchaseLinks: formData.purchaseLinks,
        });
        showToast("Permintaan barang berhasil diperbarui!", "success");
      } else {
        await createItemRequest({
          userId: user.uid,
          userName: user.displayName || user.email || "Unknown",
          division: formData.division,
          category: formData.category,
          title: formData.title,
          description: formData.description,
          purchaseLinks: formData.purchaseLinks,
        });
        showToast("Permintaan barang berhasil dikirim! Menunggu persetujuan Asman.", "success");
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast("Gagal mengirim permintaan: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editItem ? "Edit Permintaan Barang" : "Buat Permintaan Barang"}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kategori Permintaan</label>
            <select 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value as any})}
              className={styles.selectField}
            >
              <option value="Permintaan ATK">Permintaan ATK</option>
              <option value="Permintaan Terkait Part Komputer/Laptop">Permintaan Terkait Part Komputer/Laptop</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Judul Singkat</label>
              <input 
                type="text" 
                required 
                placeholder="Cth: Tinta Printer L3110" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className={styles.textInput} 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Fungsi / Bidang</label>
              <input 
                type="text" 
                required 
                placeholder="Cth: SDM / IT" 
                value={formData.division} 
                onChange={e => setFormData({...formData, division: e.target.value})} 
                className={styles.textInput} 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Deskripsi Lengkap (Sertakan Spesifikasi)</label>
            <textarea 
              required 
              placeholder="Jelaskan detail barang yang dibutuhkan (Merk, Tipe, Jumlah, dsb)..." 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className={styles.textInput} 
              style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {/* DYNAMIC LINK INPUT */}
          <div className={styles.formGroup} style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <label className={styles.formLabel} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔗</span> Tautan Referensi Pembelian (Opsional)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input 
                type="url" 
                placeholder="Tempel link Tokopedia/Shopee/E-Katalog..." 
                value={currentLink}
                onChange={e => setCurrentLink(e.target.value)}
                className={styles.textInput}
                style={{ flex: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
              />
              <button 
                type="button" 
                onClick={handleAddLink}
                style={{ 
                  padding: '0 1rem', 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 'var(--radius-sm)', 
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Tambah
              </button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {formData.purchaseLinks.map((link, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid var(--primary-light)',
                  borderRadius: '99px',
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  maxWidth: '100%'
                }}>
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '150px'
                  }}>
                    {link}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveLink(idx)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                      padding: 0
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {formData.purchaseLinks.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada tautan ditambahkan.</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.875rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Kirim Permintaan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
