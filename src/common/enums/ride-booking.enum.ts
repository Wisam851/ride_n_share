export enum RideType {
  PRIVATE = 'private',
  CARPOOL = 'carpool',
}

export enum RideStatus {
  BOOKED = 'booked',
  ACCEPTED = 'ACCEPTED',
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED_BY_CUSTOMER = 'cancelled_by_customer',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
}

export enum RideLocationType {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  DRIVER_LOCATION = 'driver_location',
}

export enum RideBookingNotes {
  BOOKED = 'Ride Booked',
  ACCEPTED = 'Ride Accepted by Driver',
  ARRIVED = 'Driver Arrived at Pickup',
  STARTED = 'Ride Started',
  COMPLETED = 'Ride Completed',
  CANCELLED = 'Ride Cancelled',
}
