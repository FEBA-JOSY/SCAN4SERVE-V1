const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

console.log("🚀 WebSocket Server running on ws://0.0.0.0:8080");

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("📩 Incoming:", data);

      // Broadcast to ALL (ESP + kitchen + waiter)
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (e) {
      console.error("Invalid JSON received");
    }
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});
