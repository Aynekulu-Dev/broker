'use client';

import { useCart } from '@/lib/cart';
import { Button, Card, QuantityStepper, Thumbnail } from '@/components/ui';

export type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  description?: string;
  photoUrl: string;
  isInStock: boolean;
};

export function ProductCard({ product }: { product: Product }) {
  const { items, add, updateQuantity } = useCart();
  const inCart = items.find((i) => i.productId === product.id);

  return (
    <Card
      padding={14}
      className={`relative overflow-hidden flex gap-3.5 ${product.isInStock ? '' : 'opacity-75'}`}
    >
      <div className={`stamp ${product.isInStock ? 'stamp--in' : 'stamp--out'}`}>
        {product.isInStock ? 'አለ' : 'አልቋል'}
      </div>

      <Thumbnail photoUrl={product.photoUrl} alt={product.name} size={76} radius={10} />

      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-soft font-semibold">{product.category}</div>
        <div className="font-bold text-base mt-0.5">{product.name}</div>
        {product.description && (
          <div className="text-[13px] text-ink-soft mt-1 line-clamp-2">
            {product.description}
          </div>
        )}

        <div className="flex items-center justify-between mt-2.5">
          <span className="money text-base text-ochre-deep">
            {Number(product.price).toLocaleString()} ብር
          </span>

          {!product.isInStock ? (
            <span className="hint">አልቀረበም</span>
          ) : inCart ? (
            <QuantityStepper
              value={inCart.quantity}
              onChange={(q) => updateQuantity(product.id, q)}
            />
          ) : (
            <Button
              variant="navy"
              size="sm"
              onClick={() =>
                add({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  photoUrl: product.photoUrl,
                })
              }
            >
              ጨምር
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
