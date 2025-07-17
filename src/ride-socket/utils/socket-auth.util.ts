// socket-auth.util.ts
import * as jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

export async function authenticateSocket(client: Socket): Promise<any> {
  const token = client.handshake.auth?.token || client.handshake.headers['authorization'];
  if (!token) throw new Error('No token provided');

  try {
    const cleanedToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanedToken, 'user-secret-key');
    client.data.user = decoded;
    return decoded;
  } catch (err) {
    throw new Error('Invalid token');
  }
}
