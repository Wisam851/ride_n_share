import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'user-secret-key',
      ignoreExpiration: true,
      passReqToCallback: true,
    });
  }
  async validate(
    req: Request,
    payload: { sub: number; email: string; roles: string[] },
  ) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.access_token)
      throw new UnauthorizedException('Invalid or expired token');

    // if (token !== user.access_token)
    //   throw new UnauthorizedException('Token revoked or expired');

    // Add roles to returned user object
    return {
      ...user,
      roles: payload.roles, // attach roles from JWT
    };
  }
}
