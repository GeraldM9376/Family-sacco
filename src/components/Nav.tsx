"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Nav() {
  const { data } = useSession();
  if (!data?.user) return null;
  const role = (data.user as any).role;
  return (
    <nav className="flex items-center gap-4 border-b bg-white px-6 py-3 shadow-sm">
      <Link href={role === "admin" ? "/admin" : "/dashboard"} className="font-bold text-indigo-600">
        Sacco
      </Link>
      <div className="flex-1" />
      {role === "admin" ? (
        <>
          <Link href="/admin" className="text-sm hover:text-indigo-600">Dashboard</Link>
          <Link href="/admin/users" className="text-sm hover:text-indigo-600">Users</Link>
          <Link href="/admin/loans/new" className="text-sm hover:text-indigo-600">New Loan</Link>
          <Link href="/admin/payments/new" className="text-sm hover:text-indigo-600">Record Payment</Link>
          <Link href="/admin/settings" className="text-sm hover:text-indigo-600">Settings</Link>
        </>
      ) : (
        <>
          <Link href="/dashboard" className="text-sm hover:text-indigo-600">Dashboard</Link>
          <Link href="/dashboard/pay" className="text-sm hover:text-indigo-600">Pay</Link>
          <Link href="/dashboard/loans" className="text-sm hover:text-indigo-600">My Loans</Link>
          <Link href="/dashboard/transactions" className="text-sm hover:text-indigo-600">Transactions</Link>
        </>
      )}
      <button
       onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
       className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
       >
        Logout
      </button>
    </nav>
  );
}