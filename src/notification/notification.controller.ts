import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './dto/notification.dto';

import { MultiAuthGuard } from 'src/auth/multi-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(MultiAuthGuard, RolesGuard)
@Roles('customer', 'driver')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  //All of Auth User
  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.notificationService.findAll(userId);
  }

  //All Count of All Unread of Auth User
  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: number) {
    return this.notificationService.getUnreadCount(userId);
  }

  //Get Notification By UserID
  @Get('user/:id')
  findUserWise(@Param('id') id: string) {
    return this.notificationService.findUserWise(+id);
  }

  //Get Notification By ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(+id);
  }

  //Update Notification By ID
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(+id);
  }

  //Mark as Read Notification By ID
  @Put('mark-as-read/:id')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(+id);
  }

  //Mark as Read All Notification of Auth User
  @Put('mark-all-as-read')
  markAllAsRead(@CurrentUser('id') userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }
}
