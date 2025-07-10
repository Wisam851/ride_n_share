import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RideFareStandardsService } from './ride-fare-standards.service';
import {
  CreateRideFareStandardDto,
  UpdateRideFareStandardDto,
} from './dtos/ride-fare-standard.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/ride-fare-standards')
export class RideFareStandardsController {
  constructor(private readonly service: RideFareStandardsService) {}

  @Post('store')
  create(
    @Body() dto: CreateRideFareStandardDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.service.create(dto, adminId);
  }

  @Get('list')
  findAll() {
    return this.service.findAll();
  }

  @Get('show/:id')
  findOne(@Param('id') id: number) {
    return this.service.findOne(id);
  }

  @Patch('update/:id')
  update(@Param('id') id: number, @Body() dto: UpdateRideFareStandardDto) {
    return this.service.update(id, dto);
  }

  @Get('toogleStatus/:id')
  toggleStatus(@Param('id') id: number) {
    return this.service.toggleStatus(id);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.service.remove(id);
  }
}
