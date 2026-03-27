#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
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

//////////////// MQTT (EMQX SECURE) //////////////////
const char* mqtt_server = "y12dbb61.ala.asia-southeast1.emqxsl.com";
const int mqtt_port = 8883;
const char* mqtt_user = "table_T01";
const char* mqtt_pass = "scan4serve";
const char* client_id = "esp32_table_01_secure"; // Must be unique

//////////////// TOPICS //////////////////
const char* topic_all = "restaurant/snmimt/#";
const char* topic_status = "restaurant/snmimt/status";
const char* topic_order = "restaurant/snmimt/table/T01";

WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

//////////////// OLED //////////////////
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

//////////////// DATA //////////////////
String lines[10];
int totalItems = 0;
int totalAmount = 0;

////////////////////////////////////////////////////
// OLED FUNCTIONS
////////////////////////////////////////////////////
void showIntro() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(10, 10);
  display.println("Scan4Serve");
  display.setTextSize(1);
  display.setCursor(20, 40);
  display.println("MQTT Cloud Link");
  display.display();
  delay(2000);
}

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
    if (y >= 54) break; 
  }

  display.setCursor(0, 54);
  display.print("Total: ");
  display.print(totalAmount);
  display.display();
}

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
// MQTT CALLBACK
////////////////////////////////////////////////////
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to String
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("📩 MQTT IN [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("JSON Parse Error");
    return;
  }

  String msgType = doc["type"].as<String>();

  ////////////////// ORDER //////////////////
  if (msgType == "ORDER") {
    totalItems = 0;
    totalAmount = doc["total"].as<int>();
    JsonArray items = doc["items"].as<JsonArray>();

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
    String status = doc["status"].as<String>();
    String from = doc.containsKey("from") ? doc["from"].as<String>() : "Notification";
    showStatus(status, from);
  }
}

////////////////////////////////////////////////////
// MQTT RECONNECT
////////////////////////////////////////////////////
void reconnect() {
  while (!mqtt.connected()) {
    Serial.print("Attempting Secure MQTT connection...");
    showStatus("Connecting...", "EMQX Cloud");
    
    if (mqtt.connect(client_id, mqtt_user, mqtt_pass)) {
      Serial.println("✅ connected!");
      showStatus("MQTT Linked", "System Status");
      
      // Subscribe to cloud topics
      mqtt.subscribe(topic_order);
      mqtt.subscribe(topic_status);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
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
    Serial.print("ESP IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WIFI FAILED");
    showStatus("WiFi FAIL", "System Error");
    return;
  }

  // Bypass SSL Certificate validation so it connects directly
  espClient.setInsecure();

  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      reconnect();
    }
    mqtt.loop();
  }
}
