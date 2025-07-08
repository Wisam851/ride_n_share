import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly rolesSeederService: RolesSeederService) {}

  async onApplicationBootstrap() {
    await this.rolesSeederService.seed();
  }
}
