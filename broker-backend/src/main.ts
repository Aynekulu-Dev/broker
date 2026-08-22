import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors(); // Next.js frontend runs on a different origin
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Receipt/product images now live on Cloudflare R2 and are served directly
  // from R2_PUBLIC_URL — no local static file serving needed anymore.

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Broker backend running on http://localhost:${port}`);
}
bootstrap();
