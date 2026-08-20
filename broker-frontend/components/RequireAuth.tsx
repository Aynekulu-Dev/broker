'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(role === 'ADMIN' ? '/admin/login' : '/login');
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin/orders' : '/catalog');
    }
  }, [ready, user, role, router]);

  if (!ready || !user || (role && user.role !== role)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
