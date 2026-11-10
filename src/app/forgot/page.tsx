"use client";
import { useState, useEffect } from "react";
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
  const [adminMsg, setAdminMsg] = useState("");
  
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    
    const calculateTime = () => {
      const remaining = expiresAt - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    };
    calculateTime();
    const timer = setInterval(() => {
      const remaining = expiresAt - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber }),
      });
      const data = await res.json();
      setLoading(false);
      
      // Even if it's an "existing code", we treat it as a success and go to Step 2
      if (!res.ok) return setMsg({ text: data.error, type: "error" });
      
      setStep(2);
      setAdminMsg(data.message);
      setExpiresAt(new Date(data.expiresAt).getTime());
      setMsg({ 
        text: data.isExisting ? "Using your existing active code." : "Request sent successfully.", 
        type: "success" 
      });
    } catch (err) {
      setLoading(false);
      setMsg({ text: "Failed to connect to the server.", type: "error" });
    }
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
    
    setMsg({ text: "Password reset successfully! Redirecting…", type: "success" });
    setTimeout(() => router.push("/login"), 1500);
  }

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
        </div>
        
        {step === 1 ? (
          <>
            <p className="mb-6 text-sm text-slate-400 text-center">
              Enter your ID Number. A reset code will be generated for the Admin to give you.
            </p>
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-300">Your ID Number</label>
                <input type="text" placeholder="e.g. 12345678" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
              </div>
              <Message text={msg?.text} type={msg?.type} />
              <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-60 mt-2">
                {loading ? "Sending..." : "Send Code Request"}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <Message text={msg?.text} type={msg?.type} />
            
            <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30 text-indigo-300 text-sm font-bold text-center">
              {adminMsg}
            </div>

            {timeLeft > 0 ? (
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-center">
                <p className="text-xs text-slate-400 mb-1">Code expires in</p>
                <p className="text-xl font-mono font-bold text-amber-400">{formatTime(timeLeft)}</p>
              </div>
            ) : (
              <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/30 text-center flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-red-400">Code expired.</p>
                <button type="button" onClick={sendCode} disabled={loading} className="text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition">
                  {loading ? "Requesting..." : "Request New Code"}
                </button>
              </div>
            )}
            
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">6-Digit Code</label>
              <input placeholder="000000" required value={code} onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-white outline-none focus:bg-slate-800 focus:border-indigo-500" />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">New Password</label>
              <input type="password" placeholder="••••••••" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:bg-slate-800 focus:border-indigo-500" />
            </div>

            <button disabled={loading || timeLeft <= 0} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500 transition disabled:opacity-60 mt-2">
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered it? <Link href="/login" className="text-indigo-400 font-bold hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}