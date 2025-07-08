import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from 'src/admin/entity/admin.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private jwtSerrvice: JwtService,
  ) {}

  async validateEmail(email: string, password: string) {
    try {
      const admin = await this.adminRepo.findOne({ where: { email } });
      if (!admin) {
        throw new BadRequestException('Invalid email or password');
      }

      const match = await bcrypt.compare(password, admin.password);
      if (!match) {
        throw new BadRequestException('Invalid email or password');
      }

      return admin;
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  async login(admin: Admin) {
    try {
      const payload = { sub: admin.id, email: admin.email };
      const token = this.jwtSerrvice.sign(payload);
      admin.access_token = token;

      await this.adminRepo.save(admin);

      const { password, access_token, ...safeAdmin } = admin;

      return {
        success: true,
        message: 'Admin has been logged in successfully',
        access_token: token,
        data: safeAdmin,
      };
    } catch (error) {
      throw new InternalServerErrorException('Login failed');
    }
  }

  async getProfile(admin: Admin) {
    try {
      const loginAdmin = await this.adminRepo.findOne({
        where: { id: admin.id },
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

      if (!loginAdmin) {
        throw new NotFoundException('Admin not found');
      }

      return {
        success: true,
        message: 'Admin profile fetched successfully',
        data: loginAdmin,
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  async passwordChange(
    body: { oldPassword: string; newPassword: string },
    admin: any,
  ) {
    try {
      const loginAdmin = await this.adminRepo.findOne({
        where: { id: admin.id },
      });

      if (!loginAdmin) {
        throw new NotFoundException('Admin not found');
      }

      const matched = await bcrypt.compare(
        body.oldPassword,
        loginAdmin.password,
      );
      if (!matched) {
        throw new BadRequestException('Old password is incorrect');
      }

      if (!body.newPassword || body.newPassword.trim().length < 6) {
        throw new BadRequestException(
          'New password must be at least 6 characters',
        );
      }

      const saltRounds = 10;
      loginAdmin.password = await bcrypt.hash(body.newPassword, saltRounds);

      await this.adminRepo.save(loginAdmin);

      return {
        success: true,
        message: 'Password has been successfully updated',
        data: {},
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  async logout(admin: Admin) {
    try {
      admin.access_token = '';
      await this.adminRepo.save(admin);

      return {
        success: true,
        message: 'Logged out successfully',
        data: {},
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  private handleUnknown(err: unknown): never {
    if (err instanceof BadRequestException || err instanceof NotFoundException)
      throw err;
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
