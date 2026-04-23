"use client";

import { useState, useEffect } from "react";
import { createVehicleBooking, updateVehicleBooking, VehicleBooking } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import styles from "../app/dashboard/dashboard.module.css";

interface VehicleBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBooking?: VehicleBooking | null;
}

export default function VehicleBookingModal({ isOpen, onClose, onSuccess, editBooking }: VehicleBookingModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tripType: "pp" as "pp" | "one_way",
    date: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    userName: user?.displayName || "",
    userPhone: "",
    passengers: 1,
    event: "",
    pickupTime: "08:00",
    pickupLocation: "",
    destination: ""
  });

  useEffect(() => {
    if (isOpen && editBooking) {
      setFormData({
        tripType: editBooking.tripType,
        date: editBooking.date,
        endDate: editBooking.endDate || editBooking.date,
        userName: editBooking.userName,
        userPhone: editBooking.userPhone,
        passengers: editBooking.passengers,
        event: editBooking.event,
        pickupTime: editBooking.pickupTime,
        pickupLocation: editBooking.pickupLocation,
        destination: editBooking.destination
      });
    } else if (isOpen && !editBooking) {
      setFormData({
        tripType: "pp",
        date: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        userName: user?.displayName || "",
        userPhone: "",
        passengers: 1,
        event: "",
        pickupTime: "08:00",
        pickupLocation: "",
        destination: ""
      });
    }
  }, [isOpen, editBooking, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showToast("Sesi habis, silakan login kembali.", "error");

    if (!formData.pickupLocation.trim() || !formData.destination.trim() || !formData.event.trim()) {
      return showToast("Mohon lengkapi semua field yang tersedia.", "warning");
    }

    setLoading(true);
    try {
      // Auto-calculate duration
      const s = new Date(formData.date);
      const e = new Date(formData.endDate);
      const diffTime = e.getTime() - s.getTime();
      const duration = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      if (editBooking && editBooking.id) {
        await updateVehicleBooking(editBooking.id, {
          userName: formData.userName,
          userPhone: formData.userPhone,
          tripType: formData.tripType,
          date: formData.date,
          endDate: formData.endDate,
          duration: duration,
          passengers: Number(formData.passengers),
          event: formData.event,
          pickupTime: formData.pickupTime,
          pickupLocation: formData.pickupLocation,
          destination: formData.destination
        });
        showToast("Pengajuan kendaraan berhasil diperbarui!", "success");
      } else {
        await createVehicleBooking({
          userId: user.uid,
          userName: formData.userName,
          userPhone: formData.userPhone,
          tripType: formData.tripType,
          date: formData.date,
          endDate: formData.endDate,
          duration: duration,
          passengers: Number(formData.passengers),
          event: formData.event,
          pickupTime: formData.pickupTime,
          pickupLocation: formData.pickupLocation,
          destination: formData.destination
        });
        showToast("Pengajuan kendaraan berhasil dikirim! Silakan pantau status pengajuan Anda di halaman Riwayat Booking.", "success");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast("Gagal mengirim pengajuan: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Formulir Peminjaman Kendaraan</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Jenis Perjalanan</label>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="tripType" 
                  checked={formData.tripType === "pp"} 
                  onChange={() => setFormData({...formData, tripType: "pp"})}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                Pulang Pergi (PP)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="tripType" 
                  checked={formData.tripType === "one_way"} 
                  onChange={() => setFormData({...formData, tripType: "one_way"})}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                Sekali Jalan
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tanggal Mulai</label>
              <input 
                type="date" 
                required 
                value={formData.date} 
                onChange={e => {
                  const newDate = e.target.value;
                  setFormData(prev => ({
                    ...prev, 
                    date: newDate,
                    endDate: prev.endDate < newDate ? newDate : prev.endDate
                  }));
                }} 
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nama Pengguna / PIC</label>
              <input 
                type="text" 
                required 
                placeholder="Nama Lengkap" 
                value={formData.userName} 
                onChange={e => setFormData({...formData, userName: e.target.value})} 
                className={styles.textInput} 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>No. HP PIC</label>
              <input 
                type="tel" 
                required 
                placeholder="Contoh: 0812..." 
                value={formData.userPhone} 
                onChange={e => setFormData({...formData, userPhone: e.target.value.replace(/[^0-9]/g, '')})} 
                className={styles.textInput} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div className={styles.formGroup}>
              <label className={styles.formLabel}>Jumlah Penumpang</label>
              <input 
                type="number" 
                min="1" 
                required 
                value={formData.passengers} 
                onChange={e => {
                  const val = e.target.value === "" ? "" : parseInt(e.target.value);
                  setFormData({...formData, passengers: val as any});
                }} 
                className={styles.textInput} 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Jam Penjemputan (24 Jam)</label>
              <input 
                type="text" 
                required 
                placeholder="Cth: 14:00"
                value={formData.pickupTime} 
                onChange={e => {
                  let val = e.target.value.replace(/[^0-9:]/g, '');
                  if (val.length === 2 && !val.includes(':') && !e.target.value.endsWith(':')) {
                    if (e.target.value.length > formData.pickupTime.length) val += ':';
                  }
                  if (val.length > 5) val = val.substring(0, 5);
                  setFormData({...formData, pickupTime: val});
                }} 
                onBlur={e => {
                  // Simple validation on blur
                  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                  if (formData.pickupTime && !regex.test(formData.pickupTime)) {
                    showToast("Format jam tidak valid. Gunakan format HH:mm (00:00 - 23:59)", "warning");
                  }
                }}
                className={styles.textInput} 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Acara / Keperluan Penggunaan</label>
            <input 
              type="text" 
              required 
              placeholder="Cth: Management Walkdown Repair Coupling" 
              value={formData.event} 
              onChange={e => setFormData({...formData, event: e.target.value})} 
              className={styles.textInput} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tempat Penjemputan (Detail Alamat)</label>
            <textarea 
              required 
              placeholder="Masukkan alamat lengkap penjemputan..." 
              value={formData.pickupLocation} 
              onChange={e => setFormData({...formData, pickupLocation: e.target.value})} 
              className={styles.textInput} 
              style={{ minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tujuan</label>
            <input 
              type="text" 
              required 
              placeholder="Cth: PLTU Indramayu" 
              value={formData.destination} 
              onChange={e => setFormData({...formData, destination: e.target.value})} 
              className={styles.textInput} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.875rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Mengirim...' : (editBooking ? 'Simpan Perubahan' : 'Ajukan Peminjaman')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
