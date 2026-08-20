'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function TopBar({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="top-bar">
      <div>
        <div className="top-bar__brand">{title}</div>
        {subtitle && <div className="top-bar__sub">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-3.5">
        {rightSlot}
        {user && (
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="bg-transparent border border-cream/35 text-cream rounded-lg px-3 py-1.5 text-[13px] font-semibold"
          >
            ውጣ
          </button>
        )}
      </div>
    </div>
  );
}

function NavTabs<T extends string>({
  active,
  tabs,
}: {
  active: T;
  tabs: { key: T; href: string; label: string }[];
}) {
  return (
    <div className="flex gap-2 px-4 py-2.5 bg-ink-navy-deep overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`text-cream font-bold text-sm px-2.5 py-1.5 shrink-0 ${
            active === t.key ? 'opacity-100' : 'opacity-55'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function AdminNav({ active }: { active: 'orders' | 'products' | 'ledgers' | 'customers' }) {
  return (
    <NavTabs
      active={active}
      tabs={[
        { key: 'orders', href: '/admin/orders', label: 'ትዕዛዞች' },
        { key: 'products', href: '/admin/products', label: 'ካታሎግ' },
        { key: 'ledgers', href: '/admin/ledgers', label: 'ደብተር' },
        { key: 'customers', href: '/admin/customers', label: 'ነጋዴዎች' },
      ]}
    />
  );
}

export function CustomerNav({ active }: { active: 'catalog' | 'orders' }) {
  return (
    <NavTabs
      active={active}
      tabs={[
        { key: 'catalog', href: '/catalog', label: 'ካታሎግ' },
        { key: 'orders', href: '/orders', label: 'ትዕዛዞቼ' },
      ]}
    />
  );
}
