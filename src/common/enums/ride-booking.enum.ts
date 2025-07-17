export enum RideType {
  PRIVATE = 'private',
  CARPOOL = 'carpool',
}

export enum RideStatus {
  REQUESTED = 'requested', // customer asked for a ride; no driver yet
  DRIVER_OFFERED = 'driver_offered', // at least one driver responded (not final)
  CUSTOMER_SELECTED = 'customer_selected', // customer picked a driver (pending confirm?) optional
  CONFIRMED = 'confirmed', // ride is now official (was BOOKED)
  DRIVER_EN_ROUTE = 'driver_en_route', // optional alias for ARRIVED flow
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED_BY_CUSTOMER = 'cancelled_by_customer',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
  EXPIRED = 'expired', // request timed out before confirm
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
