'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, fileUrl } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, AdminNav } from '@/components/TopBar';
import { StatusPill } from '@/components/StatusPill';
import {
  Button,
  Card,
  ErrorBanner,
  FilterChips,
  LoadingRow,
  EmptyState,
  Modal,
  QuantityStepper,
  SelectField,
} from '@/components/ui';

const FILTER_LABELS: Record<string, string> = {
  ALL: 'ሁሉም',
  PENDING: 'በመጠባበቅ ላይ',
  APPROVED: 'ጸድቋል',
  DISPATCHED: 'ተልኳል',
  REJECTED: 'ውድቅ ተደርጓል',
};

const FILTER_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'DISPATCHED', 'REJECTED'] as const;

// Shared dispatch form — used both for a single order and for a batch of
// several orders riding on the same truck.
function DispatchForm({ orderIds, onDone }: { orderIds: string[]; onDone: () => void }) {
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
      await api.createDelivery({
        orderIds,
        vehiclePlateNumber: plate,
        driverName,
        driverPhone,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'የመላኪያ መረጃ ማስቀመጥ አልተቻለም');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2.5 p-3 bg-paper rounded-[10px] border border-dashed border-ochre">
      <ErrorBanner message={error} />
      <div className="hint mb-2">{orderIds.length} ትዕዛዝ(ዎች) በዚህ መኪና ይላካሉ</div>
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
        {saving ? 'በማስቀመጥ ላይ...' : 'ላክ (Dispatch)'}
      </Button>
    </form>
  );
}

// Admin edit: adjust quantities, remove a line, or add another product —
// only ever shown for PENDING orders (backend enforces this too).
function EditOrderModal({
  order,
  products,
  onClose,
  onSaved,
}: {
  order: any;
  products: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<{ productId: string; name: string; price: string; quantity: number }[]>(
    order.items.map((i: any) => ({
      productId: i.productId,
      name: i.product?.name ?? '',
      price: i.unitPrice,
      quantity: i.quantity,
    })),
  );
  const [addProductId, setAddProductId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const addable = products.filter((p) => !items.some((i) => i.productId === p.id));

  function setQty(productId: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function addProduct() {
    const p = products.find((p) => p.id === addProductId);
    if (!p) return;
    setItems((prev) => [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
    setAddProductId('');
  }

  async function submit() {
    if (items.length === 0) {
      setError('ትዕዛዙ ቢያንስ 1 እቃ ሊኖረው ይገባል');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateOrder(
        order.id,
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ማስተካከል አልተቻለም');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="font-bold text-base mb-2.5">ትዕዛዝ አስተካክል</div>
      <ErrorBanner message={error} />
      <div className="flex flex-col gap-2.5 mb-3">
        {items.map((i) => (
          <div key={i.productId} className="flex items-center justify-between gap-2 border-b border-paper-line pb-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{i.name}</div>
              <div className="hint">{Number(i.price).toLocaleString()} ብር</div>
            </div>
            <QuantityStepper value={i.quantity} onChange={(q) => setQty(i.productId, q)} />
            <button
              type="button"
              className="text-stamp-red font-bold px-1.5"
              onClick={() => removeItem(i.productId)}
              aria-label="አስወግድ"
            >
              ✕
            </button>
          </div>
        ))}
        {items.length === 0 && <EmptyState>ምንም እቃ የለም</EmptyState>}
      </div>

      {addable.length > 0 && (
        <div className="flex gap-2 items-end mb-3">
          <div className="flex-1">
            <SelectField label="ምርት ጨምር" value={addProductId} onChange={(e) => setAddProductId(e.target.value)}>
              <option value="">-- ምረጥ --</option>
              {addable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {Number(p.price).toLocaleString()} ብር
                </option>
              ))}
            </SelectField>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!addProductId} onClick={addProduct}>
            ጨምር
          </Button>
        </div>
      )}

      <div className="flex justify-between pt-2 font-extrabold text-[17px] mb-3">
        <span>ጠቅላላ ድምር</span>
        <span className="money text-ochre-deep">{total.toLocaleString()} ብር</span>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" flex onClick={onClose}>
          ይቅር
        </Button>
        <Button type="button" variant="primary" flex disabled={saving} onClick={submit}>
          {saving ? 'በማስቀመጥ ላይ...' : 'አስቀምጥ'}
        </Button>
      </div>
    </Modal>
  );
}

function OrdersInner() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]>('ALL');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [error, setError] = useState('');

  // Batch-dispatch mode: pick several APPROVED, undispatched orders and
  // send them together on one vehicle.
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function refresh() {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([api.allOrders(), api.getProducts()]);
      setOrders(o);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function approve(id: string) {
    await api.approveOrder(id);
    refresh();
  }

  async function reject(id: string) {
    const reason = window.prompt('የውድቅ ምክንያት:');
    if (!reason) return;
    await api.rejectOrder(id, reason);
    refresh();
  }

  async function remove(order: any) {
    if (!window.confirm(`ይህን ትዕዛዝ (${Number(order.totalAmount).toLocaleString()} ብር) መሰረዝ ይፈልጋሉ?`)) return;
    setError('');
    try {
      await api.deleteOrder(order.id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ትዕዛዝ መሰረዝ አልተቻለም');
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);
  const dispatchableCount = orders.filter((o) => o.status === 'APPROVED' && !o.delivery).length;

  return (
    <div className="app-shell">
      <TopBar title="ትዕዛዞች" subtitle="ትዕዛዝ ማጽደቅ እና መላክ" />
      <AdminNav active="orders" />

      <FilterChips options={FILTER_OPTIONS} active={filter} onChange={setFilter} labels={FILTER_LABELS} />

      <div className="container flex flex-col gap-3.5">
        <ErrorBanner message={error} />

        {dispatchableCount > 1 && (
          <Button
            type="button"
            variant={batchMode ? 'danger' : 'outline'}
            block
            onClick={() => {
              setBatchMode((v) => !v);
              setSelected(new Set());
            }}
          >
            {batchMode ? 'ምርጫ ይቅር' : `🚚 ብዙ ትዕዛዞችን በ1 መኪና ላክ (${dispatchableCount} ዝግጁ)`}
          </Button>
        )}

        {batchMode && selected.size > 0 && (
          <Card>
            <div className="font-bold mb-2">{selected.size} ትዕዛዝ(ዎች) ተመርጠዋል</div>
            <DispatchForm
              orderIds={[...selected]}
              onDone={() => {
                setBatchMode(false);
                setSelected(new Set());
                refresh();
              }}
            />
          </Card>
        )}

        {loading && <LoadingRow />}
        {!loading && filtered.length === 0 && <EmptyState>ምንም ትዕዛዝ የለም</EmptyState>}

        {filtered.map((order) => {
          const canSelect = batchMode && order.status === 'APPROVED' && !order.delivery;
          return (
            <Card key={order.id} className={selected.has(order.id) ? 'ring-2 ring-ink-navy' : ''}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-2">
                  {canSelect && (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                    />
                  )}
                  <div>
                    <div className="font-bold">{order.customer?.storeName}</div>
                    <div className="hint">
                      {order.customer?.ownerName} · {order.customer?.phoneNumber}
                    </div>
                  </div>
                </div>
                <StatusPill status={order.status} />
              </div>

              <div className="text-[13px] text-ink-soft mb-2">
                {order.items?.map((i: any) => `${i.product?.name} ×${i.quantity}`).join('፣ ')}
              </div>

              <div className="flex justify-between items-center">
                <span className="money text-base text-ochre-deep">
                  {Number(order.totalAmount).toLocaleString()} ብር
                </span>
                <a
                  href={fileUrl(order.paymentReceiptUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-bold text-ink-navy underline"
                >
                  ደረሰኝ ይመልከቱ
                </a>
              </div>

              {!batchMode && (
                <div className="flex gap-2 mt-3">
                  {order.status === 'PENDING' && (
                    <Button variant="outline" size="sm" onClick={() => setEditingOrder(order)}>
                      አስተካክል
                    </Button>
                  )}
                  {order.status !== 'DISPATCHED' && (
                    <Button variant="danger" size="sm" onClick={() => remove(order)}>
                      ሰርዝ
                    </Button>
                  )}
                </div>
              )}

              {!batchMode && order.status === 'PENDING' && (
                <div className="flex gap-2 mt-2">
                  <Button variant="primary" flex onClick={() => approve(order.id)}>
                    አጽድቅ
                  </Button>
                  <Button variant="danger" flex onClick={() => reject(order.id)}>
                    ውድቅ አድርግ
                  </Button>
                </div>
              )}

              {!batchMode && order.status === 'APPROVED' && !order.delivery && (
                <>
                  {dispatchingId === order.id ? (
                    <DispatchForm
                      orderIds={[order.id]}
                      onDone={() => {
                        setDispatchingId(null);
                        refresh();
                      }}
                    />
                  ) : (
                    <Button variant="navy" block className="mt-3" onClick={() => setDispatchingId(order.id)}>
                      🚚 የትራንስፖርት መረጃ አስገባ
                    </Button>
                  )}
                </>
              )}

              {order.delivery && (
                <div className="mt-3 text-[13px] bg-paper rounded-[10px] p-2.5">
                  🚚 {order.delivery.vehiclePlateNumber} · {order.delivery.driverName} ·{' '}
                  {order.delivery.driverPhone}
                  {order.delivery.orders?.length > 1 && (
                    <span className="hint"> · ከሌላ {order.delivery.orders.length - 1} ትዕዛዝ(ዎች) ጋር</span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          products={products}
          onClose={() => setEditingOrder(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <RequireAuth role="ADMIN">
      <OrdersInner />
    </RequireAuth>
  );
}
