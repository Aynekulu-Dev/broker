import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import {
  CreateDeliveryDto,
  DispatchDeliveryDto,
  StartBatchDto,
} from './dto/delivery.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  // Admin: record vehicle plate, driver name & phone once truck is full
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateDeliveryDto) {
    return this.deliveriesService.create(dto);
  }

  // Admin: batch-management list (COLLECTING/FULL/PAYMENT_REQUESTED/
  // DISPATCHED), optionally filtered — e.g. GET /deliveries?status=FULL
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query('status') status?: string) {
    return this.deliveriesService.findAll(status);
  }

  // Customer/Admin: live tracking view for a given order (may show
  // sibling orders that shipped on the same truck)
  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.deliveriesService.findByOrder(orderId);
  }

  // Admin: open a batch for a product ahead of orders coming in,
  // optionally overriding its default capacity for this truck.
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('batch')
  startBatch(@Body() dto: StartBatchDto) {
    return this.deliveriesService.startBatch(dto);
  }

  // Admin: truck reached capacity (FULL) — ask every rider to pay.
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/request-payment')
  requestPayment(@Param('id') id: string) {
    return this.deliveriesService.requestPayment(id);
  }

  // Admin: every rider APPROVED — record driver/vehicle and dispatch.
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/dispatch')
  dispatch(@Param('id') id: string, @Body() dto: DispatchDeliveryDto) {
    return this.deliveriesService.dispatchBatch(id, dto);
  }
}
