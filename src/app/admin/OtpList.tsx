"use client";
import { useState, useEffect } from "react";

export default function OtpList({ initialOtps }: { initialOtps: any[] }) {
  const [otps, setOtps] = useState(initialOtps);
  const [tick, setTick] = useState(0);

  // Force re-render every second to update countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      
      // Remove expired codes visually without refreshing
      setOtps((prev) => prev.filter((otp) => new Date(otp.expiresAt).getTime() > Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Optional: Poll the server every 30 seconds to catch new codes
  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch("/api/admin/get-otps");
      if (res.ok) {
        const data = await res.json();
        setOtps(data);
      }
    }, 30000);
    return () => clearInterval(poll);
  }, []);

  if (otps.length === 0) {
    return (
      <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 overflow-hidden">
        <div className="p-5 border-b border-indigo-500/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-indigo-300">Active Password Reset Codes</h2>
          <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-md border border-indigo-500/30">0 active</span>
        </div>
        <div className="p-5">
          <p className="text-slate-400 text-sm">No active reset codes. When a user requests one, it will appear here for 15 minutes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 overflow-hidden">
      <div className="p-5 border-b border-indigo-500/20 flex justify-between items-center">
        <h2 className="text-lg font-bold text-indigo-300">Active Password Reset Codes</h2>
        <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-md border border-indigo-500/30">{otps.length} active</span>
      </div>
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {otps.map((otp: any) => {
            const expiresAt = new Date(otp.expiresAt).getTime();
            const remaining = expiresAt - Date.now();
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);

            return (
              <div key={otp.id} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-indigo-500/20">
                <div>
                  <p className="font-bold text-white">{otp.user.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono">ID: {otp.user.idNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-extrabold text-indigo-300 tracking-widest">{otp.code}</p>
                  <p className="text-[10px] text-amber-400 font-bold mt-1">
                    Expires in {mins}:{secs.toString().padStart(2, "0")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}