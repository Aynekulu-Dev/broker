import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import type Redis from 'ioredis';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import { REDIS } from '../../common/redis.module';
import * as schema from '../../db/schema';
import { CreateCustomerDto } from './dto/login.dto';

// Characters chosen to avoid visual ambiguity when read aloud/over the
// phone (no 0/O, no 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

// Brute-force protection on the login endpoint itself: the code is
// permanent and only ~40-bit entropy, so without a limiter an attacker
// could script through the space. Keyed by IP (global ThrottlerGuard
// already caps 100 req/min per IP on every route; this is a tighter,
// login-specific limit).
const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Admin onboarding flow: creates the merchant record and generates a
   * permanent access code. The plaintext code is returned ONLY in this
   * response — after this call, the system only ever holds its hash,
   * so the admin must relay it to the merchant now (call, in person,
   * Telegram message, etc.) and write it down if needed. Lost codes
   * are handled via `regenerateAccessCode`, not recovery.
   */
  async createCustomer(dto: CreateCustomerDto) {
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phoneNumber, dto.phoneNumber));
    if (existing) {
      throw new ConflictException(
        'A merchant with this phone number already exists',
      );
    }

    const { code, hash } = this.generateAccessCode();

    const [user] = await this.db
      .insert(schema.users)
      .values({
        storeName: dto.storeName,
        ownerName: dto.ownerName,
        phoneNumber: dto.phoneNumber,
        city: dto.city,
        role: 'CUSTOMER',
        accessCodeHash: hash,
      })
      .returning();

    return {
      user: {
        id: user.id,
        storeName: user.storeName,
        ownerName: user.ownerName,
        phoneNumber: user.phoneNumber,
      },
      accessCode: code,
      warning:
        'Save this code now — it will not be shown again. Give it to the merchant directly.',
    };
  }

  /** Admin action for a merchant who lost their code — invalidates the old one. */
  async regenerateAccessCode(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!user || user.role !== 'CUSTOMER') {
      throw new NotFoundException('Merchant not found');
    }

    const { code, hash } = this.generateAccessCode();
    await this.db
      .update(schema.users)
      .set({ accessCodeHash: hash })
      .where(eq(schema.users.id, userId));

    return {
      accessCode: code,
      warning:
        'Save this code now — it will not be shown again. The previous code no longer works.',
    };
  }

  /**
   * Customer login: the access code alone, nothing else required.
   * Codes are hashed with SHA-256 (not bcrypt) so we can look them up
   * with a single indexed equality query — safe here because the code
   * is server-generated, high-entropy, and rate-limited, not a
   * user-chosen low-entropy password.
   */
  async customerLogin(rawCode: string, ip: string) {
    await this.enforceLoginRateLimit(ip);

    const normalized = this.normalizeCode(rawCode);
    const hash = this.hashCode(normalized);

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.accessCodeHash, hash));

    if (!user || user.role !== 'CUSTOMER') {
      throw new UnauthorizedException('Invalid access code');
    }

    return this.issueToken(user);
  }

  private async enforceLoginRateLimit(ip: string) {
    const key = `login:attempts:${ip}`;
    try {
      const attempts = await this.redis.incr(key);
      if (attempts === 1) {
        await this.redis.expire(key, LOGIN_ATTEMPT_WINDOW_SECONDS);
      }
      if (attempts > LOGIN_ATTEMPT_LIMIT) {
        throw new HttpException(
          'Too many login attempts. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err; // real rate-limit hit — keep blocking
      // Redis unreachable: fail OPEN, not closed. Rate limiting is a
      // defense-in-depth measure, not the primary auth check — a cache
      // outage should never be the reason a legitimate merchant can't
      // log in.
      this.logger.warn(`Rate-limit check skipped (Redis unavailable): ${(err as Error).message}`);
    }
  }

  private generateAccessCode(): { code: string; hash: string } {
    let code = '';
    const bytes = randomBytes(CODE_LENGTH);
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return { code, hash: this.hashCode(code) };
  }

  private normalizeCode(raw: string): string {
    return raw.toUpperCase().replace(/[\s-]/g, '');
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Admin authentication uses phone number + password (bcrypt hashed),
   * since the admin account needs stronger protection than a shared code.
   */
  async adminLogin(phoneNumber: string, password: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phoneNumber, phoneNumber));

    if (!user || user.role !== 'ADMIN' || !user.passwordHash) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return this.issueToken(user);
  }

  private issueToken(user: schema.User) {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        storeName: user.storeName,
        ownerName: user.ownerName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }
}
