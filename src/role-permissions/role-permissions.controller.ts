// src/role-permissions/role-permissions.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import {
  CreateRolePermissionAssigningDto,
  UpdateRolePermissionAssigningDto,
} from './dto/role-permission.dto';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@Controller('admin/role-permissions')
@UseGuards(AdminJwtAuthGuard)
export class RolePermissionsController {
  constructor(private readonly service: RolePermissionsService) {}

  @Post('store')
  create(@Body() dto: CreateRolePermissionAssigningDto) {
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
    @Body() dto: UpdateRolePermissionAssigningDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
