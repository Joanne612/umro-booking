"use client";

import React from "react";
import styles from "../app/dashboard/dashboard.module.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  type = "danger",
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "danger": return "⚠️";
      case "warning": return "💡";
      case "info": return "ℹ️";
      default: return "❓";
    }
  };

  const getConfirmColor = () => {
    switch (type) {
      case "danger": return "#EF4444";
      case "warning": return "#F59E0B";
      case "info": return "var(--primary)";
      default: return "var(--primary)";
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', padding: '2rem', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{getIcon()}</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ 
              flex: 1, 
              padding: '0.8rem', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border)', 
              background: 'white', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{ 
              flex: 1, 
              padding: '0.8rem', 
              borderRadius: 'var(--radius-md)', 
              border: 'none', 
              background: getConfirmColor(), 
              color: 'white', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            {isLoading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
