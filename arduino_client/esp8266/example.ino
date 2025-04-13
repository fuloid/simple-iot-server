#include <ESP8266WiFi.h>
#include "SMServer.h"

// WiFi credentials
const char* WIFI_SSID = "YourWiFiSSID";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Server host of the API server gateway.
const char* SERVER_HOST = "sms-example.up.railway.app";  // without http://

// Device identifier, make sure every device uuid is different!
const char* DEVICE_UUID = "d83f3248-cc83-46fb-bceb-891db3a79cce"; 

// Secret key to connect to the API server.
// Check DEVICE_<type>_SECRET_KEY in variables on railway.
// Careful for type MASTER/AGENT! (this will be used for device registration)
const char* DEVICE_SECRET = "super-secret";

// Create instance of the SMServer
SMServer smServer(SERVER_HOST, DEVICE_UUID, DEVICE_SECRET);

void setup() {
  Serial.begin(115200);
  delay(100);

  // Connect to WiFi
  unsigned int wifiConnectAttempt = 1;
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    for (int i = 0; i < 10; i++) {
      if (WiFi.status() == WL_CONNECTED) break;
      delay(1000);
      Serial.print("."); // Simulate loading
    }
    if (WiFi.status() == WL_CONNECTED) break;

    if (wifiConnectAttempt >= 3) {
      Serial.println("\nWifi connection failed for 3 attempts. Halting...");
      while (true);
    }

    Serial.print("\nWifi connection failed. Reattempting connection");
    wifiConnectAttempt++;
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  Serial.println("\nWiFi connected!");

  // Initialize SMServer
  unsigned int smServerBeginAttempt = 1;
  Serial.println("Initializing SMServer...");
  while (!smServer.begin()) {
    if (smServerBeginAttempt >= 5) {
      Serial.println("SMServer initialization failed for 5 attempts. Halting...");
      while (true);
    }

    Serial.print("SMServer initialization failed. Reattempting in 5 seconds");
    for (int i = 0; i < 5; i++) {
      delay(1000);
      Serial.print("."); // Simulate loading
    }

    smServerBeginAttempt++;
    Serial.println("\nInitializing SMServer...");
  }; // Repeat attempt until connected.

  Serial.println("SMServer initialized successfully!");
}

void loop() {
  // This handles MQTT reconnects, pinging, etc.
  smServer.loop();

  // Check for new MQTT messages
  auto msg = smServer.message();
  if (msg.has_value()) {

    String topic = msg->topic;
    String rawData = msg->rawData;
    MessageData data = msg->data;

    Serial.println("MQTT Message Received:");
    Serial.println("  - Topic: " + topic);
    Serial.println("  - Raw: " + rawData);
    Serial.println("  - Code: " + data.code);

    // Ping reply example
    if (topic.endsWith("/ping") && data.code == "PING") {
      smServer.ping(true);  // Ping call with argument true means PONG
    }
  }

  // Connection status handling
  if (!smServer.isConnected()) {
    Serial.println("MQTT not connected, waiting for reconnect...");
  }

  // Optional: Do other tasks here, safely
  delay(10); // Small delay to allow WiFi stack to breathe
}
