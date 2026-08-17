"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardData = {
  generatedAt: string;
  sidebar: {
    availableUsdc: string | null;
    balanceStatus: "available" | "unavailable";
    activeAgents: number;
  };
  overview: {
    tasks: { pending: number; running: number; completed: number; failed: number; manualReview: number };
    schedules: { active: number; paused: number; autoPaused: number };
  };
  workforceActivity: {
    spending: Array<{ date: string; amount: string }>;
    agentSpending: Array<{ date: string; agentId: string; agentName: string; amount: string; taskCount: number }>;
    performance: Array<{ agentId: string; agentName: string; completed: number; failed: number; averageLatencyMs: number | null; averageCost: string; totalTokens: string }>;
    events: Array<{ id: string; targetId: string; kind: "task" | "payment" | "schedule" | "transaction"; title: string; status: string; agentName: string | null; eventType: string; occurredAt: string }>;
    recentActivity: Array<{ id: string; targetId: string; kind: "task" | "transaction"; title: string; subtitle: string; status: string; occurredAt: string }>;
  };
};

type DashboardContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const load = () => {
      if (inFlight) return;
      inFlight = true;
      void fetch("/api/dashboard", {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "Could not load dashboard data");
          setData(body);
          setError(null);
        })
        .catch((reason) => {
          if (reason instanceof Error && reason.name !== "AbortError") {
            setError(reason.message);
          }
        })
        .finally(() => { inFlight = false; });
    };
    const initialLoad = window.setTimeout(load, 0);
    const refresh = window.setInterval(load, 10_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      controller.abort();
    };
  }, [refreshKey]);

  const value = useMemo(
    () => ({ data, loading: !data && !error, error, refresh }),
    [data, error, refresh]
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardData() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("Dashboard data provider is missing");
  return value;
}
