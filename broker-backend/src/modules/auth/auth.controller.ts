import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminLoginDto, CustomerLoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Customer login: access code only. The admin created the merchant
  // and handed them this code directly — no phone/OTP step needed.
  @Post('customer-login')
  customerLogin(@Body() dto: CustomerLoginDto, @Req() req: Request) {
    return this.authService.customerLogin(dto.accessCode, req.ip ?? 'unknown');
  }

  // Admin login: phone number + password
  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.phoneNumber, dto.password);
  }

  // Admin regenerates a merchant's access code (e.g. they lost it).
  // Lives here (not UsersController) since it's a credential operation.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('customers/:id/regenerate-code')
  regenerateCode(@Param('id') id: string) {
    return this.authService.regenerateAccessCode(id);
  }
}
