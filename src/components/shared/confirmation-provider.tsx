"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Request = {
  title: string;
  description: string;
  confirmLabel?: string;
};

type PendingRequest = Request & { resolve: (confirmed: boolean) => void };

const ConfirmationContext = createContext<
  ((request: Request) => Promise<boolean>) | null
>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);

  const requestConfirmation = useCallback((request: Request) => {
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { ...request, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const finish = (confirmed: boolean) => {
    pendingRef.current?.resolve(confirmed);
    pendingRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmationContext.Provider value={requestConfirmation}>
      {children}
      {pending ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={() => finish(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="confirmation-title" className="text-lg font-semibold text-white">{pending.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{pending.description}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => finish(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500">Keep</button>
              <button type="button" onClick={() => finish(true)} className="rounded-lg border border-red-900 bg-red-950/30 px-4 py-2 text-sm text-red-300 hover:bg-red-950/60">{pending.confirmLabel ?? "Confirm"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const value = useContext(ConfirmationContext);
  if (!value) throw new Error("Confirmation provider is missing");
  return value;
}
