import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entity/notification.entity';
import { User } from 'src/users/entity/user.entity';
import { FirebaseService } from '../common/firebase/firebase.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './dto/notification.dto';

interface NotificationDetails {
  id: number;
  title: string;
  subtitle: string;
  is_read: boolean;
  metadata: Record<string, any> | null;
  generated_at: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  private toNotificationDetails(
    notification: Notification,
  ): NotificationDetails {
    return {
      id: notification.id,
      title: notification.title,
      subtitle: notification.subtitle,
      is_read: notification.is_read,
      metadata: notification.metadata as Record<string, any> | null,
      generated_at: notification.created_at.toISOString(),
    };
  }

  private async findNotificationById(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  //Customer to Driver Notification
  async create(createNotificationDto: CreateNotificationDto): Promise<any> {
    const userId = createNotificationDto.userId;

    const user = await this.validateUser(userId);
    if (!user.fcm_token) {
      this.logger.warn(`🚫 User ${userId} has no FCM token, skipping push`);
    }

    // 1. Save to DB
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      user: { id: userId },
    });
    const savedNotification = await this.notificationRepository.save(notification);

    // 2. Send FCM Push (if token exists)
    if (user.fcm_token) {
      try {
        await this.firebaseService.sendToDriver(user.fcm_token, {
          notification: {
            title: createNotificationDto.title,
            body: createNotificationDto.subtitle || '',
          },
          data: {
            userId: String(userId),
            ...((createNotificationDto.metadata as Record<string, string>) || {}),
          },
        });
      } catch (err) {
        this.logger.error(`🔥 FCM push failed for user ${userId}: ${err.message}`);
      }
    }

    // 3. Return response
    return {
      success: true,
      message: 'Notification saved & sent (if token available)',
      data: this.toNotificationDetails(savedNotification),
    };
  }

  // Driver to Customer Notification
  async createFromDriver(createNotificationDto: CreateNotificationDto): Promise<any> {
    const userId = createNotificationDto.userId;

    const user = await this.validateUser(userId);
    if (!user.fcm_token) {
      this.logger.warn(`🚫 User ${userId} has no FCM token, skipping push`);
    }

    // 1. Save to DB
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      user: { id: userId },
    });
    const savedNotification = await this.notificationRepository.save(notification);

    // 2. Send FCM Push (if token exists)
    if (user.fcm_token) {
      try {
        await this.firebaseService.sendToUser(user.fcm_token, {
          notification: {
            title: createNotificationDto.title,
            body: createNotificationDto.subtitle || '',
          },
          data: {
            userId: String(userId),
            ...((createNotificationDto.metadata as Record<string, string>) || {}),
          },
        });
      } catch (err) {
        this.logger.error(`🔥 FCM push failed for user ${userId}: ${err.message}`);
      }
    }

    // 3. Return response
    return {
      success: true,
      message: 'Notification saved & sent (if token available)',
      data: this.toNotificationDetails(savedNotification),
    };
  }


  async findAll(userId: number): Promise<any> {
    await this.validateUser(userId);
    const notifications = await this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    });

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data: notifications.map((notification) =>
        this.toNotificationDetails(notification),
      ),
    };
  }

  async findUserWise(userId: number): Promise<any> {
  await this.validateUser(userId); // Ensure user exists

  const notifications = await this.notificationRepository.find({
    where: { user: { id: userId } },
    order: { id: 'DESC' }, // Optional: newest first
  });

  return {
    success: true,
    message: 'Notifications retrieved successfully',
    data: notifications.map((notification) =>
      this.toNotificationDetails(notification),
    ),
  };
}


  async findOne(id: number): Promise<any> {
    const notification = await this.findNotificationById(id);
    return {
      success: true,
      message: 'Notification retrieved successfully',
      data: this.toNotificationDetails(notification),
    };
  }

  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<any> {
    const notification = await this.findNotificationById(id);
    Object.assign(notification, updateNotificationDto);
    const updatedNotification =
      await this.notificationRepository.save(notification);

    return {
      success: true,
      message: 'Notification updated successfully',
      data: this.toNotificationDetails(updatedNotification),
    };
  }

  async remove(id: number): Promise<any> {
    const notification = await this.findNotificationById(id);
    await this.notificationRepository.remove(notification);

    return {
      success: true,
      message: 'Notification deleted successfully',
      data: undefined,
    };
  }

  async markAsRead(id: number): Promise<any> {
    const notification = await this.findNotificationById(id);
    notification.is_read = true;
    const updatedNotification =
      await this.notificationRepository.save(notification);

    return {
      success: true,
      message: 'Notification marked as read successfully',
      data: this.toNotificationDetails(updatedNotification),
    };
  }

  async markAllAsRead(userId: number): Promise<any> {
    await this.validateUser(userId);
    await this.notificationRepository.update(
      { user: { id: userId }, is_read: false },
      { is_read: true },
    );

    return {
      success: true,
      message: 'All notifications marked as read successfully',
      data: undefined,
    };
  }

  async getUnreadCount(userId: number): Promise<any> {
    await this.validateUser(userId);
    const count = await this.notificationRepository.count({
      where: { user: { id: userId }, is_read: false },
    });

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unread_count: count },
    };
  }

  // async validateUser(userId: number) {
  //   console.debug(inspect(userId));
  //   const user = await this.userRepository.findOne({ where: { id: userId } });
  //   console.log(inspect(user));
  //   if (!user) {
  //     throw new NotFoundException('User Not Found');
  //   }
  //   return user;
  // }

  async validateUser(userId: number) {
    console.debug('validateUser input:', typeof userId, userId);

    if (typeof userId !== 'number' || isNaN(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User Not Found');
    }

    return user;
  }
}
