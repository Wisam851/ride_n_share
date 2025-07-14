const { io } = require('socket.io-client');
const USER_ID = 6;

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('👤 User 2 Connected');
  socket.emit('register', { userId: USER_ID });
});

socket.on('BOOK_RIDE_SUCCESS', (data) => {
  console.log('✅ User 2 - Ride booked:', data);
});

socket.on('ride-status-update', (data) => {
  console.log('📲 User 2 - Ride status update:', data);
});
