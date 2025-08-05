export const SOCKET_EVENTS = {
  // registration
  DRIVER_REGISTER: 'driver-register',
  CUSTOMER_REGISTER: 'customer-register',

  // matching flow
  REQUEST_RIDE: 'request-ride', // in: customer
  RIDE_REQUEST_CREATED: 'ride-request-created', // out: ack to customer
  RIDE_REQUEST_BROADCAST: 'ride-request', // out: to drivers (short name for mobile)
  OFFER_RIDE: 'offer-ride', // in: driver
  RIDE_OFFERS_UPDATE: 'ride-offers-update', // out: to customer
  CONFIRM_DRIVER: 'confirm-driver', // in: customer picks driver
  RIDE_CONFIRMED: 'ride-confirmed', // out: to customer + selected driver
  RIDE_EXPIRED: 'ride-expired', // out: when TTL passes

  // ride lifecycle (after booking)
  RIDE_ARRIVED: 'ride-arrived',
  RIDER_REACHED: 'rider-reached', // optional generic push
  RIDE_STARTED: 'ride-started',
  RIDE_COMPLETED: 'ride-completed',
  RIDE_CANCELLED: 'ride-cancelled',
  RIDE_STATUS_UPDATE: 'ride-status-update', // optional generic push

  RIDE_SUMMARY: 'ride-summary', // out: ride summary after completion
  RIDE_SUMMARY_RESPONSE: 'ride-summary-response', // out: ride summary after completion

  RIDE_ERROR: 'ride-error', // generic error during ride lifecycle
  OFFER_SUCCESS: 'offer-success',
  OFFER_ERROR: 'offer-error',
  UNAUTHORIZED: 'unauthorized',
} as const;
