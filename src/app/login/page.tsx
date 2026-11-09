"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Message } from "@/components/Message";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      idNumber: fd.get("idNumber"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) return setErr("Invalid ID number or password.");
    router.push("/redirect");
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Sign In</h1>
          <p className="text-sm text-slate-400 mt-1">Access your MAWEGA SACCO account.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ID Number</label>
            <input name="idNumber" placeholder="Enter your ID" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <Link href="/forgot" className="text-xs text-indigo-400 hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} placeholder="••••••••" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 pr-12 text-white placeholder-slate-600 outline-none focus:border-indigo-500" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-500 hover:text-white">👁️</button>
            </div>
          </div>
          <Message text={err} type="error" />
          <button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 mt-2">
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">Don't have an account? <Link href="/signup" className="text-indigo-400 hover:underline">Create one</Link></p>
      </div>
    </div>
  );
}