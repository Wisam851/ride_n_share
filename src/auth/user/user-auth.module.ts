import { Module } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';
import { UserAuthController } from './user-auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { UserJwtStrategy } from './user-jwt.strategy';
import { Role } from 'src/roles/entity/roles.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole]), // ✅ THIS LINE IS REQUIRED
    JwtModule.register({
      secret: 'user-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UserAuthController],
  providers: [UserAuthService, UserJwtStrategy],
  exports: [UserAuthService],
})
export class UserAuthModule {}
