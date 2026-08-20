import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import { REDIS } from '../../common/redis.module';
import * as schema from '../../db/schema';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // For Render health checks / uptime monitors (e.g. UptimeRobot).
  // Verifies the API can actually reach Postgres and Redis, not just
  // that the Node process is alive.
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { database: { status: 'up' } };
    } catch (err) {
      throw new HealthCheckError('Database check failed', {
        database: { status: 'down', message: (err as Error).message },
      });
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return { redis: { status: 'up' } };
    } catch (err) {
      throw new HealthCheckError('Redis check failed', {
        redis: { status: 'down', message: (err as Error).message },
      });
    }
  }
}
