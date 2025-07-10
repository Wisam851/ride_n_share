import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dtos/role.dto';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@Controller('admin/roles')
@UseGuards(AdminJwtAuthGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post('store')
  async create(@Body() data: CreateRoleDto) {
    return await this.rolesService.create(data);
  }

  @Get('index')
  async index() {
    return await this.rolesService.index();
  }

  @Get('show/:id')
  async show(@Param('id', ParseIntPipe) id: number){
    return this.rolesService.findOne(id);
  }
  @Patch('update/:id')
  async update(@Param('id') id: number, @Body() data: UpdateRoleDto) {
    return this.rolesService.update(data, id);
  }

  @Get("toogleStatus/:id")
  async toogleStatus(@Param('id', ParseIntPipe) id: number){
    return this.rolesService.toogleStatus(id);
  }

}
