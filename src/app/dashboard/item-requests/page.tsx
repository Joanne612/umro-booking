"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getUserItemRequests, deleteItemRequest, ItemRequest } from "@/lib/firebase/firestore";
import ItemRequestModal from "@/components/ItemRequestModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import styles from "../dashboard.module.css";

export default function ItemRequestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Confirmation State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserItemRequests(user.uid);
      setRequests(data);
    } catch (error: any) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteItemRequest(itemToDelete);
      showToast("Permintaan berhasil dihapus.", "success");
      setIsConfirmOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#DCFCE7', text: '#166534', label: 'Selesai' };
      case 'approved': return { bg: '#DBEAFE', text: '#1E40AF', label: 'Disetujui Asman' };
      case 'rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'Ditolak' };
      default: return { bg: '#FFEDD5', text: '#9A3412', label: 'Menunggu Asman' };
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem' 
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Permintaan Barang</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola pengajuan ATK, IT Part, dan kebutuhan barang lainnya.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <span>+</span> Buat Permintaan Baru
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
      ) : requests.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Belum ada permintaan</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Anda belum memiliki riwayat permintaan barang.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Mulai Ajukan Sekarang
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {requests.map(req => {
            const statusStyle = getStatusStyle(req.status);
            return (
              <div key={req.id} className={styles.card} style={{ borderLeft: `4px solid ${statusStyle.text}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>{req.category}</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{req.title}</h3>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      textTransform: 'uppercase'
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {req.status === 'pending' && (
                      <button 
                        onClick={() => handleDeleteClick(req.id!)}
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid #FEE2E2', 
                          color: '#EF4444', 
                          background: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem', padding: '0.85rem', backgroundColor: 'rgba(0,162,233,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-light)' }}>
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

                <div style={{ 
                  backgroundColor: 'var(--background)', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {req.description}
                </div>

                {req.purchaseLinks && req.purchaseLinks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tautan:</span>
                    {req.purchaseLinks.map((link, i) => {
                      let domain = "Tautan";
                      try {
                        domain = new URL(link).hostname.replace('www.', '');
                        domain = domain.charAt(0).toUpperCase() + domain.slice(1);
                      } catch (e) {}

                      return (
                        <a 
                          key={i} 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.75rem',
                            backgroundColor: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '99px',
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          🔗 {domain}
                        </a>
                      );
                    })}
                  </div>
                )}
                
                {req.rejectReason && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 'var(--radius-sm)', color: '#C53030', fontSize: '0.875rem' }}>
                    <strong>Alasan Penolakan:</strong> {req.rejectReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ItemRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
      />

      {isConfirmOpen && (
        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Konfirmasi Hapus"
          message="Apakah Anda yakin ingin menghapus permintaan barang ini?"
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          isLoading={deleting}
        />
      )}
    </div>
  );
}
