// src/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './entity/user.entity';
import { UserDetails } from './entity/user_details.entity';
import { CreateUserDto, UpdateUserDto } from './dtos/users.dto';
import { UserDetailsDto } from './dtos/user_details.dto';
import * as bcrypt from 'bcrypt';
import { Exclude, instanceToPlain, plainToInstance } from 'class-transformer';
import { Role } from 'src/roles/entity/roles.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserDetails)
    private readonly userDetailsRepository: Repository<UserDetails>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,
  ) { }

  /* ─────────────────────────────── CREATE USER ─────────────────────────────── */
  async storeUser(dto: CreateUserDto) {
    try {
      const exists = await this.userRepository.findOne({
        where: { email: dto.email },
        relations: ['userRoles.role'],
      });
      if (exists)
        throw new BadRequestException('User with this email already exists');

      if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);

      const saved = await this.userRepository.save(
        this.userRepository.create(dto),
      );
      const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
      if (!role) throw new NotFoundException('Role not found');
      const userRole = await this.userRoleRepo.create({
        user_id: saved.id,
        user: saved,
        role_id: role.id,
        role: role,
      });
      await this.userRoleRepo.save(userRole);
      const { password, access_token, ...clean } = saved;

      return {
        success: true,
        message: 'User has been created',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── LIST USERS ─────────────────────────────── */
  async idnex() {
    // kept the original route name; consider renaming to "index" later
    try {
      const usersData = await this.userRepository.find({
        relations: [
          'details',
          'userRoles.role'
        ],
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
          gender: true,
          city: true,
          image: true,
          status: true,
          isVarified: true,
          isOnline: true,
          details: true,
          userRoles: false,
          userVehicles: true
        }
      });
      const users = usersData.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        address: u.address,
        gender: u.gender,
        city: u.city,
        image: u.image,
        details: u.details,
        userRoles: u.userRoles?.[0]?.role?.name || null // just "customer"
      }));
      return { success: true, message: 'User list', data: plainToInstance(User, users) };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── FIND BY ID ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['details'],
      });
      if (!user) throw new NotFoundException('User not found');

      const { password, access_token, ...clean } = user;
      return { success: true, message: 'User fetched', data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── FIND BY EMAIL ─────────────────────────────── */
  async findOnByEmail(email: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['details'],
      });
      if (!user) throw new NotFoundException('User not found');

      const { password, access_token, ...clean } = user;
      return { success: true, message: 'User fetched', data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── UPDATE USER ─────────────────────────────── */
  async updateUser(id: number, dto: UpdateUserDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      /* ✅ NEW: exclude current record when checking email uniqueness */
      if (dto.email) {
        const dup = await this.userRepository.findOne({
          where: { email: dto.email, id: Not(id) },
        });
        if (dup) throw new BadRequestException('Email already exists');
      }

      if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
      if (!dto.image) dto.image = user.image;

      Object.assign(user, dto);
      const saved = await this.userRepository.save(user);

      const { password, access_token, ...clean } = saved;
      return { success: true, message: 'User updated', data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── TOGGLE STATUS ─────────────────────────────── */
  async statusUpdate(id: number) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      user.status = user.status === 0 ? 1 : 0;
      const saved = await this.userRepository.save(user);

      const { password, access_token, ...clean } = saved;
      const msg =
        saved.status === 1
          ? 'User has been activated successfully'
          : 'User has been deactivated successfully';

      return { success: true, message: msg, data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── CREATE USER DETAILS ─────────────────────────────── */
  async create_user_details(dto: UserDetailsDto, user: User) {
    try {
      const exists = await this.userDetailsRepository.findOne({
        where: { user: { id: user.id } },
      });
      if (exists) throw new BadRequestException('User details already exist');

      /* ✅ NEW: optional uniqueness guard on license_no / identity_no */
      const licDup = await this.userDetailsRepository.findOne({
        where: { license_no: dto.license_no },
      });
      if (licDup)
        throw new BadRequestException('License number already in use');

      const details = this.userDetailsRepository.create({
        license_no: dto.license_no,
        license_validity_date: dto.license_validity_date,
        identity_no: dto.identity_no,
        identity_validity_date: dto.identity_validity_date,
        user,
      });

      const saved = await this.userDetailsRepository.save(details);
      return {
        success: true,
        message: 'User details added',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── PRIVATE ─────────────────────────────── */
  private handleUnknown(err: unknown): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err; // preserve intended HTTP code
    }
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
