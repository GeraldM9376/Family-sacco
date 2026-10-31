"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

export default function AdminPaymentPage() {
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");

    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admin/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to record payment.");
        return;
      }
      window.location.href = "/admin?msg=Payment recorded successfully";
    } catch (error: any) {
      setErr("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-lg border border-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Record Payment for User</h1>
      <p className="mb-6 text-sm text-gray-500">Use this if a user has paid you directly (e.g., via M-Pesa) and you want to update their account immediately.</p>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Payment Type</label>
          <select name="type" className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500 bg-white">
            <option value="savings">Savings</option>
            <option value="normal">Normal Loan Repayment</option>
            <option value="emergency">Emergency Loan Repayment</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Amount (KES)</label>
            <input name="amount" type="number" min="1" required placeholder="e.g. 1000"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Date Paid</label>
            <input name="paidOn" type="date" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Name on Payment (Caps)</label>
          <input name="payerName" required placeholder="JOHN DOE"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500 uppercase" />
        </div>

        {err && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">{err}</p>}

        <SubmitButton className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 transition">
          Record Payment Instantly
        </SubmitButton>
      </form>
    </div>
  );
}