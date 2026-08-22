import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheHelper } from './cache.helper';
import { REDIS } from './redis.tokens';

export { REDIS };

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const client = new Redis(config.get<string>('REDIS_URL') as string, {
          connectTimeout: 3000,
          commandTimeout: 2000,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 200, 2000),
          lazyConnect: false,
        });
        client.on('error', (err) => {
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
