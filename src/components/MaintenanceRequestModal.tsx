"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { uploadToCloudinary, validateImageFile } from "@/lib/cloudinary";
import styles from "../app/dashboard/dashboard.module.css";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface MaintenanceRequest {
    id?: string;
    userId: string;
    userName: string;
    division: string;
    category: "Pemeliharaan AC" | "Pemeliharaan Gedung" | "Pemeliharaan Listrik" | "Pemeliharaan Plumbing" | "Lainnya";
    priority: "Rendah" | "Sedang" | "Tinggi" | "Darurat";
    title: string;
    location: string;
    description: string;
    photoUrls: string[];
    status: "pending" | "approved" | "in_progress" | "completed" | "rejected";
    createdAt: any;
    ticketId?: string;
    asmanApprovedBy?: string;
    asmanApprovedByName?: string;
    asmanApprovalDate?: any;
    staffProcessedBy?: string;
    staffProcessedByName?: string;
    staffCompletedDate?: any;
    rejectReason?: string;
    estimatedCompletionDate?: string;
    notes?: string;
}

interface MaintenanceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editItem?: MaintenanceRequest | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES: MaintenanceRequest["category"][] = [
    "Pemeliharaan AC",
    "Pemeliharaan Gedung",
    "Pemeliharaan Listrik",
    "Pemeliharaan Plumbing",
    "Lainnya",
];

const PRIORITIES: { value: MaintenanceRequest["priority"]; label: string; color: string; bg: string }[] = [
    { value: "Rendah", label: "Rendah", color: "#16a34a", bg: "#dcfce7" },
    { value: "Sedang", label: "Sedang", color: "#d97706", bg: "#fef3c7" },
    { value: "Tinggi", label: "Tinggi", color: "#ea580c", bg: "#ffedd5" },
    { value: "Darurat", label: "Darurat", color: "#dc2626", bg: "#fee2e2" },
];

const CATEGORY_ICONS: Record<MaintenanceRequest["category"], string> = {
    "Pemeliharaan AC": "❄️",
    "Pemeliharaan Gedung": "🏢",
    "Pemeliharaan Listrik": "⚡",
    "Pemeliharaan Plumbing": "🔧",
    "Lainnya": "📋",
};

const DEFAULT_FORM = {
    category: "Pemeliharaan AC" as MaintenanceRequest["category"],
    priority: "Sedang" as MaintenanceRequest["priority"],
    title: "",
    division: "",
    location: "",
    description: "",
    photoUrls: [] as string[],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MaintenanceRequestModal({
    isOpen,
    onClose,
    onSuccess,
    editItem,
}: MaintenanceRequestModalProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(DEFAULT_FORM);

    // Upload state
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Bottom sheet
    const [sheetOpen, setSheetOpen] = useState(false);

    // Refs — kamera & galeri (di luar modal agar tidak konflik di iOS)
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && editItem) {
            setFormData({
                category: editItem.category,
                priority: editItem.priority,
                title: editItem.title,
                division: editItem.division,
                location: editItem.location,
                description: editItem.description,
                photoUrls: editItem.photoUrls || [],
            });
            setPhotoFiles([]);
            setPhotoPreviews(editItem.photoUrls || []);
        } else if (isOpen && !editItem) {
            setFormData(DEFAULT_FORM);
            setPhotoFiles([]);
            setPhotoPreviews([]);
        }
        setUploadProgress(0);
        setIsUploading(false);
    }, [isOpen, editItem]);

    if (!isOpen) return null;

    const set = (patch: Partial<typeof formData>) =>
        setFormData((prev) => ({ ...prev, ...patch }));

    // Handler pilih foto
    const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        for (const file of files) {
            const err = validateImageFile(file);
            if (err) { showToast(err, "error"); return; }
        }
        const existingUrls = photoPreviews.filter(p => p.startsWith("http"));
        setPhotoFiles(prev => [...prev, ...files]);
        setPhotoPreviews([...existingUrls, ...photoFiles.map(f => URL.createObjectURL(f)), ...files.map(f => URL.createObjectURL(f))]);
        e.target.value = "";
    };

    const handleRemovePhoto = (idx: number) => {
        const preview = photoPreviews[idx];
        if (preview.startsWith("http")) {
            const newUrls = formData.photoUrls.filter(u => u !== preview);
            set({ photoUrls: newUrls });
            setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
        } else {
            const uploadedCount = photoPreviews.filter(p => p.startsWith("http")).length;
            const fileIdx = idx - uploadedCount;
            setPhotoFiles(photoFiles.filter((_, i) => i !== fileIdx));
            setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return showToast("Sesi habis, silakan login kembali.", "error");

        const { title, description, division, location } = formData;
        if (!title.trim() || !description.trim() || !division.trim() || !location.trim()) {
            return showToast("Mohon lengkapi semua field yang wajib diisi.", "warning");
        }

        setLoading(true);
        try {
            let finalPhotoUrls = [...formData.photoUrls];
            if (photoFiles.length > 0) {
                setIsUploading(true);
                for (let i = 0; i < photoFiles.length; i++) {
                    setUploadProgress(0);
                    const result = await uploadToCloudinary(
                        photoFiles[i],
                        "umro-booking/maintenance",
                        (p) => setUploadProgress(Math.round(((i / photoFiles.length) + p / 100 / photoFiles.length) * 100))
                    );
                    finalPhotoUrls.push(result.url);
                }
                setIsUploading(false);
            }

            const { createMaintenanceRequest, updateMaintenanceRequest } = await import(
                "@/lib/firebase/firestore"
            );

            if (editItem?.id) {
                await updateMaintenanceRequest(editItem.id, {
                    category: formData.category,
                    priority: formData.priority,
                    title: formData.title,
                    division: formData.division,
                    location: formData.location,
                    description: formData.description,
                    photoUrls: finalPhotoUrls,
                });
                showToast("Permintaan pemeliharaan berhasil diperbarui!", "success");
            } else {
                await createMaintenanceRequest({
                    userId: user.uid,
                    userName: user.displayName || user.email || "Unknown",
                    category: formData.category,
                    priority: formData.priority,
                    title: formData.title,
                    division: formData.division,
                    location: formData.location,
                    description: formData.description,
                    photoUrls: finalPhotoUrls,
                });
                showToast(
                    "Permintaan pemeliharaan berhasil dikirim! Anda dapat memantau status di halaman Riwayat Booking.",
                    "success"
                );
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            showToast("Gagal mengirim permintaan: " + error.message, "error");
        } finally {
            setLoading(false);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <>
            {/* Hidden inputs di luar modal agar tidak konflik di iOS */}
            <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: "none" }}
                onChange={handlePhotoSelected}
            />
            <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handlePhotoSelected}
            />

            <div className={styles.modalOverlay}>
                <div
                    className={styles.modalContent}
                    style={{ maxWidth: "640px", padding: "0", overflow: "hidden" }}
                >
                    {/* ── Header ── */}
                    <div style={{
                        background: "linear-gradient(135deg, #0369a1 0%, #00A2E9 100%)",
                        padding: "1.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}>
                        <div>
                            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                                UMRO — Pemeliharaan
                            </p>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "white" }}>
                                {editItem ? "Edit Permintaan Pemeliharaan" : "Buat Permintaan Pemeliharaan"}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px",
                                width: "36px", height: "36px", display: "flex", alignItems: "center",
                                justifyContent: "center", cursor: "pointer", color: "white",
                                fontSize: "1.25rem", lineHeight: 1, flexShrink: 0,
                            }}
                        >&times;</button>
                    </div>

                    {/* ── Body ── */}
                    <div style={{ padding: "1.5rem", overflowY: "auto", maxHeight: "calc(90vh - 160px)" }}>
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                            {/* Category */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Kategori Pemeliharaan</label>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" }}>
                                    {CATEGORIES.map((cat) => (
                                        <button key={cat} type="button" onClick={() => set({ category: cat })}
                                            style={{
                                                padding: "0.75rem 0.5rem", borderRadius: "var(--radius-md)",
                                                border: `2px solid ${formData.category === cat ? "var(--primary)" : "var(--border)"}`,
                                                background: formData.category === cat ? "var(--primary-light)" : "var(--background)",
                                                color: formData.category === cat ? "var(--primary)" : "var(--text-muted)",
                                                fontWeight: formData.category === cat ? 700 : 500,
                                                cursor: "pointer", display: "flex", flexDirection: "column",
                                                alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", transition: "all 0.15s ease",
                                            }}>
                                            <span style={{ fontSize: "1.5rem" }}>{CATEGORY_ICONS[cat]}</span>
                                            <span style={{ textAlign: "center", lineHeight: 1.2 }}>{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Tingkat Prioritas</label>
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                    {PRIORITIES.map((p) => (
                                        <button key={p.value} type="button" onClick={() => set({ priority: p.value })}
                                            style={{
                                                padding: "0.5rem 1rem", borderRadius: "99px",
                                                border: `2px solid ${formData.priority === p.value ? p.color : "var(--border)"}`,
                                                background: formData.priority === p.value ? p.bg : "white",
                                                color: formData.priority === p.value ? p.color : "var(--text-muted)",
                                                fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", transition: "all 0.15s ease",
                                            }}>
                                            {p.value === "Darurat" && "🚨 "}{p.label}
                                        </button>
                                    ))}
                                </div>
                                {formData.priority === "Darurat" && (
                                    <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.35rem", fontWeight: 500 }}>
                                        ⚠️ Status Darurat akan langsung dinotifikasikan ke tim UMRO.
                                    </p>
                                )}
                            </div>

                            {/* Title + Division */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.formLabel}>Judul Singkat *</label>
                                    <input type="text" required placeholder="Cth: AC Ruang Rapat Bocor"
                                        value={formData.title} onChange={(e) => set({ title: e.target.value })}
                                        className={styles.textInput} />
                                </div>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.formLabel}>Fungsi / Bidang *</label>
                                    <input type="text" required placeholder="Cth: SDM / IT / Keuangan"
                                        value={formData.division} onChange={(e) => set({ division: e.target.value })}
                                        className={styles.textInput} />
                                </div>
                            </div>

                            {/* Location */}
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.formLabel}>Lokasi / Ruangan *</label>
                                <input type="text" required placeholder="Cth: Lantai 2 - Ruang Rapat Utama"
                                    value={formData.location} onChange={(e) => set({ location: e.target.value })}
                                    className={styles.textInput} />
                            </div>

                            {/* Description */}
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.formLabel}>Deskripsi Kerusakan / Keluhan *</label>
                                <textarea required
                                    placeholder="Jelaskan kondisi kerusakan secara detail..."
                                    value={formData.description} onChange={(e) => set({ description: e.target.value })}
                                    className={styles.textInput}
                                    style={{ minHeight: "110px", fontFamily: "inherit", resize: "vertical" }} />
                            </div>

                            {/* ── Foto Upload ── */}
                            <div className={styles.formGroup} style={{
                                background: "var(--background)", padding: "1rem",
                                borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: 0,
                            }}>
                                <label className={styles.formLabel} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <span>📷</span> Foto Kerusakan{" "}
                                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Opsional)</span>
                                </label>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                    Upload foto langsung dari kamera atau galeri hp kamu.
                                </p>

                                {/* Upload progress */}
                                {isUploading && (
                                    <div style={{ marginBottom: "0.75rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                                            <span>⬆️ Mengupload foto...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div style={{ height: "6px", background: "#E2E8F0", borderRadius: "99px", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--primary)", borderRadius: "99px", transition: "width 0.2s ease" }} />
                                        </div>
                                    </div>
                                )}

                                {/* Grid preview */}
                                {photoPreviews.length > 0 && (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                        {photoPreviews.map((src, idx) => (
                                            <div key={idx} style={{ position: "relative" }}>
                                                <img src={src} alt={`Foto ${idx + 1}`}
                                                    style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #E2E8F0" }} />
                                                <button type="button" onClick={() => handleRemovePhoto(idx)}
                                                    style={{ position: "absolute", top: "3px", right: "3px", background: "#EF4444", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700 }}>
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Tombol tambah foto */}
                                <button type="button" onClick={() => setSheetOpen(true)}
                                    style={{
                                        width: "100%", padding: "0.875rem", borderRadius: "12px",
                                        border: "2px dashed #CBD5E1", background: "white", cursor: "pointer",
                                        color: "#64748B", fontWeight: 600, fontSize: "0.875rem",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                                    }}>
                                    <span style={{ fontSize: "1.1rem" }}>📷</span>
                                    {photoPreviews.length > 0 ? "+ Tambah Foto" : "Ambil / Pilih Foto Kerusakan"}
                                </button>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
                                <button type="button" onClick={onClose}
                                    style={{
                                        flex: 1, padding: "0.875rem", borderRadius: "var(--radius-md)",
                                        border: "1px solid var(--border)", background: "white",
                                        fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                                    }}>
                                    Batal
                                </button>
                                <button type="submit" disabled={loading || isUploading}
                                    style={{
                                        flex: 2, padding: "0.875rem", borderRadius: "var(--radius-md)",
                                        border: "none",
                                        background: loading || isUploading ? "var(--border)" : "linear-gradient(135deg, #0369a1, #00A2E9)",
                                        color: "white", fontWeight: 700,
                                        cursor: loading || isUploading ? "not-allowed" : "pointer",
                                        fontSize: "0.9rem", display: "flex", alignItems: "center",
                                        justifyContent: "center", gap: "0.5rem", transition: "opacity 0.2s",
                                    }}>
                                    {loading ? (
                                        <>
                                            <span style={{
                                                width: "16px", height: "16px",
                                                border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white",
                                                borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block",
                                            }} />
                                            Menyimpan...
                                        </>
                                    ) : editItem ? "💾 Simpan Perubahan" : "🔧 Kirim Permintaan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* ===== BOTTOM SHEET PILIH SUMBER FOTO ===== */}
            {sheetOpen && (
                <>
                    <div onClick={() => setSheetOpen(false)}
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, animation: "fadeIn 0.2s ease" }} />
                    <div style={{
                        position: "fixed", bottom: 0, left: 0, right: 0,
                        background: "white", borderRadius: "24px 24px 0 0",
                        padding: "1.5rem 1.5rem 2.5rem", zIndex: 2001,
                        animation: "slideUp 0.25s ease", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
                    }}>
                        <div style={{ width: "40px", height: "4px", background: "#E2E8F0", borderRadius: "99px", margin: "0 auto 1.25rem" }} />
                        <p style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "1.25rem", textAlign: "center", color: "#1E293B" }}>
                            Pilih Sumber Foto
                        </p>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button type="button"
                                onClick={() => { setSheetOpen(false); setTimeout(() => cameraRef.current?.click(), 100); }}
                                style={{
                                    flex: 1, padding: "1.25rem 1rem", borderRadius: "16px",
                                    border: "2px solid #E2E8F0", background: "white", cursor: "pointer",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                                }}>
                                <span style={{ fontSize: "2rem" }}>📷</span>
                                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1E293B" }}>Kamera</span>
                                <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Ambil foto baru</span>
                            </button>
                            <button type="button"
                                onClick={() => { setSheetOpen(false); setTimeout(() => galleryRef.current?.click(), 100); }}
                                style={{
                                    flex: 1, padding: "1.25rem 1rem", borderRadius: "16px",
                                    border: "2px solid #E2E8F0", background: "white", cursor: "pointer",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                                }}>
                                <span style={{ fontSize: "2rem" }}>🖼️</span>
                                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1E293B" }}>Galeri</span>
                                <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Pilih dari galeri</span>
                            </button>
                        </div>
                        <button type="button" onClick={() => setSheetOpen(false)}
                            style={{
                                marginTop: "1rem", width: "100%", padding: "0.875rem",
                                borderRadius: "12px", border: "none", background: "#F1F5F9",
                                fontWeight: 700, fontSize: "0.875rem", color: "#64748B", cursor: "pointer",
                            }}>
                            Batal
                        </button>
                    </div>
                </>
            )}
        </>
    );
}