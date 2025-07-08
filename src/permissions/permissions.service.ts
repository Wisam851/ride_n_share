import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Permission } from './entity/permission.entity';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from './dtos/permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  async create(data: CreatePermissionDto) {
    try {
      const existingPermission = await this.permissionRepo.findOne({
        where: { name: data.name, guard: data.guard },
      });

      if (existingPermission) {
        throw new BadRequestException('This name permission is already made');
      }

      const permission = this.permissionRepo.create(data);
      const saved = await this.permissionRepo.save(permission);

      return {
        success: true,
        message: 'Permission created successfully',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findAll() {
    try {
      const permissions = await this.permissionRepo.find();

      return {
        success: true,
        message: 'All permissions fetched successfully',
        data: permissions,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number) {
    try {
      const permission = await this.permissionRepo.findOneBy({ id });
      if (!permission) {
        throw new NotFoundException('Permission not found');
      }

      return {
        success: true,
        message: 'Permission fetched successfully',
        data: permission,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(id: number, data: UpdatePermissionDto) {
    try {
      const existingPermission = await this.permissionRepo.findOne({
        where: {
          id: Not(id),
          name: data.name,
          guard: data.guard,
        },
      });

      if (existingPermission) {
        throw new BadRequestException('This name permission is already made');
      }

      const permission = await this.permissionRepo.findOne({ where: { id } });

      if (!permission) {
        throw new NotFoundException('Permission not found');
      }

      Object.assign(permission, data);
      const savedPermission = await this.permissionRepo.save(permission);

      return {
        success: true,
        message: 'Permission updated successfully',
        data: savedPermission,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async toogleStatus(id: number) {
    try {
      const permission = await this.permissionRepo.findOne({ where: { id } });

      if (!permission) {
        throw new NotFoundException('Permission not found');
      }

      permission.status = permission.status === 0 ? 1 : 0;
      const updated = await this.permissionRepo.save(permission);

      return {
        success: true,
        message:
          permission.status === 1
            ? 'Permission is activated'
            : 'Permission is deactivated',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async remove(id: number) {
    try {
      const found = await this.findOne(id); // already throws if not found
      const permission = found.data;
      const removed = await this.permissionRepo.remove(permission);

      return {
        success: true,
        message: 'Permission deleted successfully',
        data: removed,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

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
}
