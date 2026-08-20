import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { AuthModule } from '../auth/auth.module';
import { TelegramService } from '../../common/telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, TelegramService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
