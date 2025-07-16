import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entity/admin.entity';

@Injectable()
export class AdminAuthSeederService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
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
    console.log('✅ Admin seeded successfully');
  }
}
