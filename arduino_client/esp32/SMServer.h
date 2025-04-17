#ifndef SMSERVER_H
#define SMSERVER_H

#include <WiFi.h>
#include <PubSubClient.h>

#define SM_QUEUE_SIZE 5

class SMServer {
public:
  SMServer(const char* mqttServer, uint16_t mqttPort, const char* username, const char* password);
  void begin();
  void loop();
  void reconnect();
  void publish(const char* name, float value);

  bool connected();
  bool available();
  String read();

private:
  WiFiClient wifiClient;
  PubSubClient client;

  const char* mqttServer;
  uint16_t mqttPort;
  const char* username;
  const char* password;

  char clientId[13]; // "dev-" + 8 chars
  bool clientError = false;

  void generateClientId();
  void subscribeTopics();

  static void mqttCallback(char* topic, byte* payload, unsigned int length);
  static SMServer* instance;
  void handleMessage(const String& topic, const String& payload);

    // Queue handling
  String messageQueue[SM_QUEUE_SIZE];
  int queueHead = 0;
  int queueTail = 0;
  bool queueFull = false;

  void queuePush(const String& msg);
  String queuePop();

  const char* mqttErrorString(int state);
};

#endif
