"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserBookings,
  getUserVehicleBookings,
  getUserItemRequests,
  subscribeToUserBookings,
  subscribeToUserVehicles,
  subscribeToUserItems,
  subscribeToAllBookings,
  subscribeToAllVehicles,
  subscribeToAllItems,
  subscribeToUserMaintenanceRequests,
  subscribeToAllMaintenanceRequests,
  cancelBooking,
  cancelBookingSeries,
  initAndGetRooms,
  cancelVehicleBooking,
  deleteItemRequest,
  deleteMaintenanceRequest,
  updateMaintenanceRequest,
  BookingData,
  Room,
  VehicleBooking,
  ItemRequest,
  MaintenanceRequest
} from "@/lib/firebase/firestore";
import { useToast } from "@/context/ToastContext";
import BookingModal from "@/components/BookingModal";
import VehicleBookingModal from "@/components/VehicleBookingModal";
import ItemRequestModal from "@/components/ItemRequestModal";
import MaintenanceRequestModal from "@/components/MaintenanceRequestModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import styles from "../dashboard.module.css";

type TabType = "meeting" | "zoom" | "vehicle" | "item" | "maintenance";

export default function MyBookingsPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();

  // Data State
  const [activeTab, setActiveTab] = useState<TabType>("meeting");
  const [roomBookings, setRoomBookings] = useState<BookingData[]>([]);
  const [vehicles, setVehicles] = useState<VehicleBooking[]>([]);
  const [items, setItems] = useState<ItemRequest[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  // Modals & Interaction State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [selectedRoomBooking, setSelectedRoomBooking] = useState<BookingData | null>(null);
  const [vehicleToEdit, setVehicleToEdit] = useState<VehicleBooking | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemRequest | null>(null);
  const [selectedMaint, setSelectedMaint] = useState<MaintenanceRequest | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{ id: string; type: TabType; groupId?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const roomsData = await initAndGetRooms();
      setRooms(roomsData);
    } catch (error: any) {
      showToast("Gagal memuat data ruangan: " + error.message, "error");
    }
  };

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    fetchData();

    // Subscribe to data based on role
    const unsubRooms = userRole === "admin"
      ? subscribeToAllBookings((data) => setRoomBookings(data))
      : subscribeToUserBookings(user.uid, (data) => setRoomBookings(data));

    const unsubVehicles = userRole === "admin"
      ? subscribeToAllVehicles((data) => setVehicles(data))
      : subscribeToUserVehicles(user.uid, (data) => setVehicles(data));

    const unsubItems = userRole === "admin"
      ? subscribeToAllItems((data) => { setItems(data); })
      : subscribeToUserItems(user.uid, (data) => { setItems(data); });

    const unsubMaint = userRole === "admin"
      ? subscribeToAllMaintenanceRequests((data) => { setMaintenanceRequests(data); setLoading(false); })
      : subscribeToUserMaintenanceRequests(user.uid, (data) => { setMaintenanceRequests(data); setLoading(false); });

    return () => {
      unsubRooms();
      unsubVehicles();
      unsubItems();
      unsubMaint();
    };
  }, [user]);

  const isDateMatch = (dateStr: string | any) => {
    if (filterDate === "all") return true;
    if (!dateStr) return false;
    
    let dateObj: Date;
    if (typeof dateStr === 'string') {
      dateObj = new Date(dateStr);
    } else if (dateStr.seconds) {
      dateObj = new Date(dateStr.seconds * 1000);
    } else if (dateStr.toMillis) {
      dateObj = new Date(dateStr.toMillis());
    } else {
      dateObj = new Date(dateStr);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);

    if (filterDate === "hari") {
      return checkDate.getTime() === today.getTime();
    } else if (filterDate === "minggu") {
      const startOfWeek = new Date(today);
      const day = today.getDay() || 7;
      if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setHours(24 * 6);

      return checkDate >= startOfWeek && checkDate <= endOfWeek;
    } else if (filterDate === "bulan") {
      return checkDate.getMonth() === today.getMonth() && checkDate.getFullYear() === today.getFullYear();
    }
    return true;
  };

  const isPastDate = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

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
    const isTabMatch = activeTab === "meeting" ? room.type === "physical" : room.type === "online";
    const isStatusMatch = filterStatus === "all" || b.status === filterStatus;
    const searchMatch = !searchQuery || 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (b.userName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const dateMatch = userRole === "admin" ? isDateMatch(b.date) : true;
    return isTabMatch && isStatusMatch && searchMatch && dateMatch;
  });

  const filteredVehicles = vehicles.filter(v => {
    const isStatusMatch = filterStatus === "all" || v.status === filterStatus;
    const searchMatch = !searchQuery || 
      v.event.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (v.userName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const dateMatch = userRole === "admin" ? isDateMatch(v.date) : true;
    return isStatusMatch && searchMatch && dateMatch;
  });

  const filteredItems = items.filter(i => {
    const isStatusMatch = filterStatus === "all" || i.status === filterStatus;
    const searchMatch = !searchQuery || 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (i.userName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const dateMatch = userRole === "admin" ? isDateMatch(i.createdAt) : true;
    return isStatusMatch && searchMatch && dateMatch;
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
        case "maintenance":
          await deleteMaintenanceRequest(itemToCancel.id);
          break;
      }
      showToast("Permintaan telah dihapus.", "success");
      setIsConfirmOpen(false);
      fetchData();
    } catch (error: any) {
      showToast("Gagal menghapus: " + error.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  const MAINT_CATEGORY_ICON: Record<string, string> = {
    "Pemeliharaan AC": "❄️",
    "Pemeliharaan Gedung": "🏢",
    "Pemeliharaan Listrik": "⚡",
    "Pemeliharaan Plumbing": "🔧",
    "Lainnya": "📋",
  };
  const MAINT_PRIORITY_COLOR: Record<string, string> = {
    "Rendah": "#16a34a", "Sedang": "#d97706", "Tinggi": "#ea580c", "Darurat": "#dc2626",
  };
  const MAINT_PRIORITY_BG: Record<string, string> = {
    "Rendah": "#dcfce7", "Sedang": "#fef3c7", "Tinggi": "#ffedd5", "Darurat": "#fee2e2",
  };

  const filteredMaintenance = maintenanceRequests.filter(m => {
    const isStatusMatch = filterStatus === "all" || m.status === filterStatus;
    const searchMatch = !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.userName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.location || "").toLowerCase().includes(searchQuery.toLowerCase());
    return isStatusMatch && searchMatch;
  });

  if (loading) return <div style={{ padding: '2rem' }}>Memuat riwayat pemesanan...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Riwayat Booking</h2>
        <p style={{ color: 'var(--text-muted)' }}>Pantau dan kelola seluruh reservasi Anda di sini.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button onClick={() => { setActiveTab('meeting'); setFilterStatus('all'); }} className={`${styles.tabButton} ${activeTab === 'meeting' ? styles.active : ""}`}>🏢 Ruang Meeting</button>
        <button onClick={() => { setActiveTab('zoom'); setFilterStatus('all'); }} className={`${styles.tabButton} ${activeTab === 'zoom' ? styles.active : ""}`}>💻 Zoom Meeting</button>
        <button onClick={() => { setActiveTab('vehicle'); setFilterStatus('all'); }} className={`${styles.tabButton} ${activeTab === 'vehicle' ? styles.active : ""}`}>🚗 Peminjaman Kendaraan</button>
        <button onClick={() => { setActiveTab('item'); setFilterStatus('all'); }} className={`${styles.tabButton} ${activeTab === 'item' ? styles.active : ""}`}>📦 Permintaan Barang</button>
        <button onClick={() => { setActiveTab('maintenance'); setFilterStatus('all'); }} className={`${styles.tabButton} ${activeTab === 'maintenance' ? styles.active : ""}`}>🔧 Pemeliharaan</button>
      </div>

      {/* Filter & Search UI */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {userRole === "admin" && (
          <select 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minWidth: '150px' }}
          >
            <option value="all">Semua Waktu</option>
            <option value="hari">Hari Ini</option>
            <option value="minggu">Minggu Ini</option>
            <option value="bulan">Bulan Ini</option>
          </select>
        )}
        <input 
          type="text" 
          placeholder="Cari berdasarkan judul, nama pemesan..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
        />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minWidth: '150px' }}
        >
          <option value="all">Semua Status</option>
          {activeTab === 'meeting' || activeTab === 'zoom' ? (
            <>
              <option value="active">Aktif</option>
              <option value="cancelled">Dibatalkan</option>
            </>
          ) : activeTab === 'vehicle' ? (
            <>
              <option value="pending">Menunggu Validasi</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </>
          ) : activeTab === 'maintenance' ? (
            <>
              <option value="pending">Menunggu</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="completed">Selesai</option>
              <option value="rejected">Ditolak</option>
            </>
          ) : (
            <>
              <option value="pending">Pending</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="completed">Selesai</option>
            </>
          )}
        </select>
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
            displayRoomBookings.map(b => {
              const isPast = isPastDate((b as any).minDate || b.date);
              return (
              <div key={b.id || b.groupId} className={styles.card} style={{
                borderLeft: b.status === 'cancelled' ? '4px solid #CBD5E1' : isPast ? '4px solid #3B82F6' : '4px solid var(--primary)',
                opacity: b.status === 'cancelled' ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    {b.ticketId && (
                      <div style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        marginBottom: '0.5rem',
                        fontWeight: 700,
                        background: '#F1F5F9',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px dashed #CBD5E1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <span>🎫</span> #{b.ticketId}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>{b.title}</h4>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: 700,
                        background: b.status === 'cancelled' ? '#F1F5F9' : isPast ? '#DBEAFE' : '#D1FAE5',
                        color: b.status === 'cancelled' ? '#64748B' : isPast ? '#1E40AF' : '#10B981'
                      }}>{b.status === 'cancelled' ? 'DIBATALKAN' : isPast ? 'SELESAI' : 'AKTIF'}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      📍 {b.roomName} &bull; 🕒 {b.startTime} - {b.endTime}
                    </p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      📅 {(b as any).isGroup
                        ? `${new Date((b as any).minDate).toLocaleDateString()} - ${new Date((b as any).maxDate).toLocaleDateString()}`
                        : new Date(b.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      🏷️ <b>Jenis Meeting:</b> {b.meetingType || 'Internal Fungsi'} {b.isHybrid && <span style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: '0.5rem' }}>🌐 (Hybrid)</span>}
                    </p>
                    {userRole === "admin" && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.4rem 0.6rem', 
                        background: '#F0F9FF', 
                        borderRadius: '6px', 
                        border: '1px solid #BAE6FD',
                        fontSize: '0.8125rem',
                        color: '#0369A1',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <div>👤 <b>Pemesan:</b> <span style={{ fontWeight: 600 }}>{b.userName || "Tidak diketahui"}</span></div>
                        <div>🏢 <b>Fungsi / Bidang:</b> <span style={{ fontWeight: 600 }}>{b.division || "-"}</span></div>
                      </div>
                    )}

                    {activeTab === 'zoom' && b.meetingLink && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#F8FAFC',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.8125rem',
                        position: 'relative'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                          borderBottom: '1px solid #E2E8F0',
                          paddingBottom: '0.5rem'
                        }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.75rem' }}>🔗 INFORMASI ZOOM / MEETING</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(b.meetingLink || "");
                              alert("Undangan disalin ke clipboard!");
                            }}
                            style={{
                              background: 'white',
                              border: '1px solid var(--border)',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >Salin Undangan</button>
                        </div>
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          color: '#334155',
                          lineHeight: '1.5'
                        }}>
                          {b.meetingLink}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.rowActions}>
                    {b.status === 'active' && !isPastDate((b as any).minDate || b.date) ? (
                      <>
                        <button onClick={() => { setSelectedRoomBooking(b as BookingData); setIsRoomModalOpen(true); }} className={styles.btnEdit}>✏️ Edit</button>
                        <button onClick={() => openCancelConfirm(b.id!, activeTab, b.groupId)} className={styles.btnCancel}>🗑️ Batal</button>
                      </>
                    ) : b.status === 'active' && (
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', padding: '0.5rem' }}>Jadwal Telah Berlalu</span>
                    )}
                  </div>
                </div>
              </div>
            );
            })
          )
        )}

        {/* Render Vehicles */}
        {activeTab === 'vehicle' && (
          filteredVehicles.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</div>
              <h3>Belum ada peminjaman</h3>
              <p>Riwayat peminjaman kendaraan Anda akan muncul di sini.</p>
            </div>
          ) : (
            filteredVehicles.map(v => (
              <div key={v.id} className={styles.card} style={{
                borderLeft: `4px solid ${v.status === 'approved' ? '#10B981' : v.status === 'rejected' ? '#EF4444' : '#F59E0B'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    {v.ticketId && (
                      <div style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        marginBottom: '0.6rem',
                        fontWeight: 700,
                        background: '#F1F5F9',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        border: '1px dashed #CBD5E1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>🎫</span> #{v.ticketId}
                      </div>
                    )}
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.75rem' }}>{v.event}</h4>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>👤</span>
                        <span>PIC: <b style={{ color: 'var(--foreground)' }}>{v.userName}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>📍</span>
                        <span>Tujuan: <b style={{ color: 'var(--foreground)' }}>{v.destination}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: 700 }}>
                        <span style={{ fontSize: '1rem' }}>📅</span>
                        <span>
                          {v.endDate && v.endDate !== v.date
                            ? `${new Date(v.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(v.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : new Date(v.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                          }
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.8rem', borderRadius: '99px', background: '#F1F5F9', color: '#475569', fontWeight: 700, border: '1px solid #E2E8F0', textTransform: 'uppercase' }}>
                        {v.tripType === 'pp' ? '🔄 Pulang Pergi' : '➡️ Sekali Jalan'}
                      </span>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.25rem 0.8rem', borderRadius: '99px', fontWeight: 800, textTransform: 'uppercase',
                        background: v.status === 'approved' ? '#D1FAE5' : v.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                        color: v.status === 'approved' ? '#065F46' : v.status === 'rejected' ? '#991B1B' : '#92400E',
                        border: `1px solid ${v.status === 'approved' ? '#A7F3D0' : v.status === 'rejected' ? '#FECACA' : '#FDE68A'}`
                      }}>
                        {v.status === 'approved' ? '✓ DISETUJUI' : v.status === 'rejected' ? '✗ DITOLAK' : '⌛ MENUNGGU VALIDASI'}
                      </span>
                    </div>
                  </div>
                  {v.status !== 'approved' && v.status !== 'rejected' && (
                    <div className={styles.rowActions} style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setVehicleToEdit(v);
                          setIsVehicleModalOpen(true);
                        }}
                        className={styles.btnEdit}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', borderRadius: '8px' }}
                      >
                        <span>📝</span> Edit
                      </button>
                      <button
                        onClick={() => openCancelConfirm(v.id!, 'vehicle')}
                        className={styles.btnCancel}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', borderRadius: '8px' }}
                      >
                        <span>🗑️</span> Batalkan
                      </button>
                    </div>
                  )}
                </div>

                {v.vehicleNotes && (
                  <div style={{
                    marginTop: '1.25rem',
                    padding: '1rem 1.25rem',
                    background: 'linear-gradient(to right, #F0F9FF, #E0F2FE)',
                    borderRadius: '12px',
                    border: '1px solid #BAE6FD',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>🚐</div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', letterSpacing: '0.025em' }}>
                        Informasi Armada & Driver
                      </label>
                      <div style={{ color: '#0C4A6E', fontWeight: 700, fontSize: '0.925rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {v.vehicleNotes}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        )}

        {/* Render Items */}
        {activeTab === 'item' && (
          filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <h3>Belum ada permintaan</h3>
              <p>Daftar pengadaan ATK/Barang Anda akan muncul di sini.</p>
            </div>
          ) : (
            filteredItems.map(i => (
              <div key={i.id} className={styles.card} style={{
                borderLeft: `4px solid ${i.status === 'completed' ? '#3B82F6' : i.status === 'approved' ? '#10B981' : i.status === 'rejected' ? '#EF4444' : '#F59E0B'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    {i.ticketId && (
                      <div style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        marginBottom: '0.6rem',
                        fontWeight: 700,
                        background: '#F1F5F9',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        border: '1px dashed #CBD5E1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>🎫</span> #{i.ticketId}
                      </div>
                    )}
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.75rem' }}>{i.title}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span>📦</span> Kategori: <b style={{ color: 'var(--foreground)' }}>{i.category}</b>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span>📅</span> Diajukan: <b style={{ color: 'var(--foreground)' }}>{new Date(i.createdAt?.toMillis()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-block', fontSize: '0.65rem', padding: '0.25rem 0.8rem', borderRadius: '99px', fontWeight: 800, textTransform: 'uppercase',
                      background: i.status === 'completed' ? '#DBEAFE' : i.status === 'approved' ? '#D1FAE5' : i.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                      color: i.status === 'completed' ? '#1E40AF' : i.status === 'approved' ? '#065F46' : i.status === 'rejected' ? '#991B1B' : '#92400E',
                      border: `1px solid ${i.status === 'completed' ? '#BFDBFE' : i.status === 'approved' ? '#A7F3D0' : i.status === 'rejected' ? '#FECACA' : '#FDE68A'}`
                    }}>
                      {i.status === 'completed' ? '✓ SELESAI' : i.status === 'approved' ? '✓ DISETUJUI' : i.status === 'rejected' ? '✗ DITOLAK' : '⌛ PENDING'}
                    </span>
                  </div>
                  {i.status === 'pending' && (
                    <div className={styles.rowActions} style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => { setSelectedItem(i); setIsItemModalOpen(true); }}
                        className={styles.btnEdit}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', borderRadius: '8px' }}
                      >
                        <span>📝</span> Edit
                      </button>
                      <button
                        onClick={() => openCancelConfirm(i.id!, 'item')}
                        className={styles.btnCancel}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', borderRadius: '8px' }}
                      >
                        <span>🗑️</span> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        )}

        {/* Render Maintenance */}
        {activeTab === 'maintenance' && (
          filteredMaintenance.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
              <h3>Belum ada laporan pemeliharaan</h3>
              <p>Laporan gangguan fasilitas yang Anda buat akan muncul di sini.</p>
            </div>
          ) : (
            filteredMaintenance.map(m => {
              const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
                pending:     { label: '⌛ MENUNGGU',          bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
                in_progress: { label: '🔄 SEDANG DIKERJAKAN', bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' },
                completed:   { label: '✓ SELESAI',            bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
                rejected:    { label: '✗ DITOLAK',            bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
              };
              const sc = statusConfig[m.status] || statusConfig.pending;
              const borderColor = m.status === 'completed' ? '#10B981' : m.status === 'in_progress' ? '#3B82F6' : m.status === 'rejected' ? '#EF4444' : '#F59E0B';
              return (
                <div key={m.id} className={styles.card} style={{ borderLeft: `4px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      {m.ticketId && (
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569', marginBottom: '0.6rem', fontWeight: 700, background: '#F1F5F9', padding: '0.3rem 0.7rem', borderRadius: '4px', border: '1px dashed #CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>🎫</span> #{m.ticketId}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.1rem' }}>{MAINT_CATEGORY_ICON[m.category] || '🔧'}</span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{m.title}</h4>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 700, textTransform: 'uppercase', background: MAINT_PRIORITY_BG[m.priority] || '#F1F5F9', color: MAINT_PRIORITY_COLOR[m.priority] || '#475569', border: `1px solid ${MAINT_PRIORITY_COLOR[m.priority] || '#CBD5E1'}` }}>
                          {m.priority}
                        </span>
                        <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 700, textTransform: 'uppercase', background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                          {m.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div>📍 <b style={{ color: 'var(--foreground)' }}>{m.location}</b></div>
                        <div>📅 Dilaporkan: <b style={{ color: 'var(--foreground)' }}>{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</b></div>
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.65rem', padding: '0.3rem 0.9rem', borderRadius: '99px', fontWeight: 800, textTransform: 'uppercase', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                        {m.status === 'rejected' && m.rejectReason && (
                          <p style={{ fontSize: '0.8rem', color: '#991B1B', fontStyle: 'italic', marginTop: '0.4rem' }}>Alasan: {m.rejectReason}</p>
                        )}
                      </div>
                    </div>
                    {m.status === 'pending' && (
                      <div className={styles.rowActions}>
                        <button onClick={() => { setSelectedMaint(m); setIsMaintModalOpen(true); }} className={styles.btnEdit} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>📝</span> Edit
                        </button>
                        <button onClick={() => openCancelConfirm(m.id!, 'maintenance')} className={styles.btnCancel} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>🗑️</span> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}

      </div>

      {/* Modals */}
      {isRoomModalOpen && selectedRoomBooking && (
        <BookingModal
          isOpen={isRoomModalOpen}
          onClose={() => { setIsRoomModalOpen(false); setSelectedRoomBooking(null); fetchData(); }}
          rooms={rooms.filter(r => activeTab === "meeting" ? r.type === "physical" : r.type === "online")}
          selectedDate={selectedRoomBooking.date}
          editData={selectedRoomBooking}
        />
      )}

      {isVehicleModalOpen && (
        <VehicleBookingModal
          isOpen={isVehicleModalOpen}
          onClose={() => { setIsVehicleModalOpen(false); setVehicleToEdit(null); }}
          onSuccess={fetchData}
          editBooking={vehicleToEdit}
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

      {isMaintModalOpen && (
        <MaintenanceRequestModal
          isOpen={isMaintModalOpen}
          onClose={() => { setIsMaintModalOpen(false); setSelectedMaint(null); }}
          onSuccess={() => { setIsMaintModalOpen(false); setSelectedMaint(null); }}
          editItem={selectedMaint}
        />
      )}

      {isConfirmOpen && (
        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleCancelConfirm}
          title={itemToCancel?.type === 'maintenance' ? 'Hapus Laporan Pemeliharaan' : 'Konfirmasi Pembatalan'}
          message={itemToCancel?.type === 'maintenance' ? 'Apakah Anda yakin ingin menghapus laporan pemeliharaan ini?' : `Apakah Anda yakin ingin membatalkan/menghapus ${itemToCancel?.type === 'item' ? 'permintaan' : 'reservasi'} ini?`}
          confirmLabel={itemToCancel?.type === 'maintenance' ? 'Ya, Hapus' : 'Ya, Batalkan'}
          isLoading={cancelling}
        />
      )}
    </div>
  );
}
