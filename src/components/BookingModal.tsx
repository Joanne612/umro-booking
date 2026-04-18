"use client";

import { useState, useEffect } from "react";
import { createBooking, checkBookingConflict, BookingData as FullBookingData, Room } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import styles from "../app/dashboard/dashboard.module.css";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  selectedDate: string;
  initialTime?: string;
}

// Generate 24-hour time slots to prevent AM/PM browser issues
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
};
const timeSlots = generateTimeSlots();

export default function BookingModal({ isOpen, onClose, rooms, selectedDate, initialTime }: BookingModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    roomId: rooms[0]?.id || "",
    date: selectedDate,
    title: "",
    division: "",
    participants: 1,
    startTime: initialTime || "09:00",
    endTime: "10:00" // Will be synced in useEffect
  });

  const [conflict, setConflict] = useState<FullBookingData | null>(null);
  const [checking, setChecking] = useState(false);

  // Sync modal date and initial time when props change
  useEffect(() => {
    let start = initialTime || "09:00";

    // Auto-calculate end time (1 hour later)
    let [h, m] = start.split(':').map(Number);
    let endH = h + 1;
    let end = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    setFormData(prev => ({
      ...prev,
      date: selectedDate,
      startTime: start,
      endTime: end,
      roomId: rooms[0]?.id || prev.roomId
    }));
  }, [selectedDate, initialTime, rooms]);

  // Real-time conflict check
  useEffect(() => {
    if (!formData.roomId || !formData.date || !formData.startTime || !formData.endTime) return;

    const check = async () => {
      setChecking(true);
      try {
        const result = await checkBookingConflict(
          formData.roomId,
          formData.date,
          formData.startTime,
          formData.endTime
        );
        setConflict(result);
      } catch (err) {
        console.error("Conflict check failed:", err);
      } finally {
        setChecking(false);
      }
    };

    const timer = setTimeout(check, 500); // Debounce
    return () => clearTimeout(timer);
  }, [formData.roomId, formData.date, formData.startTime, formData.endTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showToast("Anda harus login untuk membooking.", "error");

    // Basic Client validation
    if (formData.endTime <= formData.startTime) {
      return showToast("Waktu selesai harus lebih besar dari waktu mulai.", "warning");
    }

    setLoading(true);
    try {
      const room = rooms.find(r => r.id === formData.roomId);
      await createBooking({
        roomId: formData.roomId,
        roomName: room?.name || "Unknown",
        title: formData.title,
        division: formData.division,
        participants: Number(formData.participants),
        date: formData.date, // Use the freely editable date
        startTime: formData.startTime,
        endTime: formData.endTime,
        userId: user.uid,
        userName: user.displayName || user.email || "Unknown",
        createdAt: new Date() // Placeholder, converted to Timestamp in firestore.ts
      });
      showToast("Booking berhasil dibuat!", "success");
      onClose();
    } catch (error: any) {
      showToast("Gagal membooking: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Buat Booking Baru</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Real-time Warning */}
          {conflict && (
            <div className={styles.conflictWarning}>
              ⚠️ <strong>Sudah Dipesan:</strong> {conflict.userName} ({conflict.startTime} - {conflict.endTime})
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tanggal</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={styles.textInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Pilih Ruang</label>
            <select required value={formData.roomId} onChange={(e) => setFormData({ ...formData, roomId: e.target.value })} className={styles.selectField}>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name} ({room.type === 'online' ? 'Online' : 'Meeting'})</option>
              ))}
            </select>
            {/* Elegant Room Description Info Box */}
            {rooms.find(r => r.id === formData.roomId)?.description && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderLeft: '4px solid var(--primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>ℹ️</span> Detail & Fasilitas Ruangan:
                </div>
                {rooms.find(r => r.id === formData.roomId)?.description}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Judul Kegiatan / Meeting</label>
            <input 
              required 
              type="text" 
              maxLength={60}
              placeholder="Cth: Rapat Evaluasi Bulanan (Maks 60 Karakter)" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              className={styles.textInput} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Fungsi / Bidang</label>
              <input 
                required 
                type="text" 
                maxLength={30}
                placeholder="Cth: SDM / Teknik" 
                value={formData.division} 
                onChange={(e) => setFormData({ ...formData, division: e.target.value })} 
                className={styles.textInput} 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Jumlah Peserta</label>
              <input
                required
                type="number"
                min="1"
                max="500"
                placeholder="Cth: 10"
                value={formData.participants || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, participants: val === "" ? 0 : parseInt(val) });
                }}
                className={styles.textInput}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Waktu Mulai</label>
              <select required value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className={styles.selectField}>
                {timeSlots.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Waktu Selesai</label>
              <select required value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className={styles.selectField}>
                {timeSlots.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 500, cursor: 'pointer' }}>Batal</button>
            <button type="submit" disabled={loading || !!conflict || checking} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: conflict ? '#94A3B8' : 'var(--primary)', color: 'white', fontWeight: 600, cursor: (loading || !!conflict || checking) ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Menyimpan...' : (conflict ? 'Waktu Bentrok' : 'Booking Ruangan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
