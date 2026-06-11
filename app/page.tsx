"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/teams" : "/auth");
  }, [user, loading, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-gray-400">Loading…</p>
    </main>
  );
}

