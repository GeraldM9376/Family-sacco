import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "MAWEGA SACCO",
  description: "Secure Savings & Loans",
};

export const viewport: Viewport = {
  themeColor: "#020617", // Very dark slate/black
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <Providers>
          <Suspense fallback={<div className="p-6 text-center text-slate-400">Loading...</div>}>
            <Nav />
            <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}