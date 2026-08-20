'use client';

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

/** Shorthand for the "በመጫን ላይ..." loading row used across every list */
export function LoadingRow() {
  return <EmptyState>በመጫን ላይ...</EmptyState>;
}
