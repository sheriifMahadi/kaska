"use client";

import {
  createContext,
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
    events: Array<{ id: string; kind: "task" | "schedule"; title: string; status: string; agentName: string; occurredAt: string }>;
    completedTasks: Array<{ id: string; title: string; agentName: string; completedAt: string | null; amount: string | null }>;
  };
};

type DashboardContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const load = () => {
      if (inFlight) return;
      inFlight = true;
      void fetch("/api/dashboard", { signal: controller.signal })
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
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refresh);
      controller.abort();
    };
  }, []);

  const value = useMemo(() => ({ data, loading: !data && !error, error }), [data, error]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardData() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("Dashboard data provider is missing");
  return value;
}
