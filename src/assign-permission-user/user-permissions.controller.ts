// src/user-permission/user-permissions.controller.ts
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
import { UserPermissionsService } from './user-permissions.service';
import {
  CreateUserPermissionDto,
  UpdateUserPermissionDto,
} from './dtos/user-permission.dto';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@Controller('admin/permission-assigning-user')
@UseGuards(AdminJwtAuthGuard)
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Post('store')
  create(@Body() dto: CreateUserPermissionDto) {
    return this.userPermissionsService.create(dto);
  }

  @Get('index')
  findAll() {
    return this.userPermissionsService.findAll();
  }

  @Get('findOne/:id')
  findOne(@Param('id') id: number) {
    return this.userPermissionsService.findOne(id);
  }

  @Get('toggleStatus/:id')
  toggleStatus(@Param('id') id: number) {
    return this.userPermissionsService.toggleStatus(id);
  }

  @Patch('update/:id')
  update(@Param('id') id: number, @Body() dto: UpdateUserPermissionDto) {
    return this.userPermissionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.userPermissionsService.remove(id);
  }
}
