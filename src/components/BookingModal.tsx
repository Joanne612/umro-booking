"use client";

import { useState, useEffect } from "react";
import { createBooking, updateBooking, checkBookingConflict, getDatesInRange, deleteBooking, getBookingsByGroupId, BookingData as FullBookingData, Room } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import styles from "../app/dashboard/dashboard.module.css";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  selectedDate: string;
  initialTime?: string;
  editData?: FullBookingData | null;
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

export default function BookingModal({ 
  isOpen, 
  onClose, 
  rooms, 
  selectedDate, 
  initialTime,
  editData 
}: BookingModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    roomId: rooms[0]?.id || "",
    date: selectedDate,
    endDate: selectedDate, // Tambahkan endDate
    title: "",
    division: "",
    participants: 1,
    startTime: initialTime || "09:00",
    endTime: "10:00",
    consumption: {
      requested: false,
      morningSnack: false,
      lunch: false,
      afternoonSnack: false,
      notes: ""
    }
  });

  const [conflict, setConflict] = useState<FullBookingData | null>(null);
  const [checking, setChecking] = useState(false);

  // Sync modal date and initial time OR edit data when props change
  useEffect(() => {
    if (editData) {
      setFormData({
        roomId: editData.roomId,
        date: editData.date,
        endDate: editData.endDate || editData.date,
        title: editData.title,
        division: editData.division,
        participants: editData.participants,
        startTime: editData.startTime,
        endTime: editData.endTime,
        consumption: {
          requested: editData.consumption?.requested || false,
          morningSnack: editData.consumption?.morningSnack || false,
          lunch: editData.consumption?.lunch || false,
          afternoonSnack: editData.consumption?.afternoonSnack || false,
          notes: editData.consumption?.notes || ""
        }
      });
    } else {
      let start = initialTime || "09:00";
      let [h, m] = start.split(':').map(Number);
      let endH = h + 1;
      let end = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      setFormData({
        roomId: rooms[0]?.id || "",
        date: selectedDate,
        endDate: selectedDate,
        title: "",
        division: "",
        participants: 1,
        startTime: start,
        endTime: end,
        consumption: {
          requested: false,
          morningSnack: false,
          lunch: false,
          afternoonSnack: false,
          notes: ""
        }
      });
    }
  }, [isOpen, editData, selectedDate, initialTime, rooms]);

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
          formData.endTime,
          editData?.id,
          editData?.groupId
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
  }, [formData.roomId, formData.date, formData.startTime, formData.endTime, editData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showToast("Anda harus login untuk membooking.", "error");

    if (formData.endTime <= formData.startTime) {
      return showToast("Waktu selesai harus lebih besar dari waktu mulai.", "warning");
    }

    setLoading(true);
    try {
      const room = rooms.find(r => r.id === formData.roomId);
      const isMultiDay = formData.endDate > formData.date;
      const dates = isMultiDay ? getDatesInRange(formData.date, formData.endDate) : [formData.date];

      // 1. Check conflicts for ALL days first
      for (const date of dates) {
        const conflictOnDate = await checkBookingConflict(formData.roomId, date, formData.startTime, formData.endTime, editData?.id, editData?.groupId);
        if (conflictOnDate) {
          throw new Error(`Bentrok pada tanggal ${date}: Ruangan ini sudah dibooking oleh ${conflictOnDate.userName} (${conflictOnDate.startTime} - ${conflictOnDate.endTime}).`);
        }
      }

      // 2. Process create/update
      if (editData?.id) {
        const groupId = editData.groupId || (isMultiDay ? `group_${user.uid}_${Date.now()}` : undefined);
        
        // If it's a group, we need to sync others
        if (groupId) {
          const groupBookings = await getBookingsByGroupId(groupId);
          const newDates = dates; // From getDatesInRange(formData.date, formData.endDate)
          
          // Identify existing dates in group (including original single booking if converting)
          let effectiveGroupBookings = groupBookings;
          if (!editData.groupId && editData.id) {
            effectiveGroupBookings = [...groupBookings, editData as FullBookingData];
          }
          const existingDateMap = new Map(effectiveGroupBookings.map(b => [b.date, b]));

          // A. Update or Create for the new range
          for (const date of newDates) {
            const existingInGroup = existingDateMap.get(date);
            const payload = {
              roomId: formData.roomId,
              roomName: room?.name || "Unknown",
              title: formData.title,
              division: formData.division,
              participants: Number(formData.participants),
              date: date,
              startTime: formData.startTime,
              endTime: formData.endTime,
              userId: user.uid,
              userName: user.displayName || user.email || "Unknown",
              createdAt: existingInGroup?.createdAt || new Date(),
              ...(groupId && { groupId }),
              ...(isMultiDay && { endDate: formData.endDate }), // Store the range info in every doc
              // Always sync consumption if it existed before or is currently requested
              ...((existingInGroup?.consumption || formData.consumption.requested) ? {
                consumption: {
                  requested: formData.consumption.requested,
                  morningSnack: formData.consumption.morningSnack,
                  lunch: formData.consumption.lunch,
                  afternoonSnack: formData.consumption.afternoonSnack,
                  notes: formData.consumption.notes,
                  status: (existingInGroup?.consumption?.status || "pending") as any
                }
              } : {}),
            };

            if (existingInGroup?.id) {
              await updateBooking(existingInGroup.id, payload);
            } else {
              await createBooking(payload);
            }
          }

          // B. Delete those outside the new range
          const newDateSet = new Set(newDates);
          for (const b of groupBookings) {
            if (!newDateSet.has(b.date) && b.id) {
              await deleteBooking(b.id);
            }
          }
          
          showToast("Rangkaian booking berhasil diperbarui!", "success");
        } else {
          // Standard single edit (no groupId and not changing to range)
          const bookingPayload = {
            roomId: formData.roomId,
            roomName: room?.name || "Unknown",
            title: formData.title,
            division: formData.division,
            participants: Number(formData.participants),
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            userId: user.uid,
            userName: user.displayName || user.email || "Unknown",
            createdAt: editData?.createdAt || new Date(),
            // Always sync consumption if it existed before or is currently requested
            ...((editData?.consumption || formData.consumption.requested) ? {
              consumption: {
                ...formData.consumption,
                status: (editData?.consumption?.status || "pending") as "pending" | "approved" | "rejected" | "completed"
              }
            } : {})
          };
          await updateBooking(editData.id, bookingPayload);
          showToast("Booking berhasil diperbarui!", "success");
        }
      } else {
        const groupId = isMultiDay ? `group_${user.uid}_${Date.now()}` : undefined;
        
        for (const date of dates) {
          const bookingPayload = {
            roomId: formData.roomId,
            roomName: room?.name || "Unknown",
            title: formData.title,
            division: formData.division,
            participants: Number(formData.participants),
            date: date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            userId: user.uid,
            userName: user.displayName || user.email || "Unknown",
            createdAt: new Date(),
            ...(groupId && { groupId }),
            ...(isMultiDay && { endDate: formData.endDate }),
            ...(formData.consumption.requested ? {
              consumption: {
                ...formData.consumption,
                status: "pending" as "pending"
              }
            } : {})
          };
          await createBooking(bookingPayload);
        }

        showToast(
          isMultiDay 
            ? `Berhasil membooking ${dates.length} hari!`
            : (formData.consumption.requested 
                ? "Booking berhasil! Permintaan konsumsi sedang menunggu persetujuan Asman Umum." 
                : "Booking berhasil dibuat!"), 
          "success"
        );
      }
      onClose();
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {editData ? "Edit Booking Ruangan" : "Buat Booking Baru"}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Real-time Warning */}
          {conflict && (
            <div className={styles.conflictWarning}>
              ⚠️ <strong>Sudah Dipesan:</strong> {conflict.userName} ({conflict.startTime} - {conflict.endTime})
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tanggal Mulai</label>
              <input 
                type="date" 
                required 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                className={styles.textInput} 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sampai Tanggal</label>
              <input 
                type="date" 
                required 
                min={formData.date}
                value={formData.endDate} 
                onChange={e => setFormData({...formData, endDate: e.target.value})} 
                className={styles.textInput} 
              />
            </div>
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
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
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

          {/* CONSUMPTION SECTION */}
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            border: formData.consumption.requested ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: formData.consumption.requested ? 'rgba(59, 130, 246, 0.02)' : 'var(--surface)',
            transition: 'all 0.3s ease'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, marginBottom: formData.consumption.requested ? '1rem' : '0' }}>
              <input 
                type="checkbox" 
                checked={formData.consumption.requested} 
                onChange={(e) => setFormData({ 
                  ...formData, 
                  consumption: { ...formData.consumption, requested: e.target.checked }
                })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              🍴 Ingin Memesan Fasilitas Konsumsi?
            </label>

            {formData.consumption.requested && (
              <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', paddingLeft: '2rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.consumption.morningSnack} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consumption: { ...formData.consumption, morningSnack: e.target.checked }
                      })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Snack Pagi
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.consumption.lunch} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consumption: { ...formData.consumption, lunch: e.target.checked }
                      })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Makan Siang
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.consumption.afternoonSnack} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consumption: { ...formData.consumption, afternoonSnack: e.target.checked }
                      })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Snack Sore
                  </label>
                </div>
                
                <div style={{ paddingLeft: '2rem' }}>
                  <label className={styles.formLabel} style={{ fontSize: '0.8rem' }}>Catatan Khusus (Opsional)</label>
                  <input 
                    type="text" 
                    placeholder="Cth: Alergi kacang, Vegetarian, dsb." 
                    value={formData.consumption.notes}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      consumption: { ...formData.consumption, notes: e.target.value } 
                    })}
                    className={styles.textInput}
                    style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    *Permintaan konsumsi memerlukan persetujuan dari Asman Umum.
                  </p>
                </div>
              </div>
            )}
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
