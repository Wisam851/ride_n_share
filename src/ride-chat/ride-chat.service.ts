import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entity/chat-message.entity';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';
import { SendMessageDto } from './dtos/chat-message.dto';
import { RideStatus } from 'src/common/enums/ride-booking.enum';

@Injectable()
export class RideChatService {
  private readonly logger = new Logger(RideChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(RideBooking)
    private rideBookingRepository: Repository<RideBooking>,
  ) {}

  async sendMessage(
    rideId: number,
    senderId: number,
    messageData: SendMessageDto,
  ) {
    const ride = await this.validateRide(rideId);
    this.validateChatAllowed(ride.ride_status);
    this.validateUserParticipation(ride, senderId);

    const chatMessage = this.chatMessageRepository.create({
      rideId,
      senderId,
      message: messageData.message,
      messageType: messageData.messageType || 'text',
    });

    const savedMessage = await this.chatMessageRepository.save(chatMessage);
    return this.formatChatMessage(savedMessage);
  }

  async getChatHistory(rideId: number) {
    await this.validateRide(rideId);

    const messages = await this.chatMessageRepository.find({
      where: { rideId },
      order: { createdAt: 'ASC' },
      relations: ['sender'],
    });

    return messages.map((message) => this.formatChatMessage(message));
  }

  async isParticipant(rideId: number, userId: number): Promise<boolean> {
    const ride = await this.rideBookingRepository.findOne({
      where: { id: rideId },
      select: ['customer_id', 'driver_id'],
    });

    if (!ride) return false;
    return ride.customer_id === userId || ride.driver_id === userId;
  }

  private async validateRide(rideId: number): Promise<RideBooking> {
    const ride = await this.rideBookingRepository.findOne({
      where: { id: rideId },
    });

    if (!ride) {
      throw new BadRequestException('Ride not found');
    }

    return ride;
  }

  private validateChatAllowed(rideStatus: RideStatus): void {
    const allowedStatuses = [
      RideStatus.CONFIRMED,
      RideStatus.DRIVER_EN_ROUTE,
      RideStatus.ARRIVED,
    ];

    if (!allowedStatuses.includes(rideStatus)) {
      throw new BadRequestException(
        `Chat is not allowed for ride status: ${rideStatus}. Chat is only available from ride confirmation to arrival.`,
      );
    }
  }

  private validateUserParticipation(ride: RideBooking, userId: number): void {
    if (ride.customer_id !== userId && ride.driver_id !== userId) {
      throw new ForbiddenException('You are not a participant of this ride.');
    }
  }

  private formatChatMessage(message: ChatMessage) {
    return {
      id: message.id,
      rideId: message.rideId,
      senderId: message.senderId,
      message: message.message,
      messageType: message.messageType,
      createdAt: message.createdAt,
    };
  }
}
