const mqtt = require("mqtt");
const { Server } = require("socket.io");
const http = require("http");

// Connect to EMQX Cloud Broker
const mqttClient = mqtt.connect("mqtts://y12dbb61.ala.asia-southeast1.emqxsl.com:8883", {
  username: "table_T01",
  password: "scan4serve",
  clientId: "node_wrapper_" + Math.random().toString(16).substring(2, 8)
});

// Create Socket.IO Bridge for the Next.js Frontend
const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

console.log("🚀 MQTT ↔ Socket.IO Bridge running on port 8080");

mqttClient.on("connect", () => {
  console.log("✅ Connected securely to EMQX MQTT Broker");
  mqttClient.subscribe("restaurant/snmimt/#");
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
});

// 1. MQTT → Frontend (Waiters, Kitchen, Managers)
mqttClient.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`📩 MQTT IN (${topic}):`, data);
    
    // Broadcast to web dashboards
    io.emit("notification", data);
  } catch (err) {
    console.error("Invalid JSON from MQTT:", err);
  }
});

// 2. Frontend → MQTT
io.on("connection", (socket) => {
  console.log("✅ Web Client connected:", socket.id);

  socket.on("message", (data) => {
    console.log("📤 Web Client sent (Routing to MQTT):", data);

    let topic = "restaurant/snmimt/system";
    
    if (data.type === "ORDER") {
      topic = `restaurant/snmimt/table/${data.tableId || "T01"}`;
    } else if (data.type === "STATUS") {
      topic = "restaurant/snmimt/status";
    }

    // Publish into the cloud broker so ESP32 natively hears it!
    mqttClient.publish(topic, JSON.stringify(data));
  });

  socket.on("disconnect", () => {
    console.log("❌ Web Client disconnected:", socket.id);
  });
});

server.listen(8080, "0.0.0.0");
