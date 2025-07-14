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
import { SocketRegisterService } from '../socket-registry.service';

@WebSocketGateway({ cros: { origin: '*' } })
export class DriverGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('DriverGateway');

  constructor(
    private socketRegistry: SocketRegisterService,
    private rideBookingService: RideBookingService,
  ) {}

  afterInit() {
    this.logger.log('✅ Driver WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🚕 Driver Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.socketRegistry.removeSocket(client.id);
    this.logger.log(`❌ Driver disconnected`);
  }

  @SubscribeMessage(SOCKET_EVENTS.REGISTER)
  handleRegister(
    @MessageBody() data: { driverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.socketRegistry.setDriverSocket(data.driverId, client.id);
    this.logger.log(`🔗 Driver Registered: ${data.driverId}`);
    client.emit('registered', { success: true });
  }

  @SubscribeMessage('accept-ride')
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
      client.emit('ride-accepted', final);

      // to the user
      const ride = final.data;
      const customerSocketId = this.socketRegistry.getUserSocket(
        ride.customer_id,
      );
      if (customerSocketId) {
        this.server.to(customerSocketId).emit('ride-status-update', {
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
}
