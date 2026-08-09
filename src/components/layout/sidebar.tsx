"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { dashboardNav } from "@/constants/navigation";
import {
  Bot,
  Wallet,
  Users,
  Menu,
  Power,
  X,
} from "lucide-react";
import { useDashboardData } from
  "@/components/dashboard/dashboard-data-provider";

export function Sidebar() {
  const pathname = usePathname();
  const { data, loading } = useDashboardData();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-900 bg-black px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-wide">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600"><Bot size={17} /></span>
          KASKA
        </Link>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} className="rounded-lg border border-zinc-800 p-2 text-zinc-300">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {open ? <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/70 md:hidden" /> : null}

      <aside className={open ? "fixed inset-y-0 left-0 z-40 flex h-dvh w-64 translate-x-0 flex-col border-r border-zinc-900 bg-black transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0" : "fixed inset-y-0 left-0 z-40 flex h-dvh w-64 -translate-x-full flex-col border-r border-zinc-900 bg-black transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0"}>
      {/* Logo */}
      <div className="border-b border-zinc-900 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600">
            <Bot size={22} className="text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-wide text-white">
              KASKA
            </h1>

            <p className="text-xs text-zinc-500">
              AI Workforce OS
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          const disabled = "disabled" in item && item.disabled;
          const active =
            !disabled &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));

          if (disabled) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-zinc-700"
              >
                <Icon size={20} />
                <span className="font-medium">{item.title}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Panel */}
      <div className="shrink-0 space-y-4 border-t border-zinc-900 p-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Wallet size={18} className="text-violet-400" />
            <p className="text-sm text-zinc-400">
              Available
            </p>
          </div>

          <p className="text-2xl font-bold text-white">
            {loading
              ? "—"
              : data?.sidebar.balanceStatus === "available"
                ? `${data.sidebar.availableUsdc} USDC`
                : "Unavailable"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Users size={18} className="text-violet-400" />
            <p className="text-sm text-zinc-400">
              Active Workers
            </p>
          </div>

          <p className="text-2xl font-bold text-white">
            {loading ? "—" : data?.sidebar.activeAgents ?? 0}
          </p>
        </div>

        <div className="flex justify-center border-t border-zinc-900 pt-3">
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2.5 text-red-500/60 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              <Power size={18} />
            </button>
          </SignOutButton>
        </div>
      </div>
      </aside>
    </>
  );
}
