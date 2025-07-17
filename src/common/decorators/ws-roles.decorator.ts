import { SetMetadata } from '@nestjs/common';
export const WS_ROLES_KEY = 'ws_roles';
export const WsRoles = (...roles: string[]) => SetMetadata(WS_ROLES_KEY, roles);
