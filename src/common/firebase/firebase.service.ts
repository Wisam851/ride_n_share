import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  private userApp: admin.app.App;
  private driverApp: admin.app.App;

  constructor() {
    // Initialize User App
    const userAppExists = admin.apps.find((app: admin.app.App) => app.name === 'userApp');
    if (!userAppExists) {
      this.userApp = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId: process.env.USER_FIREBASE_PROJECT_ID,
            clientEmail: process.env.USER_FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.USER_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        },
        'userApp',
      );
    } else {
      this.userApp = admin.app('userApp');
    }

    // Initialize Driver App
    const driverAppExists = admin.apps.find((app: admin.app.App) => app.name === 'driverApp');
    if (!driverAppExists) {
      this.driverApp = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId: process.env.DRIVER_FIREBASE_PROJECT_ID,
            clientEmail: process.env.DRIVER_FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.DRIVER_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        },
        'driverApp',
      );
    } else {
      this.driverApp = admin.app('driverApp');
    }
  }

  async sendToUser(token: string, payload: admin.messaging.MessagingPayload) {
    try {
      const response = await this.userApp.messaging().send({
        token,
        notification: payload.notification,
        data: payload.data,
      });

      return {
        success: true,
        message: 'User notification sent',
        response,
      };
    } catch (error) {
      this.logger.error(`🔥 USER FCM Error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async sendToDriver(token: string, payload: admin.messaging.MessagingPayload) {
    try {
      const response = await this.driverApp.messaging().send({
        token,
        notification: payload.notification,
        data: payload.data,
      });

      return {
        success: true,
        message: 'Driver notification sent',
        response,
      };
    } catch (error) {
      this.logger.error(`🔥 DRIVER FCM Error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
