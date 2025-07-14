const { io } = require('socket.io-client');
const USER_ID = 5;

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('👤 User 1 Connected');
  socket.emit('register', { userId: USER_ID });

  setTimeout(() => {
    const rideData = {
      type: 'private',
      ride_km: 20,
      ride_timing: 30,
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
    socket.emit('BOOK_RIDE', rideData);
  }, 2000);
});

socket.on('BOOK_RIDE_SUCCESS', (data) => {
  console.log('✅ User 1 - Ride booked:', data);

  // After 3 seconds simulate driver1 accepting the ride manually in driver1.js
});

socket.on('ride-status-update', (data) => {
  console.log('📲 User 1 - Ride status update:', data);
});
