"use client";

import { VehicleBooking } from "@/lib/firebase/firestore";
import styles from "../app/dashboard/dashboard.module.css";

interface VehicleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: VehicleBooking | null;
}

export default function VehicleDetailModal({ isOpen, onClose, booking }: VehicleDetailModalProps) {
  if (!isOpen || !booking) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'waiting_asman': return '#3B82F6';
      default: return '#F59E0B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'waiting_asman': return 'Disetujui (Mengetahui Asman)';
      default: return 'Menunggu Validasi';
    }
  };

  return (
    <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
      <div className={styles.modalContent} style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
        {/* Header Status */}
        <div style={{ 
          background: getStatusColor(booking.status), 
          padding: '1.5rem', 
          color: 'white',
          position: 'relative'
        }}>
          <button 
            onClick={onClose} 
            style={{ 
              position: 'absolute', 
              right: '1rem', 
              top: '1rem', 
              background: 'rgba(0,0,0,0.1)', 
              border: 'none', 
              color: 'white', 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              cursor: 'pointer' 
            }}
          >
            &times;
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.25rem' }}>Status Pengajuan</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{getStatusLabel(booking.status)}</h2>
            </div>
            {booking.ticketId && (
              <div style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '0.4rem 0.8rem', 
                borderRadius: '6px', 
                fontSize: '0.85rem', 
                fontFamily: 'monospace', 
                fontWeight: 700,
                marginTop: '0.2rem',
                marginRight: '1rem',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                #{booking.ticketId}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{booking.destination}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{booking.tripType === 'pp' ? '🔄 Pulang Pergi' : '➡️ Sekali Jalan'} • {booking.duration} Hari</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <DetailItem 
              label="Tanggal" 
              value={booking.endDate && booking.endDate !== booking.date 
                ? `${new Date(booking.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(booking.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : new Date(booking.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              } 
            />
            <DetailItem label="Jam Jemput" value={`${booking.pickupTime} WIB`} />
            <DetailItem label="PIC / Pengguna" value={booking.userName} />
            <DetailItem label="No. HP" value={booking.userPhone} />
            <DetailItem label="Penumpang" value={`${booking.passengers} Orang`} />
          </div>

          <DetailItem label="Keperluan / Acara" value={booking.event} fullWidth />
          <div style={{ height: '1rem' }}></div>
          <DetailItem label="Alamat Penjemputan" value={booking.pickupLocation} fullWidth />

          {/* Vehicle Info from Officer */}
          {(booking.status === 'approved' || booking.status === 'waiting_asman') && booking.vehicleNotes && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Informasi Kendaraan & Driver</label>
              <div style={{ fontSize: '0.875rem', color: '#0C4A6E', fontWeight: 500, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {booking.vehicleNotes}
              </div>
              {booking.validatedByName && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', borderTop: '1px solid #BAE6FD', paddingTop: '0.5rem' }}>
                  Divalidasi oleh: <b>{booking.validatedByName}</b>
                </div>
              )}
            </div>
          )}

          {/* Rejection/Approval Info */}
          {booking.status === 'rejected' && booking.rejectReason && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Alasan Penolakan</label>
              <p style={{ fontSize: '0.875rem', color: '#991B1B', fontWeight: 500 }}>{booking.rejectReason}</p>
            </div>
          )}

          {booking.status === 'approved' && booking.approvedByName && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Disetujui oleh: <b>{booking.approvedByName}</b>
            </div>
          )}

          <button 
            onClick={onClose} 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '2rem' }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, fullWidth = false }: { label: string, value: string, fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
