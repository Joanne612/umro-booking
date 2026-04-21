"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getUserVehicleBookings, cancelVehicleBooking, VehicleBooking } from "@/lib/firebase/firestore";
import VehicleBookingModal from "@/components/VehicleBookingModal";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import styles from "../dashboard.module.css";

export default function VehiclesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<VehicleBooking | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserVehicleBookings(user.uid);
      // Sort by date descending
      setBookings(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error: any) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenDetail = (booking: VehicleBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan kendaraan ini?")) return;
    try {
      await cancelVehicleBooking(id);
      showToast("Pengajuan berhasil dibatalkan.", "success");
      fetchData();
    } catch (error: any) {
      showToast("Gagal membatalkan: " + error.message, "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#DCFCE7', text: '#166534' };
      case 'rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      case 'waiting_asman': return { bg: '#DBEAFE', text: '#1E40AF' };
      default: return { bg: '#FFEDD5', text: '#9A3412' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'waiting_asman': return 'Divalidasi Umum';
      default: return 'Menunggu Validasi';
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Peminjaman Kendaraan</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola pengajuan kendaraan operasional UMRO.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>+</span> Buat Pengajuan Baru
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
      ) : bookings.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Belum ada pengajuan</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Anda belum memiliki riwayat peminjaman kendaraan.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">Mulai Ajukan Sekarang</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {bookings.map(booking => (
            <div key={booking.id} className={styles.card} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--primary-light)', 
                color: 'var(--primary)', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '80px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{new Date(booking.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{new Date(booking.date).getDate()}</span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                   <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{booking.destination}</h3>
                   <span style={{
                     padding: '0.2rem 0.5rem',
                     borderRadius: '4px',
                     fontSize: '0.65rem',
                     fontWeight: 800,
                     textTransform: 'uppercase',
                     background: getStatusColor(booking.status).bg,
                     color: getStatusColor(booking.status).text,
                   }}>
                     {getStatusLabel(booking.status)}
                   </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {booking.tripType === 'pp' ? '🔄 Pulang Pergi' : '➡️ Sekali Jalan'} • 🕒 {booking.pickupTime} WIB
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                  <b>Acara:</b> {booking.event}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {booking.status === 'pending' && (
                  <button 
                    onClick={() => handleCancel(booking.id!)}
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid #FEE2E2', 
                      color: '#EF4444', 
                      background: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Batalkan
                  </button>
                )}
                <button 
                  onClick={() => handleOpenDetail(booking)}
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--text-main)', 
                    background: '#F8FAFC',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VehicleBookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
      />

      <VehicleDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        booking={selectedBooking}
      />
    </div>
  );
}
