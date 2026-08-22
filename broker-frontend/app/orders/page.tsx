'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar } from '@/components/TopBar';
import { CustomerBottomNav } from '@/components/BottomNav';
import { StatusPill } from '@/components/StatusPill';
import { OrderStatusTimeline, BatchFillBar } from '@/components/OrderStatusTimeline';
import { Button, Card, EmptyState, ErrorBanner, OrderCardSkeleton } from '@/components/ui';

// Shown once an order's truck is FULL and the admin has requested
// payment (order status AWAITING_PAYMENT) — lets the merchant attach
// their receipt now, same upload step as the ordinary checkout flow.
function PayNowCard({ order, onPaid }: { order: any; onPaid: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) {
      setError('እባክዎ የክፍያ ደረሰኝ ፎቶ ያያይዙ');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const { url } = await api.uploadReceipt(file);
      await api.submitPayment(order.id, url);
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ደረሰኝ መላክ አልተቻለም');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-paper border border-dashed border-stamp-red rounded-[10px] p-3 mt-2.5 text-[13px]">
      <div className="font-bold mb-1.5">💰 መኪናው ሞልቷል — ክፍያ ይላኩ</div>
      <p className="hint mb-2.5">ወደ ባንክ ሂሳብ ከተላከ በኋላ ደረሰኙን በፎቶ ያንሱ እና እዚህ ያያይዙ</p>
      <ErrorBanner message={error} />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="receipt preview"
          className="w-full max-h-[180px] object-contain rounded-[10px] mb-2.5 border border-paper-line"
        />
      )}
      <label className="btn btn-outline btn-block inline-flex cursor-pointer">
        {file ? 'ፎቶ ቀይር' : 'ፎቶ ይምረጡ'}
        <input type="file" accept="image/*" hidden onChange={onFileChange} />
      </label>
      <Button variant="primary" block className="mt-2.5" disabled={uploading} onClick={submit}>
        {uploading ? 'በመላክ ላይ...' : 'ደረሰኝ ላክ'}
      </Button>
    </div>
  );
}

// Truck is "full" once every non-rejected rider's quantity for the
// batch's product adds up to (or passes) its capacity.
function computeFill(delivery: any): number | null {
  if (!delivery?.capacity || !Array.isArray(delivery.orders)) return null;
  return delivery.orders
    .filter((o: any) => o.status !== 'REJECTED')
    .flatMap((o: any) => o.items ?? [])
    .filter((it: any) => it.productId === delivery.productId)
    .reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
}

function OrdersInner() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    return api
      .myOrders()
      .then(async (mine) => {
        setOrders(mine);
        setLoading(false);
        // For orders riding on a still-open batch, fetch the live
        // delivery (with sibling orders) so we can show a fill-progress
        // bar — the order snapshot itself only carries capacity, not
        // how much of the truck is currently taken.
        const batchOrders = mine.filter((o: any) => o.deliveryId && o.delivery?.capacity);
        await Promise.all(
          batchOrders.map(async (o: any) => {
            try {
              const delivery = await api.trackDelivery(o.id);
              setOrders((prev) => prev.map((p) => (p.id === o.id ? { ...p, delivery } : p)));
            } catch {
              // no live delivery record yet — keep the snapshot as-is
            }
          }),
        );
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // Wired to GET /deliveries/order/:orderId — refetches the live delivery
  // record directly instead of relying on the order snapshot.
  async function refreshTracking(orderId: string) {
    setTrackingId(orderId);
    try {
      const delivery = await api.trackDelivery(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, delivery } : o)));
    } catch (err) {
      // No delivery recorded yet — nothing to update.
    } finally {
      setTrackingId(null);
    }
  }

  return (
    <div className="app-shell">
      <TopBar title="ትዕዛዞቼ" subtitle="ሁኔታ እና ትራንስፖርት መከታተያ" />

      <div className="container flex flex-col gap-3.5">
        {loading && (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        )}
        {!loading && orders.length === 0 && (
          <EmptyState>
            እስካሁን ምንም ትዕዛዝ አልተላከም
            <div className="mt-4">
              <a href="/catalog" className="btn btn-navy">
                ወደ ካታሎግ ሂድ
              </a>
            </div>
          </EmptyState>
        )}

        {orders.map((order) => {
          const fillInfo = order.deliveryId && order.delivery ? computeFill(order.delivery) : null;
          const showFillBar =
            fillInfo !== null &&
            order.delivery?.capacity &&
            ['PENDING', 'AWAITING_PAYMENT'].includes(order.status);

          return (
            <Card key={order.id}>
              <div className="flex justify-between items-start mb-2.5">
                <div>
                  <div className="text-xs text-ink-soft">
                    {new Date(order.createdAt).toLocaleDateString('am-ET')}
                  </div>
                  <div className="money text-[17px] mt-0.5">
                    {Number(order.totalAmount).toLocaleString()} ብር
                  </div>
                </div>
                <StatusPill status={order.status} />
              </div>

              <div className="text-[13px] text-ink-soft mb-3">
                {order.items?.map((i: any) => `${i.product?.name} ×${i.quantity}`).join('፣ ')}
              </div>

              <div className="border-t border-paper-line pt-3 mb-1">
                <OrderStatusTimeline order={order} />
              </div>

              {showFillBar && <BatchFillBar filled={fillInfo!} capacity={order.delivery.capacity} />}

              {order.status === 'AWAITING_PAYMENT' && (
                <PayNowCard order={order} onPaid={load} />
              )}

              {order.status === 'PAYMENT_SUBMITTED' && (
                <div className="bg-paper border border-dashed border-ochre rounded-[10px] p-3 text-[13px] mt-2.5">
                  ደረሰኝዎ ተልኳል — በአስተዳዳሪ በግምገማ ላይ ነው።
                </div>
              )}

              {order.status === 'DISPATCHED' && (
                <div className="bg-paper border border-dashed border-ochre rounded-[10px] p-3 text-[13px] mt-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="font-bold">🚚 የትራንስፖርት መረጃ</div>
                    <button
                      onClick={() => refreshTracking(order.id)}
                      disabled={trackingId === order.id}
                      className="text-ink-navy underline text-xs font-semibold"
                    >
                      {trackingId === order.id ? 'በማደስ ላይ...' : 'አድስ'}
                    </button>
                  </div>
                  {order.delivery ? (
                    <>
                      <div>ታርጋ ቁጥር: {order.delivery.vehiclePlateNumber}</div>
                      <div>ሹፌር: {order.delivery.driverName}</div>
                      <div>ስልክ: {order.delivery.driverPhone}</div>
                    </>
                  ) : (
                    <div className="hint">የትራንስፖርት መረጃ እስካሁን አልገባም</div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <CustomerBottomNav active="orders" />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth role="CUSTOMER">
      <OrdersInner />
    </RequireAuth>
  );
}
