"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VehicleBookingModal from "@/components/VehicleBookingModal";
import styles from "../dashboard.module.css";

export default function VehiclesPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem' 
      }}>
        <div>
          <button onClick={() => router.push('/dashboard/booking')} className={styles.backBtn}>
            &larr; Ganti Kategori
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Peminjaman Kendaraan</h2>
          <p style={{ color: 'var(--text-muted)' }}>Silakan buat pengajuan kendaraan operasional UMRO di bawah ini.</p>
        </div>
      </div>

      <div className={styles.card} style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--border)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🚗</div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Butuh Kendaraan Operasional?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px', marginInline: 'auto' }}>
          Klik tombol di bawah untuk mengisi formulir peminjaman. Seluruh pengajuan Anda dapat dipantau di halaman Riwayat Booking.
        </p>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="btn-primary"
          style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}
        >
          + Mulai Buat Pengajuan
        </button>
      </div>

      <VehicleBookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          router.push('/dashboard/my-bookings');
        }}
      />
    </div>
  );
}
