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
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { ComplaintsService } from './complaints.service';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';
import { ComplaintStatus } from './entity/complaints.entity';
import {
  CreateComplaintsDto,
  UpdateComplaintStatusDto,
} from './dto/complaints.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';
import { User } from 'src/users/entity/user.entity';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintServiceRepo: ComplaintsService) {}

  @UseGuards(UserJwtAuthGuard)
  @Post('store')
  async store(
    @Body() body: CreateComplaintsDto,
    @CurrentUser('id') userId: number,
  ) {
    return await this.complaintServiceRepo.create(body, userId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('list-all-complaints')
  async findAll() {
    return await this.complaintServiceRepo.findAll();
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('status/:id')
  updateComplaintStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.complaintServiceRepo.updateStatus(
      id,
      dto.complaint_status,
      dto.admin_remarks,
      adminId,
    );
  }

  @UseGuards(UserJwtAuthGuard)
  @Get('userwise-complaints')
  async findAllUser(@Query('hrs') hrs: number) {
    return await this.complaintServiceRepo.findAll(hrs);
  }

  @UseGuards(UserJwtAuthGuard)
  @Get('my-complaints')
  async myComplaints(@CurrentUser('id') userId: number) {
    return await this.complaintServiceRepo.myComplaints(userId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.complaintServiceRepo.findOne(id);
  }

  @UseGuards(UserJwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return await this.complaintServiceRepo.delete(id);
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
