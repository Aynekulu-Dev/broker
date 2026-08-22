'use client';

type Step = { key: string; label: string };

// Ordinary flow: receipt already attached at checkout, nothing to pay later.
const STANDARD_STEPS: Step[] = [
  { key: 'PENDING', label: 'ትዕዛዝ ገብቷል' },
  { key: 'APPROVED', label: 'ጸድቋል' },
  { key: 'DISPATCHED', label: 'ተልኳል' },
];

// Batch/truck-load flow: reserve a spot first, pay only once the truck fills.
const BATCH_STEPS: Step[] = [
  { key: 'PENDING', label: 'ቦታ ተይዟል' },
  { key: 'AWAITING_PAYMENT', label: 'ክፍያ ይጠበቃል' },
  { key: 'PAYMENT_SUBMITTED', label: 'ክፍያ በግምገማ' },
  { key: 'APPROVED', label: 'ጸድቋል' },
  { key: 'DISPATCHED', label: 'ተልኳል' },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OrderStatusTimeline({ order }: { order: any }) {
  const isBatch = !!order.deliveryId;
  const steps = isBatch ? BATCH_STEPS : STANDARD_STEPS;
  const rejected = order.status === 'REJECTED';

  // When rejected we still show how far the order got before rejection —
  // approximated as "everything up to APPROVED" since that's the step
  // admin review happens at in both flows.
  const currentIndex = rejected
    ? steps.findIndex((s) => s.key === 'APPROVED')
    : steps.findIndex((s) => s.key === order.status);

  return (
    <div className="flex items-center w-full py-1">
      {steps.map((step, i) => {
        const done = !rejected && i < currentIndex;
        const isCurrent = !rejected && i === currentIndex;
        const isRejectedHere = rejected && i === currentIndex;
        const upcoming = !done && !isCurrent && !isRejectedHere;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isRejectedHere
                    ? 'bg-stamp-red text-white'
                    : done
                    ? 'bg-stamp-green text-white'
                    : isCurrent
                    ? 'bg-ochre text-white'
                    : 'bg-paper-line text-ink-soft'
                }`}
              >
                {isRejectedHere ? <XIcon /> : done ? <CheckIcon /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              <span
                className={`text-[10px] font-semibold text-center leading-tight w-14 ${
                  isCurrent || isRejectedHere ? 'text-ink' : upcoming ? 'text-ink-soft/60' : 'text-ink-soft'
                }`}
              >
                {isRejectedHere ? 'ውድቅ ተደርጓል' : step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-[2px] flex-1 mx-1 mb-4 ${
                  done || (rejected && i < currentIndex) ? 'bg-stamp-green' : 'bg-paper-line'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Slim progress bar showing how full a truck-load batch is, when known. */
export function BatchFillBar({ filled, capacity }: { filled: number; capacity: number }) {
  const pct = Math.min(100, Math.round((filled / capacity) * 100));
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] font-semibold text-ink-soft mb-1">
        <span>የመኪና ጭነት</span>
        <span>
          {filled} / {capacity}
        </span>
      </div>
      <div className="h-2 bg-paper-line rounded-full overflow-hidden">
        <div className="h-full bg-ochre rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
