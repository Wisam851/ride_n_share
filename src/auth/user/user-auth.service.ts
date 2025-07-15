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
import { Role } from 'src/roles/entity/roles.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';
import { UpdateProfileDto, UserRegisterDto } from './dtos/user-auth.dto';
import { cleanObject } from 'src/common/utils/sanitize.util';

@Injectable()
export class UserAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,
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

  async register(body: UserRegisterDto) {
    const oldUsers = await this.userRepository.find({
      where: { email: body.email },
    });

    if (oldUsers.length > 0) {
      throw new BadRequestException('User with this email already exists');
    }

    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    }

    const user = this.userRepository.create({
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      gender: body.gender
    });

    const savedUser = await this.userRepository.save(user);

    let role;
    if (body.role === 'customer' || body.role === 'driver') {
      role = await this.roleRepo.findOne({
        where: { name: body.role },
        select: {
          id: true,
          name: true,
        },
      });
      if (!role) throw new BadRequestException('Role Not Found');

      const userRole = this.userRoleRepo.create({
        user: savedUser,
        role: role,
      });
      await this.userRoleRepo.save(userRole);
    }

    // Fetch user with roles (eagerly or via join)
    const userWithRole = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['userRoles', 'userRoles.role'],
    });

    // Clean user response (remove password)
    if (!userWithRole) {
      throw new InternalServerErrorException(
        'User not found after registration',
      );
    }
    const { password, userRoles, ...userWithoutPassword } = userWithRole;

    return {
      success: true,
      message: 'User is registered successfully',
      data: {
        user: userWithoutPassword,
        role: role,
      },
    };
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
      const roles = await this.userRoleRepo.find({
        where: { user_id: user.id },
        relations: ['role'],
        select: {
          role: {
            id: true,
            name: true,
          },
        },
      });
      const roleNames = roles.map((r) => r.role.name);
      const payload = {
        sub: user.id,
        email: user.email,
        roles: roleNames,
      };

      const token = this.jwtService.sign(payload);
      user.access_token = token;

      await this.userRepository.save(user);

      const { password, access_token, ...cleanUser } = user;
      const userRole = roles[0]?.role;
      return {
        success: true,
        message: 'User has been successfully logged in',
        data: {
          access_token: token,
          user: cleanUser,
          role: userRole
            ? {
                id: userRole.id,
                name: userRole.name,
              }
            : null,
        },
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async profile(user: User) {
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

  async profileUpdate(user: User, body: UpdateProfileDto) {
    try {
      const exist = await this.userRepository.findOne({
        where: { id: user.id },
      });
      if (!exist) {
        throw new NotFoundException('User Not Found');
      }
      if (body.name !== undefined) exist.name = body.name;
      if (body.city !== undefined) exist.city = body.city;
      if (body.address !== undefined) exist.address = body.address;
      if (body.gender !== undefined) exist.gender = body.gender;
      if (body.phone !== undefined) exist.phone = body.phone;
      if (body.image !== undefined) exist.image = body.image;

      const savedUser = await this.userRepository.save(exist);

      return {
        success: true,
        message: 'Password updated successfully',
        data: savedUser,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async changePassword(
    body: { oldPassword: string; newPassword: string },
    user: User,
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
