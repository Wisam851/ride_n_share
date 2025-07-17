import { Logger, UseGuards } from '@nestjs/common';
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
import { authenticateSocket } from '../utils/socket-auth.util';
import { WsRolesGuard } from 'src/common/guards/ws-roles.guard';
import { WsRoles } from 'src/common/decorators/ws-roles.decorator';

@WebSocketGateway({ cors: { origin: '*' } })
export class CustomerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('CustomerGateway');

  constructor(
    private socketRegistry: SocketRegisterService,
    private rideBookingService: RideBookingService,
  ) {}

  afterInit() {
    this.logger.log('✅ Customer WebSocket Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const user = await authenticateSocket(client);
      if (!user) {
        this.logger.warn('Unautharized: Not a customer');
        client.disconnect();
        return;
      }
      this.logger.log(`🧑‍💻 Customer Connected: ${client.id}`);
      this.socketRegistry.setCustomerSocket(user.sub, client.id);
    } catch (err) {
      this.logger.error(err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.warn(`❌ Disconnected socket: ${client.id}`);
    const customerId = this.socketRegistry.getCustomerIdFromSocket(client.id);
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);

    if (customerId) this.logger.warn(`❌ Customer disconnected: ${customerId}`);
    if (driverId) this.logger.warn(`❌ Driver disconnected: ${driverId}`);

    this.socketRegistry.removeSocket(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.Customer_REGISTER)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer')
  handleRigester(
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`🔗 Customer Registered:`);
    client.emit('registered', { success: true });
  }

  @SubscribeMessage(SOCKET_EVENTS.BOOK_RIDE)
  async handleRideBooking(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('book ride socket run');
    const customerId = this.socketRegistry.getCustomerIdFromSocket(client.id);
    if (!customerId) {
      client.emit('BOOK_RIDE_ERROR', {
        success: false,
        message: 'Customer not registered or session expired',
      });
      return;
    }
    this.logger.log('useid:', customerId);
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
    this.logger.log('🙋‍♂️ Customer ID:', customerId);

    const result = await this.rideBookingService.create(dto, customerId);
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
