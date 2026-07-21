export default function WorkerConsole() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Worker Console
      </h2>

      <pre className="font-mono text-sm text-purple-400">
{`> Initializing Research Agent...

✓ Connected

> Searching...

> Waiting...
`}
      </pre>
    </div>
  );
}