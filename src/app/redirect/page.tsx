"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RedirectPage() {
  const { data, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "loading") return;
    if (!data?.user) return router.push("/login");
    router.replace((data.user as any).role === "admin" ? "/admin" : "/dashboard");
  }, [status, data, router]);
  return <p className="p-6 text-gray-500">Loading…</p>;
}