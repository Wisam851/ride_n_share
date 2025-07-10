import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserLoginDto } from './dtos/user-login.dto';
import { UserAuthService } from './user-auth.service';
import { UserJwtAuthGuard } from './user-jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entity/user.entity';

@Controller('user')
export class UserAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: UserLoginDto) {
    const user = await this.userAuthService.validateUser(
      body.email,
      body.password,
    );
    return await this.userAuthService.login(user);
  }

  @Get('profile')
  @UseGuards(UserJwtAuthGuard)
  async profile(@CurrentUser() user: User) {
    return await this.userAuthService.profile(user);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(UserJwtAuthGuard)
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @CurrentUser() user: User,
  ) {
    return await this.userAuthService.changePassword(body, user);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(UserJwtAuthGuard)
  async logout(@CurrentUser() user: User) {
    return await this.userAuthService.logout(user);
  }
}
