import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { complaints } from './entity/complaints.entity';
import { MoreThan } from 'typeorm';
import { RideBookingService } from 'src/ride-booking/ride-booking.service';

import {
  CreateComplaintsDto,
  UpdateComplaintStatusDto,
} from './dto/complaints.dto';
// Import ComplaintStatus enum
import { ComplaintStatus } from './entity/complaints.entity';
import { RideBookingLog } from 'src/ride-booking/entity/ride-booking-logs.entity';
import { RideRouting } from 'src/ride-booking/entity/ride-routing.entity';
import { RideLocationType } from 'src/common/enums/ride-booking.enum';
import { haversineKm } from 'src/common/utils/geo.util';
import { complaintsCaterory } from 'src/complaints-category/entity/complaints_category.entity';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(complaints)
    private complaintsRepo: Repository<complaints>,
    private rideBookingService: RideBookingService,

    @InjectRepository(complaintsCaterory)
    private complaintsCategoryRepo: Repository<complaintsCaterory>,

    @InjectRepository(RideBookingLog)
    private readonly rideBookLogRepo: Repository<RideBookingLog>,

    @InjectRepository(RideRouting)
    private readonly rideRoutingRepo: Repository<RideRouting>,
  ) { }

  async create(body, userId) {
    try {
      await this.rideBookingService.ensureRideExists(body.ride_id);
      const complaintsCategory = await this.complaintsCategoryRepo.findOne({
        where: { id: body.complaint_category_id },
      });
      if (!complaintsCategory) {
        throw new NotFoundException({
          success: false,
          message: `Complaint category with ID ${body.complaint_category_id} not found.`,
        });
      }
      const category = this.complaintsRepo.create({
        ride_id: body.ride_id,
        complaint_category_id: body.complaint_category_id,
        complaintCategory: complaintsCategory,
        complaint_issue: body.complaint_issue,
        complaint_description: body.complaint_description,
        complaint_status: ComplaintStatus.PENDING, // ⬅️ Ensure it's set
        created_by: userId,
      });

      const saved = await this.complaintsRepo.save(category);
      return {
        success: true,
        message: 'Complaint created successfully.',
        data: saved,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to create complaint.',
        error: error.message,
      });
    }
  }

  async updateStatus(
    id: number,
    complaint_status: ComplaintStatus,
    admin_remarks?: string,
    adminId?: number,
  ) {
    try {
      const result = await this.findOne(id);
      const complaint = result.data.complaints;

      complaint.complaint_status = complaint_status;
      complaint.admin_remarks = admin_remarks ?? complaint.admin_remarks;
      complaint.responded_by = adminId;
      complaint.updated_at = new Date().toISOString().split('T')[0];

      await this.complaintsRepo.save(complaint);

      return {
        success: true,
        message: `Complaint status updated to ${admin_remarks}.`,
        data: complaint,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: `Failed to update complaint status for ID ${id}.`,
        error: error.message,
      });
    }
  }

  async findAll(hrs?: number) {
    try {
      const where: any = { status: 1 };

      if (hrs) {
        const currentDate = new Date();
        const pastDate = new Date(currentDate.getTime() - hrs * 60 * 60 * 1000);
        where.created_at = MoreThan(pastDate);
      }

      const complaints = await this.complaintsRepo.find({
        where,
        relations: ['user', 'ride', 'ride.driver'],
      });
      // Map over complaints to add pickup, dropoff, and distance
      const complaintsWithLocation = await Promise.all(
        complaints.map(async (complaint) => {
          const routings = await this.rideRoutingRepo.find({
            where: { ride_id: complaint.ride.id },
          });

          const pickup = routings.find((r) => r.type === RideLocationType.PICKUP) || null;
          const dropoff = routings.find((r) => r.type === RideLocationType.DROPOFF) || null;

          let distance_km: number | null = null;
          if (pickup && dropoff) {
            distance_km = haversineKm(
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: dropoff.latitude, longitude: dropoff.longitude },
            );
          }

          return {
            ...complaint,
            pickup_location: pickup,
            dropoff_location: dropoff,
            distance_km,
          };
        })
      );
      return {
        success: true,
        message: 'Active complaints fetched successfully.',
        data: complaintsWithLocation,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch complaints.',
        error: error.message,
      });
    }
  }

  async myComplaints(userId: number) {
    const complaints = await this.complaintsRepo.find({
      where: { created_by: userId },
      relations: ['user', 'ride', 'ride.driver'],
    });
    return {
      success: true,
      message: 'complaints fetched successfully.',
      data: complaints,
    };
  }

  async findOne(id: number) {
    try {
      const complaints = await this.complaintsRepo.findOne({
        where: { id },
        relations: ['user', 'ride', 'complaintCategory'],
      });
      if (!complaints) {
        throw new NotFoundException("Complaint not found");
      }
      const complaintsCategory = await this.complaintsCategoryRepo.findOne({
        where: { id: complaints.complaint_category_id },
      });
      const rideRoutingPickUp = await this.rideRoutingRepo.findOne({
        where: { ride_id: complaints.ride_id, type: RideLocationType.PICKUP },
      });
      const rideRoutingDropOff = await this.rideRoutingRepo.findOne({
        where: { ride_id: complaints.ride_id, type: RideLocationType.DROPOFF },
      });
      let distance_km: number | null = null;
      if (rideRoutingPickUp && rideRoutingDropOff) {
        distance_km = haversineKm(
          { latitude: rideRoutingPickUp.latitude, longitude: rideRoutingPickUp.longitude },
          { latitude: rideRoutingDropOff.latitude, longitude: rideRoutingDropOff.longitude },
        );
      }

      if (!complaints) {
        throw new NotFoundException({
          success: false,
          message: `Complaint with ID ${id} not found.`,
          data: [],
        });
      }


      return {
        success: true,
        message: `Complaint with ID ${id} fetched successfully.`,
        data: {
          complaints: complaints,
          complaintsCategory: complaintsCategory,
          pickup_location: rideRoutingPickUp,
          dropoff_location: rideRoutingDropOff,
          distance_km: distance_km,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch complaint.',
        error: error.message,
      });
    }
  }

  async delete(id: number) {
    try {
      const result = await this.findOne(id);
      const complaints = result.data.complaints;

      complaints.status = complaints.status === 0 ? 1 : 0;
      complaints.updated_at = new Date().toISOString().split('T')[0];

      await this.complaintsRepo.save(complaints);
      const messge =
        complaints.status === 0 ? 'Marked As InActive' : "'Marked As Active";
      return {
        success: true,
        message: messge,
        data: complaints,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: `Failed to delete complaint with ID ${id}.`,
        error: error.message,
      });
    }
  }
}
