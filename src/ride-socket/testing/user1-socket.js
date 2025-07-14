const { io } = require('socket.io-client');
const USER_ID = 5;

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('👤 User 1 Connected');
  socket.emit('register', { userId: USER_ID });

  setTimeout(() => {
    const rideData = {
      type: 'private',
      fare_id: 3,
      ride_km: 80,
      ride_timing: 15,
      base_fare: 1600,
      surcharge_amount: 48,
      app_fees_amount: 30,
      company_fees_amount: 80,
      driver_fees_amount: 240,
      additional_cost: 0,
      discount: 0,
      total_fare: 1758,
      routing: [
        {
          type: 'PICKUP',
          latitude: 24.8607,
          longitude: 67.0011,
        },
        {
          type: 'DROPOFF',
          latitude: 24.8999,
          longitude: 66.99,
        },
      ],
    };

    console.log('📦 User 1 sending BOOK_RIDE...');
    socket.emit('book-ride', rideData);
  }, 2000);
});

socket.on('BOOK_RIDE_SUCCESS', (data) => {
  console.log('✅ User 1 - Ride booked:', data);

  // After 3 seconds simulate driver1 accepting the ride manually in driver1.js
});

socket.on('ride-status-update', (data) => {
  console.log('📲 User 1 - Ride status update:', data);
});
