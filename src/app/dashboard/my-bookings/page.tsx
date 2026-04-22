"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserBookings,
  cancelBooking,
  cancelBookingSeries,
  initAndGetRooms,
  getUserVehicleBookings,
  getUserItemRequests,
  cancelVehicleBooking,
  deleteItemRequest,
  BookingData,
  Room,
  VehicleBooking,
  ItemRequest
} from "@/lib/firebase/firestore";
import { useToast } from "@/context/ToastContext";
import BookingModal from "@/components/BookingModal";
import ItemRequestModal from "@/components/ItemRequestModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import styles from "../dashboard.module.css";

type TabType = "meeting" | "zoom" | "vehicle" | "item";

export default function MyBookingsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();

  // Data State
  const [activeTab, setActiveTab] = useState<TabType>("meeting");
  const [roomBookings, setRoomBookings] = useState<BookingData[]>([]);
  const [vehicles, setVehicles] = useState<VehicleBooking[]>([]);
  const [items, setItems] = useState<ItemRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Interaction State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedRoomBooking, setSelectedRoomBooking] = useState<BookingData | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemRequest | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{ id: string; type: TabType; groupId?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bookingsData, vehiclesData, itemsData, roomsData] = await Promise.all([
        getUserBookings(user.uid),
        getUserVehicleBookings(user.uid),
        getUserItemRequests(user.uid),
        initAndGetRooms()
      ]);

      setRoomBookings(bookingsData);
      setVehicles(vehiclesData);
      setItems(itemsData);
      setRooms(roomsData);
    } catch (error: any) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Filtering Rooms by Type (Meeting vs Zoom)
  const roomDateFilter = (data: BookingData[]) => {
    const today = new Date().toISOString().split('T')[0];
    return data.filter(b => {
      if (userRole === "admin" || userRole === "asman") return true;
      return b.date >= today;
    });
  };

  const currentRoomBookings = roomBookings.filter(b => {
    const room = rooms.find(r => r.id === b.roomId);
    if (!room) return false;
    return activeTab === "meeting" ? room.type === "physical" : room.type === "online";
  });

  const displayRoomBookings = (() => {
    const sorted = roomDateFilter(currentRoomBookings);
    const groups: Record<string, BookingData[]> = {};
    const singletons: BookingData[] = [];

    sorted.forEach(b => {
      if (b.groupId) {
        if (!groups[b.groupId]) groups[b.groupId] = [];
        groups[b.groupId].push(b);
      } else {
        singletons.push(b);
      }
    });

    const groupedResult = Object.entries(groups).map(([groupId, groupMembers]) => {
      const sortedMembers = [...groupMembers].sort((a, b) => a.date.localeCompare(b.date));
      const representative = sortedMembers[0];
      return {
        ...representative,
        isGroup: true,
        groupSize: sortedMembers.length,
        minDate: sortedMembers[0].date,
        maxDate: sortedMembers[sortedMembers.length - 1].date,
        status: (sortedMembers.some(m => m.status === 'active') ? 'active' : 'cancelled') as "active" | "cancelled"
      };
    });

    return [...singletons, ...groupedResult].sort((a, b) => {
      const dateA = (a as any).minDate || a.date;
      const dateB = (b as any).minDate || b.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  })();

  // Cancellation Handling
  const openCancelConfirm = (id: string, type: TabType, groupId?: string) => {
    setItemToCancel({ id, type, groupId });
    setIsConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!itemToCancel) return;
    setCancelling(true);
    try {
      switch (itemToCancel.type) {
        case "meeting":
        case "zoom":
          if (itemToCancel.groupId) {
            await cancelBookingSeries(itemToCancel.groupId);
          } else {
            await cancelBooking(itemToCancel.id);
          }
          break;
        case "vehicle":
          await cancelVehicleBooking(itemToCancel.id);
          break;
        case "item":
          await deleteItemRequest(itemToCancel.id);
          break;
      }
      showToast("Pemesanan telah dibatalkan.", "success");
      setIsConfirmOpen(false);
      fetchData();
    } catch (error: any) {
      showToast("Gagal membatalkan: " + error.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Memuat riwayat pemesanan...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Riwayat Booking</h2>
        <p style={{ color: 'var(--text-muted)' }}>Pantau dan kelola seluruh reservasi Anda di sini.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button onClick={() => setActiveTab('meeting')} className={`${styles.tabButton} ${activeTab === 'meeting' ? styles.active : ""}`}>🏢 Ruang Meeting</button>
        <button onClick={() => setActiveTab('zoom')} className={`${styles.tabButton} ${activeTab === 'zoom' ? styles.active : ""}`}>💻 Ruang Zoom</button>
        <button onClick={() => setActiveTab('vehicle')} className={`${styles.tabButton} ${activeTab === 'vehicle' ? styles.active : ""}`}>🚗 Peminjaman Kendaraan</button>
        <button onClick={() => setActiveTab('item')} className={`${styles.tabButton} ${activeTab === 'item' ? styles.active : ""}`}>📦 Permintaan Barang</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Render Meeting & Zoom */}
        {(activeTab === 'meeting' || activeTab === 'zoom') && (
          displayRoomBookings.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
              <h3>Belum ada jadwal</h3>
              <p>Anda tidak memiliki jadwal mendatang di kategori ini.</p>
            </div>
          ) : (
            displayRoomBookings.map(b => (
              <div key={b.id || b.groupId} className={styles.card} style={{
                borderLeft: b.status === 'active' ? '4px solid var(--primary)' : '4px solid #CBD5E1',
                opacity: b.status === 'cancelled' ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{b.title}</h4>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: 700,
                        background: b.status === 'active' ? '#D1FAE5' : '#F1F5F9', color: b.status === 'active' ? '#10B981' : '#64748B'
                      }}>{b.status === 'active' ? 'AKTIF' : 'DIBATALKAN'}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      📍 {b.roomName} &bull; 🕒 {b.startTime} - {b.endTime}
                    </p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      📅 {(b as any).isGroup
                        ? `${new Date((b as any).minDate).toLocaleDateString()} - ${new Date((b as any).maxDate).toLocaleDateString()}`
                        : new Date(b.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {b.status === 'active' && (
                      <>
                        <button onClick={() => { setSelectedRoomBooking(b as BookingData); setIsRoomModalOpen(true); }} className="btn-secondary">✏️ Edit</button>
                        <button onClick={() => openCancelConfirm(b.id!, activeTab, b.groupId)} className="btn-danger">Batal</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {/* Render Vehicles */}
        {activeTab === 'vehicle' && (
          vehicles.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</div>
              <h3>Belum ada peminjaman</h3>
              <p>Riwayat peminjaman kendaraan Anda akan muncul di sini.</p>
            </div>
          ) : (
            vehicles.map(v => (
              <div key={v.id} className={styles.card} style={{
                borderLeft: `4px solid ${v.status === 'approved' ? '#10B981' : v.status === 'rejected' ? '#EF4444' : '#F59E0B'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{v.event}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      📍 Tujuan: {v.destination} &bull; 📅 {new Date(v.date).toLocaleDateString()}
                    </p>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#F1F5F9', fontWeight: 600 }}>{v.tripType === 'pp' ? 'PULANG PERGI' : 'SEKALI JALAN'}</span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700,
                        background: v.status === 'approved' ? '#D1FAE5' : v.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                        color: v.status === 'approved' ? '#10B981' : v.status === 'rejected' ? '#EF4444' : '#D97706'
                      }}>
                        {v.status === 'approved' ? 'DISETUJUI' : v.status === 'rejected' ? 'DITOLAK' : v.status === 'waiting_asman' ? 'MENUNGGU KONFIRMASI ASMAN' : 'MENUNGGU VALIDASI KOORDINATOR'}
                      </span>
                    </div>
                  </div>
                  {(v.status === 'pending' || v.status === 'waiting_asman') && (
                    <button onClick={() => openCancelConfirm(v.id!, 'vehicle')} className="btn-danger">Batalkan</button>
                  )}
                </div>
              </div>
            ))
          )
        )}

        {/* Render Items */}
        {activeTab === 'item' && (
          items.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <h3>Belum ada permintaan</h3>
              <p>Daftar pengadaan ATK/Barang Anda akan muncul di sini.</p>
            </div>
          ) : (
            items.map(i => (
              <div key={i.id} className={styles.card} style={{
                borderLeft: `4px solid ${i.status === 'completed' ? '#3B82F6' : i.status === 'approved' ? '#10B981' : i.status === 'rejected' ? '#EF4444' : '#F59E0B'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{i.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{i.category} &bull; {new Date(i.createdAt?.toMillis()).toLocaleDateString()}</p>
                    <span style={{
                      display: 'inline-block', marginTop: '0.5rem', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700,
                      background: i.status === 'completed' ? '#DBEAFE' : i.status === 'approved' ? '#D1FAE5' : i.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                      color: i.status === 'completed' ? '#3B82F6' : i.status === 'approved' ? '#10B981' : i.status === 'rejected' ? '#EF4444' : '#D97706'
                    }}>
                      {i.status === 'completed' ? 'SELESAI' : i.status === 'approved' ? 'DISETUJUI' : i.status === 'rejected' ? 'DITOLAK' : 'PENDING'}
                    </span>
                  </div>
                  {i.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setSelectedItem(i); setIsItemModalOpen(true); }} className="btn-secondary">Edit</button>
                      <button onClick={() => openCancelConfirm(i.id!, 'item')} className="btn-danger">Hapus</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        )}

      </div>

      {/* Modals */}
      {isRoomModalOpen && selectedRoomBooking && (
        <BookingModal
          isOpen={isRoomModalOpen}
          onClose={() => { setIsRoomModalOpen(false); setSelectedRoomBooking(null); fetchData(); }}
          rooms={rooms}
          selectedDate={selectedRoomBooking.date}
          editData={selectedRoomBooking}
        />
      )}

      {isItemModalOpen && selectedItem && (
        <ItemRequestModal
          isOpen={isItemModalOpen}
          onClose={() => { setIsItemModalOpen(false); setSelectedItem(null); fetchData(); }}
          onSuccess={() => fetchData()}
          editItem={selectedItem}
        />
      )}

      {isConfirmOpen && (
        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleCancelConfirm}
          title="Konfirmasi Pembatalan"
          message={`Apakah Anda yakin ingin membatalkan/menghapus ${itemToCancel?.type === 'item' ? 'permintaan' : 'reservasi'} ini?`}
          confirmLabel="Ya, Batalkan"
          isLoading={cancelling}
        />
      )}
    </div>
  );
}
