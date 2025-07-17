const { io } = require('socket.io-client');

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoid2lzYW1AZ21haWwuY29tIiwicm9sZXMiOlsiY3VzdG9tZXIiXSwiaWF0IjoxNzUyNzU1NjQwLCJleHAiOjE3NTMzNjA0NDB9.1zFWBp4pY5lS44-bt3zXZzC_na8fyjlVzWPL-iyUB6c'; // Replace with real token from login API

const socket = io('http://localhost:3000/customer', {
  auth: {
    token: token, 
  },
});

socket.on('connect', () => {
  console.log('👤 Customer Connected with JWT');

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
        { type: 'pickup', latitude: 24.8607, longitude: 67.0011 },
        { type: 'dropoff', latitude: 24.8999, longitude: 66.99 },
      ],
    };

    console.log('📦 Customer sending BOOK_RIDE...');
    socket.emit('book-ride', rideData);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Customer Disconnected');
});

socket.on('BOOK_RIDE_SUCCESS', (data) => {
  console.log('✅ Customer 1 - Ride booked:', data);
});
socket.on('BOOK_RIDE_ERROR', (data) => {
  console.log('Customer 1 ride Booking error:', data);
});

socket.on('ride-status-update', (data) => {
  console.log('📲 Customer 1 - Ride status update:', data);
});
