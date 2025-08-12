import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entity/admin.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { AdminRole } from 'src/assig-roles-admin/entity/admin-role.entity';

@Injectable()
export class AdminAuthSeederService {
  private readonly logger = new Logger(AdminAuthSeederService.name);
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(AdminRole)
    private readonly adminRolerepo: Repository<AdminRole>,
  ) {}

  async seed(): Promise<void> {
    const adminExists = await this.adminRepository.findOne({
      where: { email: 'admin@gmail.com' },
    });

    if (adminExists) {
      console.log('Admin already exists. Skipping seeding.');
      return;
    }

    const hashedPassword = await bcrypt.hash('123456789', 10);

    const admin = this.adminRepository.create({
      name: 'Super Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      status: 1,
    });

    await this.adminRepository.save(admin);

    const role = await this.roleRepo.findOne({
      where: { name: 'admin' },
      select: { id: true, name: true },
    });
    if (!role) {
      this.logger.error(`Role admin not found in roles table.`);
      return;
    }

    const adminRole = this.adminRolerepo.create({
      admin_id: admin.id,
      role_id: role.id,
      admin: admin,
      role: role,
    });

    await this.adminRolerepo.save(adminRole);
    this.logger.log("Admin Is successfully ")
  }
}