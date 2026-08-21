'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, AdminNav } from '@/components/TopBar';
import { StatusPill } from '@/components/StatusPill';
import { Button, Card, ErrorBanner, EmptyState, FilterChips, LoadingRow, SelectField } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
  COLLECTING: 'እየተሰበሰበ',
  FULL: 'ሞልቷል',
  PAYMENT_REQUESTED: 'ክፍያ ተጠይቋል',
  DISPATCHED: 'ተልኳል',
};

const FILTER_OPTIONS = ['OPEN', 'COLLECTING', 'FULL', 'PAYMENT_REQUESTED', 'DISPATCHED'] as const;
const FILTER_LABELS: Record<string, string> = {
  OPEN: 'ክፍት ያሉ',
  COLLECTING: 'እየተሰበሰቡ',
  FULL: 'የሞሉ',
  PAYMENT_REQUESTED: 'ክፍያ የተጠየቁ',
  DISPATCHED: 'የተላኩ',
};

// Sum of item quantities across the batch's still-live orders (mirrors
// the backend's own loaded-vs-capacity calculation) — REJECTED orders
// don't count against capacity.
function loadedQuantity(batch: any): number {
  return (batch.orders || [])
    .filter((o: any) => o.status !== 'REJECTED')
    .reduce(
      (sum: number, o: any) =>
        sum + (o.items || []).reduce((s: number, i: any) => s + i.quantity, 0),
      0,
    );
}

function DispatchBatchForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const [plate, setPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.dispatchBatch(batchId, { vehiclePlateNumber: plate, driverName, driverPhone });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Dispatch አልተቻለም');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2.5 p-3 bg-paper rounded-[10px] border border-dashed border-ochre">
      <ErrorBanner message={error} />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="ታርጋ ቁጥር" value={plate} onChange={(e) => setPlate(e.target.value)} required />
        <input
          placeholder="የሹፌር ስም"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          required
        />
        <input
          placeholder="የሹፌር ስልክ"
          value={driverPhone}
          onChange={(e) => setDriverPhone(e.target.value)}
          required
          className="col-span-2"
        />
      </div>
      <Button variant="navy" block className="mt-2.5" disabled={saving}>
        {saving ? 'በመላክ ላይ...' : '🚚 ላክ (Dispatch)'}
      </Button>
    </form>
  );
}

// Admin: pre-open a COLLECTING batch for a product, ahead of any orders
// existing for it yet — optionally overriding the product's default
// capacity for this particular truck (trucks differ in size).
function StartBatchForm({ products, onStarted }: { products: any[]; onStarted: () => void }) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const batchable = products.filter((p) => p.batchCapacity);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setSaving(true);
    setError('');
    try {
      await api.startBatch(productId, capacity ? Number(capacity) : undefined);
      setOpen(false);
      setProductId('');
      setCapacity('');
      onStarted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ባች መክፈት አልተቻለም');
    } finally {
      setSaving(false);
    }
  }

  if (batchable.length === 0) return null;

  if (!open) {
    return (
      <Button variant="outline" block onClick={() => setOpen(true)}>
        + አዲስ ባች ክፈት
      </Button>
    );
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <ErrorBanner message={error} />
        <SelectField label="ምርት" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">-- ምረጥ --</option>
          {batchable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (ነባሪ አቅም፦ {p.batchCapacity})
            </option>
          ))}
        </SelectField>
        <div className="field">
          <label>የዚህ መኪና አቅም (ካልተሞላ ነባሪውን ይጠቀማል)</label>
          <input
            type="number"
            min={1}
            placeholder={String(products.find((p) => p.id === productId)?.batchCapacity ?? '')}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="outline" flex onClick={() => setOpen(false)}>
            ይቅር
          </Button>
          <Button variant="primary" flex disabled={saving || !productId}>
            {saving ? 'በመክፈት ላይ...' : 'ክፈት'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BatchesInner() {
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]>('OPEN');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [b, p] = await Promise.all([api.listBatches(), api.getProducts()]);
      setBatches(b);
      setProducts(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ባቾችን ማምጣት አልተቻለም');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function requestPayment(id: string) {
    setRequestingId(id);
    setError('');
    try {
      await api.requestPayment(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ክፍያ መጠየቅ አልተቻለም');
    } finally {
      setRequestingId(null);
    }
  }

  const filtered = batches.filter((b) => {
    if (filter === 'OPEN') return b.status !== 'DISPATCHED';
    return b.status === filter;
  });

  return (
    <div className="app-shell">
      <TopBar title="ባቾች" subtitle="የመኪና ጭነት ማጠናቀር (Truck Batching)" />
      <AdminNav active="batches" />

      <FilterChips options={FILTER_OPTIONS} active={filter} onChange={setFilter} labels={FILTER_LABELS} />

      <div className="container flex flex-col gap-3.5">
        <ErrorBanner message={error} />

        {!loading && <StartBatchForm products={products} onStarted={refresh} />}

        {loading && <LoadingRow />}
        {!loading && filtered.length === 0 && <EmptyState>ምንም ባች የለም</EmptyState>}

        {filtered.map((batch) => {
          const loaded = loadedQuantity(batch);
          const pct = batch.capacity ? Math.min(100, Math.round((loaded / batch.capacity) * 100)) : 0;
          const riders = (batch.orders || []).filter((o: any) => o.status !== 'REJECTED');
          const allReviewed = riders.every((o: any) => o.status === 'APPROVED' || o.status === 'REJECTED');

          return (
            <Card key={batch.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{batch.product?.name || 'ምርት'}</div>
                  <div className="hint">
                    {new Date(batch.createdAt).toLocaleDateString('am-ET')} · {riders.length} ደንበኞች
                  </div>
                </div>
                <span className={`status-pill status-pill--${batch.status.toLowerCase()}`}>
                  {STATUS_LABELS[batch.status] || batch.status}
                </span>
              </div>

              {batch.capacity != null && (
                <div className="mb-2.5">
                  <div className="flex justify-between text-[13px] font-semibold mb-1">
                    <span>
                      {loaded} / {batch.capacity}
                    </span>
                    <span className="text-ink-soft">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-paper rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ochre-deep rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 mb-2">
                {riders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center text-[13px] border-b border-paper-line pb-1.5 last:border-b-0">
                    <span>{o.customer?.storeName}</span>
                    <StatusPill status={o.status} />
                  </div>
                ))}
              </div>

              {batch.status === 'FULL' && (
                <Button
                  variant="primary"
                  block
                  disabled={requestingId === batch.id}
                  onClick={() => requestPayment(batch.id)}
                >
                  {requestingId === batch.id ? 'በመላክ ላይ...' : '💰 ክፍያ ጠይቅ (ለሁሉም)'}
                </Button>
              )}

              {batch.status === 'PAYMENT_REQUESTED' && !allReviewed && (
                <div className="hint mt-1">
                  ሁሉም ትዕዛዞች ከመላካቸው በፊት መጽደቅ/ውድቅ መደረግ አለባቸው (ከ"ትዕዛዞች" ገፅ)።
                </div>
              )}

              {batch.status === 'PAYMENT_REQUESTED' && allReviewed && (
                <>
                  {dispatchingId === batch.id ? (
                    <DispatchBatchForm
                      batchId={batch.id}
                      onDone={() => {
                        setDispatchingId(null);
                        refresh();
                      }}
                    />
                  ) : (
                    <Button variant="navy" block onClick={() => setDispatchingId(batch.id)}>
                      🚚 የትራንስፖርት መረጃ አስገባ እና ላክ
                    </Button>
                  )}
                </>
              )}

              {batch.status === 'DISPATCHED' && (
                <div className="text-[13px] bg-paper rounded-[10px] p-2.5">
                  🚚 {batch.vehiclePlateNumber} · {batch.driverName} · {batch.driverPhone}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminBatchesPage() {
  return (
    <RequireAuth role="ADMIN">
      <BatchesInner />
    </RequireAuth>
  );
}
