'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, AdminNav } from '@/components/TopBar';
import { Button, Card, ErrorBanner, Field } from '@/components/ui';

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('አዲሱ password ቢያንስ 8 ፊደል/ቁጥር ሊኖረው ይገባል');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('አዲሱ password ካረጋገጡት password ጋር አይመሳሰልም');
      return;
    }

    setSaving(true);
    try {
      await api.changeAdminPassword(currentPassword, newPassword);
      setSuccess('Password በተሳካ ሁኔታ ተቀይሯል');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Password መቀየር አልተቻለም');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding={20}>
      <div className="font-extrabold mb-1">Password ቀይር</div>
      <p className="hint mb-4">የአሁኑን password አረጋግጠው አዲስ password ያዘጋጁ።</p>

      <ErrorBanner message={error} />
      {success && (
        <div className="rounded-lg bg-stamp-green/10 text-stamp-green text-sm px-3 py-2 mb-3 font-semibold">
          {success}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="የአሁኑ Password"
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Field
          label="አዲስ Password"
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
        />
        <Field
          label="አዲስ Password (ድጋሚ)"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
        />
        <Button type="submit" variant="primary" block disabled={saving}>
          {saving ? 'በማዘጋጀት...' : 'Password አዘምን'}
        </Button>
      </form>
    </Card>
  );
}

function SettingsInner() {
  return (
    <div className="app-shell">
      <TopBar title="ቅንብር" subtitle="የመለያ ማስተካከያዎች" />
      <AdminNav active="settings" />

      <div className="container flex flex-col gap-3">
        <ChangePasswordCard />
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <RequireAuth role="ADMIN">
      <SettingsInner />
    </RequireAuth>
  );
}
