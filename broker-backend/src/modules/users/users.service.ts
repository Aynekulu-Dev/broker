import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import * as schema from '../../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Admin merchant directory (all 40+ Bahir Dar merchants, per the SRS)
  async findAllCustomers() {
    return this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, 'CUSTOMER'));
  }

  async findOne(id: string) {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
