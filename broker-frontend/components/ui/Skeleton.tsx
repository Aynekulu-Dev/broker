'use client';

/** Shimmering placeholder block — building block for list skeletons. */
function Bone({ className = '' }: { className?: string }) {
  return <div className={`bg-paper-line/70 rounded-md animate-pulse ${className}`} />;
}

/** Mimics the shape of a ProductCard while products are loading, so the
 * catalog doesn't flash a bare "በመጫን ላይ..." line then pop in real content. */
export function ProductCardSkeleton() {
  return (
    <div className="paper-card flex gap-3.5 p-3.5">
      <Bone className="w-[76px] h-[76px] shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2 py-1">
        <Bone className="h-3 w-16" />
        <Bone className="h-4 w-3/4" />
        <div className="flex items-center justify-between mt-2">
          <Bone className="h-4 w-14" />
          <Bone className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Mimics a single order/list card row for the orders screen. */
export function OrderCardSkeleton() {
  return (
    <div className="paper-card p-3.5 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-20" />
          <Bone className="h-5 w-24" />
        </div>
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      <Bone className="h-3 w-4/5" />
    </div>
  );
}
