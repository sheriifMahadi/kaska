"use client";

import { useState } from "react";

type Props = {
  address: string;
};

export default function DepositPanel({ address }: Props) {
  const [copyState, setCopyState] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-amber-200">
          Send only USDC on Arc Testnet
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-100/70">
          Tokens sent on another network, or assets other than USDC, may
          not appear in Kaska. Testnet USDC has no real-world value.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
          Your Arc Testnet deposit address
        </p>
        <code className="block select-all break-all rounded-xl border border-zinc-800 bg-black p-4 font-mono text-xs text-green-400">
          {address}
        </code>
      </div>

      <button
        type="button"
        onClick={copyAddress}
        className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500"
      >
        {copyState === "copied" ? "Address Copied" : "Copy Address"}
      </button>

      <p aria-live="polite" className="min-h-5 text-center text-xs">
        {copyState === "copied" && (
          <span className="text-emerald-400">
            Ready to paste into the sending wallet.
          </span>
        )}
        {copyState === "failed" && (
          <span className="text-red-400">
            Copy failed. Select and copy the address manually.
          </span>
        )}
      </p>

      <ol className="space-y-2 text-sm text-zinc-400">
        <li>1. Select Arc Testnet in the sending wallet.</li>
        <li>2. Select USDC and paste this address.</li>
        <li>3. Confirm the address before sending.</li>
        <li>4. Wait for Arc confirmation; Kaska updates automatically.</li>
      </ol>
    </div>
  );
}
