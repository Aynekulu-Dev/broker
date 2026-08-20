import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { LedgersService } from './ledgers.service';
import { AddManualCreditDto, MonthlyReportQueryDto } from './dto/ledger.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('ledgers')
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}

  // Customer: view own debt/ledger history
  @Get('mine')
  getMine(@CurrentUser() user: { sub: string }) {
    return this.ledgersService.getCustomerLedger(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('customer/:customerId')
  getForCustomer(@Param('customerId') customerId: string) {
    return this.ledgersService.getCustomerLedger(customerId);
  }

  // Admin: this merchant's not-yet-fully-paid orders, for partial settlement
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('customer/:customerId/outstanding-orders')
  getOutstandingOrders(@Param('customerId') customerId: string) {
    return this.ledgersService.getOutstandingOrders(customerId);
  }

  // Admin dashboard: all merchant balances at a glance
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('balances')
  getAllBalances() {
    return this.ledgersService.getAllBalances();
  }

  // Admin: record a manual payment (e.g. cash received in person)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('credit')
  addManualCredit(@Body() dto: AddManualCreditDto) {
    return this.ledgersService.addManualCredit(dto);
  }

  // Admin analytics: monthly product-wise sales (quantity + revenue)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('reports/monthly')
  getMonthlySales(@Query() query: MonthlyReportQueryDto) {
    return this.ledgersService.getMonthlyProductSales(
      Number(query.year),
      Number(query.month),
    );
  }
}
