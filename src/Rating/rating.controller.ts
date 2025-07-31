import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateRatingDto, UpdateRatingDto, rateDto } from './dto/Rating.dto';
import { User } from 'src/users/entity/user.entity';

@UseGuards(UserJwtAuthGuard)
@Controller('user/rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}
  @Post('store')
  async create(
    @Body() rating: CreateRatingDto,
    @CurrentUser('id') userId: number,
  ) {
    return await this.ratingService.create({ ...rating, userId });
  }

  @Post('rate-to-driver')
  async rateToDriver(
    @Body() rating: rateDto,
    @CurrentUser('id') userId: number,
  ) {
    return await this.ratingService.rateToDriver({ ...rating, userId });
  }

  @Post('rate-to-customer')
  async rateToCustomer(
    @Body() rating: rateDto,
    @CurrentUser('id') userId: number,
  ) {
    return await this.ratingService.rateToCustomer({ ...rating, userId });
  }

  @Get('list')
  async getAllRatings(@CurrentUser('id') userId: number) {
    return await this.ratingService.getAllRatings(userId);
  }
  @Get('show/:id')
  async getRatingByID(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return await this.ratingService.getRatingByID(id, userId);
  }
  @Patch('update/:id')
  async updateRating(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() updateDto: UpdateRatingDto,
  ) {
    return await this.ratingService.updateRating(id, userId, updateDto);
  }
  @Delete(':id')
  async deleteRating(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return await this.ratingService.deleteRating(id, userId);
  }
}
