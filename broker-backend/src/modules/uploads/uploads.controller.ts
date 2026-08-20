import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { StorageService } from '../../common/storage/storage.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const imageInterceptorOptions = {
  storage: memoryStorage(), // keep the file in memory only — we stream it straight to R2, never touch local disk
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new BadRequestException('Only image uploads are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  // Customer uploads payment receipt screenshot before submitting an order (FR-03)
  @Post('receipt')
  @UseInterceptors(FileInterceptor('file', imageInterceptorOptions))
  async uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = await this.storage.uploadBuffer(file.buffer, file.originalname, file.mimetype, 'receipts');
    return { url };
  }

  // Admin uploads a product photo when creating/editing a catalog item
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('product')
  @UseInterceptors(FileInterceptor('file', imageInterceptorOptions))
  async uploadProductPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = await this.storage.uploadBuffer(file.buffer, file.originalname, file.mimetype, 'products');
    return { url };
  }
}
