import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rating } from './entity/rating.entity';
import { User } from 'src/users/entity/user.entity';
import { Repository } from 'typeorm';
import { CreateRatingDto, UpdateRatingDto } from './dto/Rating.dto';

@Injectable()
export class RatingService {
    constructor(
        @InjectRepository(Rating)
        private ratingRepository: Repository<Rating>,

        @InjectRepository(User)
        private userRepository: Repository<User>
    ) { }
    async create(createRatingDto: CreateRatingDto) {
        try {
            const { userId, driverId, rideId, remarks, rating } = createRatingDto;

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const newRating = this.ratingRepository.create({
                driverId,
                rideId,
                remarks,
                rating,
                user,
                user_id: userId
            });
            const saverating = await this.ratingRepository.save(newRating)

            return {
                success: true,
                message: 'Rating created successfully',
                data: saverating,
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
                    user_id: userId , // ensures it belongs to the current user
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
                where: { id, user: { id: userId }, status: 1 },
            });

            if (!rating) {
                throw new NotFoundException(`Rating with ID ${id} not found or already inactive`);
            }

            rating.status = 0;
            rating.updated_at = new Date().toISOString().split('T')[0];

            await this.ratingRepository.save(rating);

            return {
                success: true,
                message: `Rating with ID ${id} marked inactive`,
                data: [],
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
