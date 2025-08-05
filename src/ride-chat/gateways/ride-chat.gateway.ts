import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Namespace, Socket, Server } from 'socket.io';
import { RideChatService } from '../ride-chat.service';
import { authenticateSocket } from 'src/ride-socket/utils/socket-auth.util';
import { WsRolesGuard } from 'src/common/guards/ws-roles.guard';
import { WsRoles } from 'src/common/decorators/ws-roles.decorator';
import { SendMessageDto } from '../dtos/chat-message.dto';
import { inspect } from 'util';

const JOIN_CHAT = 'join-chat';
const LEAVE_CHAT = 'leave-chat';
const SEND_MESSAGE = 'send-message';
const RECEIVE_MESSAGE = 'receive-message';
const CHAT_HISTORY = 'chat-history';
const CHAT_ERROR = 'chat-error';

//For Testing
const SAY_HELLO = 'say-hello';
const SAID_HELLO = 'said-hello';

@WebSocketGateway({ namespace: 'ride-chat', cors: { origin: '*' } })
export class RideChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Namespace;
  private ioServer: Server;
  private logger = new Logger(RideChatGateway.name);

  constructor(private readonly rideChatService: RideChatService) {}

  afterInit() {
    this.ioServer = this.server.server;
    this.logger.log('✅ Ride Chat WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    try {
      const user = authenticateSocket(client);
      this.logger.log(inspect(user));

      if (
        !user.roles?.includes('customer') &&
        !user.roles?.includes('driver')
      ) {
        this.logger.warn(
          `Unauthorized chat connect: userId=${user.sub} lacks required role`,
        );
        client.disconnect();
        return;
      }
      this.logger.log(
        `💬 Chat Connected: ${client.id} (userId=${user.sub}, roles=${user.roles.join(',')})`,
      );
      this.logger.debug(` \n 💬 Chat Connected: ${client.id} \n `);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Chat auth error: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(` \n ❌ Chat disconnected: ${client.id} \n `);
  }

  @SubscribeMessage(JOIN_CHAT)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer', 'driver')
  async handleJoinRideChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: number },
  ) {
    try {
      const user = authenticateSocket(client);
      const userType = user.roles.includes('customer') ? 'customer' : 'driver';

      const roomName = `ride-${data.rideId}`;

      const isParticipant = await this.rideChatService.isParticipant(
        data.rideId,
        user.sub,
      );

      if (!isParticipant) {
        throw new Error('You are not a participant of this ride');
      }

      await client.join(roomName);

      const chatHistory = await this.rideChatService.getChatHistory(
        data.rideId,
      );

      client.emit(CHAT_HISTORY, {
        rideId: data.rideId,
        messages: chatHistory,
      });

      this.logger.log(
        `👥 User ${user.sub} (${userType}) joined chat room: ${roomName} with ${chatHistory.length} existing messages`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error joining chat: ${errorMessage}`);
      client.emit(CHAT_ERROR, { message: errorMessage });
    }
  }

  @SubscribeMessage(LEAVE_CHAT)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer', 'driver')
  async handleLeaveRideChat(
    @MessageBody() data: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `ride-${data.rideId}`;
    await client.leave(roomName);

    this.logger.debug(` \n 👋 User left chat room: ${roomName} \n `);
  }

  @SubscribeMessage(SEND_MESSAGE)
  @UseGuards(WsRolesGuard)
  @WsRoles('customer', 'driver')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = authenticateSocket(client);

      const savedMessage = await this.rideChatService.sendMessage(
        data.rideId,
        user.sub,
        data,
      );

      const roomName = `ride-${data.rideId}`;

      this.server.to(roomName).emit(RECEIVE_MESSAGE, {
        ...savedMessage,
        timestamp: new Date(),
      });

      const userType = user.roles.includes('customer') ? 'customer' : 'driver';
      this.logger.log(
        `💬 Message saved and sent in ride ${data.rideId} by ${userType} ${user.sub}: "${data.message}"`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending message: ${errorMessage}`);
      client.emit(CHAT_ERROR, { message: errorMessage });
    }
  }

  @SubscribeMessage(SAY_HELLO)
  handleSayHello(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.emit(SAID_HELLO, data);
  }
}
