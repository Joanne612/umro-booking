"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import styles from "../app/dashboard/dashboard.module.css";

// ─── Interface ──────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function MaintenanceRequestModal({
    isOpen,
    onClose,
    onSuccess,
    editItem,
}: MaintenanceRequestModalProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [currentUrl, setCurrentUrl] = useState("");
    const [formData, setFormData] = useState(DEFAULT_FORM);

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
        } else if (isOpen && !editItem) {
            setFormData(DEFAULT_FORM);
            setCurrentUrl("");
        }
    }, [isOpen, editItem]);

    if (!isOpen) return null;

    const set = (patch: Partial<typeof formData>) =>
        setFormData((prev) => ({ ...prev, ...patch }));

    const handleAddUrl = () => {
        const url = currentUrl.trim();
        if (!url) return;
        if (!url.startsWith("http")) {
            showToast("Tautan harus diawali dengan http:// atau https://", "warning");
            return;
        }
        set({ photoUrls: [...formData.photoUrls, url] });
        setCurrentUrl("");
    };

    const handleRemoveUrl = (idx: number) => {
        const updated = [...formData.photoUrls];
        updated.splice(idx, 1);
        set({ photoUrls: updated });
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
            // Dynamic import to avoid bundling issues
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
                    photoUrls: formData.photoUrls,
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
                    photoUrls: formData.photoUrls,
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
        }
    };

    const selectedPriority = PRIORITIES.find((p) => p.value === formData.priority)!;

    return (
        <div className={styles.modalOverlay}>
            <div
                className={styles.modalContent}
                style={{ maxWidth: "640px", padding: "0", overflow: "hidden" }}
            >
                {/* ── Header ── */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #0369a1 0%, #00A2E9 100%)",
                        padding: "1.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
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
                            background: "rgba(255,255,255,0.15)",
                            border: "none",
                            borderRadius: "8px",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "white",
                            fontSize: "1.25rem",
                            lineHeight: 1,
                            flexShrink: 0,
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: "1.5rem", overflowY: "auto", maxHeight: "calc(90vh - 160px)" }}>
                    <form
                        onSubmit={handleSubmit}
                        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                    >
                        {/* Category */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Kategori Pemeliharaan</label>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                    gap: "0.5rem",
                                }}
                            >
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => set({ category: cat })}
                                        style={{
                                            padding: "0.75rem 0.5rem",
                                            borderRadius: "var(--radius-md)",
                                            border: `2px solid ${formData.category === cat ? "var(--primary)" : "var(--border)"}`,
                                            background: formData.category === cat ? "var(--primary-light)" : "var(--background)",
                                            color: formData.category === cat ? "var(--primary)" : "var(--text-muted)",
                                            fontWeight: formData.category === cat ? 700 : 500,
                                            cursor: "pointer",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            fontSize: "0.8rem",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
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
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => set({ priority: p.value })}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            borderRadius: "99px",
                                            border: `2px solid ${formData.priority === p.value ? p.color : "var(--border)"}`,
                                            background: formData.priority === p.value ? p.bg : "white",
                                            color: formData.priority === p.value ? p.color : "var(--text-muted)",
                                            fontWeight: 700,
                                            fontSize: "0.8125rem",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
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

                        {/* Title + Division (2 col) */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "1rem",
                            }}
                        >
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.formLabel}>Judul Singkat *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Cth: AC Ruang Rapat Bocor"
                                    value={formData.title}
                                    onChange={(e) => set({ title: e.target.value })}
                                    className={styles.textInput}
                                />
                            </div>
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.formLabel}>Fungsi / Bidang *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Cth: SDM / IT / Keuangan"
                                    value={formData.division}
                                    onChange={(e) => set({ division: e.target.value })}
                                    className={styles.textInput}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                            <label className={styles.formLabel}>Lokasi / Ruangan *</label>
                            <input
                                type="text"
                                required
                                placeholder="Cth: Lantai 2 - Ruang Rapat Utama / Toilet Pria Gedung A"
                                value={formData.location}
                                onChange={(e) => set({ location: e.target.value })}
                                className={styles.textInput}
                            />
                        </div>

                        {/* Description */}
                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                            <label className={styles.formLabel}>Deskripsi Kerusakan / Keluhan *</label>
                            <textarea
                                required
                                placeholder="Jelaskan kondisi kerusakan secara detail (gejala, sudah berapa lama, dampak yang ditimbulkan, dll)..."
                                value={formData.description}
                                onChange={(e) => set({ description: e.target.value })}
                                className={styles.textInput}
                                style={{ minHeight: "110px", fontFamily: "inherit", resize: "vertical" }}
                            />
                        </div>

                        {/* Photo URLs */}
                        <div
                            className={styles.formGroup}
                            style={{
                                background: "var(--background)",
                                padding: "1rem",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border)",
                                marginBottom: 0,
                            }}
                        >
                            <label
                                className={styles.formLabel}
                                style={{
                                    marginBottom: "0.5rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                }}
                            >
                                <span>📷</span> Tautan Foto Kerusakan{" "}
                                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Opsional)</span>
                            </label>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                Lampirkan tautan foto dari Google Drive, OneDrive, atau link publik lainnya.
                            </p>
                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                <input
                                    type="url"
                                    placeholder="Tempel link foto (Google Drive, OneDrive, dll)..."
                                    value={currentUrl}
                                    onChange={(e) => setCurrentUrl(e.target.value)}
                                    className={styles.textInput}
                                    style={{ flex: 1 }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddUrl();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddUrl}
                                    style={{
                                        padding: "0 1rem",
                                        backgroundColor: "var(--primary)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    + Tambah
                                </button>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                                {formData.photoUrls.map((url, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            padding: "0.35rem 0.75rem",
                                            backgroundColor: "white",
                                            border: "1px solid var(--primary-light)",
                                            borderRadius: "99px",
                                            fontSize: "0.75rem",
                                            color: "var(--primary)",
                                        }}
                                    >
                                        <span>🔗</span>
                                        <span
                                            style={{
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                maxWidth: "160px",
                                            }}
                                        >
                                            {url}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveUrl(idx)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-muted)",
                                                cursor: "pointer",
                                                fontSize: "1rem",
                                                lineHeight: 1,
                                                padding: 0,
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                                {formData.photoUrls.length === 0 && (
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-muted)",
                                            fontStyle: "italic",
                                        }}
                                    >
                                        Belum ada tautan foto ditambahkan.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: "0.875rem",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)",
                                    background: "white",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    flex: 2,
                                    padding: "0.875rem",
                                    borderRadius: "var(--radius-md)",
                                    border: "none",
                                    background: loading
                                        ? "var(--border)"
                                        : "linear-gradient(135deg, #0369a1, #00A2E9)",
                                    color: "white",
                                    fontWeight: 700,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontSize: "0.9rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    transition: "opacity 0.2s",
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span
                                            style={{
                                                width: "16px",
                                                height: "16px",
                                                border: "2px solid rgba(255,255,255,0.4)",
                                                borderTopColor: "white",
                                                borderRadius: "50%",
                                                animation: "spin 0.7s linear infinite",
                                                display: "inline-block",
                                            }}
                                        />
                                        Menyimpan...
                                    </>
                                ) : editItem ? (
                                    "💾 Simpan Perubahan"
                                ) : (
                                    "🔧 Kirim Permintaan"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}