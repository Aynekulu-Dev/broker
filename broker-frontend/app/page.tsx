'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (user.role === 'ADMIN') router.replace('/admin/orders');
    else router.replace('/catalog');
  }, [ready, user, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-ink-navy text-cream font-bold">
      በመጫን ላይ...
    </div>
  );
}
