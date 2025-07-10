import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dtos/admin-login.dto';
import { AdminJwtAuthGuard } from './admin-jwt.guard';
import { Admin } from 'src/admin/entity/admin.entity';

@Controller('admin')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: AdminLoginDto) {
    const admin = await this.adminAuthService.validateEmail(
      body.email,
      body.password,
    );
    return this.adminAuthService.login(admin);
  }

  @HttpCode(200)
  @Get('profile')
  @UseGuards(AdminJwtAuthGuard)
  profileGet(@Req() req: any) {
    return this.adminAuthService.getProfile(req.user);
  }

  @HttpCode(200)
  @Post('change-password')
  @UseGuards(AdminJwtAuthGuard)
  changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @Req() req: any,
  ) {
    return this.adminAuthService.passwordChange(body, req.user);
  }

  @HttpCode(200)
  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  logout(@Req() req: any) {
    return this.adminAuthService.logout(req.user); // `req.user.id` is available
  }
}
