'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, AdminNav } from '@/components/TopBar';
import { Button, Card, ErrorBanner, Field, LoadingRow, EmptyState, Modal } from '@/components/ui';

// Shows a freshly generated access code exactly once, per AuthService's
// "never retrievable again" contract — the admin must copy it down now.
function AccessCodeModal({
  storeName,
  accessCode,
  onClose,
}: {
  storeName: string;
  accessCode: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(accessCode);
    setCopied(true);
  }

  return (
    <Modal onClose={onClose} variant="center" maxWidth={380}>
      <div className="font-extrabold mb-1">{storeName}</div>
      <p className="hint mb-4">
        ይህ ኮድ አሁን ብቻ ይታያል — ለነጋዴው በስልክ ወይም በአካል ያስተላልፉ እና አስፈላጊ ከሆነ ይፃፉት።
      </p>
      <div className="paper-card p-4 text-center mb-4">
        <div className="money text-2xl tracking-widest text-ink-navy">{accessCode}</div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" flex onClick={copy}>
          {copied ? '✓ ተቀድቷል' : 'ቅዳ'}
        </Button>
        <Button variant="primary" flex onClick={onClose}>
          ተከናውኗል
        </Button>
      </div>
    </Modal>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: (storeName: string, accessCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('Bahir Dar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.createCustomer({ storeName, ownerName, phoneNumber, city });
      setStoreName('');
      setOwnerName('');
      setPhoneNumber('');
      setOpen(false);
      onCreated(res.user.storeName, res.accessCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ነጋዴ መመዝገብ አልተሳካም');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" block onClick={() => setOpen(true)}>
        + አዲስ ነጋዴ መዝግብ
      </Button>
    );
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <ErrorBanner message={error} />
        <Field label="የሱቅ ስም" value={storeName} onChange={(e) => setStoreName(e.target.value)} required autoFocus />
        <Field label="የባለቤት ስም" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        <Field
          label="ስልክ ቁጥር"
          type="tel"
          placeholder="09XXXXXXXX"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <Field label="ከተማ" value={city} onChange={(e) => setCity(e.target.value)} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" flex onClick={() => setOpen(false)}>
            ይቅር
          </Button>
          <Button variant="primary" flex disabled={saving}>
            {saving ? 'በመመዝገብ ላይ...' : 'መዝግብ'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function CustomersInner() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState<{ storeName: string; accessCode: string } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setCustomers(await api.listCustomers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function regenerate(customer: any) {
    if (!window.confirm(`የ${customer.storeName} ኮድ እንደገና ማዘጋጀት ይፈልጋሉ? የቀድሞው ኮድ ስራ ያቆማል።`)) return;
    setRegeneratingId(customer.id);
    try {
      const res = await api.regenerateAccessCode(customer.id);
      setNewCode({ storeName: customer.storeName, accessCode: res.accessCode });
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'ኮድ ማዘጋጀት አልተቻለም');
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="app-shell">
      <TopBar title="ነጋዴዎች" subtitle="ደንበኞችን መዝግብ እና የመዳረሻ ኮድ አዘጋጅ" />
      <AdminNav active="customers" />

      <div className="container flex flex-col gap-3">
        <NewCustomerForm
          onCreated={(storeName, accessCode) => {
            setNewCode({ storeName, accessCode });
            refresh();
          }}
        />

        {loading && <LoadingRow />}
        {!loading && customers.length === 0 && <EmptyState>እስካሁን ምንም ነጋዴ አልተመዘገበም</EmptyState>}

        {customers.map((c) => (
          <Card key={c.id} padding={14} className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <div className="font-bold truncate">{c.storeName}</div>
              <div className="hint">
                {c.ownerName} · {c.phoneNumber}
                {c.city ? ` · ${c.city}` : ''}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={regeneratingId === c.id}
              onClick={() => regenerate(c)}
            >
              {regeneratingId === c.id ? 'በማዘጋጀት...' : 'ኮድ ቀይር'}
            </Button>
          </Card>
        ))}
      </div>

      {newCode && (
        <AccessCodeModal
          storeName={newCode.storeName}
          accessCode={newCode.accessCode}
          onClose={() => setNewCode(null)}
        />
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <RequireAuth role="ADMIN">
      <CustomersInner />
    </RequireAuth>
  );
}