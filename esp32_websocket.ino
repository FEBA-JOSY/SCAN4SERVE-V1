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

// THIS IS YOUR LAPTOP IP (from ipconfig)
const char* ws_host = "10.242.122.175";
const int ws_port = 8080;

//////////////// OLED //////////////////
Adafruit_SSD1306 display(128, 64, &Wire, -1);

/////////////////////////////////////////////////////
// DISPLAY
/////////////////////////////////////////////////////
void showText(String text) {
  display.clearDisplay();
  display.setCursor(0, 20);
  display.setTextSize(1);
  display.println(text);
  display.display();
}

/////////////////////////////////////////////////////
// HANDLE MESSAGE
/////////////////////////////////////////////////////
void handleMessage(String msg) {

  DynamicJsonDocument doc(1024);

  if (deserializeJson(doc, msg)) {
    showText("JSON ERROR");
    return;
  }

  String type = doc["type"];

  if (type == "ORDER_PLACED") {

    String name = doc["items"][0]["name"];
    int qty = doc["items"][0]["quantity"];
    int total = doc["total"];

    showText(name + " x" + String(qty) + "\nRs:" + String(total));
  }
}

/////////////////////////////////////////////////////
// WEBSOCKET EVENTS
/////////////////////////////////////////////////////
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {

  switch(type) {

    case WStype_CONNECTED:
      Serial.println("✅ WS CONNECTED");
      showText("WS Connected");
      break;

    case WStype_DISCONNECTED:
      Serial.println("❌ WS DISCONNECTED");
      showText("WS Disconnected");
      break;

    case WStype_TEXT:
      Serial.println("📩 DATA RECEIVED:");
      Serial.println((char*)payload);
      handleMessage(String((char*)payload));
      break;
  }
}

/////////////////////////////////////////////////////
// SETUP
/////////////////////////////////////////////////////
void setup() {

  Serial.begin(115200);
  Wire.begin(21,22);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setTextColor(WHITE);

  showText("Connecting WiFi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  showText("WiFi OK");

  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000); // Auto reconnect every 3 sec
}

/////////////////////////////////////////////////////
// LOOP
/////////////////////////////////////////////////////
void loop() {
  webSocket.loop();
}
