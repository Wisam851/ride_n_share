const { io } = require('socket.io-client');
const DRIVER_ID = 7;

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('🟢 Driver 1 Connected');
  socket.emit('register', { driverId: DRIVER_ID });
});

socket.on('new-ride-request', (data) => {
  console.log('🚕 Driver 1 received new ride request:', data);
});

socket.on('ride-accepted', (data) => {
  console.log('✅ Driver 1 - ride accepted result:', data);
});
setTimeout(() => {
  socket.emit('accept-ride', {
    rideId: 30, 
    driverId: DRIVER_ID,
    lat: 24.8607,
    lng: 67.0011,
    address: 'Main Shahrah-e-Faisal, Karachi, Pakistan',
  });
}, 10000);
