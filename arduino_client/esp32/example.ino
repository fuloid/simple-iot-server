#include <WiFi.h>
#include "SMServer.h"

const char* ssid = "YOUR_SSID";
const char* pass = "YOUR_PASS";

SMServer Server(
  "any.proxy.rlwy.net", // Proxy ip address or domain name
  12345, // Proxy port
  "username", // Username
  "password" // Password
);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");

  Server.begin();
}

void loop() {
  Server.loop();

  if (Server.available()) {
    String message = Server.read();
    Serial.println("Received from device/remote: " + message);

    // Do something with the message
  }

  // Example publish
  Server.publish("light", 3.14);

  delay(10); // Small delay to allow WiFi stack to breathe
}
