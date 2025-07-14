import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserLoginDto } from './dtos/user-login.dto';
import { UserAuthService } from './user-auth.service';
import { UserJwtAuthGuard } from './user-jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entity/user.entity';
import { UpdateProfileDto, UserRegisterDto } from './dtos/user-auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';

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

  @Post('register')
  async register(@Body() body: UserRegisterDto) {
    return this.userAuthService.register(body);
  }

  @Get('profile')
  @UseGuards(UserJwtAuthGuard)
  async profile(@CurrentUser() user: User) {
    return await this.userAuthService.profile(user);
  }
  @UseGuards(UserJwtAuthGuard)
  @Post('update-profile')
  @UseInterceptors(FileInterceptor('image', multerConfig('uploads')))
  async profileUpdate(
    @CurrentUser() user: User,
    @Body() body: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploaddata = file ? { ...body, image: file.filename } : body;
    return await this.userAuthService.profileUpdate(user, uploaddata);
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
