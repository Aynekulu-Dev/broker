import { IsString, Matches, MinLength } from 'class-validator';

/**
 * Customer login: a single admin-issued access code, nothing else.
 * No phone number needed at login time — the code alone identifies
 * the merchant (per the owner's request: fastest possible entry for
 * regional merchants who already got their code by phone/in person).
 */
export class CustomerLoginDto {
  @IsString()
  @MinLength(4)
  accessCode: string;
}

/**
 * Admin creates a merchant record. An access code is generated
 * server-side and returned once in the response — it is never stored
 * in retrievable form, so the admin must copy it down immediately
 * (or use the regenerate-code endpoint later if it's lost).
 */
export class CreateCustomerDto {
  @IsString()
  storeName: string;

  @IsString()
  ownerName: string;

  @IsString()
  @Matches(/^(\+251|0)[79]\d{8}$/, {
    message: 'phoneNumber must be a valid Ethiopian phone number',
  })
  phoneNumber: string;

  @IsString()
  city?: string;
}

export class AdminLoginDto {
  @IsString()
  @Matches(/^(\+251|0)[79]\d{8}$/)
  phoneNumber: string;

  @IsString()
  password: string;
}

/**
 * Self-service password change for an already-logged-in admin.
 * Requires the current password so a stolen/left-open session token
 * alone isn't enough to take over the account.
 */
export class ChangeAdminPasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'newPassword must be at least 8 characters' })
  newPassword: string;
}
