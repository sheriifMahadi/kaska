export function PageLoadingSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="animate-pulse space-y-7 p-4 sm:p-6 lg:p-8">
      <div>
        <div className="h-8 w-40 rounded-lg bg-zinc-900" />
        <div className="mt-3 h-4 w-full max-w-md rounded bg-zinc-900" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="h-44 rounded-2xl border border-zinc-900 bg-zinc-950" />
        ))}
      </div>
    </div>
  );
}

export function ListLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-16 rounded-xl border border-zinc-900 bg-zinc-950" />
      ))}
    </div>
  );
}

export function PanelLoadingSkeleton() {
  return <div className="h-52 animate-pulse rounded-xl border border-zinc-900 bg-zinc-950" />;
}
