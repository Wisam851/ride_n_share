import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminRolesService } from './admin-roles.service';
import { CreateAdminRoleDto, UpdateAdminRoleDto } from './dtos/admin-role.dto';

@Controller('admin/roles-assigning-admin')
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  @Post('store')
  create(@Body() dto: CreateAdminRoleDto) {
    return this.service.create(dto);
  }

  @Get('index')
  findAll() {
    return this.service.findAll();
  }

  @Get('findOne/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @Get('toogleStatus/:id')
  toogleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.service.toogleStatus(id);
  }

  @Patch('update/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminRoleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
