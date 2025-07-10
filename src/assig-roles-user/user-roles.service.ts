// src/user-role/user-roles.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Role } from 'src/roles/entity/roles.entity';
import { User } from 'src/users/entity/user.entity';
import { UserRole } from './entity/user-role.entity';
import { CreateUserRoleDto, UpdateUserRoleDto } from './dtos/user-role.dto';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /* ─────────────────────────────── CREATE ─────────────────────────────── */
  async create(dto: CreateUserRoleDto) {
    try {
      const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
      if (!user) throw new BadRequestException('Invalid user_id');

      const role = await this.roleRepo.findOne({ where: { id: dto.role_id } });
      if (!role) throw new BadRequestException('Invalid role_id');
      if (role.guard !== 'user')
        throw new BadRequestException('Role must be for user guard only');

      // ✅ prevent duplicate assignment
      const duplicate = await this.userRoleRepo.findOne({
        where: { user_id: dto.user_id, role_id: dto.role_id },
      });
      if (duplicate)
        throw new BadRequestException('This user already has that role');

      const saved = await this.userRoleRepo.save(this.userRoleRepo.create(dto));

      const record = await this.userRoleRepo.findOne({
        where: { id: saved.id },
        relations: ['user', 'role'],
      });

      return { success: true, message: 'Role assigned to user', data: record };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── LIST ─────────────────────────────── */
  async findAll() {
    try {
      const list = await this.userRoleRepo.find({
        relations: ['user', 'role'],
      });
      return { success: true, message: 'User roles fetched', data: list };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── GET ONE ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const record = await this.userRoleRepo.findOne({
        where: { id },
        relations: ['user', 'role'],
      });
      if (!record) throw new NotFoundException('Record not found');
      return { success: true, message: 'User role fetched', data: record };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── UPDATE ─────────────────────────────── */
  async update(id: number, dto: UpdateUserRoleDto) {
    try {
      const existing = await this.userRoleRepo.findOne({ where: { id } });
      if (!existing)
        throw new NotFoundException('User role assignment not found');

      if (dto.user_id) {
        const user = await this.userRepo.findOne({
          where: { id: dto.user_id },
        });
        if (!user) throw new BadRequestException('Invalid user_id');
        existing.user_id = dto.user_id;
        existing.user = user;
      }

      if (dto.role_id) {
        const role = await this.roleRepo.findOne({
          where: { id: dto.role_id },
        });
        if (!role) throw new BadRequestException('Invalid role_id');
        if (role.guard !== 'user')
          throw new BadRequestException('Role must be for user guard only');
        existing.role_id = dto.role_id;
        existing.role = role;
      }

      // ✅ ensure uniqueness after edits
      const collision = await this.userRoleRepo.findOne({
        where: {
          id: Not(id),
          user_id: existing.user_id,
          role_id: existing.role_id,
        },
      });
      if (collision)
        throw new BadRequestException('Another record already has that pair');

      await this.userRoleRepo.save(existing);
      return {
        success: true,
        message: 'User role updated',
        data: (await this.findOne(id)).data,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── TOGGLE STATUS ─────────────────────────────── */
  async toggleStatus(id: number) {
    try {
      const record = await this.userRoleRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');

      record.status = record.status === 0 ? 1 : 0;
      const saved = await this.userRoleRepo.save(record);

      const msg =
        saved.status === 1 ? 'User role activated' : 'User role deactivated';

      return { success: true, message: msg, data: saved };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── REMOVE ─────────────────────────────── */
  async remove(id: number) {
    try {
      const record = await this.userRoleRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
      await this.userRoleRepo.remove(record);
      return { success: true, message: 'User role deleted', data: [] };
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
