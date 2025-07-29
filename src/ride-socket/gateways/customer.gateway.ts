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
import { Namespace, Socket, Server } from 'socket.io';
import { RideBookingService } from 'src/ride-booking/ride-booking.service';
import { SOCKET_EVENTS } from '../ride-socket.constants';
import { plainToInstance } from 'class-transformer';
import { RatingService } from 'src/Rating/rating.service';
import {
  RideBookingDto,
  RideRequestDto,
} from 'src/ride-booking/dtos/ride-booking.dto';
import { validate } from 'class-validator';
import { SocketRegisterService } from '../socket-registry.service';
import { authenticateSocket } from '../utils/socket-auth.util';
import { WsRolesGuard } from 'src/common/guards/ws-roles.guard';
import { WsRoles } from 'src/common/decorators/ws-roles.decorator';
import { getRootServer } from '../utils/get-root-server.util';  

@WebSocketGateway({ namespace: 'customer', cors: { origin: '*' } })
export class CustomerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Namespace; // server for /customer namespace
  private ioServer: Server;
  private logger = new Logger('CustomerGateway');

  constructor(
    private readonly socketRegistry: SocketRegisterService,
    private readonly rideBookingService: RideBookingService,
    private readonly ratingService: RatingService,
  ) {}

  afterInit() {
    this.ioServer = this.server.server as Server;
    this.logger.log('✅ Customer WebSocket Initialized');
  }
  private getDriverNamespace() {
    return this.ioServer.of('/driver');
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

  // no-op, legacy
  @SubscribeMessage(SOCKET_EVENTS.CUSTOMER_REGISTER)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer')
  handleRegister(@ConnectedSocket() client: Socket) {
    client.emit('registered', { success: true });
  }

  /** NEW: Customer Ride Request */
  @SubscribeMessage(SOCKET_EVENTS.REQUEST_RIDE)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer')
  async handleRequestRide(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('REQUEST_RIDE event received ');
    this.logger.log('📨 REQUEST_RIDE event received');
    const customerId = this.socketRegistry.getCustomerIdFromSocket(client.id);
    if (!customerId) {
      console.log('REQUEST_RIDE event received - customer not registered');
      client.emit(SOCKET_EVENTS.RIDE_REQUEST_CREATED, {
        success: false,
        message: 'Customer not registered or session expired',
      });
      return;
    }

    // validate input (socket payload -> dto)
    const dto = plainToInstance(RideRequestDto, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      const messages = errors
        .map((err) => (err.constraints ? Object.values(err.constraints) : []))
        .flat();
        console.log('REQUEST_RIDE event received - validation errors', messages);
      client.emit(SOCKET_EVENTS.RIDE_REQUEST_CREATED, {
        success: false,
        message: 'Validation error',
        error: messages,
      });
      return;
    }

    // create ride request in DB
    let result;
    try {
      console.log('REQUEST_RIDE event received - calling service');
      result = await this.rideBookingService.requestRide(dto, customerId);
    } catch (err: any) {
      console.log('REQUEST_RIDE event received - ride request failed', err.message);
      this.logger.error(`requestRide failed: ${err.message}`);
      client.emit(SOCKET_EVENTS.RIDE_REQUEST_CREATED, {
        success: false,
        message: err.message || 'Ride request failed',
      });
      return;
    }

    const { rideRequest, customer } = result.data;

    // ack to requesting customer
    client.emit(SOCKET_EVENTS.RIDE_REQUEST_CREATED, {
      success: true,
      message: result.message,
      data: {
        requestId: rideRequest.id,
        fare_id: rideRequest.fare_standard_id,
        base_fare: rideRequest.base_fare,
        total_fare: rideRequest.total_fare,
        ride_km: rideRequest.ride_km,
        ride_timing: rideRequest.ride_timing,
        expires_at: rideRequest.expires_at,
      },
    });

    // broadcast to drivers (trimmed payload)
    const root = getRootServer(this.server);
    const driverNs = root.of('/driver');
    const driverRefs = this.socketRegistry.getAllDriversSockets();
    this.logger.log(
      `📢 Broadcasting ride request ${rideRequest.id} to ${driverRefs.length} drivers`,
    );

    const broadcastPayload = {
      requestId: rideRequest.id,
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerImage: customer.image,
      customerRating: await this.ratingService.calculateCustomerAverageRating(customer.id),
      totalFare: rideRequest.total_fare,
      type: dto.type,
      ride_km: dto.ride_km,
      ride_timing: dto.ride_timing,
      pickup: dto.routing?.find((r) => r.type === 'pickup') || dto.routing?.[0],
      dropoff:
        dto.routing?.find((r) => r.type === 'dropoff') ||
        dto.routing?.[dto.routing.length - 1],
      expires_at: rideRequest.expires_at,
    };

    // send to all connected drivers
    for (const ref of driverRefs) {
      driverNs
        .to(ref.socketId)
        .emit(SOCKET_EVENTS.RIDE_REQUEST_BROADCAST, broadcastPayload);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.CONFIRM_DRIVER)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer')
  async handleConfirmDriver(
    @MessageBody() data: { requestId: number; driverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const customerId = this.socketRegistry.getCustomerIdFromSocket(client.id);
    if (!customerId) {
      client.emit(SOCKET_EVENTS.RIDE_CONFIRMED, {
        success: false,
        message: 'Customer not registered or session expired',
      });
      return;
    }

    if (!data?.requestId || !data?.driverId) {
      client.emit(SOCKET_EVENTS.RIDE_CONFIRMED, {
        success: false,
        message: 'requestId and driverId required',
      });
      return;
    }

    let result;
    try {
      result = await this.rideBookingService.confirmDriver(
        data.requestId,
        data.driverId,
        customerId,
      );
    } catch (err: any) {
      client.emit(SOCKET_EVENTS.RIDE_CONFIRMED, {
        success: false,
        message: err.message || 'Confirm failed',
      });
      return;
    }

    // result.data = { success:true,... includes booking result shape from service }
    client.emit(SOCKET_EVENTS.RIDE_CONFIRMED, {
      success: true,
      message: result.message,
      data: result.data,
    });

    // Notify selected driver
    const root = getRootServer(this.server);
    const driverNs = root.of('/driver');
    const driverRef = this.socketRegistry.getDriverSocket(data.driverId);
    if (driverRef) {
      driverNs.to(driverRef.socketId).emit(SOCKET_EVENTS.RIDE_CONFIRMED, {
        success: true,
        message: 'Ride confirmed and assigned to you.',
        data: result.data,
      });
    }

    // Optionally notify *other* drivers that request closed
    this.notifyLosingDrivers(root, data.requestId, data.driverId);
  }

  /** tell drivers who weren't selected */
  private async notifyLosingDrivers(
    rootServer: any,
    requestId: number,
    winningDriverId: number,
  ) {
    const driverNs = rootServer.of('/driver');
    const losingDriverIds =
      await this.rideBookingService.getLosingDriversForRequest(
        requestId,
        winningDriverId,
      );
    for (const driverId of losingDriverIds) {
      const ref = this.socketRegistry.getDriverSocket(driverId);
      if (ref) {
        driverNs.to(ref.socketId).emit(SOCKET_EVENTS.RIDE_REQUEST_BROADCAST, {
          closed: true,
          requestId,
          message: 'This ride has been assigned to another driver.',
        });
      }
    }
  }
}
