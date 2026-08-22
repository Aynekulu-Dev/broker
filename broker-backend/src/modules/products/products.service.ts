import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import { CacheHelper } from '../../common/cache.helper';
import * as schema from '../../db/schema';
import {
  CreateProductDto,
  ToggleStockDto,
  UpdateProductDto,
} from './dto/product.dto';

const CATALOG_CACHE_KEY = 'catalog:products';
const CATALOG_CACHE_TTL_SECONDS = 60; // short TTL, invalidated on writes anyway

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheHelper,
  ) {}

  /**
   * FR-07: Catalog reads are served from Redis when possible so merchants
   * on slow mobile networks get near-instant responses. If the cache is
   * unavailable, this transparently falls back to a direct DB read.
   */
  async findAll() {
    const cached = await this.cache.get<schema.Product[]>(CATALOG_CACHE_KEY);
    if (cached) return cached;

    const items = await this.db.select().from(schema.products);
    await this.cache.set(CATALOG_CACHE_KEY, items, CATALOG_CACHE_TTL_SECONDS);
    return items;
  }

  async findOne(id: string) {
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const [product] = await this.db
      .insert(schema.products)
      .values({ ...dto, isInStock: true })
      .returning();
    await this.invalidateCache();
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const [product] = await this.db
      .update(schema.products)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    await this.invalidateCache();
    return product;
  }

  /** Admin's "አለ / አልቋል" binary toggle (FR-02) — no numeric stock tracking. */
  async toggleStock(id: string, dto: ToggleStockDto) {
    await this.findOne(id);
    const [product] = await this.db
      .update(schema.products)
      .set({ isInStock: dto.isInStock, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    await this.invalidateCache();
    return product;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.products).where(eq(schema.products.id, id));
    await this.invalidateCache();
    return { deleted: true };
  }

  private async invalidateCache() {
    await this.cache.del(CATALOG_CACHE_KEY);
  }
}
