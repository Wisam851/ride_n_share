import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SavedPlacesService } from './saved-places.service';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import {
  CreateSavedPlaceDto,
  UpdateSavedPlaceDto,
} from './dtos/saved-place.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entity/user.entity';

@UseGuards(UserJwtAuthGuard)
@Controller('user/saved-places')
export class SavedPlacesController {
  constructor(private readonly savedService: SavedPlacesService) {}

  @Post('store')
  async create(@Body() dto: CreateSavedPlaceDto, @CurrentUser('id') id: number) {
    return this.savedService.create(dto, id);
  }

  @Get('list')
  async findAll(@CurrentUser() user: User) {
    return this.savedService.findAll(user.id);
  }

  @Get('show/:id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.savedService.findOne(id, user.id);
  }

  @Patch('update/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedPlaceDto,
    @CurrentUser() user: User,
  ) {
    return this.savedService.update(id, dto, user.id);
  }

  @Delete('delete/:id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.savedService.remove(id, user.id);
  }
}
