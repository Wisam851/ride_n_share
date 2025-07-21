import { Namespace, Server } from 'socket.io';

export function getRootServer(ns: Namespace): Server {
  return (ns as any).server as Server;
}
