"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Nav() {
  const { data } = useSession();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!data?.user) return null;
  const role = (data.user as any).role;

  const navLink = (href: string, label: string) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
          isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 md:px-8 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md">
            <span className="font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">MAWEGA <span className="text-indigo-600">SACCO</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {role === "admin" ? (
            <>
              {navLink("/admin", "Dashboard")}
              {navLink("/admin/users", "Users")}
              {navLink("/admin/loans/new", "New Loan")}
              {navLink("/admin/payments/new", "Record Payment")}
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

        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-gray-900">{data.user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Logging out...
              </>
            ) : ("Logout")}
          </button>
        </div>
      </div>
    </nav>
  );
}