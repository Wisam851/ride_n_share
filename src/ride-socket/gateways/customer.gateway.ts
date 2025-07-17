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
import { Namespace, Socket } from 'socket.io';
import { RideBookingService } from 'src/ride-booking/ride-booking.service';
import { SOCKET_EVENTS } from '../ride-socket.constants';
import { plainToInstance } from 'class-transformer';
import { RideBookingDto } from 'src/ride-booking/dtos/create-ride-booking.dto';
import { validate } from 'class-validator';
import { SocketRegisterService } from '../socket-registry.service';
import { authenticateSocket } from '../utils/socket-auth.util';
import { WsRolesGuard } from 'src/common/guards/ws-roles.guard';
import { WsRoles } from 'src/common/decorators/ws-roles.decorator';

@WebSocketGateway({ namespace: 'customer', cors: { origin: '*' } })
export class CustomerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Namespace; // server for /customer namespace
  private logger = new Logger('CustomerGateway');

  constructor(
    private readonly socketRegistry: SocketRegisterService,
    private readonly rideBookingService: RideBookingService,
  ) {}

  afterInit() {
    this.logger.log('✅ Customer WebSocket Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const user = authenticateSocket(client);
      if (!user.roles?.includes('customer')) {
        this.logger.warn(
          `Unauthorized WS connect: userId=${user.sub} lacks 'customer' role`,
        );
        client.disconnect();
        return;
      }
      this.logger.log(
        `🧑‍💻 Customer Connected: ${client.id} (userId=${user.sub})`,
      );
      this.socketRegistry.setCustomerSocket(user.sub, client.id, '/customer');
    } catch (err: any) {
      this.logger.error(`Auth error: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const customerId = this.socketRegistry.getCustomerIdFromSocket(client.id);
    if (customerId) this.logger.warn(`❌ Customer disconnected: ${customerId}`);
    this.socketRegistry.removeSocket(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.Customer_REGISTER)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer')
  handleRegister(@ConnectedSocket() client: Socket) {
    this.logger.log(`🔗 Customer Register event (noop) socket=${client.id}`);
    client.emit('registered', { success: true });
  }

  @SubscribeMessage(SOCKET_EVENTS.BOOK_RIDE)
  async handleRideBooking(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('📨 BOOK_RIDE event received');
    const customerId = this.socketRegistry.getCustomerIdFromSocket(client.id);
    if (!customerId) {
      client.emit('BOOK_RIDE_ERROR', {
        success: false,
        message: 'Customer not registered or session expired',
      });
      return;
    }

    // validate DTO
    const dto = plainToInstance(RideBookingDto, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      const messages = errors
        .map((err) => (err.constraints ? Object.values(err.constraints) : []))
        .flat();
      client.emit('BOOK_RIDE_ERROR', {
        success: false,
        message: 'Validation error',
        error: messages,
      });
      return;
    }

    // create ride
    const result = await this.rideBookingService.create(dto, customerId);
    client.emit('BOOK_RIDE_SUCCESS', {
      success: true,
      message: 'Ride booked successfully',
      data: result,
    });

    // notify drivers across namespace
    const driverNs = this.server.server.of('/driver'); // <--- critical line
    const driverRefs = this.socketRegistry.getAllDriversSockets();
    this.logger.log(`📢 Notifying ${driverRefs.length} drivers of new ride`);

    for (const ref of driverRefs) {
      driverNs.to(ref.socketId).emit('new-ride-request', {
        type: 'booking',
        message: 'A new ride is available for acceptance',
        rideData: result,
      });
    }
  }
}
