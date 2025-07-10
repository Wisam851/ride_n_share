// src/user-permission/user-permissions.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserPermission } from './entity/user-permission.entity';
import {
  CreateUserPermissionDto,
  UpdateUserPermissionDto,
} from './dtos/user-permission.dto';
import { User } from 'src/users/entity/user.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Injectable()
export class UserPermissionsService {
  constructor(
    @InjectRepository(UserPermission)
    private readonly userPermissionRepo: Repository<UserPermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /* ─────────────────────────────── CREATE ─────────────────────────────── */
  async create(dto: CreateUserPermissionDto) {
    try {
      const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
      if (!user) throw new BadRequestException('Invalid user_id');

      const permission = await this.permissionRepo.findOne({
        where: { id: dto.permission_id },
      });
      if (!permission) throw new BadRequestException('Invalid permission_id');
      if (permission.guard !== 'user')
        throw new BadRequestException('Permission must be for user guard only');

      // ✅ duplicate‑pair guard
      const duplicate = await this.userPermissionRepo.findOne({
        where: { user_id: dto.user_id, permission_id: dto.permission_id },
      });
      if (duplicate)
        throw new BadRequestException('This user already has that permission');

      const saved = await this.userPermissionRepo.save(
        this.userPermissionRepo.create(dto),
      );

      return {
        success: true,
        message: 'User permission assigned successfully',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── LIST ─────────────────────────────── */
  async findAll() {
    try {
      const records = await this.userPermissionRepo.find({
        relations: ['user', 'permission'],
      });
      return {
        success: true,
        message: 'User permissions list fetched successfully',
        data: records,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── GET ONE ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const record = await this.userPermissionRepo.findOne({
        where: { id },
        relations: ['user', 'permission'],
      });
      if (!record) throw new NotFoundException('Record not found');

      return {
        success: true,
        message: 'User permission fetched successfully',
        data: record,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── UPDATE ─────────────────────────────── */
  async update(id: number, dto: UpdateUserPermissionDto) {
    try {
      const existing = await this.userPermissionRepo.findOne({ where: { id } });
      if (!existing)
        throw new NotFoundException('User permission assignment not found');

      if (dto.user_id) {
        const user = await this.userRepo.findOne({
          where: { id: dto.user_id },
        });
        if (!user) throw new BadRequestException('Invalid user_id');
        existing.user_id = dto.user_id;
        existing.user = user;
      }

      if (dto.permission_id) {
        const permission = await this.permissionRepo.findOne({
          where: { id: dto.permission_id },
        });
        if (!permission) throw new BadRequestException('Invalid permission_id');
        if (permission.guard !== 'user')
          throw new BadRequestException(
            'Permission must be for user guard only',
          );
        existing.permission_id = dto.permission_id;
        existing.permission = permission;
      }

      // ✅ ensure uniqueness after edits
      const collision = await this.userPermissionRepo.findOne({
        where: {
          id: Not(id),
          user_id: existing.user_id,
          permission_id: existing.permission_id,
        },
      });
      if (collision)
        throw new BadRequestException('Another record already has that pair');

      await this.userPermissionRepo.save(existing);

      const updated = await this.userPermissionRepo.findOne({
        where: { id },
        relations: ['user', 'permission'],
      });

      return {
        success: true,
        message: 'User permission updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── TOGGLE STATUS ─────────────────────────────── */
  async toggleStatus(id: number) {
    try {
      const record = await this.userPermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');

      record.status = record.status === 0 ? 1 : 0;
      const updated = await this.userPermissionRepo.save(record);

      const message =
        updated.status === 1
          ? 'User permission activated successfully'
          : 'User permission deactivated successfully';

      return { success: true, message, data: updated };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── DELETE ─────────────────────────────── */
  async remove(id: number) {
    try {
      const record = await this.userPermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
      await this.userPermissionRepo.remove(record);
      return {
        success: true,
        message: 'User permission deleted successfully',
        data: [],
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── PRIVATE ─────────────────────────────── */
  private handleUnknown(err: unknown): never {
    if (err instanceof BadRequestException || err instanceof NotFoundException)
      throw err;
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
