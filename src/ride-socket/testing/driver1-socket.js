const { io } = require('socket.io-client');
const DRIVER_ID = 7;
let rideId = 0;
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('driver-register', { driverId: DRIVER_ID });
  console.log('🟢 Driver 1 Connected');
});

socket.on('new-ride-request', (data) => {
  console.log(
    '🚕 Driver 1 received new ride request:',
    data?.rideData?.success,
  );
  const rideId = data?.rideData?.data?.id;
  if (rideId) {
    socket.emit('ride-accepted', {
      rideId: rideId,
      driverId: DRIVER_ID,
      lat: 24.8607,
      lng: 67.0011,
      address: 'Main Shahrah-e-Faisal, Karachi, Pakistan',
    });
  } else {
    console.log('ride not found');
  }
});

socket.on('ride-accepted', (data) => {
  console.log(
    '✅ Driver 1 - ride accepted result:',
    data?.message,
    data?.data?.id,
  );

  rideId = data?.data?.id;
  if (rideId) {
    socket.emit('ride-arrived', { rideId: rideId });
  }
});

socket.on('rider-reached', (data) => {
  console.log("✅ Driver 1 - You have arrived at the user's location.");
  console.log('📦 Ride Arrival Response:', data);

  console.log(`Ride ID: ${data.data?.id}`);
  console.log(`Message: ${data.message}`);
  rideId = data?.data?.id;
  if (rideId) {
    console.log(`Ride id ${rideId}`);
    console.log(`ride started time`);
    setTimeout(() => {
      socket.emit('ride-started', { rideId: rideId });
    });
  }
});
socket.on('rider-started-response', (data) => {
  console.log('driver 1 ride is started');
  console.log('Ride start response:', data?.data?.id);

  rideId = data?.data?.id;
  if (rideId) {
    console.log('Ride Complete Ride Id:', rideId);
    setTimeout(() => {
      socket.emit('ride-completed', { rideId: rideId });
    });
  }
});

socket.on('ride-completed-response', (data) => {
  console.log('Your Ride Is completed');
  console.log(data);
});
