'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { TopBar } from '@/components/TopBar';
import { CustomerBottomNav } from '@/components/BottomNav';
import { ProductCard, Product } from '@/components/ProductCard';
import { CartBar } from '@/components/CartBar';
import { FilterChips, EmptyState, ProductCardSkeleton } from '@/components/ui';

// Public: anyone can browse the catalog without logging in (FR-02/FR-07).
// Login is only required at checkout, when they actually place an order —
// see /checkout, which is still wrapped in RequireAuth.
export default function CatalogPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('ሁሉም');

  useEffect(() => {
    api
      .getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['ሁሉም', ...Array.from(set)];
  }, [products]);

  const visible = useMemo(
    () => (category === 'ሁሉም' ? products : products.filter((p) => p.category === category)),
    [products, category],
  );

  return (
    <div className="app-shell">
      <TopBar title="ካታሎግ" subtitle="የዛሬ ዋጋ እና ክምችት" />
      {!user && (
        <div className="bg-ink-navy-deep px-4 py-2.5 flex items-center justify-between">
          <span className="text-cream/70 text-xs">ትዕዛዝ ለመላክ መግባት ያስፈልጋል</span>
          <a href="/login" className="text-ochre text-xs font-bold shrink-0 ml-3">
            ግባ →
          </a>
        </div>
      )}

      <FilterChips options={categories} active={category} onChange={setCategory} />

      <div className="container flex flex-col gap-3">
        {loading && (
          <>
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </>
        )}
        {!loading && visible.length === 0 && <EmptyState>ምንም ምርት አልተገኘም</EmptyState>}
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <CartBar />
      <CustomerBottomNav active="catalog" />
    </div>
  );
}
