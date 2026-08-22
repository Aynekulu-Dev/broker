'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[22px] h-[22px]"
    >
      {children}
    </svg>
  );
}

const CATALOG_ICON = <path d="M4 6h16M4 12h16M4 18h9" />;
const ORDERS_ICON = (
  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 7h6m-6 4h6" />
);
const LOGIN_ICON = <path d="M15 12H3m0 0l4-4m-4 4l4 4M15 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />;

/** height reserved in .app-shell content so the fixed bar never overlaps
 * the last card in a list — kept in one place so CartBar can read it too. */
export const BOTTOM_NAV_HEIGHT = 64;

/**
 * Fixed bottom tab bar for the customer side of the app. Two tabs when
 * logged in (ካታሎግ / ትዕዛዞቼ); a single "ግባ" tab for guests, since "ትዕዛዞቼ"
 * has nothing to show them until they do.
 */
export function CustomerBottomNav({ active }: { active: 'catalog' | 'orders' }) {
  const { user } = useAuth();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-ink-navy border-t border-white/10 flex"
      style={{ height: BOTTOM_NAV_HEIGHT, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link
        href="/catalog"
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-cream ${
          active === 'catalog' ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <Icon>{CATALOG_ICON}</Icon>
        <span className="text-[11px] font-bold">ካታሎግ</span>
      </Link>

      {user ? (
        <Link
          href="/orders"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-cream ${
            active === 'orders' ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <Icon>{ORDERS_ICON}</Icon>
          <span className="text-[11px] font-bold">ትዕዛዞቼ</span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-ochre"
        >
          <Icon>{LOGIN_ICON}</Icon>
          <span className="text-[11px] font-bold">ግባ</span>
        </Link>
      )}
    </nav>
  );
}
