const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket Server running on port ${port}`);

wss.on('connection', function connection(ws, req) {
    console.log("✅ New client connected from:", req.socket.remoteAddress);

    ws.on('message', function incoming(message) {
        console.log("📩 Received:", message.toString());

        // broadcast to all clients (ESP32 + web)
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});
