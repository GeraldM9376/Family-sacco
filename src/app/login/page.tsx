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
    <div className="animated-bg min-h-screen flex items-center justify-center p-4 md:p-0 -m-4 md:-m-8">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl glass-panel shadow-2xl md:flex-row flex-col">
        
        {/* Left Side - Branding */}
        <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-600/40 to-purple-900/40 p-12 text-white md:flex relative backdrop-blur-sm">
          <div className="relative z-10 mt-10">
            <h2 className="text-4xl font-extrabold tracking-tight">Welcome Back.</h2>
            <p className="mt-4 text-lg text-indigo-100">
              Log in to manage your savings, view your loan progress, and stay on top of your finances.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full p-8 md:w-1/2 lg:p-12 flex flex-col justify-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Sign In</h1>
          <p className="mb-8 text-sm text-slate-400">Don't have an account? <Link href="/signup" className="font-semibold text-indigo-400 hover:underline">Create one</Link></p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">ID Number</label>
              <input name="idNumber" placeholder="Enter your ID" required
                className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-300">Password</label>
                <Link href="/forgot" className="text-xs font-semibold text-indigo-400 hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input name="password" type={showPass ? "text" : "password"} placeholder="••••••••" required
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <Message text={err} type="error" />

            <button disabled={loading}
              className="w-full transform rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-indigo-500 active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2">
              {loading ? (
                <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Signing in…</>
              ) : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}