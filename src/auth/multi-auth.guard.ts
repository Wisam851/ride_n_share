import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MultiAuthGuard extends AuthGuard(['admin-jwt', 'user-jwt']) {
  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Not authenticated');
    }

    return user;
  }
}
