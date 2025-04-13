#ifndef SMSERVER_H
#define SMSERVER_H

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <queue>
#include <optional>
#include "KV.h"

struct MessageData {
  String code;
  String token;
  String ip;
};

struct Message {
  String topic;
  String rawData;
  MessageData data;
};

class SMServer {
public:
  SMServer(const char* serverHost, const char* uuid, const char* secret);
  bool begin();
  void loop();
  bool connectMQTT();
  bool requestToken(bool force = false);
  void ping(bool pong = false);
  bool isConnected();
  std::optional<Message> message();

  // Read-only accessors
  bool isRegistered() const { return _registered; }
  bool isInitialized() const { return _initialized; }

private:
  WiFiClient _wifiClient;
  PubSubClient _mqttClient;
  String _serverHost;
  String _uuid;
  String _secret;
  String _token;
  bool _registered = false;
  bool _initialized = false;

  unsigned long _lastReconnectAttempt = 0;
  unsigned long _lastPingTime = 0;

  std::queue<Message> _messageQueue;
  std::optional<Message> _currentMessage;

  HTTPClient getHttpResponse(const String& path, const String& token = "");
  bool handleExpiredToken(std::function<bool()> retryFunction);
  void subscribeToTopics();
};

#endif
