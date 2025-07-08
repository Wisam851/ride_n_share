import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entity/user.entity';

@Injectable()
export class UserAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private handleUnknown(err: unknown): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    throw new InternalServerErrorException('Unexpected error occurred', {
      cause: err as Error,
    });
  }

  async validateUser(email: string, password: string) {
    try {
      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        throw new BadRequestException('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new BadRequestException('Invalid password');
      }

      return user;
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async login(user: User) {
    try {
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);
      user.access_token = token;

      await this.userRepository.save(user);

      const { password, access_token, ...cleanUser } = user;

      return {
        success: true,
        message: 'User has been successfully logged in',
        data: {
          access_token: token,
          user: cleanUser,
        },
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async profile(user: any) {
    try {
      const loginUser = await this.userRepository.findOne({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!loginUser) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        message: 'User profile fetched successfully',
        data: loginUser,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async changePassword(
    body: { oldPassword: string; newPassword: string },
    user: any,
  ) {
    try {
      const { oldPassword, newPassword } = body;

      if (!oldPassword || !newPassword) {
        throw new BadRequestException(
          'Both old and new passwords are required',
        );
      }

      const loginUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!loginUser) {
        throw new NotFoundException('User not found');
      }

      const matched = await bcrypt.compare(oldPassword, loginUser.password);
      if (!matched) {
        throw new BadRequestException('Old password is incorrect');
      }

      if (newPassword.trim().length < 6) {
        throw new BadRequestException(
          'New password must be at least 6 characters long',
        );
      }

      loginUser.password = await bcrypt.hash(newPassword.trim(), 10);
      await this.userRepository.save(loginUser);

      return {
        success: true,
        message: 'Password updated successfully',
        data: {},
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async logout(data: User) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: data.id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.access_token = '';
      await this.userRepository.save(user);

      return {
        success: true,
        message: 'User has been logged out successfully',
        data: {},
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }
}
