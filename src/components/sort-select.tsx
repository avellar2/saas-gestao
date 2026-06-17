"use client";

interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  options: SortOption[];
  defaultValue?: string;
}

export function SortSelect({ options, defaultValue }: SortSelectProps) {
  return (
    <select
      defaultValue={defaultValue || options[0]?.value}
      onChange={(e) => {
        const url = new URL(window.location.href);
        url.searchParams.set("sort", e.target.value);
        url.searchParams.set("page", "1");
        window.location.href = url.toString();
      }}
      className="h-12 rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
