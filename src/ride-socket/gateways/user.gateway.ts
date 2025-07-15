import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RideBookingService } from 'src/ride-booking/ride-booking.service';
import { SOCKET_EVENTS } from '../ride-socket.constants';
import { plainToInstance } from 'class-transformer';
import { RideBookingDto } from 'src/ride-booking/dtos/create-ride-booking.dto';
import { validate, Validate } from 'class-validator';
import { SocketRegisterService } from '../socket-registry.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class UserGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('UserGateway');

  constructor(
    private socketRegistry: SocketRegisterService,
    private rideBookingService: RideBookingService,
  ) {}

  afterInit() {
    this.logger.log('✅ User WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🧑‍💻 User Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.warn(`❌ Disconnected socket: ${client.id}`);
    const userId = this.socketRegistry.getUserIdFromSocket(client.id);
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);

    if (userId) this.logger.warn(`❌ User disconnected: ${userId}`);
    if (driverId) this.logger.warn(`❌ Driver disconnected: ${driverId}`);

    this.socketRegistry.removeSocket(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.USER_REGISTER)
  handleRigester(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.socketRegistry.setUserSocket(data.userId, client.id);
    this.logger.log(`🔗 User Registered: ${data.userId}`);
    client.emit('registered', { success: true });
  }

  @SubscribeMessage(SOCKET_EVENTS.BOOK_RIDE)
  async handleRideBooking(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('book ride socket run');
    const userId = this.socketRegistry.getUserIdFromSocket(client.id);
    if (!userId) {
      client.emit('BOOK_RIDE_ERROR', {
        success: false,
        message: 'User not registered or session expired',
      });
      return;
    }
    this.logger.log('useid:', userId);
    const dto = plainToInstance(RideBookingDto, data);

    // validation
    const errors = await validate(dto);
    if (errors.length > 0) {
      const message = errors
        .map((err) => (err.constraints ? Object.values(err.constraints) : []))
        .flat();
      client.emit('BOOK_RIDE_ERROR', {
        success: false,
        message: 'Validation error',
        error: message,
      });
      return;
    }

    // ✅ Proceed
    this.logger.log('📦 Booking DTO:', dto);
    this.logger.log('🙋‍♂️ User ID:', userId);

    const result = await this.rideBookingService.create(dto, userId);
    this.logger.log(result);
    client.emit('BOOK_RIDE_SUCCESS', {
      success: true,
      message: 'Ride Booked Successfull',
      data: result,
    });

    const getAllDriverSocketIds = this.socketRegistry.getAllDriversSockets();
    this.logger.log(`📢 Notifying ${getAllDriverSocketIds.length} drivers`);
    for (const socketId of getAllDriverSocketIds) {
      this.logger.log(`📢 Notifying ${socketId} drivers`);
      this.server.to(socketId).emit('new-ride-request', {
        type: 'booking',
        message: 'A new ride is available for acceptance',
        rideData: result,
      });
    }
  }
}
