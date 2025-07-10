import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Admin } from 'src/admin/entity/admin.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'admin-secret-key',
      passReqToCallback: true, // ✅ Important
    });
  }

  async validate(req: Request, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    const admin = await this.adminRepo.findOne({
      where: { id: payload.sub },
    });

    if (!admin || !admin.access_token) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (token !== admin.access_token) {
      throw new UnauthorizedException('Token revoked or expired');
    }

    return admin;
  }
}
