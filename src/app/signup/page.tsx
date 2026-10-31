"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/components/Message";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    idNumber: "",
    phone: "",
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
    if (name === "idNumber") val = val.replace(/\D/g, ""); // Force numbers only
    
    setForm({ ...form, [name]: val });
  };

  const isValidName = /^[A-Z\s]+$/.test(form.fullName) && form.fullName.length > 2;
  const isValidEmail = /^\S+@\S+\.\S+$/.test(form.email);
  const isValidId = /^\d{6,10}$/.test(form.idNumber);
  const isValidPhone = /^\+254[17]\d{8}$/.test(form.phone);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidName || !isValidEmail || !isValidId || !isValidPhone) {
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
    
    setMsg({ text: "Account created! Password sent to your email. Redirecting to login…", type: "success" });
    setTimeout(() => router.push("/login"), 2500);
  }

  const InputStatus = ({ isValid, value }: { isValid: boolean; value: string }) => {
    if (!value) return null;
    return isValid ? <span className="absolute right-3 top-3 text-emerald-500">✓</span> : <span className="absolute right-3 top-3 text-red-500">✗</span>;
  };

  return (
    <div className="flex min-h-[80vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 p-12 text-white md:flex relative">
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold tracking-tight">Join MAWEGA SACCO.</h2>
          <p className="mt-4 text-lg text-indigo-100">
            Secure your future with Kenya's most transparent savings and loan platform.
          </p>
        </div>
      </div>

      <div className="w-full p-8 md:w-1/2 lg:p-12 relative overflow-y-auto">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Create Account</h1>
        <p className="mb-8 text-sm text-gray-500">Already have an account? <Link href="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link></p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name (Caps)</label>
            <div className="relative">
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="JOHN DOE" required
                className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all focus:border-indigo-500 ${form.fullName ? (isValidName ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
              <InputStatus isValid={isValidName} value={form.fullName} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative">
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@gmail.com" required
                className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all focus:border-indigo-500 ${form.email ? (isValidEmail ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
              <InputStatus isValid={isValidEmail} value={form.email} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ID Number (Numbers only)</label>
              <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="12345678" required
                className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all focus:border-indigo-500 ${form.idNumber ? (isValidId ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="relative">
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+254712345678" required
                  className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all focus:border-indigo-500 ${form.phone ? (isValidPhone ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
                <InputStatus isValid={isValidPhone} value={form.phone} />
              </div>
            </div>
          </div>

          <Message text={msg?.text} type={msg?.type} />

          <button disabled={loading}
            className="w-full transform rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2">
            {loading ? (
              <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Creating Account…</>
            ) : "Create Account & Email Password"}
          </button>
        </form>
      </div>
    </div>
  );
}