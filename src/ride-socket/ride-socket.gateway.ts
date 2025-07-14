import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { RideBookingService } from 'src/ride-booking/ride-booking.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RideGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private rdeBookingService: RideBookingService) {}

  private userSockets = new Map<number, string>();

  private logger: Logger = new Logger('RideGateway');
  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Server Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`📲 Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const disconnectedUserId = [...this.userSockets.entries()].find(
      ([_, socketId]) => socketId === client.id,
    )?.[0];

    if (disconnectedUserId) {
      this.userSockets.delete(disconnectedUserId);
      this.logger.log(`👋 User ${disconnectedUserId} disconnected`);
    }
    this.logger.log(`❌ Client Disconnected: ${client.id}`);
  }

  @SubscribeMessage('rigister')
  handleRegister(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.userSockets.set(data.userId, client.id);
    this.logger.log(`🔗 User Registered: ${data.userId} → ${client.id}`);
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
      const final = await this.rdeBookingService.acceptRide(
        data.rideId,
        data.driverId,
        dto,
      );
      // back to driver
      client.emit('ride-accepted', final);

      // to the user
      const ride = final.data;
      const customerSocketId = this.userSockets.get(ride.customer_id);
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
