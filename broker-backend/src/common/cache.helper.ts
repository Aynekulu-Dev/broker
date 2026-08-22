import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from './redis.module';

/**
 * Thin wrapper around Redis reads/writes used by every cached endpoint.
 * If Redis is slow, unreachable, or errors out, callers get `null`
 * (cache miss) instead of a thrown exception — the request falls back
 * to hitting the database directly rather than failing outright.
 * This is what actually keeps the app responsive when the free-tier
 * Redis instance hiccups, instead of every cached route 500-ing.
 */
@Injectable()
export class CacheHelper {
  private readonly logger = new Logger(CacheHelper.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Cache read failed for "${key}", falling back to DB: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache write failed for "${key}" (non-fatal): ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Cache invalidation failed for "${key}" (non-fatal): ${(err as Error).message}`);
    }
  }
}
