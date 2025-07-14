import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from 'src/users/entity/user.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';

@Injectable()
export class UserAuthSeederService {
  private readonly logger = new Logger(UserAuthSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async seed() {
    await this.seedUser({
      name: 'Customer User',
      email: 'customer@gmail.com',
      password: '$2b$10$2W5M6W6UN3KWa5KJHeUSDeIlR2iosf2.QBVRE2bvodIRNjl5KSFHe',
      roleId: 3,
    });

    await this.seedUser({
      name: 'Driver User',
      email: 'driver@gmail.com',
      password: '$2b$10$2W5M6W6UN3KWa5KJHeUSDeIlR2iosf2.QBVRE2bvodIRNjl5KSFHe',
      roleId: 4,
    });
  }

  private async seedUser({
    name,
    email,
    password,
    roleId,
  }: {
    name: string;
    email: string;
    password: string;
    roleId: number;
  }) {
    const existing = await this.userRepo.findOne({ where: { email } });

    if (existing) {
      this.logger.log(`${email} already exists, skipping...`);
      return;
    }

    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      this.logger.error(`Role ID ${roleId} not found.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ name, email, password: hashedPassword });
    const savedUser = await this.userRepo.save(user);

    const userRole = this.userRoleRepo.create({
      user: savedUser,
      role,
    });

    await this.userRoleRepo.save(userRole);
    this.logger.log(`User ${email} created with role ${role.name}`);
  }
}
