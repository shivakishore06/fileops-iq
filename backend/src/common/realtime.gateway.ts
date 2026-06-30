import { 
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, 
  SubscribeMessage, ConnectedSocket, MessageBody 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*', // Customize in production
  },
  namespace: 'events',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly jwtService = new JwtService({});

  constructor(private readonly configService: ConfigService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      const token = authHeader?.split(' ')[1] || (client.handshake.query.token as string);

      if (!token) {
        throw new UnauthorizedException('Token is missing');
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Join client to dynamic tenant room
      const tenantRoom = `tenant:${payload.tenantId}`;
      await client.join(tenantRoom);
      
      this.logger.log(`Socket Client ${client.id} joined room: ${tenantRoom}`);
    } catch (err: any) {
      this.logger.warn(`Socket authentication failed: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket Client disconnected: ${client.id}`);
  }

  // Broadcaster utility for background engines (SLA, Poller, Processor)
  sendToTenant(tenantId: string, eventName: string, payload: any) {
    const roomName = `tenant:${tenantId}`;
    if (this.server) {
      this.server.to(roomName).emit(eventName, payload);
    }
  }
}
