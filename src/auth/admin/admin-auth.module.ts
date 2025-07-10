import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/admin/entity/admin.entity';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AdminJwtStrategy } from './admin-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    JwtModule.register({
      secret: 'admin-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
