import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPlace } from './entity/saved-place.entity';
import {
  CreateSavedPlaceDto,
  UpdateSavedPlaceDto,
} from './dtos/saved-place.dto';
import { User } from 'src/users/entity/user.entity';

@Injectable()
export class SavedPlacesService {
  constructor(
    @InjectRepository(SavedPlace)
    private readonly savedRepo: Repository<SavedPlace>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private handleUnknown(err: unknown): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    throw new InternalServerErrorException('Unexpected server error occurred', {
      cause: err as Error,
    });
  }

  async create(dto: CreateSavedPlaceDto, userId: number) {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('Invalid user ID');
      }

      const savedPlace = this.savedRepo.create({
        ...dto,
        user_id: user.id,
        created_by: user.id,
      });

      const created = await this.savedRepo.save(savedPlace);

      return {
        success: true,
        message: 'Saved place has been created',
        data: created,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findAll(userId: number) {
    try {
      const list = await this.savedRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      });

      return {
        success: true,
        message: 'Saved places fetched successfully',
        data: list,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number, userId: number) {
    try {
      const place = await this.savedRepo.findOne({
        where: { id, user_id: userId },
      });

      if (!place) {
        throw new NotFoundException('Saved place not found');
      }

      return {
        success: true,
        message: 'Saved place fetched successfully',
        data: place,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(id: number, dto: UpdateSavedPlaceDto, userId: number) {
    try {
      const record = await this.savedRepo.findOne({
        where: { id, user_id: userId },
      });

      if (!record) {
        throw new NotFoundException('Saved place not found');
      }

      Object.assign(record, dto);
      const updated = await this.savedRepo.save(record);

      return {
        success: true,
        message: 'Saved place updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async remove(id: number, userId: number) {
    try {
      const record = await this.savedRepo.findOne({
        where: { id, user_id: userId },
      });

      if (!record) {
        throw new NotFoundException('Saved place not found');
      }

      await this.savedRepo.remove(record);

      return {
        success: true,
        message: 'Saved place deleted successfully',
        data: {},
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }
}
