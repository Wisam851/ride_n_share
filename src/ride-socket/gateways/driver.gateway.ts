import { Body, Logger, UseGuards } from '@nestjs/common';
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
import { SocketRegisterService } from '../socket-registry.service';
import { authenticateSocket } from '../utils/socket-auth.util';
import { WsRolesGuard } from 'src/common/guards/ws-roles.guard';
import { WsRoles } from 'src/common/decorators/ws-roles.decorator';

@WebSocketGateway({ namespace: 'driver', cros: { origin: '*' } })
export class DriverGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Namespace;
  private logger = new Logger('DriverGateway');

  constructor(
    private socketRegistry: SocketRegisterService,
    private rideBookingService: RideBookingService,
  ) {}

  afterInit() {
    this.logger.log('✅ Driver WebSocket Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const user = authenticateSocket(client);
      if (!user.roles?.includes('driver')) {
        this.logger.warn(
          `Unauthorized WS connect: userId=${user.sub} lacks 'driver' role`,
        );
        client.disconnect();
        return;
      }
      this.logger.log(`🚕 Driver Connected: ${client.id} (userId=${user.sub})`);
      this.socketRegistry.setDriverSocket(user.sub, client.id, '/driver');
    } catch (err: any) {
      this.logger.error(`Auth error: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (driverId) this.logger.warn(`❌ Driver disconnected: ${driverId}`);
    this.socketRegistry.removeSocket(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.DRIVER_REGISTER)
  @UseGuards(WsRolesGuard)
  @WsRoles('driver')
  handleRegister(@ConnectedSocket() client: Socket) {
    this.logger.log(`🔗 Driver Register event (noop) socket=${client.id}`);
    client.emit('registered', { success: true });
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_ACCEPTED)
  async handleAcceptRide(
    @MessageBody()
    data: {
      rideId: number;
      driverId: number;
      lat: number;
      lng: number;
      address: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      client.emit('RIDE_ACCEPT_ERROR', {
        success: false,
        message: 'Driver not registered',
      });
      return;
    }
    this.logger.log(`🚗 Accept Ride Data: ${JSON.stringify(data)}`);
    const dto = {
      latitude: data.lat,
      longitude: data.lng,
      address: data.address,
    };
    try {
      const final = await this.rideBookingService.acceptRide(
        data.rideId,
        data.driverId,
        dto,
      );
      // back to driver
      if (final.success == true) {
        client.emit('ride-accepted', final);
      }

      // to the Customer
      const ride = final.data;
      if (!ride) return;
      const customerSocketId = this.socketRegistry.getCustomerSocket(
        ride.customer_id,
      );
      this.logger.log(`customer id : ${customerSocketId}`);

      if (customerSocketId) {
        const customerNs = this.server.server.of('/customer');
        customerNs.to(customerSocketId.socketId).emit('ride-status-update', {
          type: 'accepted',
          rideId: ride.id,
          message: 'Your ride has been accepted',
        });
      } else {
        this.logger.warn(`❌ Customer ${ride.customer_id} not connected`);
      }
    } catch (error) {
      this.logger.error('❌ Ride Accept Error:', error?.message || error);
      client.emit('ride-accepted', {
        success: false,
        message: 'Failed to accept ride',
        error: error.message || 'Internal error',
      });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_ARRIVED)
  async handleRideArrived(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      return {
        success: false,
        message: 'You Are Not Registered',
        data: [],
      };
    }

    try {
      const ride = await this.rideBookingService.arrivedRide(
        body.rideId,
        driverId,
      );
      if (ride.success === true && ride.data) {
        this.logger.log(`🚀 Emitting 'rider-reached' to driver ${driverId}`);
        client.emit('rider-reached', ride);

        const customer_id = ride.data.customer_id;
        const customerSocketId =
          this.socketRegistry.getCustomerSocket(customer_id);

        // if (customerSocketId) {
        //   this.server.to(customerSocketId).emit('ride-status-update', {
        //     success: true,
        //     type: 'arrived',
        //     rideId: ride.data.id,
        //     message: 'Your driver has arrived',
        //   });
        // } else {
        //   this.logger.warn(`❌ Customer ${customer_id} not connected`);
        // }
      } else {
        client.emit('rider-reached', {
          success: false,
          message: 'Ride arrival failed',
        });
      }
    } catch (error) {
      this.logger.error('❌ Ride Arrived Error:', error.message);
      client.emit('rider-reached', {
        success: false,
        message: 'Internal error during ride arrival',
        error: error.message || 'Unknown error',
      });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_STARTED)
  async handleRideStarted(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      return {
        success: false,
        message: 'You Are Not Registered',
        data: [],
      };
    }
    try {
      const ride = await this.rideBookingService.verifyAndStartRide(
        body.rideId,
        driverId,
      );

      if (ride.success === true && ride.data) {
        client.emit('rider-started-response', ride);

        const customer_id = ride.data.customer_id;
        const customerSocketId =
          this.socketRegistry.getCustomerSocket(customer_id);

        // if (customerSocketId) {
        //   this.server.to(customerSocketId).emit('ride-status-update', {
        //     success: true,
        //     type: 'started',
        //     rideId: ride.data.id,
        //     message: 'Your Ride Is Started',
        //   });
        // }
      } else {
        client.emit('rider-started-response', {
          success: false,
          message: 'Ride Stating failed',
        });
      }
    } catch (error) {
      this.logger.error('❌ Ride Started Error:', error.message);
      client.emit('rider-started-response', {
        success: false,
        message: 'Internal error during ride arrival',
        error: error.message || 'Unknown error',
      });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_COMPLETED)
  async handleRideCompleted(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      client.emit('ride-completed-response', {
        success: false,
        message: 'Driver not found',
      });
      return;
    }
    try {
      const ride = await this.rideBookingService.completeRide(
        body.rideId,
        driverId,
      );

      if (ride.success == true && ride.data) {
        client.emit('ride-completed-response', ride);

        const customerSocketId = this.socketRegistry.getCustomerSocket(
          ride.data.customer_id,
        );
        // if (customerSocketId) {
        //   this.server.to(customerSocketId).emit('ride-status-update', {
        //     success: true,
        //     type: 'completed',
        //     ride_id: ride.data.ride_id,
        //     message: 'Your ride is completed',
        //   });
        // } else {
        //   client.emit('ride-completed-response', {
        //     success: false,
        //     message: 'customer is not conected',
        //     data: [],
        //   });
        // }
      } else {
      }
    } catch (error) {
      this.logger.error('Somthing went wrong', error.message || 'Undefine');
      client.emit('ride-completed-response', {
        success: false,
        message: 'Driver not found',
        error: error.message || 'Undefine',
      });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_CANCELLED)
  async handleRideCancelation(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {}
}
