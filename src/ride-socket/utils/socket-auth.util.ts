import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { parseBearerToken } from 'src/common/utils/parse-bearer-token.util';
import { JwtPayload } from 'src/common/interfaces/jwt-user.interface';

const JWT_SECRET = 'user-secret-key'; // TODO: env

export function authenticateSocket(client: Socket): JwtPayload {
  const raw =
    client.handshake.auth?.token ||
    (client.handshake.headers?.['authorization'] as string) ||
    '';

  const token = parseBearerToken(raw);
  if (!token) throw new Error('Missing auth token');

  const decoded = jwt.verify(token, JWT_SECRET);

  // runtime guard
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as Partial<JwtPayload>;

  if (
    typeof payload.sub !== 'number' ||
    typeof payload.email !== 'string' ||
    !Array.isArray(payload.roles)
  ) {
    throw new Error('Malformed token payload');
  }

  // attach for downstream guards
  client.data.user = payload as JwtPayload;

  return payload as JwtPayload;
}