#include "SMServer.h"

SMServer* SMServer::instance = nullptr;

SMServer::SMServer(const char* mqttServer, uint16_t mqttPort, const char* username, const char* password)
  : mqttServer(mqttServer), mqttPort(mqttPort), username(username), password(password), client(wifiClient) {
  instance = this;
  generateClientId();
  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqttCallback);
}

void SMServer::generateClientId() {
  const char charset[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  strcpy(clientId, "dev-");
  for (int i = 4; i < 12; i++) {
    clientId[i] = charset[random(0, sizeof(charset) - 1)];
  }
  clientId[12] = '\0';
}

void SMServer::begin() {
  reconnect();
}

void SMServer::loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}

void SMServer::reconnect() {
  while (!client.connected() && !clientError) {
    if (client.connect(clientId, username, password)) {
      subscribeTopics();
    } else {
      int state = client.state();
      if (state == 0 || state == -1) return;
      Serial.printf("Can't connect to MQTT: %s\n", mqttErrorString(state));
      if (state == 1 || state == 2 || state == 4 || state == 5) {
        Serial.println("Detected MQTT client fault. No retries will be attempted.");
        clientError = true;
        return;
      }
      delay(5000);
    }
  }
}

void SMServer::subscribeTopics() {
  client.subscribe("device/ping", 1);
  client.subscribe("device/remote", 1);
}

void SMServer::mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String payloadStr;
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  if (instance) {
    instance->handleMessage(topicStr, payloadStr);
  }
}

void SMServer::handleMessage(const String& topic, const String& payload) {
  if (topic == "device/ping" && payload == "ping") {
    client.publish("device/ping", "pong", true);
  } else if (topic == "device/remote") {
    queuePush(payload);
  }
}

void SMServer::publish(const char* name, float value) {
  char topic[64];
  snprintf(topic, sizeof(topic), "device/sensors/%s", name);

  char val[16];
  dtostrf(value, 1, 2, val);

  client.publish(topic, val, true);
}

bool SMServer::connected() {
  return client.connected();
}

bool SMServer::available() {
  return (queueHead != queueTail) || queueFull;
}

String SMServer::read() {
  if (!available()) return "";
  return queuePop();
}

// Queue helpers
void SMServer::queuePush(const String& msg) {
  messageQueue[queueTail] = msg;
  queueTail = (queueTail + 1) % SM_QUEUE_SIZE;

  if (queueTail == queueHead) {
    queueFull = true;
    queueHead = (queueHead + 1) % SM_QUEUE_SIZE; // overwrite oldest
  }
}

String SMServer::queuePop() {
  if (!available()) return "";

  String msg = messageQueue[queueHead];
  queueHead = (queueHead + 1) % SM_QUEUE_SIZE;
  queueFull = false;
  return msg;
}

const char* SMServer::mqttErrorString(int state) {
  switch (state) {
    case -4: return "Connection timed out. Retrying...";
    case -3: return "Connection lost/broken. Retrying...";
    case -2: return "Connection failed. Retrying...";
    case 1: return "Server does not support client version.";
    case 2: return "Client got rejected.";
    case 3: return "Server unavailable. Retrying...";
    case 4: return "Invalid credentials. Please recheck.";
    case 5: return "Not authorized. Please recheck.";
    default: return "Unknown error. Retrying...";
  }
}