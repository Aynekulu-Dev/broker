'use client';

export function FilterChips<T extends string>({
  options,
  active,
  onChange,
  labels,
}: {
  options: readonly T[];
  active: T;
  onChange: (value: T) => void;
  /** Optional display-label override per option; falls back to the raw option value */
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`shrink-0 px-3.5 py-[7px] rounded-full border-[1.5px] border-ink-navy font-bold text-[13px] ${
            active === o ? 'bg-ink-navy text-cream' : 'bg-transparent text-ink-navy'
          }`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}
