'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { Button, Card, ErrorBanner, Field, LoadingScreen } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { items } = useCart();

  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Only follow a redirect back into the app, never off-site.
  const redirectTo = searchParams.get('redirect');
  const nextPath = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/catalog';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.customerLogin(accessCode);
      login(res.accessToken, res.user);
      router.replace(nextPath);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('ብዙ ጊዜ የተሳሳተ ኮድ ተሞክሯል። ለጥቂት ደቂቃ ይጠብቁ እና እንደገና ይሞክሩ።');
      } else {
        setError(err instanceof ApiError ? err.message : 'ኮዱ ትክክል አይደለም');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-ink-navy flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7 text-cream">
          <div className="text-2xl font-extrabold">ትዕዛዝ ደብተር</div>
          <div className="text-sm opacity-70 mt-1">የጅምላ ንግድ ትዕዛዝ ስርዓት — ባህር ዳር</div>
        </div>

        <Card padding={24}>
          <ErrorBanner message={error} />
          <form onSubmit={submit}>
            <p className="hint mb-4">
              አስተዳዳሪው የሰጠዎትን የመዳረሻ ኮድ ያስገቡ
            </p>
            {items.length > 0 && (
              <div className="bg-paper border border-paper-line rounded-[10px] px-3.5 py-3 text-[13px] text-ink-soft mb-4">
                🛒 የግዢ ዝርዝርዎ ({items.length} እቃዎች) ተቀምጧል — ከገቡ በኋላ ትዕዛዝዎን ይቀጥላሉ።
              </div>
            )}
            <Field
              label="የመዳረሻ ኮድ"
              id="accessCode"
              type="text"
              placeholder="ለምሳሌ: A7K9M2QX"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              required
              autoFocus
              autoCapitalize="characters"
            />
            <Button variant="primary" block disabled={loading}>
              {loading ? 'በመግባት ላይ...' : 'ግባ'}
            </Button>
          </form>
        </Card>

        <div className="text-center mt-5">
          <a href="/catalog" className="text-cream/60 text-sm">
            ← ያለ መግቢያ ካታሎግ ይመልከቱ
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginForm />
    </Suspense>
  );
}
