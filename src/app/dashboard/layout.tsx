import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "MAWEGA SACCO",
  description: "Secure Savings & Loans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        <Providers>
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
            <Nav />
            <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}