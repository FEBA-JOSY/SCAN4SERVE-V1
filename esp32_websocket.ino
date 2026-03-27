#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

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
// DISPLAY ORDER
////////////////////////////////////////////////////
void showOrder() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("New Order");
  display.println("----------------");

  int y = 16;
  for (int i = 0; i < totalItems; i++) {
    display.setCursor(0, y);
    display.println(lines[i]);
    y += 12;
  }

  display.setCursor(0, 54);
  display.print("Total: ");
  display.print(totalAmount);

  display.display();
}

////////////////////////////////////////////////////
// DISPLAY STATUS
////////////////////////////////////////////////////
void showStatus(String msg) {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(10, 25);
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
      showStatus("Connected");
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);
      Serial.println(msg);

      DynamicJsonDocument doc(1024);
      deserializeJson(doc, msg);

      String type = doc["type"];

      ////////////////// ORDER //////////////////
      if (type == "ORDER") {

        totalItems = 0;
        totalAmount = doc["total"];

        JsonArray items = doc["items"];

        for (JsonObject item : items) {
          String name = item["name"];
          int qty = item["qty"];

          lines[totalItems++] = name + " x" + String(qty);
        }

        showOrder();
      }

      ////////////////// STATUS //////////////////
      else if (type == "STATUS") {
        String status = doc["status"];
        showStatus(status);
      }

      break;
    }

    case WStype_DISCONNECTED:
      Serial.println("Disconnected");
      showStatus("Reconnect...");
      break;
  }
}

////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////
void setup() {

  Serial.begin(115200);
  Wire.begin(21, 22);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setTextColor(WHITE);

  showStatus("Booting");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("WiFi Connected");
  showStatus("WiFi OK");

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
