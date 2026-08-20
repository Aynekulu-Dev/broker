'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Card, ErrorBanner, Field } from '@/components/ui';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.adminLogin(phoneNumber, password);
      login(res.accessToken, res.user);
      router.replace('/admin/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'መግባት አልተቻለም');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-ink-navy flex items-center justify-center p-5">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-7 text-cream">
          <div className="text-2xl font-extrabold">የአስተዳዳሪ ደብተር</div>
          <div className="text-sm opacity-70 mt-1">የአስተዳደር መስኮት</div>
        </div>

        <Card padding={24}>
          <ErrorBanner message={error} />
          <form onSubmit={submit}>
            <Field
              label="ስልክ ቁጥር"
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoFocus
            />
            <Field
              label="የይለፍ ቃል"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button variant="primary" block disabled={loading}>
              {loading ? 'በመግባት ላይ...' : 'ግባ'}
            </Button>
          </form>
        </Card>

        <div className="text-center mt-5">
          <a href="/login" className="text-cream/60 text-sm">
            የደንበኛ መግቢያ
          </a>
        </div>
      </div>
    </div>
  );
}
