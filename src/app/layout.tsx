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
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      {/* Force the body to be dark */}
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <Providers>
          <Suspense fallback={<div className="p-6 text-center text-slate-400">Loading...</div>}>
            <Nav />
            <main className="w-full">{children}</main>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}