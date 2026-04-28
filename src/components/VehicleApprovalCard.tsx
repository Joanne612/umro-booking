"use client";

import { VehicleBooking } from "@/lib/firebase/firestore";

interface VehicleApprovalCardProps {
  booking: VehicleBooking;
  viewMode: "pending" | "history";
  userRole: string | null;
  onApprove?: (id: string) => void;
  onReject?: (booking: VehicleBooking) => void;
  onEdit?: (booking: VehicleBooking) => void;
  processingId?: string | null;
}

export default function VehicleApprovalCard({
  booking,
  viewMode,
  userRole,
  onApprove,
  onReject,
  onEdit,
  processingId
}: VehicleApprovalCardProps) {

  const isProcessing = processingId === booking.id;
  const isHistory = viewMode === "history";

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      opacity: isProcessing ? 0.7 : 1
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        background: isHistory ? '#F8FAFC' : (userRole === 'koordinator_driver' ? 'rgba(0,162,233,0.03)' : 'rgba(16,185,129,0.02)'),
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {booking.ticketId && (
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              color: '#475569',
              marginBottom: '0.6rem',
              fontWeight: 700,
              background: '#EEF2FF',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              border: '1px dashed #C7D2FE',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span>🎫</span> #{booking.ticketId}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: userRole === 'koordinator_driver' ? 'var(--primary)' : '#10B981', textTransform: 'uppercase' }}>
              {booking.validatedByName ? `Divalidasi: ${booking.validatedByName}` : 'Tujuan Ke:'}
            </span>
            {isHistory && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                background: booking.status === 'approved' ? '#DCFCE7' : (booking.status === 'rejected' ? '#FEE2E2' : '#FEF3C7'),
                color: booking.status === 'approved' ? '#166534' : (booking.status === 'rejected' ? '#991B1B' : '#92400E'),
                textTransform: 'uppercase'
              }}>
                {booking.status === 'waiting_asman' ? 'Menunggu Keputusan Asman' : (booking.status === 'approved' ? 'Disetujui ✓' : 'Ditolak ✗')}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{booking.destination}</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.25rem' }}>
            👤 PIC/Peminjam: {booking.userName}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>
            📅 {booking.endDate && booking.endDate !== booking.date
              ? `${new Date(booking.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(booking.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : new Date(booking.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            }
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Durasi: {booking.duration} Hari</div>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>PEMOHON / PIC</label>
          <div style={{ fontWeight: 600 }}>👤 {booking.userName}</div>
          <div style={{ fontSize: '0.8125rem' }}>📞 {booking.userPhone}</div>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>PENJEMPUTAN</label>
          <div style={{ fontWeight: 600 }}>🕒 {booking.pickupTime} WIB</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', lineHeight: 1.4 }}>📍 {booking.pickupLocation}</div>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>DETAIL PERJALANAN</label>
          <div style={{ fontSize: '0.875rem' }}>🔁 Tipe: <b>{booking.tripType === 'pp' ? 'Pulang Pergi' : 'Sekali Jalan'}</b></div>
          <div style={{ fontSize: '0.875rem' }}>👥 Penumpang: <b>{booking.passengers} Orang</b></div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
            {(!isHistory && userRole === 'koordinator_driver') ? 'ACARA / KEGIATAN' : 'INFO ARMADA & DRIVER'}
          </label>
          {(!isHistory && userRole === 'koordinator_driver') ? (
            <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
              {booking.event}
            </div>
          ) : (
            <div style={{ padding: '1rem', background: '#F0F9FF', borderRadius: 'var(--radius-md)', border: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'pre-wrap', color: '#0369A1' }}>{booking.vehicleNotes || "Belum ada catatan armada."}</div>
              {onEdit && userRole === 'koordinator_driver' && (
                <button
                  onClick={() => onEdit(booking)}
                  style={{ background: 'white', color: 'var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--primary)' }}
                >
                  📝 Edit
                </button>
              )}
            </div>
          )}
        </div>

        {isHistory && (userRole === 'admin' || userRole === 'asman') && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>ACARA / KEGIATAN</label>
            <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem' }}>
              {booking.event}
            </div>
          </div>
        )}

        {booking.status === 'rejected' && booking.rejectReason && (
          <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: '#FEF2F2', borderRadius: 'var(--radius-sm)', border: '1px solid #FEE2E2', color: '#991B1B', fontSize: '0.8125rem' }}>
            <b>Alasan Penolakan:</b> {booking.rejectReason}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isHistory && (
        <div style={{ padding: '1rem 1.5rem', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          {userRole === 'staff_umum' ? (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Menunggu keputusan Asman Umum
            </div>
          ) : (
            <>
              <button
                onClick={() => onReject?.(booking)}
                disabled={!!processingId}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.25rem', border: '1px solid #EF4444', color: '#EF4444' }}
              >
                Tolak
              </button>
              <button
                onClick={() => onApprove?.(booking.id!)}
                disabled={!!processingId}
                className="btn-primary"
                style={{ padding: '0.6rem 2rem', background: userRole === 'koordinator_driver' ? '#0ea5e9' : '#10B981' }}
              >
                {userRole === 'koordinator_driver' ? '✓ Validasi & Setujui' : '✓ Setujui'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
