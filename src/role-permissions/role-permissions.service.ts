// src/role-permissions/role-permissions.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  CreateRolePermissionAssigningDto,
  UpdateRolePermissionAssigningDto,
} from './dto/role-permission.dto';
import { RolePermissions } from './entity/role-permission.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(RolePermissions)
    private readonly rolePermissionRepo: Repository<RolePermissions>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /* ─────────────────────────────── CREATE ─────────────────────────────── */
  async create(dto: CreateRolePermissionAssigningDto) {
    try {
      const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
      if (!role) throw new BadRequestException('Invalid role_id');

      const permission = await this.permissionRepo.findOne({
        where: { id: dto.permission_id },
      });
      if (!permission) throw new BadRequestException('Invalid permission_id');

      if (role.guard !== permission.guard) {
        throw new BadRequestException(
          `You can't assign a "${permission.guard}" permission to a "${role.guard}" role`,
        );
      }

      /* ✅ NEW: avoid duplicate pairs (role_id + permission_id) */
      const duplicate = await this.rolePermissionRepo.findOne({
        where: { role_id: dto.role_id, permission_id: dto.permission_id },
      });
      if (duplicate) {
        throw new BadRequestException(
          'This role already has that permission assigned',
        );
      }

      const rolePermission = this.rolePermissionRepo.create(dto);
      const saved = await this.rolePermissionRepo.save(rolePermission);
      return {
        success: true,
        message: 'Role permission assigned',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── FIND ALL ─────────────────────────────── */
  async findAll() {
    try {
      const list = await this.rolePermissionRepo.find();
      if (!list.length)
        throw new NotFoundException('No role–permission links found');

      return {
        success: true,
        message: 'Role permissions fetched',
        data: list,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── FIND ONE ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const record = await this.rolePermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
      return {
        success: true,
        message: 'Role permission fetched',
        data: record,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── UPDATE ─────────────────────────────── */
  async update(id: number, dto: UpdateRolePermissionAssigningDto) {
    try {
      const existing = await this.rolePermissionRepo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('RolePermission not found');

      const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
      if (!role) throw new BadRequestException('Invalid role_id');

      const permission = await this.permissionRepo.findOne({
        where: { id: dto.permission_id },
      });
      if (!permission) throw new BadRequestException('Invalid permission_id');

      if (role.guard !== permission.guard) {
        throw new BadRequestException(
          `You can't assign a "${permission.guard}" permission to a "${role.guard}" role`,
        );
      }

      /* ✅ NEW: ensure no *other* record collides with the same pair */
      const duplicate = await this.rolePermissionRepo.findOne({
        where: {
          id: Not(id),
          role_id: dto.role_id,
          permission_id: dto.permission_id,
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          'Another record already uses that role & permission pair',
        );
      }

      existing.role_id = dto.role_id;
      existing.permission_id = dto.permission_id;
      existing.role = role;
      existing.permission = permission;

      await this.rolePermissionRepo.save(existing);
      return this.rolePermissionRepo.findOne({
        where: { id },
        relations: ['role', 'permission'],
      });
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── TOGGLE STATUS ─────────────────────────────── */
  async toogleStatus(id: number) {
    try {
      const record = await this.rolePermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');

      record.status = record.status === 1 ? 0 : 1;
      const saved = await this.rolePermissionRepo.save(record);

      return {
        success: true,
        message:
          saved.status === 1
            ? 'Role permission activated'
            : 'Role permission deactivated',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── REMOVE ─────────────────────────────── */
  async remove(id: number) {
    try {
      const record = await this.rolePermissionRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
      return await this.rolePermissionRepo.remove(record);
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── PRIVATE ─────────────────────────────── */
  private handleUnknown(err: unknown): never {
    // Re‑throw known NestJS HTTP exceptions so the status code is preserved
    if (err instanceof BadRequestException || err instanceof NotFoundException)
      throw err;

    // Everything else becomes 500
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
