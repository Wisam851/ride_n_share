import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedPlace } from './entity/saved-place.entity';
import { SavedPlacesService } from './saved-places.service';
import { SavedPlacesController } from './saved-places.controller';
import { User } from 'src/users/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedPlace, User])],
  providers: [SavedPlacesService],
  controllers: [SavedPlacesController],
})
export class SavedPlacesModule {}
