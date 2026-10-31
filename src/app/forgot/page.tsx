"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/components/Message";
import Link from "next/link";

export default function ForgotPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [idNumber, setIdNumber] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idNumber }),
    });
    const data = await res.json();
    setLoading(false);
    
    if (!res.ok) return setMsg({ text: data.error, type: "error" });
    
    setStep(2);
    const maskedEmail = data.email.replace(/(.{2})(.*)(?=@)/, "$1***$2");
    setMsg({ text: `Code sent to ${maskedEmail}. Check your inbox.`, type: "success" });
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idNumber, code, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    
    if (!res.ok) return setMsg({ text: data.error, type: "error" });
    
    setMsg({ text: "Password reset successfully! Redirecting to login…", type: "success" });
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-slate-800 p-8 shadow-2xl border border-slate-700 mt-10">
      <h1 className="mb-2 text-2xl font-bold text-white text-center">Reset Password</h1>
      
      {step === 1 ? (
        <>
          <p className="mb-8 text-sm text-slate-400 text-center">
            Enter your ID Number. We will send a 5-minute reset code to the email address registered to your account.
          </p>
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Your ID Number</label>
              <input 
                type="text" 
                placeholder="e.g. 12345678" 
                required 
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500" 
              />
            </div>
            <Message text={msg?.text} type={msg?.type} />
            <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex justify-center items-center gap-2">
              {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Send Code"}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <Message text={msg?.text} type={msg?.type} />
          
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">6-Digit Code</label>
            <input 
              placeholder="000000" 
              required 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-900 px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-white placeholder-slate-500 outline-none focus:border-indigo-500" 
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500" 
            />
            <p className="text-xs text-slate-500 mt-1">Must have 8+ chars, upper, lower, number, symbol.</p>
          </div>

          <button disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500 transition disabled:opacity-60 flex justify-center items-center gap-2">
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Reset Password"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        Remembered it? <Link href="/login" className="text-indigo-400 font-bold hover:underline">Back to Login</Link>
      </p>
    </div>
  );
}