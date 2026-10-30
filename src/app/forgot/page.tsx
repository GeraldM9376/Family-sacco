"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/components/Message";

export default function ForgotPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg({ text: data.error, type: "error" });
    setStep(2);
    setMsg({ text: "Code sent! Check your email inbox.", type: "success" });
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg({ text: data.error, type: "error" });
    setMsg({ text: "Password reset! Redirecting…", type: "success" });
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <h1 className="mb-6 text-2xl font-bold text-indigo-700">Forgot Password</h1>
      {step === 1 ? (
        <form onSubmit={sendCode} className="space-y-4">
          <input type="email" placeholder="Your email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2" />
          <Message text={msg?.text} type={msg?.type} />
          <button className="w-full rounded-lg bg-indigo-600 py-2.5 text-white hover:bg-indigo-700">
            Send Code
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <input placeholder="6-digit code" required value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 tracking-widest" />
          <input type="password" placeholder="New password" required value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2" />
          <Message text={msg?.text} type={msg?.type} />
          <button className="w-full rounded-lg bg-emerald-600 py-2.5 text-white hover:bg-emerald-700">
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}