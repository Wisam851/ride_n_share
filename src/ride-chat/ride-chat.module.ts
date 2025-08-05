import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideChatController } from './ride-chat.controller';
import { RideChatService } from './ride-chat.service';
import { RideChatGateway } from './gateways/ride-chat.gateway';
import { ChatMessage } from './entity/chat-message.entity';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';
import { SocketRegisterService } from 'src/ride-socket/socket-registry.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, RideBooking])],
  controllers: [RideChatController],
  providers: [RideChatService, RideChatGateway, SocketRegisterService],
  exports: [RideChatService],
})
export class RideChatModule {}
