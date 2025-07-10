// src/admin-role/admin-roles.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Role } from 'src/roles/entity/roles.entity';
import { AdminRole } from './entity/admin-role.entity';
import { CreateAdminRoleDto, UpdateAdminRoleDto } from './dtos/admin-role.dto';
import { Admin } from 'src/admin/entity/admin.entity';

@Injectable()
export class AdminRolesService {
  constructor(
    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /* ─────────────────────────────── CREATE ─────────────────────────────── */
  async create(dto: CreateAdminRoleDto) {
    try {
      const admin = await this.adminRepo.findOne({
        where: { id: dto.admin_id },
      });
      if (!admin) throw new BadRequestException('Invalid admin_id');

      const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
      if (!role) throw new BadRequestException('Invalid role_id');
      if (role.guard !== 'admin')
        throw new BadRequestException('Role must be for admin guard only');

      // ✅ NEW: prevent duplicate assignment
      const duplicate = await this.adminRoleRepo.findOne({
        where: { admin_id: dto.admin_id, role_id: dto.role_id },
      });
      if (duplicate)
        throw new BadRequestException('This admin already has that role');

      const saved = await this.adminRoleRepo.save(
        this.adminRoleRepo.create(dto),
      );

      const record = await this.adminRoleRepo.findOne({
        where: { id: saved.id },
        relations: ['admin', 'role'],
      });

      return {
        success: true,
        message: 'Role assigned to admin',
        data: record,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── LIST ─────────────────────────────── */
  async findAll() {
    try {
      const list = await this.adminRoleRepo.find({
        relations: ['admin', 'role'],
      });
      return { success: true, message: 'Admin roles fetched', data: list };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── GET ONE ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const record = await this.adminRoleRepo.findOne({
        where: { id },
        relations: ['admin', 'role'],
      });
      if (!record) throw new NotFoundException('Record not found');
      return { success: true, message: 'Admin role fetched', data: record };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── UPDATE ─────────────────────────────── */
  async update(id: number, dto: UpdateAdminRoleDto) {
    try {
      const existing = await this.adminRoleRepo.findOne({ where: { id } });
      if (!existing)
        throw new NotFoundException('Admin role assignment not found');

      /* admin_id swap */
      if (dto.admin_id) {
        const admin = await this.adminRepo.findOne({
          where: { id: dto.admin_id },
        });
        if (!admin) throw new BadRequestException('Invalid admin_id');
        existing.admin_id = dto.admin_id;
        existing.admin = admin;
      }

      /* role_id swap */
      if (dto.role_id) {
        const role = await this.roleRepo.findOne({
          where: { id: dto.role_id },
        });
        if (!role) throw new BadRequestException('Invalid role_id');
        if (role.guard !== 'admin')
          throw new BadRequestException('Role must be for admin guard only');
        existing.role_id = dto.role_id;
        existing.role = role;
      }

      // ✅ NEW: ensure the updated pair is still unique
      const collision = await this.adminRoleRepo.findOne({
        where: {
          id: Not(id),
          admin_id: existing.admin_id,
          role_id: existing.role_id,
        },
      });
      if (collision)
        throw new BadRequestException('Another record already has that pair');

      await this.adminRoleRepo.save(existing);

      const updated = await this.findOne(id);
      return {
        success: true,
        message: 'Admin role updated',
        data: updated.data,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── REMOVE ─────────────────────────────── */
  async remove(id: number) {
    try {
      const record = await this.adminRoleRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
      await this.adminRoleRepo.remove(record);
      return { success: true, message: 'Admin role deleted', data: [] };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── Toogle Status ─────────────────────────────── */
  async toogleStatus(id: number) {
    try {
      const record = await this.adminRoleRepo.findOne({
        where: { id },
      });
      if (!record) throw new NotFoundException('Record not found');
      record.status = record.status === 1 ? 0 : 1;
      await this.adminRoleRepo.save(record);
      const message =
        record.status === 1
          ? 'Admin Role is Activated'
          : 'Admin Role is Inactivated';
      return { success: true, message: message, data: record };
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
