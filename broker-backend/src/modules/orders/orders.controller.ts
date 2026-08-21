import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  RejectOrderDto,
  SubmitPaymentDto,
  UpdateOrderDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Customer: submit cart + receipt (FR-03)
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.sub, dto);
  }

  // Customer: view own order history / live status (FR-05 tracking)
  @Get('mine')
  findMine(@CurrentUser() user: { sub: string }) {
    return this.ordersService.findForCustomer(user.sub);
  }

  // Admin: view all orders across merchants
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // Customer: upload receipt once the truck is full and admin has
  // requested payment (order status AWAITING_PAYMENT).
  @Patch(':id/submit-payment')
  submitPayment(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: SubmitPaymentDto,
  ) {
    return this.ordersService.submitPayment(id, user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.ordersService.approve(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectOrderDto) {
    return this.ordersService.reject(id, dto.reason);
  }

  // Admin: fix line items on an order before it's approved (FR: order editing)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  // Admin: remove a mistaken/duplicate order (FR: order deletion)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
