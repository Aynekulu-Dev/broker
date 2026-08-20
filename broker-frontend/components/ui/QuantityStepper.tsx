'use client';

import { useEffect, useState } from 'react';

/**
 * −/+ buttons plus a real editable number field in the middle, so
 * merchants ordering large quantities (e.g. 50, 200) don't have to tap
 * "+" that many times — they can just type the number.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  const [text, setText] = useState(String(value));

  // Keep the text in sync when the quantity changes from outside
  // (e.g. the −/+ buttons, or the cart being updated elsewhere).
  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = parseInt(raw, 10);
    if (!raw || Number.isNaN(parsed) || parsed < min) {
      setText(String(value));
      return;
    }
    setText(String(parsed));
    if (parsed !== value) onChange(parsed);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-outline !px-2.5 !py-1"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-14 text-center font-bold border border-paper-line rounded-md py-1"
      />
      <button type="button" className="btn btn-outline !px-2.5 !py-1" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
