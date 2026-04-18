"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import styles from "../dashboard.module.css";

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setNewName(user.displayName || user.email || "");
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    setLoading(true);
    try {
      // 1. Update ke Sistem Autentikasi Google
      await updateProfile(user, { displayName: newName });

      // 2. Update ke Database Sinkronisasi Firestore kita
      if (db) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { name: newName });
      }
      
      showToast("Nama Profil Berhasil Diganti!", "success");
      
      // Delay reload slightly to allow toast to be seen
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      showToast("Gagal merubah profil: " + error.message, "error");
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '600px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Profil & Akun</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Sesuaikan nama tampilan Anda di sistem pemesanan ruangan.</p>

      <div className={styles.card} style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Identitas Dasar</h3>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span style={{ fontSize: '2rem' }}>👤</span>
            )}
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email Terdaftar</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user.email}</div>
            <div style={{ marginTop: '0.25rem' }}>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, background: userRole === 'admin' ? '#FEE2E2' : '#E0F2FE', color: userRole === 'admin' ? '#EF4444' : '#0284C7' }}>
                Hak Akses: {userRole === 'admin' ? 'Administrator' : 'Karyawan'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Nama Tampilan (Display Name)</label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              placeholder="Contoh: Budi Santoso (Div. IT)"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Nama ini akan muncul pada tabel kalender jadwal saat Anda memesan ruangan. Perubahan nama baru tidak akan merubah sejarah rekaman jadwal Anda yang sudah lama terlewat.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Nama'}
          </button>
        </form>
      </div>
    </div>
  );
}
