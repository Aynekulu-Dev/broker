'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { TopBar, CustomerNav } from '@/components/TopBar';
import { ProductCard, Product } from '@/components/ProductCard';
import { CartBar } from '@/components/CartBar';
import { FilterChips, LoadingRow, EmptyState } from '@/components/ui';

function CatalogInner() {
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
      <CustomerNav active="catalog" />

      <FilterChips options={categories} active={category} onChange={setCategory} />

      <div className="container flex flex-col gap-3">
        {loading && <LoadingRow />}
        {!loading && visible.length === 0 && <EmptyState>ምንም ምርት አልተገኘም</EmptyState>}
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <CartBar />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <RequireAuth role="CUSTOMER">
      <CatalogInner />
    </RequireAuth>
  );
}
