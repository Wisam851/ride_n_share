import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rating } from './entity/rating.entity';
import { User } from 'src/users/entity/user.entity';
import { Repository } from 'typeorm';
import { CreateRatingDto, UpdateRatingDto } from './dto/Rating.dto';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';

@Injectable()
export class RatingService {
    constructor(
        @InjectRepository(Rating)
        private ratingRepository: Repository<Rating>,

        @InjectRepository(User)
        private userRepository: Repository<User>,

        @InjectRepository(RideBooking)
        private RideBookingRepository: Repository<RideBooking>,

    ) { }
    async create(createRatingDto: CreateRatingDto) {
        try {
            const { userId, rideId, remarks, rating } = createRatingDto;

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const Ride = await this.RideBookingRepository.findOne({ where: { id: rideId } });
            if (!Ride) {
                throw new NotFoundException('Ride nor found');
            }

            // Prevent duplicate rating for the same ride
            const existing = await this.ratingRepository.findOne({
                where: { user_id: userId, rideId },
            });
            if (existing) {
                throw new BadRequestException('You have already rated this ride');
            }


            const newRating = this.ratingRepository.create({

                rideId,
                remarks,
                rating,
                user,
                user_id: userId,
                driverId: Ride.driver_id, // Get driver from ride
            });
            const saved = await this.ratingRepository.save(newRating)


            return {
                success: true,
                message: 'Rating created successfully',
                data: saved,
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to create rating', error.message);
        }
    }
    async getAllRatings(userId: number) {
        try {
            const ratings = await this.ratingRepository.find({ where: { user_id: userId }, order: { id: 'DESC' } })
            return {
                success: true,
                message: 'Ratings fetched successfully',
                data: ratings,
            };
        } catch (error) {
            console.error('Error while fetching ratings:', error);
            throw new InternalServerErrorException('Failed to get ratings');
        }
    }
    async getRatingByID(id: number, userId: number) {
        try {
            const rating = await this.ratingRepository.findOne({
                where: {
                    id,
                    user_id: userId, // ensures it belongs to the current user
                },
            });

            if (!rating) {
                throw new NotFoundException(`Rating with ID ${id} not found for this user`);
            }

            return {
                success: true,
                message: `Rating with ID ${id} fetched successfully`,
                data: rating,
            };
        } catch (error) {
            // If it's a known exception, re-throw it
            if (error instanceof NotFoundException) {
                throw error;
            }

            console.error('Error while fetching rating by ID:', error);
            throw new InternalServerErrorException('Failed to fetch the rating');
        }
    }
    async updateRating(
        id: number,
        userId: number,
        updateDto: UpdateRatingDto,
    ) {
        const rating = await this.ratingRepository.findOne({
            where: {
                id,
                user: { id: userId },
            },
        });

        if (!rating) {
            throw new NotFoundException(
                `Rating with ID ${id} not found for this user`,
            );
        }
        try {
            Object.assign(rating, updateDto); // merge partial updates

            const updated = await this.ratingRepository.save(rating)
            return {
                success: true,
                message: `Rating with ID ${id} updated successfully`,
                data: updated,
            };
        } catch (error) {
            throw new InternalServerErrorException(
                'Failed to update rating',
                error.message,
            );
        }
    }
    async deleteRating(id: number, userId: number) {
        try {
            const rating = await this.ratingRepository.findOne({
                where: { id, user: { id: userId }},
            });

            if (!rating) {
                throw new NotFoundException(`Rating with ID ${id} not found or already inactive`);
            }

            rating.status = rating.status ===  0 ? 1 : 0;
            rating.updated_at = new Date().toISOString().split('T')[0];

            

            const save=await this.ratingRepository.save(rating);
            const message=rating.status === 0 ? "Marked As InActive" : "'Marked As Active";

            return {
                success: true,
                message: `Rating with ID ${id} marked ${rating.status === 1 ? 'active' : 'inactive'}`,
                data: save,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            console.error('Error while deleting rating:', error);
            throw new InternalServerErrorException('Failed to delete the rating');
        }
    }
}

// / ✅ Utility: Update driver's average rating
//   private async updateDriverAverageRating(driverId: number) {
//     const avg = await this.ratingRepository
//       .createQueryBuilder('rating')
//       .select('AVG(rating.rating)', 'avg')
//       .where('rating.driverId = :driverId', { driverId })
//       .andWhere('rating.status = 1')
//       .getRawOne();

//     const averageRating = parseFloat(avg.avg ?? 0);

//     await this.userRepository.update(driverId, { average_rating: averageRating });
//   }
