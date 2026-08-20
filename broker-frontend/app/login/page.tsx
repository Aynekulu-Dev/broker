'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Card, ErrorBanner, Field } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.customerLogin(accessCode);
      login(res.accessToken, res.user);
      router.replace('/catalog');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ኮዱ ትክክል አይደለም');
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
          <a href="/admin/login" className="text-cream/60 text-sm">
            የአስተዳዳሪ መግቢያ
          </a>
        </div>
      </div>
    </div>
  );
}
