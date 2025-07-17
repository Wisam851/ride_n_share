import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { WS_ROLES_KEY } from '../decorators/ws-roles.decorator';

@Injectable()
export class WsRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(
      WS_ROLES_KEY,
      context.getHandler(),
    );
    if (!roles) return true;

    const client: Socket = context.switchToWs().getClient();
    const userRoles = client.data.user?.roles || [];

    const hasRole = userRoles.some((role) => roles.includes(role));
    if (!hasRole)
      throw new ForbiddenException('Access Denied: Insufficient role');

    return true;
  }
}
