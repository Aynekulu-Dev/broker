import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

/**
 * Wraps Cloudflare R2 (S3-compatible) so the rest of the app never has to
 * know it's not "real" S3. Swapping back to AWS S3 later only means
 * changing the env vars — the R2_* names map 1:1 onto AWS credentials.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME') as string;
    // Public base URL to prefix returned links with — either your R2.dev
    // dev subdomain or a custom domain you've connected to the bucket.
    this.publicUrl = (this.config.get<string>('R2_PUBLIC_URL') as string)?.replace(/\/$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      throw new Error(
        'Missing R2 configuration. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
          'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL in your .env',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /**
   * Uploads a buffer under `${folder}/${uuid}${ext}` and returns the public URL.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    folder: 'receipts' | 'products',
  ): Promise<string> {
    const key = `${folder}/${uuid()}${extname(originalName)}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          // R2 buckets are private by default; access is granted either via
          // a connected custom domain or the r2.dev subdomain, both set as
          // R2_PUBLIC_URL — not via ACLs (R2 ignores S3 ACLs).
        }),
      );
    } catch (err) {
      this.logger.error(`R2 upload failed for key ${key}`, err as Error);
      throw new InternalServerErrorException('File upload failed, please try again');
    }

    return `${this.publicUrl}/${key}`;
  }
}
