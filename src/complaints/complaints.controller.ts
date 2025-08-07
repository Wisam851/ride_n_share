import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { ComplaintsService } from './complaints.service';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';
import {
  CreateComplaintsDto,
  UpdateComplaintsDto,
} from './dto/complaints.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';
import { User } from 'src/users/entity/user.entity';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly service: ComplaintsService) {}

@UseGuards(UserJwtAuthGuard)
  @Post('store')
  async store(
    @Body() body: CreateComplaintsDto,
    @CurrentUser('id') userId: number,
  ) {
    return await this.service.create(body, userId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('list-all-complaints')
  async findAll() {
    return await this.service.findAll();
  }

  @UseGuards(UserJwtAuthGuard)
  @Get('userwise-complaints')
  async findAllUser() {
    return await this.service.findAll();
  }

@UseGuards(AdminJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.service.findOne(id);
  }

@UseGuards(UserJwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return await this.service.delete(id);
  }
}

function GetUser(
  arg0: string,
): (
  target: ComplaintsController,
  propertyKey: 'create',
  parameterIndex: 1,
) => void {
  throw new Error('Function not implemented.');
}
