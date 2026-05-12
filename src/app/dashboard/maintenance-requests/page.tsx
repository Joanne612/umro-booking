"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MaintenanceRequestModal from "@/components/MaintenanceRequestModal";
import styles from "../dashboard.module.css";

const FEATURE_CARDS = [
    {
        icon: "❄️",
        title: "AC & Pendingin",
        desc: "Kebocoran refrigerant, AC mati, tidak dingin, bau tidak sedap",
    },
    {
        icon: "🏢",
        title: "Bangunan & Sipil",
        desc: "Atap bocor, dinding retak, pintu rusak, lantai bermasalah",
    },
    {
        icon: "⚡",
        title: "Instalasi Listrik",
        desc: "Korsleting, lampu mati, stop kontak rusak, MCB turun",
    },
    {
        icon: "🔧",
        title: "Plumbing & Sanitasi",
        desc: "Pipa bocor, toilet tersumbat, wastafel mampet",
    },
];

export default function MaintenanceRequestsPage() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
            {/* ── Page Header ── */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "2rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                }}
            >
                <div>
                    <button
                        onClick={() => router.push("/dashboard/booking")}
                        className={styles.backBtn}
                    >
                        &larr; Ganti Kategori
                    </button>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                        Permintaan Pemeliharaan
                    </h2>
                    <p style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Ajukan laporan kerusakan AC, gedung, atau fasilitas lainnya kepada
                        tim UMRO.
                    </p>
                </div>
            </div>

            {/* ── Feature Info Cards ── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1.25rem",
                    marginBottom: "2.5rem",
                }}
            >
                {FEATURE_CARDS.map((item) => (
                    <div
                        key={item.title}
                        className={styles.card}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                            padding: "1.75rem 1.25rem",
                            height: "100%",
                        }}
                    >
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "14px",
                            background: "rgba(0, 162, 233, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.75rem",
                            marginBottom: "1rem"
                        }}>
                            {item.icon}
                        </div>
                        <h4
                            style={{
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                color: "var(--foreground)",
                                marginBottom: "0.5rem"
                            }}
                        >
                            {item.title}
                        </h4>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── CTA Card ── */}
            <div
                className={styles.card}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "3rem 2rem",
                    border: "1px dashed var(--primary)",
                    background: "rgba(0, 162, 233, 0.03)",
                }}
            >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔧</div>
                <h3
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        color: "var(--primary)"
                    }}
                >
                    Laporkan Kerusakan atau Gangguan Fasilitas
                </h3>
                <p
                    style={{
                        color: "var(--text-muted)",
                        marginBottom: "1.5rem",
                        maxWidth: "500px",
                        lineHeight: 1.5,
                        fontSize: "0.9rem"
                    }}
                >
                    Tim UMRO siap membantu. Silakan buat laporan agar segera ditindaklanjuti. Pantau status pengerjaan di halaman <strong>Riwayat Booking</strong>.
                </p>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                    style={{
                        padding: "0.875rem 2rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "var(--primary)",
                        boxShadow: "var(--shadow-sm)",
                        borderRadius: "var(--radius-full)"
                    }}
                >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Buat Laporan Baru
                </button>
            </div>

            {/* ── Modal ── */}
            <MaintenanceRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => router.push("/dashboard/my-bookings")}
            />
        </div>
    );
}