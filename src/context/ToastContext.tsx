"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500); // otomatis hilang dalam 4.5 detik
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => {
          let bg = '#334155';
          let border = '#1e293b';
          let icon = 'ℹ️';
          
          if (toast.type === "success") { 
             bg = '#065F46'; // Dark green
             border = '#10B981'; 
             icon = '✅'; 
          }
          else if (toast.type === "error") { 
             bg = '#991B1B'; // Dark red
             border = '#EF4444'; 
             icon = '🚨'; 
          }
          else if (toast.type === "warning") { 
             bg = '#92400E'; // Dark orange
             border = '#F59E0B'; 
             icon = '⚠️'; 
          }

          return (
            <div key={toast.id} style={{
              minWidth: '300px',
              maxWidth: '400px',
              backgroundColor: bg,
              color: 'white',
              borderLeft: `4px solid ${border}`,
              padding: '1rem 1.25rem',
              borderRadius: '6px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.875rem',
              animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              pointerEvents: 'auto',
              backdropFilter: 'blur(8px)',
              fontWeight: 500,
              fontSize: '0.925rem',
              lineHeight: '1.4'
            }}>
              <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>{icon}</span>
              <div style={{ flex: 1, paddingRight: '0.5rem' }}>{toast.message}</div>
            </div>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          0% { transform: translateX(120%); opacity: 0; }
          70% { transform: translateX(-10px); }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus didalam ToastProvider");
  return context;
};
