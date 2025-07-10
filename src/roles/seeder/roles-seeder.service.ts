// src/roles/seeder/roles-seeder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../entity/roles.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesSeederService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async seed() {
    const defaultRoles = [
      { name: 'admin', guard: 'admin' },
      { name: 'manager', guard: 'admin' },
      { name: 'user', guard: 'user' },
      { name: 'driver', guard: 'user' },
    ];

    for (const roleData of defaultRoles) {
      const exists = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });
      if (!exists) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        Logger.log(
          `✅ Seeded role: ${JSON.stringify(roleData)}`,
          'RolesSeederService',
        );
      } else {
        Logger.log(
          `ℹ️ Role already exists: ${JSON.stringify(roleData)}`,
          'RolesSeederService',
        );
      }
    }
  }
}
