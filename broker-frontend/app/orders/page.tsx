'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, CustomerNav } from '@/components/TopBar';
import { StatusPill } from '@/components/StatusPill';
import { Button, Card, EmptyState, LoadingRow } from '@/components/ui';

function OrdersInner() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    return api
      .myOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
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
      <CustomerNav active="orders" />

      <div className="container flex flex-col gap-3.5">
        {loading && <LoadingRow />}
        {!loading && orders.length === 0 && <EmptyState>እስካሁን ምንም ትዕዛዝ አልተላከም</EmptyState>}

        {orders.map((order) => (
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

            <div className="text-[13px] text-ink-soft mb-2.5">
              {order.items?.map((i: any) => `${i.product?.name} ×${i.quantity}`).join('፣ ')}
            </div>

            {order.status === 'DISPATCHED' && (
              <div className="bg-paper border border-dashed border-ochre rounded-[10px] p-3 text-[13px]">
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
        ))}
      </div>
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
