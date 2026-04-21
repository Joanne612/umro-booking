import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UMRO Booking | PT PLN Nusantara Power",
  description: "Aplikasi penjadwalan ruang meeting Unit Maintenance, Repair & Overhaul PLN",
  icons: {
    icon: [
      { url: "/pln-logo.png" },
      { url: "/pln-logo.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/pln-logo.png",
    apple: "/pln-logo.png",
  },
};

import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
