"use client";

import { FormEvent, useState } from "react";

type Props = {
  availableBalance: string;
  onSubmitted: () => Promise<void>;
};

export default function WithdrawalPanel({
  availableBalance,
  onSubmitted,
}: Props) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [requestId, setRequestId] = useState(() =>
    crypto.randomUUID()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: recipient.trim(),
          amount: amount.trim(),
          idempotencyKey: requestId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Withdrawal could not be submitted");
      }

      setSubmitted(true);
      setRequestId(crypto.randomUUID());
      await onSubmitted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Withdrawal could not be submitted"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="font-medium text-emerald-300">
          Withdrawal submitted
        </p>
        <p className="mt-2 text-sm text-emerald-100/70">
          Circle accepted the transfer. It will remain pending until the
          transaction-status synchronization batch confirms it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-zinc-400">
        Available to withdraw: {availableBalance} USDC
      </p>

      <div>
        <label className="mb-2 block text-sm text-zinc-400">
          Recipient Arc address
        </label>
        <input
          required
          type="text"
          autoComplete="off"
          placeholder="0x..."
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-violet-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-zinc-400">
          Amount (USDC)
        </label>
        <input
          required
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-violet-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Withdraw USDC"}
      </button>

      <p className="text-xs leading-5 text-zinc-500">
        Verify the network and recipient carefully. On-chain transfers
        cannot be reversed.
      </p>
    </form>
  );
}
