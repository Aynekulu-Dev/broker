'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, AdminNav } from '@/components/TopBar';
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  LoadingRow,
  EmptyState,
  Modal,
  SelectField,
  StatCard,
} from '@/components/ui';

function CreditModal({
  customer,
  onClose,
  onDone,
}: {
  customer: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [orderId, setOrderId] = useState('');
  const [outstanding, setOutstanding] = useState<
    { orderId: string; totalAmount: string; remaining: string; createdAt: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .outstandingOrders(customer.customerId)
      .then(setOutstanding)
      .catch(() => setOutstanding([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.customerId]);

  function onSelectOrder(id: string) {
    setOrderId(id);
    const found = outstanding.find((o) => o.orderId === id);
    if (found) setAmount(found.remaining);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.addCredit(customer.customerId, amount, note, orderId || undefined);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ክፍያ መመዝገብ አልተቻለም');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} variant="center" maxWidth={380}>
      <form onSubmit={submit}>
        <div className="font-extrabold mb-1">{customer.storeName}</div>
        <div className="hint mb-3.5">የአሁኑ ሂሳብ: {Number(customer.balance).toLocaleString()} ብር</div>
        <ErrorBanner message={error} />

        {outstanding.length > 0 && (
          <SelectField
            label="ለየትኛው ትዕዛዝ (አማራጭ)"
            value={orderId}
            onChange={(e) => onSelectOrder(e.target.value)}
          >
            <option value="">-- ጠቅላላ ሂሳብ ላይ ብቻ --</option>
            {outstanding.map((o) => (
              <option key={o.orderId} value={o.orderId}>
                {new Date(o.createdAt).toLocaleDateString('am-ET')} · ቀሪ {Number(o.remaining).toLocaleString()}{' '}
                ብር (ጠቅላላ {Number(o.totalAmount).toLocaleString()})
              </option>
            ))}
          </SelectField>
        )}

        <Field
          label="የተከፈለ መጠን (ብር)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
        />
        <Field
          label="ማስታወሻ (አማራጭ)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ለምሳሌ: ጥሬ ገንዘብ"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" flex onClick={onClose}>
            ይቅር
          </Button>
          <Button variant="primary" flex disabled={saving}>
            {saving ? 'በማስቀመጥ ላይ...' : 'ክፍያ መዝግብ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Wired to GET /ledgers/customer/:customerId — the full debit/credit
// history for one merchant, not just their current balance.
function LedgerHistoryModal({ customer, onClose }: { customer: any; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ entries: any[]; currentBalance: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .customerLedger(customer.customerId)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'ታሪክ ማምጣት አልተቻለም'))
      .finally(() => setLoading(false));
  }, [customer.customerId]);

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <div className="font-extrabold mb-0.5">{customer.storeName}</div>
      <div className="hint mb-3.5">
        {customer.ownerName} · {customer.phoneNumber}
      </div>
      <ErrorBanner message={error} />
      {loading && <LoadingRow />}
      {data && (
        <>
          <div className="paper-card p-3 mb-3 flex justify-between items-center">
            <span className="hint">የአሁኑ ሂሳብ</span>
            <span
              className="money text-base"
              style={{ color: Number(data.currentBalance) > 0 ? 'var(--stamp-red)' : 'var(--stamp-green)' }}
            >
              {Number(data.currentBalance).toLocaleString()} ብር
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {data.entries.length === 0 && <EmptyState>ምንም የክፍያ ታሪክ የለም</EmptyState>}
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center border-b border-paper-line pb-2 text-sm"
              >
                <div>
                  <div className="hint">{new Date(entry.recordedAt).toLocaleDateString('am-ET')}</div>
                  <div className="font-semibold">
                    {Number(entry.debitAmount) > 0 ? 'ትዕዛዝ ተመዝግቧል' : 'ክፍያ ተቀብሏል'}
                  </div>
                </div>
                <span
                  className="money"
                  style={{
                    color:
                      Number(entry.debitAmount) > 0 ? 'var(--stamp-red)' : 'var(--stamp-green)',
                  }}
                >
                  {Number(entry.debitAmount) > 0
                    ? `+${Number(entry.debitAmount).toLocaleString()}`
                    : `-${Number(entry.creditAmount).toLocaleString()}`}{' '}
                  ብር
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <Button variant="outline" block className="mt-4" onClick={onClose}>
        ዝጋ
      </Button>
    </Modal>
  );
}

function LedgersInner() {
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditFor, setCreditFor] = useState<any | null>(null);
  const [historyFor, setHistoryFor] = useState<any | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  async function refreshBalances() {
    setLoading(true);
    try {
      setBalances(await api.allBalances());
    } finally {
      setLoading(false);
    }
  }

  async function refreshSales() {
    setSalesLoading(true);
    try {
      setSales(await api.monthlySales(year, month));
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    refreshBalances();
  }, []);

  useEffect(() => {
    refreshSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const totalOutstanding = balances.reduce((s, b) => s + Number(b.balance), 0);
  const totalRevenue = sales.reduce((s, r) => s + Number(r.totalRevenue), 0);

  return (
    <div className="app-shell">
      <TopBar title="ደብተር እና ትንተና" subtitle="የክፍያ ደብተር እና ትንተና" />
      <AdminNav active="ledgers" />

      <div className="container">
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <StatCard
            label="ጠቅላላ ያልተከፈለ"
            value={`${totalOutstanding.toLocaleString()} ብር`}
            color="var(--stamp-red)"
          />
          <StatCard
            label={`የ${month}/${year} ገቢ`}
            value={`${totalRevenue.toLocaleString()} ብር`}
            color="var(--stamp-green)"
          />
        </div>

        <div className="font-extrabold mb-2.5 mt-6">የነጋዴ ሂሳቦች</div>
        {loading && <LoadingRow />}
        <div className="flex flex-col gap-2.5">
          {balances.map((b) => (
            <Card key={b.customerId} padding={14} className="flex justify-between items-center">
              <div className="cursor-pointer" onClick={() => setHistoryFor(b)}>
                <div className="font-bold">{b.storeName}</div>
                <div className="hint">
                  {b.ownerName} · {b.phoneNumber}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="money text-base"
                  style={{ color: Number(b.balance) > 0 ? 'var(--stamp-red)' : 'var(--stamp-green)' }}
                >
                  {Number(b.balance).toLocaleString()} ብር
                </span>
                <Button variant="outline" size="sm" onClick={() => setCreditFor(b)}>
                  ክፍያ መዝግብ
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center mt-8 mb-2.5">
          <div className="font-extrabold">ወርሃዊ የምርት ሽያጭ</div>
          <div className="flex gap-1.5">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {salesLoading && <LoadingRow />}
        {!salesLoading && sales.length === 0 && <EmptyState>ለዚህ ወር ምንም ሽያጭ የለም</EmptyState>}
        <div className="flex flex-col gap-2">
          {sales.map((row) => (
            <Card key={row.productId} padding={12} className="flex justify-between">
              <div>
                <div className="font-bold text-sm">{row.productName}</div>
                <div className="hint">{row.totalQuantity} አሃድ ተሸጧል</div>
              </div>
              <span className="money text-ochre-deep">
                {Number(row.totalRevenue).toLocaleString()} ብር
              </span>
            </Card>
          ))}
        </div>
      </div>

      {creditFor && (
        <CreditModal
          customer={creditFor}
          onClose={() => setCreditFor(null)}
          onDone={() => {
            setCreditFor(null);
            refreshBalances();
          }}
        />
      )}

      {historyFor && <LedgerHistoryModal customer={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

export default function AdminLedgersPage() {
  return (
    <RequireAuth role="ADMIN">
      <LedgersInner />
    </RequireAuth>
  );
}
