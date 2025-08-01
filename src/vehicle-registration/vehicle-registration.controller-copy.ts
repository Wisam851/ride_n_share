import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';
import {
  CreateVehicleRegistrationDto,
  UpdateVehicleRegistrationDto,
} from './dtos/vehicle-registration.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { inspect } from 'util';

@Controller('vehicle-registrations')
export class VehicleRegistrationController {
  constructor(private readonly vehicleService: VehicleRegistrationService) {}

  @Roles('driver')
  @Post('store')
  @UseInterceptors(FileInterceptor('image', multerConfig('uploads')))
  create(
    @Body() dto: CreateVehicleRegistrationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.table(inspect(dto));
    const image = file ? file.filename : null;
    if (!image) {
      throw new Error('Image file is required');
    }
    return this.vehicleService.create({ ...dto, image });
  }

  @Get()
  findAll() {
    return this.vehicleService.findAll();
  }

  // Get all active vehicles
  @Get('active')
  findActive() {
    return this.vehicleService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', multerConfig('uploads')))
  update(
    @Param('id') id: number,
    @Body() dto: UpdateVehicleRegistrationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const image = file?.filename ?? dto.image ?? '';

    return this.vehicleService.update(id, { ...dto, image });
  }

  // Soft delete
  @Delete('soft-delete/:id')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.softDelete(id);
  }
}
