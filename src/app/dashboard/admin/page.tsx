"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { initAndGetRooms, updateRoom, addRoom, deleteRoom, Room, getAllUsers, updateUserRole, deleteUserAccount, UserRole } from "@/lib/firebase/firestore";
import styles from "../dashboard.module.css";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function AdminPage() {
  const { user, userRole } = useAuth();
  const { showToast } = useToast();

  // Tabs state
  const [activeTab, setActiveTab] = useState<"rooms" | "users">("rooms");

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<UserRole[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // Update state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Create state
  const [isAdding, setIsAdding] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState<"physical" | "online">("physical");

  // Role Change Confirmation State
  const [roleChangePending, setRoleChangePending] = useState<{ uid: string; name: string; newRole: "admin" | "asman" | "koordinator_driver" | "staff_umum" | "user" | "view" | "driver" } | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  // User Deletion State
  const [userDeletePending, setUserDeletePending] = useState<{ uid: string; name: string } | null>(null);
  const [userDeleting, setUserDeleting] = useState(false);

  const fetchRooms = async () => {
    setRoomsLoading(true);
    const data = await initAndGetRooms();
    setRooms(data);
    setRoomsLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setUsersLoading(false);
  };

  useEffect(() => {
    if (activeTab === "rooms") fetchRooms();
    if (activeTab === "users") fetchUsers();
  }, [activeTab]);

  const handleUpdate = async (id: string) => {
    if (!editForm.name.trim()) return;
    try {
      await updateRoom(id, { name: editForm.name, description: editForm.description });
      setEditingId(null);
      showToast("Ruangan berhasil diperbarui!", "success");
      fetchRooms();
    } catch (error: any) {
      showToast("Gagal memperbarui ruangan: " + error.message, "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      await addRoom(newRoomName, newRoomType, newRoomDescription);
      setNewRoomName("");
      setNewRoomDescription("");
      showToast("Berhasil menambahkan ruangan baru!", "success");
      setIsAdding(false);
      fetchRooms();
    } catch (error: any) {
      showToast("Gagal menambahkan ruangan: " + error.message, "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Peringatan: Apakah Bapak/Ibu yakin ingin menghapus ruangan "${name}" secara permanen? Ruangan dengan reservasi aktif tidak akan bisa dihapus.`)) {
      try {
        await deleteRoom(id);
        showToast("Ruangan berhasil dihapus!", "success");
        fetchRooms();
      } catch (error: any) {
        showToast(error.message, "error");
      }
    }
  };

  const handleRoleChangeRequest = (uid: string, name: string, newRole: "admin" | "asman" | "koordinator_driver" | "staff_umum" | "user" | "view") => {
    if (uid === user?.uid) {
      showToast("Anda tidak dapat mengubah role Anda sendiri demi keamanan.", "warning");
      return;
    }
    setRoleChangePending({ uid, name, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangePending) return;

    setRoleChanging(true);
    try {
      await updateUserRole(roleChangePending.uid, roleChangePending.newRole);
      showToast(`Akses ${roleChangePending.name} berhasil diubah ke ${roleChangePending.newRole.toUpperCase()}`, "success");
      setRoleChangePending(null);
      fetchUsers();
    } catch (error: any) {
      showToast("Gagal memperbarui role: " + error.message, "error");
    } finally {
      setRoleChanging(false);
    }
  };

  const confirmUserDelete = async () => {
    if (!userDeletePending) return;
    setUserDeleting(true);
    try {
      await deleteUserAccount(userDeletePending.uid);
      showToast(`Pengguna ${userDeletePending.name} telah dihapus dari sistem.`, "success");
      setUserDeletePending(null);
      fetchUsers();
    } catch (error: any) {
      showToast("Gagal menghapus pengguna: " + error.message, "error");
    } finally {
      setUserDeleting(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (userRole !== "admin") {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.75rem", color: "var(--foreground)", fontWeight: 700, marginBottom: "1rem" }}>Akses Tidak Terotorisasi</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
          Mohon maaf, Anda tidak memiliki tingkat perizinan keamanan yang disyaratkan untuk melihat atau memodifikasi modul Tata Kelola Ruangan ini.
        </p>
        <div style={{ padding: "1rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-muted)", textAlign: "left" }}>
          <strong style={{ color: "var(--foreground)" }}>Catatan Sistem:</strong> Modul Administrator <strong>(Admin Panel)</strong> merupakan wilayah konfidensial yang secara eksklusif hanya dapat dituju oleh unit Pengelola Ruangan atau Pejabat Struktural terkait pada PT PLN Nusantara Power. Apabila Anda merasa terjadi kendala penugasan kredensial, harap segera melapor pada Tim IT <strong>(admin)</strong>.
        </div>
      </div>
    );
  }

  if (roomsLoading && activeTab === "rooms") return <div>Memuat data ruang...</div>;
  if (usersLoading && activeTab === "users") return <div>Memuat data pengguna...</div>;

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
        <button
          onClick={() => setActiveTab("rooms")}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === "rooms" ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === "rooms" ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Manajemen Ruangan
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === "users" ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === "users" ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Manajemen Pengguna
        </button>
      </div>

      {activeTab === "rooms" ? (
        /* ROOMS MANAGEMENT TAB */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Manajemen Ruang (Admin)</h2>
              <p style={{ color: 'var(--text-muted)' }}>Ubah nama, tambahkan, atau hapus ruangan.</p>
            </div>
            <button onClick={() => setIsAdding(!isAdding)} className="btn-primary">
              {isAdding ? 'Batal Tambah' : '+ Tambah Ruangan Baru'}
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleAdd} className={styles.card} style={{ marginBottom: '2rem', background: 'var(--background)' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 700 }}>Tambah Ruangan Baru</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Nama Ruangan</label>
                  <input required type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} placeholder="Cth: Ruang VVIP" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Tipe Ruangan</label>
                  <select value={newRoomType} onChange={e => setNewRoomType(e.target.value as "physical" | "online")} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <option value="physical">Ruang Meeting Fisik</option>
                    <option value="online">Online (Zoom meeting)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Deskripsi Ruangan (Fasilitas, Kapasitas, Lokasi)</label>
                <textarea
                  value={newRoomDescription}
                  onChange={e => setNewRoomDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '80px', fontFamily: 'inherit' }}
                  placeholder="Cth: Kapasitas 10 Orang, Smart TV, Meja Bundar, Lantai 3."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>Batal</button>
                <button type="submit" className="btn-primary">Simpan Ruangan</button>
              </div>
            </form>
          )}

          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'white' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>NAMA RUANGAN</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>TIPE</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>DESKRIPSI / FASILITAS</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      {editingId === room.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)', outline: 'none', fontWeight: 600, width: '100%' }}
                        />
                      ) : (
                        <div style={{ fontWeight: 600 }}>{room.name}</div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', 
                        background: room.type === 'physical' ? '#E0F2FE' : '#F3F4F6', 
                        color: room.type === 'physical' ? '#0369A1' : '#6B7280', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {room.type === 'physical' ? 'Ruangan' : 'Online'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {editingId === room.id ? (
                        <textarea 
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)', minHeight: '60px', fontFamily: 'inherit' }}
                        />
                      ) : (
                        room.description || "-"
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {editingId === room.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleUpdate(room.id)}
                            style={{ padding: '0.4rem 0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Simpan
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            style={{ padding: '0.4rem 0.8rem', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => {
                              setEditingId(room.id);
                              setEditForm({ name: room.name, description: room.description || "" });
                            }}
                            style={{ padding: '0.4rem 0.8rem', background: '#E0F2FE', color: '#0369A1', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(room.id, room.name)}
                            style={{ padding: '0.4rem 0.8rem', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Belum ada ruangan. Silakan tambahkan melalui tombol di atas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* USERS MANAGEMENT TAB */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Pusat Kelola Pengguna</h2>
              <p style={{ color: 'var(--text-muted)' }}>Kelola hak akses dan perizinan akun karyawan.</p>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem'
                }}
              />
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>PENGGUNA</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>EMAIL</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>ROLE SEKARANG</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>UBAH HAK AKSES</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '100px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: u.role === 'admin' ? '#FEE2E2' : u.role === 'asman' ? '#FEF3C7' : u.role === 'koordinator_driver' ? '#E9D5FF' : u.role === 'staff_umum' ? '#D1FAE5' : u.role === 'view' ? '#F3F4F6' : '#E0F2FE',
                        color: u.role === 'admin' ? '#EF4444' : u.role === 'asman' ? '#D97706' : u.role === 'koordinator_driver' ? '#7E22CE' : u.role === 'staff_umum' ? '#059669' : u.role === 'view' ? '#6B7280' : '#0369A1'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChangeRequest(u.uid, u.name, e.target.value as any)}
                        disabled={u.uid === user?.uid}
                        style={{
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'white',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: u.uid === user?.uid ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="user">User (Booking)</option>
                        <option value="asman">Asman Umum (Persetujuan Konsumsi)</option>
                        <option value="koordinator_driver">Koordinator Driver (Kendaraan)</option>
                        <option value="staff_umum">Staff Umum (Kelola Konsumsi)</option>
                        <option value="driver">Driver (Operasional)</option>
                        <option value="admin">Admin (Full Control)</option>
                        <option value="view">View Only</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setUserDeletePending({ uid: u.uid, name: u.name })}
                        disabled={u.uid === user?.uid}
                        title="Hapus Pengguna"
                        style={{
                          background: '#FEE2E2',
                          color: '#EF4444',
                          border: 'none',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          cursor: u.uid === user?.uid ? 'not-allowed' : 'pointer',
                          opacity: u.uid === user?.uid ? 0.5 : 1
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ditemukan pengguna dengan nama atau email tersebut.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal Overlay */}
      {roleChangePending && (
        <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px', animation: 'scaleUp 0.3s ease' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Konfirmasi Hak Akses
              </h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.5', fontSize: '0.9375rem', marginBottom: '2rem' }}>
                Apakah Anda yakin ingin mengubah hak akses <b>{roleChangePending.name}</b> menjadi <b>{roleChangePending.newRole.toUpperCase()}</b>?
                <br />
                <span style={{ fontSize: '0.8125rem', marginTop: '0.5rem', display: 'block', color: 'var(--primary)' }}>
                  *Perubahan ini akan langsung memengaruhi fitur yang dapat diakses oleh karyawan tersebut.
                </span>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={() => setRoleChangePending(null)}
                  disabled={roleChanging}
                  style={{
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
                  onClick={confirmRoleChange}
                  disabled={roleChanging}
                  style={{
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 162, 233, 0.2)'
                  }}
                >
                  {roleChanging ? 'Memproses...' : 'Ya, Ubah Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* User Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!userDeletePending}
        onClose={() => setUserDeletePending(null)}
        onConfirm={confirmUserDelete}
        title="Hapus Pengguna"
        message={`Apakah Anda yakin ingin menghapus "${userDeletePending?.name}"? Pengguna ini tidak akan bisa login lagi sebelum mendaftar ulang.`}
        confirmLabel="Ya, Hapus Pengguna"
        cancelLabel="Batal"
        type="danger"
        isLoading={userDeleting}
      />
    </div>
  );
}
