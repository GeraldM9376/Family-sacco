import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Sacco",
  description: "Savings & Loans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}