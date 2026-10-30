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
    <div className="flex min-h-[70vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
      {/* Left Side - Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-12 text-white md:flex relative">
        <div className="relative z-10 mt-10">
          <h2 className="text-4xl font-extrabold tracking-tight">Welcome Back.</h2>
          <p className="mt-4 text-lg text-indigo-200">
            Log in to manage your savings, view your loan progress, and stay on top of your finances.
          </p>
        </div>
      </div>

      {/* Right Side - The Form */}
      <div className="w-full p-8 md:w-1/2 lg:p-12 flex flex-col justify-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Sign In</h1>
        <p className="mb-8 text-sm text-gray-500">Don't have an account? <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">Create one</Link></p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ID Number</label>
            <input name="idNumber" placeholder="Enter your ID or insignadmin" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-all focus:border-indigo-500" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link href="/forgot" className="text-xs font-semibold text-indigo-600 hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} placeholder="••••••••" required
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 pr-12 outline-none transition-all focus:border-indigo-500" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-700">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <Message text={err} type="error" />

          <button disabled={loading}
            className="w-full transform rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}