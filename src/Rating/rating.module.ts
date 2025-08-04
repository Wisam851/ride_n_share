import { Module } from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Rating } from './entity/rating.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entity/user.entity';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';
import { Role } from 'src/roles/entity/roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, User, RideBooking, UserRole, Role]),
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService, TypeOrmModule.forFeature([Rating])],
})
export class RatingModule {}
