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
  UseGuards,
  BadRequestException,
  UploadedFiles,
} from '@nestjs/common';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';
import {
  CreateVehicleRegistrationDto,
  ReviewVehicleDto,
  UpdateVehicleRegistrationDto,
} from './dtos/vehicle-registration.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
// import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { VehicleApprovalStatus } from './entity/vehicle-registration.entity';
// import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';
import { MultiAuthGuard } from 'src/auth/multi-auth.guard';

@Controller('vehicle-registrations')
@UseGuards(MultiAuthGuard, RolesGuard)
export class VehicleRegistrationController {
  constructor(private readonly vehicleService: VehicleRegistrationService) {}

  @Patch('review/:id')
  async reviewVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVehicleDto,
  ) {
    return this.vehicleService.reviewVehicle(id, dto);
  }

  // @Roles('driver')
  // @Post('store')
  // @UseInterceptors(
  //   FileFieldsInterceptor(
  //     [
  //       { name: 'image', maxCount: 10 },
  //       { name: 'vehicle_certificate_back', maxCount: 1 },
  //       { name: 'vehicle_photo', maxCount: 1 },
  //     ],
  //     multerConfig('uploads'),
  //   ),
  // )
  // create(
  //   @Body() dto: CreateVehicleRegistrationDto,
  //   @UploadedFiles()
  //   files: {
  //     image?: Express.Multer.File[];
  //     vehicle_certificate_back?: Express.Multer.File[];
  //     vehicle_photo?: Express.Multer.File[];
  //   },
  //   @CurrentUser() user: any,
  // ) {
  //   const image = files.image?.[0]?.filename;
  //   const certificateBack = files.vehicle_certificate_back?.[0]?.filename;
  //   const vehiclePhoto = files.vehicle_photo?.[0]?.filename;

  //   if (!image || !certificateBack || !vehiclePhoto) {
  //     throw new BadRequestException('All vehicle images are required');
  //   }

  //   return this.vehicleService.create({
  //     ...dto,
  //     userId: user.userId,
  //     image,
  //     vehicle_certificate_back: certificateBack,
  //     vehicle_photo: vehiclePhoto,
  //   });
  // }

  @Roles('driver')
  @Post('store')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'vehicle_certificate_back', maxCount: 1 },
        { name: 'vehicle_photo', maxCount: 1 },
      ],
      multerConfig('uploads'),
    ),
  )
  async create(
    @Body() dto: CreateVehicleRegistrationDto,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      vehicle_certificate_back?: Express.Multer.File[];
      vehicle_photo?: Express.Multer.File[];
    },
    @CurrentUser('id') userId: number,
  ) {
    // Validate required files
    if (!files.vehicle_certificate_back?.[0] || !files.vehicle_photo?.[0]) {
      throw new BadRequestException(
        'Certificate and vehicle photo are required',
      );
    }

    return this.vehicleService.create({
      ...dto,
      userId: userId,
      images: files.images?.map((img) => img.filename) || [],
      vehicle_certificate_back: files.vehicle_certificate_back[0].filename,
      vehicle_photo: files.vehicle_photo[0].filename,
    });
  }

  @Get()
  findAll() {
    return this.vehicleService.findAll();
  }

  @Get('by-status/:status')
  findByStatus(@Param('status') status: VehicleApprovalStatus) {
    return this.vehicleService.findByStatus(status);
  }

  @Patch('toggle-status/:id')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.toggleStatus(id);
  }

  @Get('active')
  findActive() {
    return this.vehicleService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.findOne(id);
  }

  // @Patch(':id')
  // @UseInterceptors(
  //   FileFieldsInterceptor(
  //     [
  //       { name: 'image', maxCount: 1 },
  //       { name: 'vehicle_certificate_back', maxCount: 1 },
  //       { name: 'vehicle_photo', maxCount: 1 },
  //     ],
  //     multerConfig('uploads'), // 📁 Custom multer config
  //   ),
  // )
  // async updateVehicleRegistration(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: UpdateVehicleRegistrationDto,
  //   @UploadedFiles()
  //   files: {
  //     image?: Express.Multer.File[];
  //     vehicle_certificate_back?: Express.Multer.File[];
  //     vehicle_photo?: Express.Multer.File[];
  //   },
  // ) {
  //   const image = files.image?.[0]?.filename ?? dto.image ?? null;
  //   const vehicle_certificate_back =
  //     files.vehicle_certificate_back?.[0]?.filename ??
  //     dto.vehicle_certificate_back ??
  //     null;
  //   const vehicle_photo =
  //     files.vehicle_photo?.[0]?.filename ?? dto.vehicle_photo ?? null;

  //   return this.vehicleService.update(id, {
  //     ...dto,
  //     image,
  //     vehicle_certificate_back,
  //     vehicle_photo,
  //   });
  // }

  @Delete('soft-delete/:id')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.softDelete(id);
  }
}
