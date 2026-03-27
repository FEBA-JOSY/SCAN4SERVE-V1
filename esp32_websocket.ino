#include <WiFi.h>
#include <SocketIOclient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

/*
  =========================================
  HARDWARE CONNECTIONS (I2C):
  - SSD1306 SDA -> ESP32 GPIO 21
  - SSD1306 SCL -> ESP32 GPIO 22
  - SSD1306 VCC -> 3.3V
  - SSD1306 GND -> GND
  =========================================
*/

//////////////// WIFI //////////////////
const char* ssid = "Gojo";
const char* password = "gojo5710";

//////////////// SOCKET.IO //////////////////
SocketIOclient socketIO;

// 👉 CHANGE THIS ONLY IF IP CHANGES
const char* ws_host = "10.242.122.175";
const int ws_port = 8080;

//////////////// OLED //////////////////
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

//////////////// ORDER //////////////////
String lines[10];
int totalItems = 0;
int totalAmount = 0;

////////////////////////////////////////////////////
// INTRO SCREEN
////////////////////////////////////////////////////
void showIntro() {
  display.clearDisplay();

  display.setTextSize(2);
  display.setCursor(10, 10);
  display.println("Scan4Serve");

  display.setTextSize(1);
  display.setCursor(20, 40);
  display.println("Smart Dining");

  display.display();
  delay(2000);
}

////////////////////////////////////////////////////
// DISPLAY ORDER
////////////////////////////////////////////////////
void showOrder() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("New Order Received");
  display.println("----------------");

  int y = 16;
  for (int i = 0; i < totalItems; i++) {
    display.setCursor(0, y);
    display.println(lines[i]);
    y += 12;
    // Prevent drawing past screen
    if (y >= 54) break; 
  }

  display.setCursor(0, 54);
  display.print("Total: ");
  display.print(totalAmount);

  display.display();
}

////////////////////////////////////////////////////
// DISPLAY STATUS (KITCHEN / WAITER UPDATES)
////////////////////////////////////////////////////
void showStatus(String msg, String title = "") {
  display.clearDisplay();
  
  if (title != "") {
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println(title);
    display.println("----------------");
    display.setTextSize(2);
    display.setCursor(0, 25);
  } else {
    display.setTextSize(2);
    display.setCursor(10, 25);
  }
  
  display.println(msg);
  display.display();
}

////////////////////////////////////////////////////
// SOCKET.IO EVENT
////////////////////////////////////////////////////
void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {

  switch(type) {

    case sIOtype_CONNECT:
      Serial.println("Connected to Socket.IO Server");
      socketIO.send(sIOtype_CONNECT, "/"); // Join default namespace
      showStatus("Online", "System Status");
      break;

    case sIOtype_DISCONNECT:
      Serial.println("Socket.IO Disconnected");
      showStatus("Reconnect...", "System Status");
      break;

    case sIOtype_EVENT: {
      String msg = String((char*)payload);
      Serial.println("Received: " + msg);

      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, payload);
      
      if (error) {
        Serial.println("JSON Parse Error");
        return;
      }

      // Socket.io events wrap data inside an array: ["eventName", { data object }]
      String eventName = doc[0].as<String>();
      JsonObject data = doc[1].as<JsonObject>();

      if (eventName == "message" || eventName == "notification") {
        
        String msgType = data["type"].as<String>();

        ////////////////// ORDER //////////////////
        if (msgType == "ORDER") {

          totalItems = 0;
          totalAmount = data["total"].as<int>();

          JsonArray items = data["items"].as<JsonArray>();

          for (JsonObject item : items) {
            if (totalItems < 10) {
              String name = item["name"].as<String>();
              int qty = item["qty"].as<int>();
              lines[totalItems++] = name + " x" + String(qty);
            }
          }

          showOrder();
        }

        ////////////////// ALERT / STATUS //////////////////
        else if (msgType == "STATUS" || msgType == "ALERT") {
          String status = data["status"].as<String>();
          String from = data.containsKey("from") ? data["from"].as<String>() : "Notification";
          showStatus(status, from);
        }
      }

      break;
    }
  }
}

////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////
void setup() {

  Serial.begin(115200);
  Wire.begin(21, 22);

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.setTextColor(WHITE);

  showIntro();
  showStatus("Booting...", "System Status");

  Serial.println("Connecting WiFi...");
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n===== WIFI CONNECTED =====");
    showStatus("WiFi OK", "System Status");
    
    // Step 1 Debugging: Print ESP IP Address
    Serial.print("\nESP IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WIFI FAILED");
    showStatus("WiFi FAIL", "System Error");
    return;   // STOP here (important)
  }

  // socketIO.begin connects to standard socket.io server instances running on path "/socket.io/?EIO=4"
  socketIO.begin(ws_host, ws_port, "/socket.io/?EIO=4");
  Serial.println("Trying Socket.IO connection to: " + String(ws_host) + ":" + String(ws_port));
  
  socketIO.onEvent(socketIOEvent);
}

// Timer for the debug ping
unsigned long lastDebugPrint = 0;

////////////////////////////////////////////////////
// LOOP
////////////////////////////////////////////////////
void loop() {
  socketIO.loop();

  // Print alive state every 5 seconds to avoid flooding terminal
  if (socketIO.isConnected()) {
    if (millis() - lastDebugPrint > 5000) {
      Serial.println("Socket.IO Connected Alive");
      lastDebugPrint = millis();
    }
  }
}
