"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/shared/stat-card";

export function DashboardClient() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("http://localhost:3000/api/wallet/ensure", {
        method: "POST",
        cache: "no-store",
      });

      const data = await res.json();
      setWallet(data);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading wallet...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard title="Active Workers" value="0" />
      <StatCard title="Tasks Completed" value="0" />
      <StatCard title="Balance" value="$0" />
      <StatCard title="Monthly Spend" value="$0" />

      {!wallet?.exists && (
        <div className="text-sm text-gray-500 mt-4">
          Initializing wallet...
        </div>
      )}
    </div>
  );
}