import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dtos/payment-method.dto';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entity/user.entity';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/payment-methods')
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Post('store')
  @UseInterceptors(FileInterceptor('image', multerConfig('uploads')))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePaymentMethodDto,
    @CurrentUser() user: User,
  ) {
    const image = file?.filename;
    return this.service.create({ ...dto, image }, user.id);
  }

  @Get('list')
  findAll() {
    return this.service.findAll();
  }

  @Get('show/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @Get('toogleStatus/:id')
  toogleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.service.toogleStatus(id);
  }

  @Put('update/:id')
  @UseInterceptors(FileInterceptor('image', multerConfig('uploads')))
  update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    const image = file?.filename;
    return this.service.update(id, { ...dto, image });
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
