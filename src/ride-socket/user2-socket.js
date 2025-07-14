const { io } = require("socket.io-client");

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Conected to server');

  socket.emit('rigister', { userId: 5 });
});

socket.on('ride-status-update', (data) => {
  console.log('📲 Customer Update:', data);
});
