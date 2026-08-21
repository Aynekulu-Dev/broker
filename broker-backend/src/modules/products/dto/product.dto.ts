import { IsBoolean, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsNumberString()
  price: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  photoUrl: string;

  // Truck-load consolidation threshold (e.g. 600 jerricans). Leave unset
  // for products that use the ordinary pay-up-front flow.
  @IsOptional()
  @IsInt()
  @Min(1)
  batchCapacity?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  batchCapacity?: number;
}

export class ToggleStockDto {
  @IsBoolean()
  isInStock: boolean;
}
