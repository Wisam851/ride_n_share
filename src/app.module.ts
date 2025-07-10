import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VehicleRegistrationModule } from './vehicle-registration/vehicle-registration.module';
import { UserAuthModule } from './auth/user/user-auth.module';
import { RolesModule } from './roles/roles.module';
import { RolesSeederModule } from './roles/seeder/roles-seeder.module';
import { RolesSeederService } from './roles/seeder/roles-seeder.service';
import { AdminsModule } from './admin/admin.module';
import { AdminAuthModule } from './auth/admin/admin-auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionModule } from './role-permissions/role-permissions.module';
import { AdminRoleModule } from './assig-roles-admin/admin-roles.module';
import { UserRoleModule } from './assig-roles-user/user-roles.module';
import { UserPermissionModule } from './assign-permission-user/user-permission.module';
import { AdminPermissionModule } from './assign-permission-admin/admin-permission.module';
import { SavedPlacesModule } from './saved-places/saved-places.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { RideFareStandardsModule } from './ride-fare-standards/ride-fare-standards.module';
import { RideBookingModule } from './ride-booking/ride-booking.module';
import { RideBookingSeederModule } from './ride-booking/seeder/ride-booking-seeder.module';
import { RideBookingSeederService } from './ride-booking/seeder/ride-booking-seeder.service';
import { RatingModule } from './Rating/rating.module';
import { ComplaintsCategoryModule } from './complaints-category/complaints-category.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    VehicleRegistrationModule,
    UserAuthModule,
    RolesModule,
    RolesSeederModule,
    AdminsModule,
    AdminAuthModule,
    PermissionsModule,
    RolePermissionModule,
    AdminRoleModule,
    UserRoleModule,
    UserPermissionModule,
    AdminPermissionModule,
    SavedPlacesModule,
    PaymentMethodsModule,
    RideFareStandardsModule,
    RideBookingSeederModule,
    RatingModule,
    ComplaintsCategoryModule,
    RideBookingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private readonly rolesSeederService: RolesSeederService,
    private readonly rideBookingSeederService: RideBookingSeederService
  ) {}

  async onApplicationBootstrap() {
    await this.rolesSeederService.seed();
    await this.rideBookingSeederService.seed();
  }
}
