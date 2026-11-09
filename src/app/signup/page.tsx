"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/components/Message";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    idNumber: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const name = e.target.name;
    
    if (name === "fullName") val = val.toUpperCase();
    if (name === "email") val = val.toLowerCase();
    if (name === "phone") {
      val = val.replace(/\s+/g, "");
      if (val.startsWith("07") || val.startsWith("01")) val = "+254" + val.substring(1);
    }
    if (name === "idNumber") val = val.replace(/\D/g, ""); 
    
    setForm({ ...form, [name]: val });
  };

  const isValidName = /^[A-Z\s]+$/.test(form.fullName) && form.fullName.length > 2;
  const isValidEmail = /^\S+@\S+\.\S+$/.test(form.email);
  const isValidId = /^\d{6,10}$/.test(form.idNumber);
  const isValidPhone = /^\+254[17]\d{8}$/.test(form.phone);
  const isValidPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/.test(form.password);
  const doPasswordsMatch = form.password === form.confirm && form.confirm !== "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidName || !isValidEmail || !isValidId || !isValidPhone || !isValidPass || !doPasswordsMatch) {
      return setMsg({ text: "Please fix the errors above before submitting.", type: "error" });
    }

    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setMsg({ text: data.error, type: "error" });
    
    setMsg({ text: "Account created! Password sent to your email. Redirecting...", type: "success" });
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-400 mt-2">Join MAWEGA SACCO today</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Full Name (Caps)</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="JOHN DOE" required
              className={`w-full rounded-xl border bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:bg-slate-800 focus:border-indigo-500 ${form.fullName ? (isValidName ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@gmail.com" required
              className={`w-full rounded-xl border bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:bg-slate-800 focus:border-indigo-500 ${form.email ? (isValidEmail ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">ID Number</label>
              <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="12345678" required
                className={`w-full rounded-xl border bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:bg-slate-800 focus:border-indigo-500 ${form.idNumber ? (isValidId ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Phone Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+254712345678" required
                className={`w-full rounded-xl border bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:bg-slate-800 focus:border-indigo-500 ${form.phone ? (isValidPhone ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" required
                className={`w-full rounded-xl border bg-slate-800/50 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none transition-all focus:bg-slate-800 focus:border-indigo-500 ${form.password ? (isValidPass ? 'border-emerald-500' : 'border-amber-500') : 'border-slate-700'}`} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Confirm Password</label>
            <div className="relative">
              <input name="confirm" type={showConfirm ? "text" : "password"} value={form.confirm} onChange={handleChange} placeholder="••••••••" required
                className={`w-full rounded-xl border bg-slate-800/50 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none transition-all focus:bg-slate-800 focus:border-indigo-500 ${form.confirm ? (doPasswordsMatch ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <Message text={msg?.text} type={msg?.type} />

          <button disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-60 flex justify-center items-center gap-2 mt-2">
            {loading ? <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Creating Account…</> : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account? <Link href="/login" className="text-indigo-400 font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}