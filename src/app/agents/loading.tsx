export default function AgentsLoading() {
  return (
    <main className="min-h-screen bg-[#050505] p-4 text-white sm:p-6 lg:p-8">
      <div className="animate-pulse">
        <div className="h-10 w-36 rounded-lg bg-zinc-900" />
        <div className="mt-3 h-5 w-full max-w-xl rounded bg-zinc-900" />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="h-12 flex-1 rounded-xl border border-zinc-900 bg-zinc-950" />
          <div className="h-12 w-full rounded-xl border border-zinc-900 bg-zinc-950 sm:w-72" />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-80 rounded-2xl border border-zinc-900 bg-zinc-950" />
          ))}
        </div>
      </div>
    </main>
  );
}
