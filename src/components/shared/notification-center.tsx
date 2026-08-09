"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { useDashboardData } from
  "@/components/dashboard/dashboard-data-provider";

type Notice = {
  key: string;
  title: string;
  subtitle: string;
  failed: boolean;
};

const seenKey = "kaska-seen-notifications";

export function NotificationCenter() {
  const { data } = useDashboardData();
  const [queue, setQueue] = useState<Notice[]>([]);
  const [hovered, setHovered] = useState(false);
  const initialized = useRef(false);
  const active = queue[0];

  useEffect(() => {
    const activity = data?.workforceActivity.recentActivity;
    if (!activity) return;

    const stored = new Set<string>(
      JSON.parse(sessionStorage.getItem(seenKey) ?? "[]")
    );
    const keys = activity.map((item) => `${item.kind}:${item.id}:${item.status}`);

    if (!initialized.current) {
      initialized.current = true;
      if (stored.size === 0) {
        sessionStorage.setItem(seenKey, JSON.stringify(keys));
        return;
      }
    }

    const notices = activity
      .filter((item) => !stored.has(`${item.kind}:${item.id}:${item.status}`))
      .reverse()
      .map((item) => ({
        key: `${item.kind}:${item.id}:${item.status}`,
        title: item.title,
        subtitle:
          item.kind === "task" && item.status === "failed"
            ? `Failed: ${item.subtitle}`
            : item.subtitle,
        failed: item.status === "failed",
      }));

    if (notices.length > 0) {
      window.setTimeout(
        () => setQueue((current) => [...current, ...notices]),
        0
      );
    }
    sessionStorage.setItem(
      seenKey,
      JSON.stringify([...new Set([...stored, ...keys])].slice(-100))
    );
  }, [data]);

  useEffect(() => {
    if (!active || hovered) return;
    const timer = window.setTimeout(
      () => setQueue((current) => current.slice(1)),
      3_000
    );
    return () => window.clearTimeout(timer);
  }, [active, hovered]);

  if (!active) return null;

  return (
    <div
      className={`fixed left-1/2 top-0 z-[100] w-[min(88vw,20rem)] -translate-x-1/2 rounded-b-xl border border-t-0 px-3.5 py-2.5 shadow-xl backdrop-blur ${
        active.failed
          ? "border-red-800/70 bg-red-950/95"
          : "border-emerald-800/70 bg-emerald-950/95"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        {active.failed ? (
          <XCircle className="mt-0.5 shrink-0 text-red-300" size={16} />
        ) : (
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={16} />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{active.title}</p>
          <p className={`mt-0.5 truncate text-xs ${active.failed ? "text-red-200/70" : "text-emerald-200/70"}`}>{active.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
