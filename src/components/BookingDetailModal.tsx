"use client";

import React from "react";
import { BookingData, cancelBooking, updateBookingMeetingLink } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import styles from "../app/dashboard/dashboard.module.css";

interface BookingDetailModalProps {
  booking: BookingData | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function BookingDetailModal({ booking, onClose, onRefresh }: BookingDetailModalProps) {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  
  // Link Meeting State
  const [isEditingLink, setIsEditingLink] = React.useState(false);
  const [currentMeetingLink, setCurrentMeetingLink] = React.useState(booking?.meetingLink || "");
  const [tempLink, setTempLink] = React.useState(booking?.meetingLink || "");
  const [savingLink, setSavingLink] = React.useState(false);
  
  if (!booking) return null;

  const isOwner = user?.uid === booking.userId && userRole !== "view";

  const handleCancel = async () => {
    if (!booking.id) return;
    setCancelling(true);

    try {
      await cancelBooking(booking.id);
      showToast("Jadwal berhasil dibatalkan.", "success");
      onRefresh();
      onClose();
    } catch (error: any) {
      showToast("Gagal membatalkan: " + error.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateLink = async () => {
    if (!booking?.id) return;
    setSavingLink(true);
    try {
      await updateBookingMeetingLink(booking.id, tempLink);
      showToast("Link rapat berhasil diperbarui!", "success");
      setIsEditingLink(false);
      setCurrentMeetingLink(tempLink);
    } catch (error: any) {
      showToast("Gagal memperbarui link: " + error.message, "error");
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '450px', padding: '0' }}
      >
        {/* Header with Color Bar */}
        <div style={{ 
          height: '8px', 
          backgroundColor: 'var(--primary)', 
          borderTopLeftRadius: 'var(--radius-lg)', 
          borderTopRightRadius: 'var(--radius-lg)' 
        }}></div>
        
        <div style={{ padding: '2rem' }}>
          {isConfirming ? (
            /* CONFIRMATION VIEW */
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Konfirmasi Pembatalan</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
                Apakah Anda yakin ingin membatalkan reservasi koordinasi untuk kegiatan:<br/>
                <strong style={{ color: 'var(--foreground)' }}>"{booking.title}"</strong>?<br/>
                <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.75rem' }}>
                  Catatan: Data reservasi yang telah dibatalkan akan dihapus secara permanen dari basis data sistem dan tidak dapat dipulihkan kembali.
                </span>
              </p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setIsConfirming(false)} 
                  disabled={cancelling}
                  style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Tidak, Kembali
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  {cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
                </button>
              </div>
            </div>
          ) : (
            /* DETAIL VIEW */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                  Detail Agenda
                </h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Title Section */}
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Kegiatan / Meeting
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{booking.title}</div>
                </div>

                {/* Grid for Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ruangan</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                      <span style={{ fontSize: '1.2rem' }}>🏢</span> {booking.roomName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tanggal</div>
                    <div style={{ fontWeight: 500 }}>📅 {booking.date}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Waktu</div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>🕒 {booking.startTime} - {booking.endTime}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Jumlah Peserta</div>
                    <div style={{ fontWeight: 600 }}>👤 {booking.participants} Orang</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Divisi</div>
                    <div style={{ fontWeight: 500 }}>👥 {booking.division}</div>
                  </div>
                </div>

                {/* --- SEKSI LINK MEETING --- */}
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--primary-light)', 
                  background: 'rgba(59, 130, 246, 0.03)',
                  animation: 'fadeIn 0.4s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🎥 LINK KOORDINASI (MEETING)
                    </div>
                    {userRole === "admin" && !isEditingLink && (
                      <button 
                        onClick={() => setIsEditingLink(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {currentMeetingLink ? 'Ubah Link' : '+ Tambah Link'}
                      </button>
                    )}
                  </div>

                  {isEditingLink ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <textarea 
                        value={tempLink} 
                        onChange={(e) => setTempLink(e.target.value)}
                        placeholder="Tempel detail undangan rapat di sini (Topic, Link, ID, Passcode)..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)', fontSize: '0.875rem', minHeight: '120px', fontFamily: 'inherit' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => { setIsEditingLink(false); setTempLink(currentMeetingLink); }}
                          style={{ padding: '0.6rem 1rem', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Batal
                        </button>
                        <button 
                          onClick={handleUpdateLink}
                          disabled={savingLink}
                          style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {savingLink ? 'Menyimpan...' : 'Simpan Detail'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {currentMeetingLink ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ 
                            backgroundColor: 'white', 
                            padding: '1rem', 
                            borderRadius: 'var(--radius-sm)', 
                            border: '1px solid var(--border)',
                            fontSize: '0.875rem',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: '#334155',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {currentMeetingLink}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(currentMeetingLink);
                                showToast("Detail rapat berhasil disalin!", "success");
                              }}
                              style={{ 
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--primary)',
                                background: 'white',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              📋 Salin Undangan
                            </button>
                            
                            {/* Attempt to extract first URL for a quick-join button */}
                            {(() => {
                              const urlMatch = currentMeetingLink.match(/https?:\/\/[^\s]+/);
                              if (urlMatch) {
                                return (
                                  <a 
                                    href={urlMatch[0]} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ 
                                      flex: 1,
                                      padding: '0.75rem',
                                      borderRadius: 'var(--radius-md)',
                                      background: 'var(--primary)',
                                      color: 'white',
                                      fontWeight: 600,
                                      textDecoration: 'none',
                                      textAlign: 'center',
                                      fontSize: '0.875rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    🚀 Join Meeting
                                  </a>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                          {userRole === "admin" ? "Link rapat belum ditambahkan. Klik 'Tambah Link' di atas." : "Link rapat belum diinput oleh Admin."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* ------------------------- */}


                {/* Owner Section */}
                <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>DIPESAN OLEH</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                      {booking.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{booking.userName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Kerja / Divisi terkait</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={onClose} 
                    style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Tutup
                  </button>
                  {isOwner && (
                    <button 
                      onClick={() => setIsConfirming(true)}
                      style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#FEE2E2', color: '#EF4444', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Batal Booking
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
