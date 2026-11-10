"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Nav() {
  const { data } = useSession();
  const pathname = usePathname();

  if (!data?.user) return null;
  const role = (data.user as any).role;

  const navLink = (href: string, label: string) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
          isActive 
            ? "bg-indigo-500/20 text-indigo-300" 
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 md:px-8 py-3">
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo */}
        <div className="flex w-full md:w-auto items-center justify-between">
          <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <span className="font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">MAWEGA <span className="text-indigo-400">SACCO</span></span>
          </Link>
          
          {/* Mobile Logout */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => signOut({ callbackUrl: "/login", redirect: true })} className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white border border-slate-700">
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex w-full md:w-auto items-center gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {role === "admin" ? (
            <>
              {navLink("/admin", "Dashboard")}
              {navLink("/admin/users", "Users")}
              {navLink("/admin/loans/new", "New Loan")}
              {navLink("/admin/payments/new", "Record Payment")}
              {navLink("/admin/withdrawals", "Withdrawals")}
              {navLink("/admin/settings", "Settings")}
            </>
          ) : (
            <>
              {navLink("/dashboard", "Overview")}
              {navLink("/dashboard/pay", "Make Payment")}
              {navLink("/dashboard/loans", "My Loans")}
              {navLink("/dashboard/history", "History")}
            </>
          )}
        </div>

        {/* Desktop User Info & Logout */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-white">{data.user.name}</p>
            <p className="text-xs text-slate-500 capitalize">{role}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login", redirect: true })} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 border border-slate-700 transition">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}