const { Server } = require("socket.io");
const http = require("http");

// Create standard HTTP server
const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

console.log("🚀 Socket.IO Server running on port 8080");

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // When your Next.js app sends an update, tell the ESP32
  socket.on("message", (data) => {
    console.log("📩 Incoming:", data);
    
    // Broadcast to ALL connected clients (ESP32, waiters, etc)
    io.emit("notification", data); 
    // Wait, earlier I set ESP32 to expect "notification" for arrays!
    // In esp32 code: if (eventName == "notification") ...
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

server.listen(8080, "0.0.0.0");
