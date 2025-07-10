import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'src/users/entity/user.entity';
import { JwtUser } from '../interfaces/jwt-user.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;
    return data ? user?.[data] : user;
  },
);
