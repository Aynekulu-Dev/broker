'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar } from '@/components/TopBar';
import { Button, Card, ErrorBanner, EmptyState, QuantityStepper } from '@/components/ui';

function CheckoutInner() {
  const { items, total, updateQuantity, clear } = useCart();
  const router = useRouter();

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function submitOrder() {
    if (!receiptFile) {
      setError('እባክዎ የክፍያ ደረሰኝ ፎቶ ያያይዙ');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      setUploading(true);
      const { url } = await api.uploadReceipt(receiptFile);
      setUploading(false);

      await api.createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentReceiptUrl: url,
      });

      clear();
      router.replace('/orders');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('የተወሰኑ እቃዎች አልቀረቡም። እባክዎ የግዢ ዝርዝርዎን ያስተካክሉ።');
      } else {
        setError(err instanceof ApiError ? err.message : 'ትዕዛዙ አልተላከም');
      }
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="app-shell">
        <TopBar title="ትዕዛዝ" />
        <EmptyState>
          የግዢ ዝርዝርዎ ባዶ ነው
          <div className="mt-4">
            <Button variant="navy" onClick={() => router.push('/catalog')}>
              ወደ ካታሎግ ተመለስ
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title="ትዕዛዝ ማረጋገጫ" subtitle={`${items.length} እቃዎች`} />

      <div className="container">
        <ErrorBanner message={error} />

        <Card className="mb-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between py-2.5 border-b border-paper-line last:border-b-0"
            >
              <div>
                <div className="font-bold text-sm">{item.name}</div>
                <div className="hint">
                  {Number(item.price).toLocaleString()} ብር × {item.quantity}
                </div>
              </div>
              <QuantityStepper
                value={item.quantity}
                onChange={(q) => updateQuantity(item.productId, q)}
              />
            </div>
          ))}
          <div className="flex justify-between pt-3.5 font-extrabold text-[17px]">
            <span>ጠቅላላ ድምር</span>
            <span className="money text-ochre-deep">{total.toLocaleString()} ብር</span>
          </div>
        </Card>

        <Card>
          <div className="font-bold mb-2.5">የክፍያ ደረሰኝ ስክሪንሾት</div>
          <p className="hint mb-3">ወደ ባንክ ሂሳብ ከተላከ በኋላ ደረሰኙን በፎቶ ያንሱ እና እዚህ ያያይዙ</p>

          {receiptPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receiptPreview}
              alt="receipt preview"
              className="w-full max-h-[220px] object-contain rounded-[10px] mb-3 border border-paper-line"
            />
          )}

          <label className="btn btn-outline btn-block inline-flex cursor-pointer">
            {receiptFile ? 'ፎቶ ቀይር' : 'ፎቶ ይምረጡ'}
            <input type="file" accept="image/*" hidden onChange={onFileChange} />
          </label>

          <Button variant="primary" block className="mt-3.5" disabled={submitting} onClick={submitOrder}>
            {uploading ? 'ደረሰኝ በመላክ ላይ...' : submitting ? 'ትዕዛዝ በመላክ ላይ...' : 'ትዕዛዝ አረጋግጥ እና ላክ'}
          </Button>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth role="CUSTOMER">
      <CheckoutInner />
    </RequireAuth>
  );
}
