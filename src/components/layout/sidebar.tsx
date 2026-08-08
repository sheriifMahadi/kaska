"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/constants/navigation";
import {
  Bot,
  Wallet,
  Users,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-900 bg-black">
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
      <nav className="flex-1 space-y-2 px-4 py-6">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="space-y-5 border-t border-zinc-900 p-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Wallet size={18} className="text-violet-400" />
            <p className="text-sm text-zinc-400">
              Treasury
            </p>
          </div>

          <p className="text-2xl font-bold text-white">
            486 USDC
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Users size={18} className="text-violet-400" />
            <p className="text-sm text-zinc-400">
              Active Workers
            </p>
          </div>

          <p className="text-2xl font-bold text-white">
            4
          </p>
        </div>
      </div>
    </aside>
  );
}
