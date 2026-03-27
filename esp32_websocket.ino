#include <WiFi.h>
#include <WebSocketsClient.h>
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

//////////////// WEBSOCKET //////////////////
WebSocketsClient webSocket;

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
// WEBSOCKET EVENT
////////////////////////////////////////////////////
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {

  switch(type) {

    case WStype_CONNECTED:
      Serial.println("Connected to WS");
      showStatus("Online", "System Status");
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);
      Serial.println(msg);

      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, msg);
      
      if (error) {
        Serial.println("JSON Parse Error");
        return;
      }

      String msgType = doc["type"];

      ////////////////// ORDER //////////////////
      if (msgType == "ORDER") {

        totalItems = 0;
        totalAmount = doc["total"];

        JsonArray items = doc["items"];

        for (JsonObject item : items) {
          if (totalItems < 10) {
            String name = item["name"];
            int qty = item["qty"];
            lines[totalItems++] = name + " x" + String(qty);
          }
        }

        showOrder();
      }

      ////////////////// ALERT / STATUS //////////////////
      else if (msgType == "STATUS" || msgType == "ALERT") {
        String status = doc["status"];
        String from = doc.containsKey("from") ? doc["from"].as<String>() : "Notification";
        
        // e.g. from = "Kitchen", status = "Order Ready"
        // e.g. from = "Waiter", status = "Table 3 Needs Help"
        showStatus(status, from);
      }

      break;
    }

    case WStype_DISCONNECTED:
      Serial.println("Disconnected");
      showStatus("Reconnect...", "System Status");
      break;
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

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("WiFi Connected");
  showStatus("WiFi OK", "System Status");

  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

////////////////////////////////////////////////////
// LOOP
////////////////////////////////////////////////////
void loop() {
  webSocket.loop();
}

