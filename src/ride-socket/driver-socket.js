const { io } = require('socket.io-client');

// connect to backend server
const socket = io('http://localhost:3000');

// when connected
socket.on('connect', () => {
  console.log('✅ Connected to server');

  socket.emit('rigister', { userId: 7 });

  socket.emit('accept-ride', {
    rideId: 28,
    driverId: 7,
    lat: 24.8607,
    lng: 67.0011,
    address: 'Main Shahrah-e-Faisal, Karachi, Pakistan',
  });
});

// when server responds
socket.on('ride-accepted', (data) => {
  console.log('Ride Accepted:', data);
});
// when disconnected
socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});
