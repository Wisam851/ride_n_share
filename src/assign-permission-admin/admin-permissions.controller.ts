// src/admin-permission/admin-permissions.controller.ts
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
import { AdminPermissionsService } from './admin-permissions.service';
import {
  CreateAdminPermissionDto,
  UpdateAdminPermissionDto,
} from './dtos/admin-permission.dto';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/permission-assigning-admin')
export class AdminPermissionsController {
  constructor(
    private readonly adminPermissionsService: AdminPermissionsService,
  ) {}

  @Post('store')
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() dto: CreateAdminPermissionDto) {
    console.log("wisam ahmed");
    return this.adminPermissionsService.create(dto);
  }

  @Get('index')
  findAll() {
    console.log("wisam ahmed");
    return this.adminPermissionsService.findAll();
  }

  @Get('findOne/:id')
  findOne(@Param('id') id: number) {
    return this.adminPermissionsService.findOne(id);
  }
  @Get('toggleStatus/:id')
  toggleStatus(@Param('id') id: number) {
    return this.adminPermissionsService.toggleStatus(id);
  }

  @Patch('update/:id')
  update(@Param('id') id: number, @Body() dto: UpdateAdminPermissionDto) {
    return this.adminPermissionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.adminPermissionsService.remove(id);
  }
}
