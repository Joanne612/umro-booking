"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserBookings, cancelBooking, cancelBookingSeries, initAndGetRooms, BookingData, Room } from "@/lib/firebase/firestore";
import { useToast } from "@/context/ToastContext";
import BookingModal from "@/components/BookingModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import styles from "../dashboard.module.css";

export default function MyBookingsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);

  // Confirmation State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{ id?: string; groupId?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async () => {
    if (user) {
      try {
        const data = await getUserBookings(user.uid);
        const roomsData = await initAndGetRooms();
        setRooms(roomsData);
        
        const today = new Date().toISOString().split('T')[0];
        const filtered = data.filter(b => {
          // Admin & asman see full history
          if (userRole === "admin" || userRole === "asman") return true;
          // User, view, umum only see future/today bookings
          return b.date >= today;
        });

        setBookings(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error: any) {
        showToast("Gagal memuat data: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, userRole]);

  const handleEdit = (booking: BookingData) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCancelClick = (booking: BookingData) => {
    setItemToCancel({ id: booking.id, groupId: booking.groupId });
    setIsConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!itemToCancel) return;
    setCancelling(true);
    try {
      if (itemToCancel.groupId) {
        await cancelBookingSeries(itemToCancel.groupId);
        showToast("Seluruh rangkaian booking berhasil dibatalkan.", "success");
      } else if (itemToCancel.id) {
        await cancelBooking(itemToCancel.id);
        showToast("Booking berhasil dibatalkan.", "success");
      }
      setIsConfirmOpen(false);
      setItemToCancel(null);
      fetchBookings();
    } catch (error: any) {
      showToast("Gagal membatalkan: " + error.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  // Logic to group bookings for rendering
  const displayBookings = (() => {
    const groups: Record<string, BookingData[]> = {};
    const singletons: BookingData[] = [];

    bookings.forEach(b => {
      if (b.groupId) {
        if (!groups[b.groupId]) groups[b.groupId] = [];
        groups[b.groupId].push(b);
      } else {
        singletons.push(b);
      }
    });

    const groupedResult = Object.entries(groups).map(([groupId, groupMembers]) => {
      // Sort members by date to find min/max
      const sortedMembers = [...groupMembers].sort((a, b) => a.date.localeCompare(b.date));
      const representative = sortedMembers[0];
      return {
        ...representative,
        isGroup: true,
        groupSize: sortedMembers.length,
        minDate: sortedMembers[0].date,
        maxDate: sortedMembers[sortedMembers.length - 1].date,
        // If ANY are active, show as active (simplified)
        status: (sortedMembers.some(m => m.status === 'active') ? 'active' : 'cancelled') as "active" | "cancelled"
      };
    });

    return [...singletons, ...groupedResult].sort((a, b) => {
      const dateA = (a as any).minDate || a.date;
      const dateB = (b as any).minDate || b.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  })();

  if (loading) return <div style={{ padding: '2rem' }}>Memuat data history...</div>;

  if (userRole === "view") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>👤</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          Maaf, role <b>Hanya Lihat (View)</b> tidak memiliki riwayat booking pribadi karena tidak memiliki izin untuk memesan ruangan.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Daftar Booking Saya</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole === 'admin' || userRole === 'asman' 
            ? 'Riwayat lengkap seluruh jadwal yang pernah Anda ajukan.' 
            : 'Daftar jadwal mendatang yang Anda ajukan. Jadwal lampau disembunyikan otomatis.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {displayBookings.length === 0 ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Belum ada jadwal</h3>
            <p style={{ color: 'var(--text-muted)' }}>Anda tidak memiliki jadwal mendatang saat ini.</p>
          </div>
        ) : (
          displayBookings.map(booking => {
            const b = booking as any;
            const isGroup = b.isGroup;

            return (
              <div key={b.id || b.groupId} className={styles.card} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                opacity: b.status === 'cancelled' ? 0.6 : 1,
                flexWrap: 'wrap',
                gap: '1rem',
                borderLeft: b.status === 'active' ? '4px solid var(--primary)' : '4px solid #CBD5E1'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{b.title}</h3>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.6rem', 
                        background: b.status === 'active' ? '#D1FAE5' : '#F1F5F9', 
                        color: b.status === 'active' ? '#10B981' : '#64748B', 
                        borderRadius: '20px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {b.status === 'active' ? 'Aktif' : 'Dibatalkan'}
                      </span>
                      {isGroup && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.6rem', 
                          background: 'var(--primary-light)', 
                          color: 'var(--primary)', 
                          borderRadius: '20px',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          📦 Rangkaian {b.groupSize} Hari
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <b>📍 {b.roomName}</b> &bull; 📅 {
                      isGroup 
                        ? `${new Date(b.minDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(b.maxDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : new Date(b.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    } &bull; 🕒 {b.startTime} - {b.endTime}
                  </p>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '4px' }}>Bidang: {b.division}</span>
                  {b.consumption?.requested && (
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: '4px' }}>
                      🍽️ Konsumsi: {
                        b.consumption.status === 'completed' ? 'Selesai' : 
                        b.consumption.status === 'approved' ? 'Disetujui' : 
                        b.consumption.status === 'rejected' ? 'Ditolak' : 'Menunggu'
                      }
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {b.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleEdit(b as BookingData)}
                        style={{ 
                          padding: '0.6rem 1.25rem', 
                          background: 'white', 
                          color: 'var(--primary)', 
                          border: '1px solid var(--primary)', 
                          borderRadius: 'var(--radius-md)', 
                          cursor: 'pointer', 
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleCancelClick(b)}
                        style={{ 
                          padding: '0.6rem 1.25rem', 
                          background: '#FFF1F2', 
                          color: '#E11D48', 
                          border: '1px solid #FFE4E6', 
                          borderRadius: 'var(--radius-md)', 
                          cursor: 'pointer', 
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      >
                        Batalkan
                      </button>
                    </>
                  )}
                </div>
              </div>
          );
        })
        )}
      </div>

      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBooking(null);
            fetchBookings();
          }}
          rooms={rooms}
          selectedDate={selectedBooking?.date || ""}
          editData={selectedBooking}
        />
      )}
      {isConfirmOpen && (
        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleCancelConfirm}
          title="Konfirmasi Pembatalan"
          message={itemToCancel?.groupId 
            ? "Apakah Anda yakin ingin membatalkan SELURUH rangkaian booking ini?" 
            : "Apakah Anda yakin ingin membatalkan booking ini?"}
          confirmLabel="Ya, Batalkan"
          cancelLabel="Kembali"
          isLoading={cancelling}
        />
      )}
    </div>
  );
}
