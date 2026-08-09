"use client";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  workType: "all" | "one-time" | "recurring";
  onWorkTypeChange: (value: "all" | "one-time" | "recurring") => void;
}

export function MarketplaceToolbar({
  search,
  onSearch,
  workType,
  onWorkTypeChange,
}: Props) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search agents or capabilities..."
        className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-violet-500"
      />
      <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        {(["all", "one-time", "recurring"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onWorkTypeChange(option)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm capitalize transition sm:flex-none ${workType === option ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
