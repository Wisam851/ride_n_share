export class SocketRegisterService {
  private userSockets = new Map<number, string>();
  private driverSockets = new Map<number, string>();

  private socketToUser = new Map<string, number>();
  private socketToDriver = new Map<string, number>();

  // user methods
  setUserSocket(userId: number, socketId: string) {
    this.userSockets.set(userId, socketId);
    this.socketToUser.set(socketId, userId);
  }

  getUserSocket(userId: number): string | undefined {
    return this.userSockets.get(userId);
  }

  getUserIdFromSocket(socketId: string): number | undefined {
    return this.socketToUser.get(socketId);
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
    return Array.from(this.userSockets.values());
  }

  removeSocket(socketId: string) {
    if (this.socketToUser.has(socketId)) {
      const userId = this.socketToUser.get(socketId);
      this.socketToUser.delete(socketId);
      if (userId) this.userSockets.delete(userId);
    }

    if (this.socketToDriver.has(socketId)) {
      const driverId = this.socketToDriver.get(socketId);
      this.socketToDriver.delete(socketId);
      if (driverId) this.driverSockets.delete(driverId);
    }
  }
}
