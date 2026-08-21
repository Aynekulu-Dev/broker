import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDeliveryDto {
  // One vehicle run can carry several orders at once — the admin loads
  // them all together and records the transport details a single time.
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderIds: string[];

  @IsString()
  vehiclePlateNumber: string;

  @IsString()
  driverName: string;

  @IsString()
  driverPhone: string;
}

/** Admin: record vehicle/driver info to actually send off a batch whose
 * orders are all APPROVED. */
export class DispatchDeliveryDto {
  @IsString()
  vehiclePlateNumber: string;

  @IsString()
  driverName: string;

  @IsString()
  driverPhone: string;
}

/** Admin: override a product's default batch capacity for one truck. */
export class StartBatchDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
