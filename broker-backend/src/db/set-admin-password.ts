/**
 * Set (or reset) the ADMIN account's password.
 *
 * There is no self-serve admin signup by design (see backend README), so
 * this script is the supported way to create the admin user the first time
 * or reset the password if it's been lost.
 *
 * Usage:
 *   npx tsx src/db/set-admin-password.ts <phoneNumber> <newPassword> [storeName] [ownerName]
 *
 * Example:
 *   npx tsx src/db/set-admin-password.ts 0912345678 "MyNewStrongPass!23" "Broker HQ" "Admin"
 *
 * Requires DATABASE_URL to be set (reads .env like the rest of the backend).
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as schema from './schema';

async function main() {
  const [phoneNumber, newPassword, storeName, ownerName] = process.argv.slice(2);

  if (!phoneNumber || !newPassword) {
    console.error(
      'Usage: npx tsx src/db/set-admin-password.ts <phoneNumber> <newPassword> [storeName] [ownerName]',
    );
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phoneNumber, phoneNumber));

    if (existing) {
      if (existing.role !== 'ADMIN') {
        console.error(
          `A user with phone ${phoneNumber} already exists with role ${existing.role}, not ADMIN. Refusing to overwrite.`,
        );
        process.exit(1);
      }
      await db
        .update(schema.users)
        .set({ passwordHash })
        .where(eq(schema.users.id, existing.id));
      console.log(`Password updated for existing admin (${phoneNumber}).`);
    } else {
      await db.insert(schema.users).values({
        storeName: storeName ?? 'Admin',
        ownerName: ownerName ?? 'Admin',
        phoneNumber,
        role: 'ADMIN',
        passwordHash,
      });
      console.log(`Admin user created for ${phoneNumber}.`);
    }

    console.log('Done. You can now log in at POST /auth/admin/login with this phone number and password.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
