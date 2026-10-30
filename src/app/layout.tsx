import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Suspense } from "react"; // Import Suspense

export const metadata: Metadata = {
  title: "Sacco",
  description: "Savings & Loans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <Providers>
          {/* Wrap the Nav and children in Suspense */}
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
            <Nav />
            <main className="mx-auto max-w-6xl p-6">{children}</main>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}