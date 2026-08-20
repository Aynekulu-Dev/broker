'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, fileUrl } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, AdminNav } from '@/components/TopBar';
import { Product } from '@/components/ProductCard';
import { QrCodeCard } from '@/components/QrCodeCard';
import { Button, Card, ErrorBanner, Field, LoadingRow, Modal, TextareaField, Thumbnail } from '@/components/ui';

function ProductFields({
  name,
  setName,
  category,
  setCategory,
  price,
  setPrice,
  description,
  setDescription,
  photoUrl,
  onPhoto,
  uploading,
}: {
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  photoUrl: string;
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <>
      <Field label="የምርት ስም" value={name} onChange={(e) => setName(e.target.value)} required />
      <Field label="ምድብ" value={category} onChange={(e) => setCategory(e.target.value)} required />
      <Field
        label="ዋጋ (ብር)"
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />
      <TextareaField
        label="መግለጫ"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="field">
        <label>ፎቶ</label>
        {photoUrl && <Thumbnail photoUrl={photoUrl} alt="" size={72} />}
        <input type="file" accept="image/*" onChange={onPhoto} />
        {uploading && <span className="hint">በመላክ ላይ...</span>}
        {photoUrl && !uploading && <span className="hint">✓ ፎቶ ተጭኗል</span>}
      </div>
    </>
  );
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadProductPhoto(file);
      setPhotoUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createProduct({ name, category, price, description, photoUrl });
      setName('');
      setCategory('');
      setPrice('');
      setDescription('');
      setPhotoUrl('');
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ምርት ማከል አልተሳካም');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" block onClick={() => setOpen(true)}>
        + አዲስ ምርት ጨምር
      </Button>
    );
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <ErrorBanner message={error} />
        <ProductFields
          name={name}
          setName={setName}
          category={category}
          setCategory={setCategory}
          price={price}
          setPrice={setPrice}
          description={description}
          setDescription={setDescription}
          photoUrl={photoUrl}
          onPhoto={onPhoto}
          uploading={uploading}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" flex onClick={() => setOpen(false)}>
            ይቅር
          </Button>
          <Button variant="primary" flex disabled={saving || uploading}>
            {saving ? 'በማስቀመጥ ላይ...' : 'አስቀምጥ'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function EditProductModal({
  product,
  onClose,
  onSaved,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description || '');
  const [photoUrl, setPhotoUrl] = useState(product.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadProductPhoto(file);
      setPhotoUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateProduct(product.id, { name, category, price, description, photoUrl });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ማስተካከል አልተሳካም');
    } finally {
      setSaving(false);
    }
  }

  // Wired to DELETE /products/:id — previously this endpoint had no button.
  async function remove() {
    if (!window.confirm(`"${product.name}" ን መሰረዝ ይፈልጋሉ?`)) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteProduct(product.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'መሰረዝ አልተቻለም');
      setDeleting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="font-bold text-base mb-2.5">ምርት አስተካክል</div>
      <form onSubmit={submit}>
        <ErrorBanner message={error} />
        <ProductFields
          name={name}
          setName={setName}
          category={category}
          setCategory={setCategory}
          price={price}
          setPrice={setPrice}
          description={description}
          setDescription={setDescription}
          photoUrl={photoUrl}
          onPhoto={onPhoto}
          uploading={uploading}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" flex onClick={onClose}>
            ይቅር
          </Button>
          <Button variant="primary" flex disabled={saving || uploading}>
            {saving ? 'በማስቀመጥ ላይ...' : 'አስቀምጥ'}
          </Button>
        </div>
        <Button
          type="button"
          variant="danger"
          block
          className="mt-2"
          disabled={deleting}
          onClick={remove}
        >
          {deleting ? 'በመሰረዝ ላይ...' : 'ምርት ሰርዝ'}
        </Button>
      </form>
    </Modal>
  );
}

function ProductDetailModal({
  product,
  onClose,
  onEdit,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="mb-3">
        <Thumbnail photoUrl={product.photoUrl} alt={product.name} aspectRatio="4 / 3" radius={10} />
      </div>
      <div className="text-xs text-ink-soft font-semibold">{product.category}</div>
      <div className="font-bold text-xl mt-0.5">{product.name}</div>
      <div className="money text-lg text-ochre-deep mt-1.5">
        {Number(product.price).toLocaleString()} ብር
      </div>
      {product.description && (
        <div className="mt-2.5 text-ink-soft leading-relaxed">{product.description}</div>
      )}
      <div className="mt-2.5">
        <span className={`stamp static ${product.isInStock ? 'stamp--in' : 'stamp--out'}`}>
          {product.isInStock ? 'አለ' : 'አልቋል'}
        </span>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" flex onClick={onClose}>
          ዝጋ
        </Button>
        <Button variant="primary" flex onClick={onEdit}>
          አስተካክል
        </Button>
      </div>
    </Modal>
  );
}

function ProductsInner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [catalogUrl, setCatalogUrl] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setProducts(await api.getProducts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    if (typeof window !== 'undefined') {
      setCatalogUrl(`${window.location.origin}/catalog`);
    }
  }, []);

  async function toggle(id: string, next: boolean) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isInStock: next } : p)));
    await api.toggleStock(id, next);
  }

  return (
    <div className="app-shell">
      <TopBar title="ካታሎግ አስተዳደር" subtitle="ዋጋ እና ክምችት አዘጋጅ" />
      <AdminNav active="products" />

      <div className="container flex flex-col gap-3">
        <NewProductForm onCreated={refresh} />

        {catalogUrl && (
          <QrCodeCard
            url={catalogUrl}
            label="የካታሎግ ማስፈንጠሪያ (ደንበኞች ይህን ስካን አድርገው ማዘዝ ይችላሉ)"
            filename="broker-catalog-qr"
          />
        )}

        {loading && <LoadingRow />}

        {products.map((p) => (
          <Card key={p.id} padding={14} className="flex gap-3 items-center">
            <div
              onClick={() => setViewingProduct(p)}
              className="flex gap-3 items-center flex-1 cursor-pointer min-w-0"
            >
              <Thumbnail photoUrl={p.photoUrl} alt={p.name} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] truncate">{p.name}</div>
                <div className="hint">{p.category}</div>
                <div className="money text-ochre-deep mt-0.5">
                  {Number(p.price).toLocaleString()} ብር
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setEditingProduct(p)}>
              አስተካክል
            </Button>

            <button
              type="button"
              onClick={() => toggle(p.id, !p.isInStock)}
              className={`stamp-toggle ${p.isInStock ? 'stamp--in' : 'stamp--out'}`}
            >
              {p.isInStock ? 'አለ' : 'አልቋል'}
            </button>
          </Card>
        ))}
      </div>

      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onEdit={() => {
            setEditingProduct(viewingProduct);
            setViewingProduct(null);
          }}
        />
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <RequireAuth role="ADMIN">
      <ProductsInner />
    </RequireAuth>
  );
}
