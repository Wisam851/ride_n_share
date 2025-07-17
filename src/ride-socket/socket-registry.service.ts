export class SocketRegisterService {
  private customerSockets = new Map<number, string>();
  private driverSockets = new Map<number, string>();

  private socketToCustomer = new Map<string, number>();
  private socketToDriver = new Map<string, number>();

  // user methods
  setCustomerSocket(customerId: number, socketId: string) {
    this.customerSockets.set(customerId, socketId);
    this.socketToCustomer.set(socketId, customerId);
  }

  getCustomerSocket(customerId: number): string | undefined {
    return this.customerSockets.get(customerId);
  }

  getCustomerIdFromSocket(socketId: string): number | undefined {
    return this.socketToCustomer.get(socketId);
  }

  // driver methods
  setDriverSocket(driverId: number, socketId: string) {
    this.driverSockets.set(driverId, socketId);
    this.socketToDriver.set(socketId, driverId);
  }

  getDriverSocket(driverId: number): string | undefined {
    return this.driverSockets.get(driverId);
  }

  getDriverIdFromSocket(socketId: string): number | undefined {
    return this.socketToDriver.get(socketId);
  }

  getAllDriversSockets(): string[] {
    return Array.from(this.driverSockets.values());
  }

  removeSocket(socketId: string) {
    if (this.socketToCustomer.has(socketId)) {
      const customerId = this.socketToCustomer.get(socketId);
      this.socketToCustomer.delete(socketId);
      if (customerId) this.customerSockets.delete(customerId);
    }

    if (this.socketToDriver.has(socketId)) {
      const driverId = this.socketToDriver.get(socketId);
      this.socketToDriver.delete(socketId);
      if (driverId) this.driverSockets.delete(driverId);
    }
  }
}
