import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheHelper } from './cache.helper';

export const REDIS = 'REDIS';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const client = new Redis(config.get<string>('REDIS_URL') as string, {
          // Fail fast instead of ioredis's default (retry up to 20x per
          // command with no cap) — a slow/unreachable Redis would otherwise
          // make every cached endpoint hang for a long time instead of
          // falling back to the database quickly. Callers wrap redis
          // calls in try/catch (see CacheHelper) so a failure here just
          // means "skip the cache this time", not a broken request.
          connectTimeout: 3000,
          commandTimeout: 2000,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 200, 2000),
          lazyConnect: false,
        });
        client.on('error', (err) => {
          // Log and move on — never let a Redis error crash the process
          // or an in-flight request. Every read/write through this client
          // is already wrapped defensively (see CacheHelper).
          logger.warn(`Redis connection issue (degrading to no-cache): ${err.message}`);
        });
        return client;
      },
    },
    CacheHelper,
  ],
  exports: [REDIS, CacheHelper],
})
export class RedisModule {}
