import { Injectable } from '@nestjs/common';

interface SocketRef {
  socketId: string;
  namespace: string; // '/customer' | '/driver' | others
}

@Injectable()
export class SocketRegisterService {
  private customerSockets = new Map<number, SocketRef>();
  private driverSockets = new Map<number, SocketRef>();
  private socketToCustomer = new Map<string, number>(); // socketId -> userId
  private socketToDriver = new Map<string, number>();

  // --- Customer ---
  setCustomerSocket(customerId: number, socketId: string, namespace: string) {
    this.customerSockets.set(customerId, { socketId, namespace });
    this.socketToCustomer.set(socketId, customerId);
  }

  getCustomerSocket(customerId: number): SocketRef | undefined {
    return this.customerSockets.get(customerId);
  }

  getCustomerIdFromSocket(socketId: string): number | undefined {
    return this.socketToCustomer.get(socketId);
  }

  // --- Driver ---
  setDriverSocket(driverId: number, socketId: string, namespace: string) {
    this.driverSockets.set(driverId, { socketId, namespace });
    this.socketToDriver.set(socketId, driverId);
  }

  getDriverSocket(driverId: number): SocketRef | undefined {
    return this.driverSockets.get(driverId);
  }

  getDriverIdFromSocket(socketId: string): number | undefined {
    return this.socketToDriver.get(socketId);
  }

  // for broadcast
  getAllDriversSockets(): SocketRef[] {
    return Array.from(this.driverSockets.values());
  }

  // cleanup
  removeSocket(socketId: string) {
    const customerId = this.socketToCustomer.get(socketId);
    if (customerId !== undefined) {
      this.socketToCustomer.delete(socketId);
      this.customerSockets.delete(customerId);
    }

    const driverId = this.socketToDriver.get(socketId);
    if (driverId !== undefined) {
      this.socketToDriver.delete(socketId);
      this.driverSockets.delete(driverId);
    }
  }
}
