import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entity/roles.entity';
import { Repository } from 'typeorm';
import { CreateRoleDto, UpdateRoleDto } from './dtos/role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  private handleUnknown(err: unknown): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    throw new InternalServerErrorException('Something went wrong internally.', {
      cause: err as Error,
    });
  }

  async create(role: CreateRoleDto) {
    try {
      if (role.guard !== 'user' && role.guard !== 'admin') {
        throw new BadRequestException('Guard must be either "user" or "admin"');
      }

      const existing = await this.roleRepo.findOne({
        where: { name: role.name, guard: role.guard },
      });

      if (existing) {
        throw new BadRequestException(
          'This role already exists under this guard',
        );
      }

      const newRole = this.roleRepo.create(role);
      const saved = await this.roleRepo.save(newRole);

      return {
        success: true,
        message: 'Role has been created',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async index() {
    try {
      const roles = await this.roleRepo.find({ order: { id: 'ASC' } });

      return {
        success: true,
        message: 'Roles fetched successfully',
        data: roles,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number) {
    try {
      const role = await this.roleRepo.findOne({ where: { id } });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      return {
        success: true,
        message: 'Role fetched successfully',
        data: role,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(role: UpdateRoleDto, id: number) {
    try {
      if (role.guard !== 'user' && role.guard !== 'admin') {
        throw new BadRequestException('Guard must be either "user" or "admin"');
      }

      const existing = await this.roleRepo.findOne({ where: { id } });

      if (!existing) {
        throw new NotFoundException('Role not found');
      }

      const duplicateName = await this.roleRepo.findOne({
        where: { name: role.name, guard: role.guard },
      });

      if (duplicateName && duplicateName.id !== id) {
        throw new BadRequestException(
          'Another role with this name already exists',
        );
      }

      Object.assign(existing, role);
      const updated = await this.roleRepo.save(existing);

      return {
        success: true,
        message: 'Role updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async toogleStatus(id: number) {
    try {
      const role = await this.roleRepo.findOne({ where: { id } });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      role.status = role.status === 0 ? 1 : 0;
      const updated = await this.roleRepo.save(role);

      return {
        success: true,
        message:
          role.status === 1
            ? 'Role has been activated'
            : 'Role has been deactivated',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }
}
