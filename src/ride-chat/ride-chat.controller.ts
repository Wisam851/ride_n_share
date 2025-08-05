import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { RideChatService } from './ride-chat.service';
import { SendMessageDto } from './dtos/chat-message.dto';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('ride-chat')
@UseGuards(UserJwtAuthGuard, RolesGuard)
export class RideChatController {
  constructor(private readonly rideChatService: RideChatService) {}

  @Post('send-message')
  @Roles('customer', 'driver')
  async sendMessage(@Body() messageData: SendMessageDto, @Request() req) {
    return await this.rideChatService.sendMessage(
      messageData.rideId,
      req.user.sub,
      messageData,
    );
  }

  @Get('history')
  @Roles('customer', 'driver')
  async getChatHistory(@Param('id') rideId: number) {
    return await this.rideChatService.getChatHistory(rideId);
  }
}
