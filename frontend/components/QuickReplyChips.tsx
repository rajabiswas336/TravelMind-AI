"use client";

export function QuickReplyChips({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="group relative rounded-full border border-ink/15 bg-white px-4 py-1.5 font-body text-sm text-ink
                     transition-colors hover:border-runway hover:bg-runway/5
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-runway"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
