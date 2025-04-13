#include "SMServer.h"

SMServer::SMServer(const char* serverHost, const char* uuid, const char* secret)
  : _mqttClient(_wifiClient), _uuid(uuid), _serverHost(serverHost), _secret(secret) {
  
  _mqttClient.setKeepAlive(30);
  _mqttClient.setCallback([this](char* topic, byte* payload, unsigned int length) {
    String msg;
    for (unsigned int i = 0; i < length; i++) {
      msg += (char)payload[i];
    }

    Message m;
    m.topic = String(topic);
    m.rawData = msg;

    DynamicJsonDocument doc(256);
    DeserializationError err = deserializeJson(doc, msg);
    if (!err) {
      if (doc.containsKey("c")) {
        m.data.code = doc["c"].as<String>();
        m.data.code.toLowerCase();
      }
      if (doc.containsKey("t")) m.data.token = doc["t"].as<String>();
      if (doc.containsKey("ip")) m.data.ip = doc["ip"].as<String>();
    }

    // Enforce max queue size
    if (_messageQueue.size() >= 5) {
      _messageQueue.pop(); // Remove oldest
    }

    _messageQueue.push(m);
  });
}

bool SMServer::begin() {
  if (_initialized) return true;
  KV.begin();

  _token = KV.get("t");
  if (_token == "") {
    if (!requestToken(true)) {
      Serial.println("Token request failed during begin()");
      return false;
    }
  } else {
    _registered = true;
  }

  if (!connectMQTT()) {
    Serial.println("MQTT connection failed during begin()");
    return false;
  }

  _initialized = true;
  return true;
}

void SMServer::loop() {
  if (!_initialized) {
    Serial.println("Client not initialized. Call begin() first.");
    return;
  }

  if (!_mqttClient.connected()) {
    Serial.println("MQTT disconnected. Attempting reconnection...");
    unsigned long now = millis();
    if (now - _lastReconnectAttempt > 5000) {
      _lastReconnectAttempt = now;
      if (connectMQTT()) {
        Serial.println("MQTT reconnected. Sending ping...");
        subscribeToTopics();
        ping();
      } else {
        Serial.println("MQTT reconnect failed.");
      }
    }
  } else {
    _mqttClient.loop();
    unsigned long now = millis();
    if (now - _lastPingTime > 15000) {
      ping();
      _lastPingTime = now;
    }
  }
}

void SMServer::ping(bool pong) {
  String command = pong ? "PONG" : "PING";
  String payload = "{\"c\":\"" + command + "\"}";
  _mqttClient.publish(("device/" + _uuid + "/ping").c_str(), payload.c_str());
}

void SMServer::subscribeToTopics() {
  _mqttClient.subscribe(("device/" + _uuid + "/ping").c_str());
}

bool SMServer::connectMQTT() {
  HTTPClient http = getHttpResponse("/mqtt", _token);
  int httpCode = http.GET();
  if (httpCode != 200) {
    http.end();
    return false;
  }

  String response = http.getString();
  Serial.println("MQTT IP response: " + response);
  http.end();

  DynamicJsonDocument doc(256);
  deserializeJson(doc, response);
  if (doc["c"] != "OK") return false;

  String ipPort = doc["ip"];
  int sep = ipPort.indexOf(':');
  String host = ipPort.substring(0, sep);
  int port = ipPort.substring(sep + 1).toInt();

  _mqttClient.setServer(host.c_str(), port);
  Serial.println("Connecting to MQTT at " + host + ":" + String(port));
  String clientId = String(random(0xffff), HEX);
  if (!_mqttClient.connect(clientId.c_str(), ("device_" + _uuid).c_str(), _token.c_str())) {
    Serial.println("MQTT connect failed");
    return false;
  }

  Serial.println("MQTT connected");
  subscribeToTopics();

  return true;
}

bool SMServer::requestToken(bool force) {
  HTTPClient http = getHttpResponse("/auth/devices/request?uuid=" + _uuid, force ? _secret : _token);
  int httpCode = http.GET();
  String response = http.getString();
  Serial.println("Token request response: " + response);
  http.end();

  if (httpCode != 200) return false;

  DynamicJsonDocument doc(256);
  deserializeJson(doc, response);

  String code = doc["c"];
  if (code == "OK") {
    String newToken = doc["t"];
    if (newToken != "") {
      _registered = true;
      _token = newToken;
      KV.set("t", _token);
      return true;
    }
  } else if (code == "NOT_REGISTERED") {
    _registered = false;
    KV.remove("t");
  }

  return false;
}

HTTPClient SMServer::getHttpResponse(const String& path, const String& token) {
  HTTPClient http;
  String url = "http://" + _serverHost + path;
  http.begin(_wifiClient, url);

  String finalToken = token != "" ? token : _token;
  if (finalToken != "") {
    http.addHeader("Authorization", "Bearer " + finalToken);
  }

  return http;
}

bool SMServer::handleExpiredToken(std::function<bool()> retryFunction) {
  if (requestToken(true)) {
    return retryFunction();
  }
  Serial.println("Token refresh failed.");
  return false;
}

bool SMServer::isConnected() {
  return _mqttClient.connected();
}

std::optional<Message> SMServer::message() {
  if (!_messageQueue.empty()) {
    _currentMessage = _messageQueue.front();
    _messageQueue.pop();
    return _currentMessage;
  }
  return std::nullopt;
}
