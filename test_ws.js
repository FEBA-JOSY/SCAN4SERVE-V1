const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('✅ TEST CLIENT: Connected to server!');
  ws.send('Hebert says hello from test client');
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 1000);
});

ws.on('error', function error(err) {
  console.log('❌ TEST CLIENT: Error:', err.message);
  process.exit(1);
});
