"use client";

interface Props {
  search: string;
  onSearch: (value: string) => void;
}

export function MarketplaceToolbar({
  search,
  onSearch,
}: Props) {
  return (
    <div className="mb-8">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search AI workers..."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-500"
      />
    </div>
  );
}
