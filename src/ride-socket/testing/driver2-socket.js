const { io } = require('socket.io-client');
const DRIVER_ID = 8;

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('🟢 Driver 2 Connected');
  socket.emit('driver-register', { driverId: DRIVER_ID });
});

socket.on('new-ride-request', (data) => {
  console.log(
    '🚕 Driver 2 received new ride request:',
    data?.rideData?.success,
  );
});

socket.on('ride-accepted', (data) => {
  console.log('✅ Driver 2 - ride accepted result:', data);
});
