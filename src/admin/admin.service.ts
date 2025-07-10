// src/admin/admin.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Admin } from './entity/admin.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { CreateAdminDto } from './dtos/create-admin.dto';
import { UpdateAdminDto } from './dtos/update-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>, // still injected even if unused for now
  ) {}

  /* ─────────────────────────────── CREATE ─────────────────────────────── */
  async create(dto: CreateAdminDto, image: string) {
    try {
      const existing = await this.adminRepo.findOne({
        where: { email: dto.email },
      });
      if (existing)
        throw new BadRequestException('User with this email already exists');

      if (dto.password) {
        dto.password = await bcrypt.hash(dto.password, 10);
      }
      if (!dto.image) dto.image = image;

      const saved = await this.adminRepo.save(this.adminRepo.create(dto));
      const { password, access_token, ...clean } = saved;

      return {
        success: true,
        message: 'Admin has been created',
        data: clean,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── FIND ALL ─────────────────────────────── */
  async findAll() {
    try {
      const admins = await this.adminRepo.find();
      if (!admins.length) throw new NotFoundException('Admin list is empty');

      const data = admins.map(({ password, access_token, ...rest }) => rest);
      return { success: true, message: 'Admins fetched', data };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── ACTIVE ONLY ─────────────────────────────── */
  async allAvtive() {
    try {
      const admins = await this.adminRepo.find({ where: { status: 1 } });
      const data = admins.map(({ password, access_token, ...rest }) => rest);
      return { success: true, message: 'Active admins fetched', data };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── FIND ONE ─────────────────────────────── */
  async findOne(id: number) {
    try {
      const admin = await this.adminRepo.findOne({ where: { id } });
      if (!admin) throw new NotFoundException('Admin not found');

      const { password, access_token, ...clean } = admin;
      return { success: true, message: 'Admin fetched', data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── UPDATE ─────────────────────────────── */
  async update(id: number, dto: UpdateAdminDto) {
    try {
      const admin = await this.adminRepo.findOne({ where: { id } });
      if (!admin) throw new NotFoundException('Admin not found');

      /* ✅ NEW: exclude this record when checking for duplicate email */
      if (dto.email) {
        const duplicate = await this.adminRepo.findOne({
          where: { id: Not(id), email: dto.email },
        });
        if (duplicate)
          throw new BadRequestException(
            'Email already in use by another admin',
          );
      }

      if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
      if (!dto.image) dto.image = admin.image;

      Object.assign(admin, dto);
      const saved = await this.adminRepo.save(admin);

      const { password, access_token, ...clean } = saved;
      return { success: true, message: 'Admin updated', data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── REMOVE ─────────────────────────────── */
  async remove(id: number) {
    try {
      const admin = await this.adminRepo.findOne({ where: { id } });
      if (!admin) throw new BadRequestException('Admin not found');

      await this.adminRepo.remove(admin); // awaited for consistency
      return { success: true, message: 'Admin deleted', data: [] };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── TOGGLE STATUS ─────────────────────────────── */
  async statusUpdate(id: number) {
    try {
      const admin = await this.adminRepo.findOne({ where: { id } });
      if (!admin) throw new BadRequestException('Admin not found');

      admin.status = admin.status === 0 ? 1 : 0;
      const saved = await this.adminRepo.save(admin);

      const { password, access_token, ...clean } = saved;
      const msg =
        saved.status === 1
          ? 'User has been activated'
          : 'User has been deactivated';

      return { success: true, message: msg, data: clean };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  /* ─────────────────────────────── PRIVATE ─────────────────────────────── */
  private handleUnknown(err: unknown): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
