const LABELS: Record<string, string> = {
  PENDING: 'በመጠባበቅ ላይ',
  AWAITING_PAYMENT: 'ክፍያ ይጠበቃል',
  PAYMENT_SUBMITTED: 'ክፍያ በግምገማ ላይ',
  APPROVED: 'ጸድቋል',
  REJECTED: 'ውድቅ ተደርጓል',
  DISPATCHED: 'ተልኳል',
};

export function StatusPill({ status }: { status: string }) {
  const cls = `status-pill status-pill--${status.toLowerCase()}`;
  return <span className={cls}>{LABELS[status] || status}</span>;
}
