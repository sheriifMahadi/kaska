export default function ActivityFeed() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Recent Activity
      </h2>

      <div className="space-y-4 text-sm">
        <p>✓ Market Report Complete</p>
        <p>✓ SEO Audit Finished</p>
        <p>✕ Blog Generation Failed</p>
      </div>
    </div>
  );
}