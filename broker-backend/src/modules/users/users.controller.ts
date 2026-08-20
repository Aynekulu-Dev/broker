import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { CreateCustomerDto } from '../auth/dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // FR-01: admin onboards a merchant and gets back their one-time-shown
  // access code to relay to them directly (call, in person, etc).
  @Post('customers')
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.authService.createCustomer(dto);
  }

  @Get('customers')
  findAllCustomers() {
    return this.usersService.findAllCustomers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
