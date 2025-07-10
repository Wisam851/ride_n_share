// src/user-role/user-roles.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto, UpdateUserRoleDto } from './dtos/user-role.dto';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@Controller('admin/roles-assigning-user')
@UseGuards(AdminJwtAuthGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post('store')
  async create(@Body() dto: CreateUserRoleDto) {
    return this.userRolesService.create(dto);
  }

  @Get('list')
  async findAll() {
    return this.userRolesService.findAll();
  }

  @Get('findOne/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userRolesService.findOne(id);
  }

  @Patch('update/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.userRolesService.update(id, dto);
  }

  @Get('toggleStatus/:id')
  @HttpCode(200)
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.userRolesService.toggleStatus(id);
  }

  @Delete('remove:id')
  @HttpCode(200)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.userRolesService.remove(id);
  }
}
