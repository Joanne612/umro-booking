"use client";

import React, { useState, useEffect } from "react";
import styles from "../app/dashboard/dashboard.module.css";
import { BookingData } from "@/lib/firebase/firestore";

interface UpdateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (link: string) => Promise<void>;
  booking: BookingData | null;
}

export default function UpdateLinkModal({
  isOpen,
  onClose,
  onSave,
  booking
}: UpdateLinkModalProps) {
  const [meetingLink, setMeetingLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setMeetingLink(booking.meetingLink || "");
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleSave = async () => {
    if (!meetingLink.trim()) {
      alert("Mohon masukkan link meeting yang valid.");
      return;
    }
    
    setIsLoading(true);
    try {
      await onSave(meetingLink);
      onClose();
    } catch (error) {
      console.error("Failed to save link:", error);
      alert("Gagal menyimpan link. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '550px', 
          padding: '0', 
          borderRadius: 'var(--radius-lg)', 
          overflow: 'hidden',
          animation: 'modalScale 0.3s ease' 
        }}
      >
        {/* Header Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary), #0ea5e9)', 
          padding: '2rem', 
          color: 'white' 
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>🌐 Input Link Meeting</h2>
          <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Berikan tautan akses untuk pertemuan virtual ini.</p>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Detail Card */}
          <div style={{ 
            background: '#F8FAFC', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid #E2E8F0',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#0F172A', lineHeight: 1.4 }}>
              {booking.title}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Ruangan</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>📍 {booking.roomName}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Pemesan</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>👤 {booking.userName}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tanggal</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>📅 {new Date(booking.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Waktu</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>🕒 {booking.startTime} - {booking.endTime} WITA</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Informasi / Undangan Meeting</label>
            <textarea
              className={styles.textInput}
              placeholder="Tempel tautan atau undangan lengkap di sini (Zoom/GMeet/Teams).Contoh:&#10;Topic: Penting&#10;Join Meeting: https://zoom.us/j/...&#10;Passcode: 12345"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              autoFocus
              rows={6}
              style={{ padding: '1rem', resize: 'vertical', lineHeight: 'normal' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              *Seluruh teks undangan yang Anda masukkan akan tampil rapi di halaman 'Riwayat Booking' milik pemesan.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: '0.875rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border)', 
                background: 'white', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              style={{ 
                flex: 2, 
                padding: '0.875rem', 
                borderRadius: 'var(--radius-md)', 
                border: 'none', 
                background: 'var(--primary)', 
                color: 'white', 
                fontWeight: 700, 
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(6, 182, 212, 0.4)'
              }}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Link Meeting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
