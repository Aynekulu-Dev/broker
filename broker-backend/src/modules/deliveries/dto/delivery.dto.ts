import { ArrayMinSize, IsArray, IsString, IsUUID } from 'class-validator';

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
