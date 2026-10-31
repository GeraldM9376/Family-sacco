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
    <div className="flex min-h-[80vh] overflow-hidden rounded-3xl bg-white shadow-2xl mx-auto max-w-4xl mt-10">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-12 text-white md:flex relative">
        <div className="relative z-10 mt-10">
          <h2 className="text-4xl font-extrabold tracking-tight">Welcome Back.</h2>
          <p className="mt-4 text-lg text-indigo-200">
            Log in to manage your savings, view your loan progress, and stay on top of your finances.
          </p>
        </div>
      </div>

      <div className="w-full p-8 md:w-1/2 lg:p-12 flex flex-col justify-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Sign In</h1>
        <p className="mb-8 text-sm text-gray-500">Don't have an account? <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">Create one</Link></p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">ID Number</label>
            <input name="idNumber" placeholder="Enter your ID" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none transition-all focus:border-indigo-500" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-bold text-gray-700">Password</label>
              <Link href="/forgot" className="text-xs font-semibold text-indigo-600 hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} placeholder="••••••••" required
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold pr-12 outline-none transition-all focus:border-indigo-500" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-700">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <Message text={err} type="error" />

          <button disabled={loading}
            className="w-full transform rounded-xl bg-gray-900 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2">
            {loading ? (
              <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Signing in…</>
            ) : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}