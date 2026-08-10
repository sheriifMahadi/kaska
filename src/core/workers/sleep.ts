export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const timeout = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      finish();
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
