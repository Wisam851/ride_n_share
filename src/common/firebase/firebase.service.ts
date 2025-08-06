import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async sendToUser(token: string, payload: admin.messaging.MessagingPayload) {
    try {
      const response = await admin.messaging().send({
        token,
        notification: payload.notification,
        data: payload.data,
      });
      return {
        success: true,
        message: 'Notification sent',
        response,
      };
    } catch (error) {
      this.logger.error(`🔥 FCM Error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
