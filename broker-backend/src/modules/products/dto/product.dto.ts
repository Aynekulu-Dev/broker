import { IsBoolean, IsNumberString, IsOptional, IsString } from 'class-validator';

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
}

export class ToggleStockDto {
  @IsBoolean()
  isInStock: boolean;
}
