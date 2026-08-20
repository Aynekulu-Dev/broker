import { IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddManualCreditDto {
  @IsUUID()
  customerId: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  note?: string;

  // Optional: allocate this payment against one specific order instead
  // of just the merchant's overall balance, so partial payments on a
  // large order (e.g. paid 18,000 of 20,000) can be tracked per-order.
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class MonthlyReportQueryDto {
  @IsNumberString()
  year: string;

  @IsNumberString()
  month: string; // 1-12
}
