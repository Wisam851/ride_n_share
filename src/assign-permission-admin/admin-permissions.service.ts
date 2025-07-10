// src/admin-permission/admin-permissions.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { AdminPermission } from './entity/admin-permission.entity';
import {
  CreateAdminPermissionDto,
  UpdateAdminPermissionDto,
} from './dtos/admin-permission.dto';
import { Admin } from 'src/admin/entity/admin.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Injectable()
export class AdminPermissionsService {
  constructor(
    @InjectRepository(AdminPermission)
    private readonly adminPermissionRepo: Repository<AdminPermission>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /* ─────────────────────────────── CREATE ─────────────────────────────── */
  async create(dto: CreateAdminPermissionDto) {
    try {
      const admin = await this.adminRepo.findOne({
        where: { id: dto.admin_id },
      });
      if (!admin) throw new BadRequestException('Invalid admin_id');

      const permission = await this.permissionRepo.findOne({
        where: { id: dto.permission_id },
      });
      if (!permission) throw new BadRequestException('Invalid permission_id');
      if (permission.guard !== 'admin')
        throw new BadRequestException(
          'Permission must be for admin guard only',
        );

      /* ✅ NEW: stop duplicate assignment */
      const duplicate = await this.adminPermissionRepo.findOne({
        where: { admin_id: dto.admin_id, permission_id: dto.permission_id },
      });
      if (duplicate)
        throw new BadRequestException('This admin already has that permission');

      const saved = await this.adminPermissionRepo.save(
        this.adminPermissionRepo.create(dto),
      );

      return {
        success: true,
        message: 'Admin permission assigned successfully',
        data: saved,
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  /* ─────────────────────────────── LIST ─────────────────────────────── */
  async findAll() {
    try {
      const records = await this.adminPermissionRepo.find({
        relations: ['admin', 'permission'],
      });
      return {
        success: true,
        message: 'Admin permissions list fetched successfully',
        data: records,
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  /* ─────────────────────────────── GET ONE ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const record = await this.adminPermissionRepo.findOne({
        where: { id },
        relations: ['admin', 'permission'],
      });
      if (!record) throw new NotFoundException('Record not found');
      return {
        success: true,
        message: 'Admin permission fetched successfully',
        data: record,
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  /* ─────────────────────────────── UPDATE ─────────────────────────────── */
  async update(id: number, dto: UpdateAdminPermissionDto) {
    try {
      const existing = await this.adminPermissionRepo.findOne({
        where: { id },
      });
      if (!existing)
        throw new NotFoundException('Admin permission assignment not found');

      if (dto.admin_id) {
        const admin = await this.adminRepo.findOne({
          where: { id: dto.admin_id },
        });
        if (!admin) throw new BadRequestException('Invalid admin_id');
        existing.admin_id = dto.admin_id;
        existing.admin = admin;
      }

      if (dto.permission_id) {
        const permission = await this.permissionRepo.findOne({
          where: { id: dto.permission_id },
        });
        if (!permission) throw new BadRequestException('Invalid permission_id');
        if (permission.guard !== 'admin')
          throw new BadRequestException(
            'Permission must be for admin guard only',
          );

        existing.permission_id = dto.permission_id;
        existing.permission = permission;
      }

      /* ✅ NEW: ensure (admin_id, permission_id) pair is still unique */
      const collision = await this.adminPermissionRepo.findOne({
        where: {
          id: Not(id),
          admin_id: existing.admin_id,
          permission_id: existing.permission_id,
        },
      });
      if (collision)
        throw new BadRequestException('Another record already has that pair');

      await this.adminPermissionRepo.save(existing);

      const updated = await this.adminPermissionRepo.findOne({
        where: { id },
        relations: ['admin', 'permission'],
      });

      return {
        success: true,
        message: 'Admin permission updated successfully',
        data: updated,
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  /* ─────────────────────────────── DELETE ─────────────────────────────── */
  async remove(id: number) {
    try {
      const record = await this.adminPermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
      await this.adminPermissionRepo.remove(record);
      return {
        success: true,
        message: 'Admin permission deleted successfully',
        data: [],
      };
    } catch (error) {
      this.handleUnknown(error);
    }
  }

  /* ─────────────────────────────── TOGGLE STATUS ─────────────────────────────── */
  async toggleStatus(id: number) {
    try {
      const record = await this.adminPermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');

      record.status = record.status === 0 ? 1 : 0;
      const updated = await this.adminPermissionRepo.save(record);

      const message =
        updated.status === 1
          ? 'Admin permission activated successfully'
          : 'Admin permission deactivated successfully';

      return { success: true, message, data: updated };
    } catch (error) {
      this.handleUnknown(error);
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
