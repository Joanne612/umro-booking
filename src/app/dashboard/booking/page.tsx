"use client";

import styles from "../dashboard.module.css";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import BookingModal from "@/components/BookingModal";
import BookingDetailModal from "@/components/BookingDetailModal";
import { CalendarSkeleton } from "@/components/Skeleton";
import { subscribeToBookingsRange, BookingData, initAndGetRooms, Room } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";

// Dynamic import for FullCalendar to avoid SSR issues
const CalendarView = dynamic(() => import("@/components/CalendarView"), { 
  ssr: false,
  loading: () => <CalendarSkeleton />
});

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1"
];

export default function BookingPage() {
  const router = useRouter();
  const { user, userRole } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"physical" | "online" | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalTime, setModalTime] = useState("09:00");
  
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Load rooms
  useEffect(() => {
    initAndGetRooms().then(res => {
      setRooms(res);
      setRoomsLoading(false);
    });
  }, []);

  // Map rooms to colors
  const roomColors = useMemo(() => {
    const mapping: Record<string, string> = {};
    rooms.forEach((room, index) => {
      mapping[room.id] = COLORS[index % COLORS.length];
    });
    return mapping;
  }, [rooms]);

  // Handle Firebase Subscription based on visible range
  useEffect(() => {
    if (!selectedType || !dateRange.start || !dateRange.end) return;

    // We fetch a slightly wider range to be safe
    const unsubscribe = subscribeToBookingsRange(dateRange.start, dateRange.end, (data) => {
      setBookings(data);
    });

    return () => unsubscribe();
  }, [selectedType, dateRange]);

  const handleDateClick = (dateStr: string, timeStr?: string) => {
    if (userRole === "view") return; // Prevent view-only users from opening modal
    setModalDate(dateStr);
    if (timeStr) setModalTime(timeStr);
    setIsModalOpen(true);
  };

  const handleEventClick = (booking: BookingData) => {
    setSelectedBooking(booking);
  };

  // 1. Initial Type Selection Screen
  if (!selectedType) {
    if (roomsLoading) return <div className={styles.selectionContainer}><CalendarSkeleton /></div>;

    return (
      <div className={styles.selectionContainer}>
        <h2 className={styles.selectionTitle}>Layanan Terpadu UMRO</h2>
        <p className={styles.selectionSubtitle}>Pilih salah satu layanan untuk memulai</p>
        
        <div className={styles.categoryGrid}>
          <button 
            onClick={() => setSelectedType('physical')}
            className={styles.categoryCard}
          >
            <div className={styles.categoryIcon}>🏢</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ruang Meeting</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Koordinasi Tatap Muka (Luring)</p>
          </button>

          <button 
            onClick={() => setSelectedType('online')}
            className={styles.categoryCard}
          >
            <div className={styles.categoryIcon}>💻</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Zoom Meeting</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Koordinasi Virtual (Daring)</p>
          </button>

          {userRole !== "view" && (
            <>
              <button 
                onClick={() => router.push('/dashboard/vehicles')}
                className={styles.categoryCard}
              >
                <div className={styles.categoryIcon}>🚗</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Kendaraan Dinas</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Peminjaman Mobil Pool</p>
              </button>

              <button 
                onClick={() => router.push('/dashboard/item-requests')}
                className={styles.categoryCard}
              >
                <div className={styles.categoryIcon}>📦</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Permintaan Barang</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Pengadaan ATK & Lainnya</p>
              </button>

              {(userRole === "staff_umum" || userRole === "admin") && (
                <button
                  onClick={() => router.push('/dashboard/maintenance-requests')}
                  className={styles.categoryCard}
                >
                  <div className={styles.categoryIcon}>🔧</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Pemeliharaan Fasilitas</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                    Laporan AC, Gedung & Utilitas
                  </p>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const filteredRooms = rooms.filter(r => r.type === selectedType);
  
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className={styles.dashboardHeader}>
        <div>
          <button onClick={() => { setSelectedType(null); setSelectedRoomId("all"); }} className={styles.backBtn}>
            &larr; Ganti Kategori
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {selectedType === 'physical' ? 'Kalender Ruang Meeting' : 'Kalender Zoom Meeting'}
          </h2>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Filter Ruangan:</span>
            <select 
              value={selectedRoomId} 
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className={styles.selectInput}
            >
              <option value="all">Semua Ruangan</option>
              {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {userRole !== "view" && (
            <button className="btn-primary" onClick={() => { setModalTime("09:00"); setIsModalOpen(true); }}>+ Booking Baru</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <CalendarView 
          bookings={bookings.filter(b => filteredRooms.some(r => r.id === b.roomId))}
          selectedRoomId={selectedRoomId}
          roomColors={roomColors}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onRangeChange={(start, end) => setDateRange({ start, end })}
        />
      </div>

      {isModalOpen && (
        <BookingModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          rooms={filteredRooms}
          selectedDate={modalDate}
          initialTime={modalTime}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          roomType={selectedType || undefined}
          onClose={() => setSelectedBooking(null)}
          onRefresh={() => {}} /* onSnapshot will handle auto-refresh */
        />
      )}
    </div>
  );
}
