import { Module } from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Rating } from './entity/rating.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entity/user.entity';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';



@Module({
  imports: [TypeOrmModule.forFeature([Rating,User,RideBooking])],
  controllers: [RatingController],
  providers: [RatingService]
})
export class RatingModule {}
