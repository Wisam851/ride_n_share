import {
  Logger,
  UseGuards,
  OnModuleInit,
} from '@nestjs/common';
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
import { getRootServer } from '../utils/get-root-server.util';
import { WsRoles } from 'src/common/decorators/ws-roles.decorator';
import { WsRolesGuard } from 'src/common/guards/ws-roles.guard';
import { inspect } from 'util';

@WebSocketGateway({ namespace: 'driver', cors: { origin: '*' } })
export class DriverGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(DriverGateway.name);

  constructor(
    private readonly rideBookingService: RideBookingService,
    private readonly socketRegistry: SocketRegisterService,
  ) {}

  onModuleInit() {
    this.logger.log('🚀 DriverGateway loaded');
  }

  afterInit() {
    this.logger.log('✅ WebSocket initialized on /driver namespace');
  }

  async handleConnection(client: Socket) {
    try {
      const user = authenticateSocket(client);

      if (!user.roles.includes('driver')) {
        this.logger.warn(`❌ Unauthorized: user ${user.sub} lacks 'driver' role`);
        client.emit('unauthorized', { message: 'Driver role required' });
        client.disconnect();
        return;
      }

      this.logger.log(`✅ Driver connected: userId=${user.sub}, socketId=${client.id}`);
      this.socketRegistry.setDriverSocket(user.sub, client.id, '/driver');

      const allDrivers = this.socketRegistry.getAllDriversSockets();
      this.logger.log(`👥 Total registered drivers: ${allDrivers.length}`);
    } catch (err) {
      this.logger.error(`❌ Socket authentication failed: ${err.message}`);
      client.emit('unauthorized', { message: err.message });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (driverId) {
      this.logger.warn(`❌ Driver disconnected: userId=${driverId}`);
    }
    this.socketRegistry.removeSocket(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.DRIVER_REGISTER)
  @UseGuards(WsRolesGuard)
  @WsRoles('driver')
  handleRegister(@ConnectedSocket() client: Socket) {
    this.logger.log(`📥 DRIVER_REGISTER from socket=${client.id}`);
    client.emit('registered', { success: true });
  }

  @SubscribeMessage(SOCKET_EVENTS.OFFER_RIDE)
  @UseGuards(WsRolesGuard)
  @WsRoles('driver')
  async handleOfferRide(
    @MessageBody()
    data: { requestId: number; latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {

    console.log('driver not register ');
      client.emit('offer-error', {
        success: false,
        message: 'Driver not registered',
      });
      return;
    }

    if (!data?.requestId) {
      console.log('missing request id ');
      client.emit('offer-error', {
        success: false,
        message: 'Missing requestId',
      });
      return;
    }

    try {
        console.log('inside try ');
      const result = await this.rideBookingService.offerRide(
        data.requestId,
        driverId,
        {
          requestId: data.requestId,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      );

      client.emit('offer-success', {
        success: true,
        message: result.message,
        data: result.data,
      });

      const rideReq = await this.rideBookingService.getRequestWithCustomer(
        data.requestId,
      );

      if (rideReq) {
        const customerRef = this.socketRegistry.getCustomerSocket(
          rideReq.customer_id,
        );
        if (customerRef) {
          const root = getRootServer(this.server);
          const customerNs = root.of('/customer');

          customerNs.to(customerRef.socketId).emit(
            SOCKET_EVENTS.RIDE_OFFERS_UPDATE,
            {
              requestId: data.requestId,
              offers: result.data, // this should include the driver info
            },
          );

          this.logger.log(
            `📤 Notified customerId=${rideReq.customer_id} about driver offer ${result.data?.[0]?.requestId} ${result.data?.[0]?.offers}`,
          );

          console.log('-------------');
          console.log(inspect(result.data, { depth: null, colors: true }));
          console.log('-----------------------------------------------------------------------------');

          this.logger.log(`📤 Sending offer update to customer ${rideReq.customer_id} on socket ${customerRef?.socketId}`);

        }
      }
    } catch (err: any) {

       console.log('inside catch ');
      client.emit('offer-error', {
        success: false,
        message: err.message || 'Offer failed',
      });
      this.logger.error(`❌ OFFER_RIDE error: ${err.message}`);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_ARRIVED)
  @UseGuards(WsRolesGuard)
  @WsRoles('driver')
  async handleRideArrived(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      return client.emit(SOCKET_EVENTS.RIDER_REACHED, {
        success: false,
        message: 'Driver not registered',
      });
    }

    try {
      const ride = await this.rideBookingService.arrivedRide(
        body.rideId,
        driverId,
      );

      if (ride.success && ride.data) {
        client.emit(SOCKET_EVENTS.RIDER_REACHED, ride);

        const customerRef = this.socketRegistry.getCustomerSocket(
          ride.data.customer_id,
        );

        if (customerRef) {
          const customerNs = this.server.server.of('/customer');
          customerNs.to(customerRef.socketId).emit(SOCKET_EVENTS.RIDE_STATUS_UPDATE, {
            type: 'arrived',
            rideId: ride.data.id,
            message: 'Your driver has arrived',
          });
        }
      } else {
        client.emit(SOCKET_EVENTS.RIDER_REACHED, {
          success: false,
          message: 'Arrival failed',
        });
      }
    } catch (error) {
      this.logger.error('❌ Ride Arrived Error:', error.message);
      client.emit(SOCKET_EVENTS.RIDER_REACHED, {
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // @SubscribeMessage(SOCKET_EVENTS.RIDE_STARTED)
  // @UseGuards(WsRolesGuard)
  // @WsRoles('driver')
  // async handleRideStarted(
  //   @MessageBody() body: { rideId: number },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
  //   if (!driverId) {
  //     return client.emit('rider-started-response', {
  //       success: false,
  //       message: 'Driver not registered',
  //     });
  //   }

  //   try {
  //     const ride = await this.rideBookingService.verifyAndStartRide(
  //       body.rideId,
  //       driverId,
  //     );

  //     if (ride.success && ride.data) {
  //       client.emit('rider-started-response', ride);

  //       const customerRef = this.socketRegistry.getCustomerSocket(
  //         ride.data.customer_id,
  //       );

  //       if (customerRef) {
  //         const customerNs = this.server.server.of('/customer');
  //         customerNs.to(customerRef.socketId).emit(SOCKET_EVENTS.RIDE_STATUS_UPDATE, {
  //           type: 'started',
  //           rideId: ride.data.id,
  //           message: 'Your ride has started',
  //         });
  //       }
  //     } else {
  //       client.emit('rider-started-response', {
  //         success: false,
  //         message: 'Could not start ride',
  //       });
  //     }
  //   } catch (error) {
  //     this.logger.error('❌ Ride Started Error:', error.message);
  //     client.emit('rider-started-response', {
  //       success: false,
  //       message: error.message || 'Internal server error',
  //     });
  //   }
  // }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_STARTED)
  @UseGuards(WsRolesGuard)
  @WsRoles('driver')
  async handleRideStarted(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      return client.emit('rider-started-response', {
        success: false,
        message: 'Driver not registered',
      });
    }

    try {
      const ride = await this.rideBookingService.verifyAndStartRide(
        body.rideId,
        driverId,
      );

      if (ride.success && ride.data) {
        client.emit('rider-started-response', ride);

        const customerRef = this.socketRegistry.getCustomerSocket(
          ride.data.customer_id,
        );

        if (customerRef) {
          const customerNs = this.server.server.of('/customer');
          customerNs.to(customerRef.socketId).emit(
            SOCKET_EVENTS.RIDE_STATUS_UPDATE,
            {
              type: 'started',
              rideId: ride.data.id,
              message: 'Your ride has started',
            },
          );
        }
      } else {
        client.emit('rider-started-response', {
          success: false,
          message: 'Could not start ride',
        });
      }
    } catch (error) {
      this.logger.error('❌ Ride Started Error:', error.message);
      client.emit('rider-started-response', {
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }


  @SubscribeMessage(SOCKET_EVENTS.RIDE_COMPLETED)
  @UseGuards(WsRolesGuard)
  @WsRoles('driver')
  async handleRideCompleted(
    @MessageBody() body: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = this.socketRegistry.getDriverIdFromSocket(client.id);
    if (!driverId) {
      return client.emit('ride-completed-response', {
        success: false,
        message: 'Driver not registered',
      });
    }

    try {
      const ride = await this.rideBookingService.completeRide(
        body.rideId,
        driverId,
      );

      if (ride.success && ride.data) {
        client.emit('ride-completed-response', ride);

        const customerRef = this.socketRegistry.getCustomerSocket(
          ride.data.customer_id,
        );

        if (customerRef) {
          const customerNs = this.server.server.of('/customer');
          customerNs.to(customerRef.socketId).emit(SOCKET_EVENTS.RIDE_STATUS_UPDATE, {
            type: 'completed',
            rideId: ride.data.ride_id,
            message: 'Your ride is complete',
          });
        }
      } else {
        client.emit('ride-completed-response', {
          success: false,
          message: 'Failed to complete ride',
        });
      }
    } catch (error) {
      this.logger.error('❌ Ride Completed Error:', error.message);
      client.emit('ride-completed-response', {
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}
