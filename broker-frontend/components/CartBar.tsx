'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { Button } from '@/components/ui';

export function CartBar() {
  const { items, total } = useCart();
  const router = useRouter();

  if (items.length === 0) return null;
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-ink-navy text-cream px-4.5 py-3.5 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.2)] z-30">
      <div>
        <div className="text-xs opacity-75">{count} እቃዎች</div>
        <div className="money text-lg font-bold">{total.toLocaleString()} ብር</div>
      </div>
      <Button variant="primary" onClick={() => router.push('/checkout')}>
        ወደ ትዕዛዝ →
      </Button>
    </div>
  );
}
