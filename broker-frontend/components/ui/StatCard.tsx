'use client';

export function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="paper-card p-4">
      <div className="hint">{label}</div>
      <div className="money text-xl mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
