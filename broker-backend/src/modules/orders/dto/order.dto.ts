import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // Optional now: orders for a batch-capacity product (see
  // products.batchCapacity) reserve a spot on the truck without paying
  // up front — the receipt is only required later, once the truck is
  // full and payment is requested (see SubmitPaymentDto). Orders for
  // ordinary (non-batched) products should still include it here.
  @IsOptional()
  @IsString()
  paymentReceiptUrl?: string;
}

/** Customer: upload the receipt once an order is AWAITING_PAYMENT. */
export class SubmitPaymentDto {
  @IsString()
  paymentReceiptUrl: string;
}

export class RejectOrderDto {
  @IsString()
  reason: string;
}

/**
 * Admin edit: replace an order's line items (e.g. fix a typo'd quantity
 * before it ships). Only allowed while the order is still PENDING —
 * see OrdersService.update for why.
 */
export class UpdateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
