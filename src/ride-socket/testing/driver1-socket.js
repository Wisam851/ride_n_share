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
    setTimeout(() => {
      socket.emit('ride-accepted', {
        rideId: rideId,
        driverId: DRIVER_ID,
        lat: 24.8607,
        lng: 67.0011,
        address: 'Main Shahrah-e-Faisal, Karachi, Pakistan',
      });
    }, 2000);
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
    setTimeout(() => {
      socket.emit('ride-arrived', {
        rideId: rideId,
      });
    }, 2000);
  }
});

socket.on('rider-reached', (data) => {
  console.log("✅ Driver 1 - You have arrived at the user's location.");
  console.log('📦 Ride Arrival Response:', data);

  if (data.success) {
    console.log(`Ride ID: ${data.data?.id}`);
    console.log(`Message: ${data.message}`);
    rideId = data?.data?.id;
    if (rideId) {
      console.log(`Ride id ${rideId}`);
      setTimeout(() => {
        console.log(`ride started time`);
        socket.emit(
          'ride-started',
          {
            rideId: rideId,
          },
          2000,
        );
      });
    }
  }
});
socket.on('rider-started-response', (data) => {
  console.log("driver 1 ride is started");
  console.log('Ride start response:', data);
});
