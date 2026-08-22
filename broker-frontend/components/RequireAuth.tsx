'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';

export function RequireAuth({
  role,
  children,
}: {
  role?: 'ADMIN' | 'CUSTOMER';
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      // Guests land here from a public page (e.g. tapped "ትዕዛዝ አድርግ" on
      // the open catalog) — carry the page they were on so login can
      // send them straight back instead of dumping them on /catalog.
      const loginPath = role === 'ADMIN' ? '/admin/login' : '/login';
      const redirect = pathname && pathname !== loginPath ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`${loginPath}${redirect}`);
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin/orders' : '/catalog');
    }
  }, [ready, user, role, router, pathname]);

  if (!ready || !user || (role && user.role !== role)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
