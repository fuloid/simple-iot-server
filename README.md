# Simple IoT Server

A lightweight IoT server implementation for managing and monitoring smart devices with MQTT support.

This readme only provides some explanation for the codebase that might be uncompleted. Please review the source code carefully to fully understand the architecture and functionality before making any modifications.

### ⚠️ Also note that this is not Production ready!
This server are only intended for testing and development. I do not recommend to use this for production, as this may still contains bug and vulnerability hidden in the code.

And btw, if you interested in the complex version one, why not check branch `hardcore`?

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/template/B379Yz?referralCode=4iJO-9)

- There's some important step to look before you deploy. Please check them first. ([here](#hosting))
- Also, there's a special tutorial on how to ask AI about this project, [here](#ai)!

## 🤔 What's This?

This is an IoT server that provides:
- App and device authentication & management
- MQTT message broker for device communication
- Rate limiting and security features
- Automatic device reconnection handling
- Structured logging system with prefixes
- Database migrations and ORM support
- Deploy-ready configurations (with Railway template) (some configuration might not completely set, check [here](#hosting))

## 📂 Project Structure

```yaml
├── mqtt/                  # MQTT broker (EMQX) container
│   ├── Dockerfile
│   └── docker-entrypoint.sh
└── server/                # Main API server
    ├── src/
    │   ├── controllers/   # API route handlers
    │   ├── db/            # Database schema and migrations 
    │   └── utils/         # Helper utilities
    └── package.json
```

## 🛠️ Used Services

- **API Server**: [Bun](https://bun.sh) + [Hono](https://hono.dev)
- **MQTT Broker**: [EMQX](https://www.emqx.io)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Logging**: Pino with pretty printing
- **Deployment**: [Railway](https://railway.app) (Recommended)

<a name="hosting"></a>
## 💻 Hosting

1. Click the "Deploy on Railway" button above
2. Configure the required environment variables:
   - `MQTT_ADMIN_PASSWORD`: EMQX dashboard admin password
   - `APP_USERNAME` & `APP_PASSWORD`: Username and password for user login via application
   - `DEV_USERNAME` & `DEV_PASSWORD`: Username and password for device (IoT) login
   - `DEBUG`: Set to "true" for debug logging (optional)
3. ⚠️ **Important!!** <br>After first time deploy, you must set the EMQX gateway (http) domain in order for Backend be able to access the EMQX API or the **Backend server might crash**.<br><br>Go to the `EMQX` service >> `Settings` >> `Networking` then add domain for API gateway (generate or use custom domain), then **redeploy** the Backend service.

## ♾️ Arduino Client Lib (ESP32)

A library for esp32 is available at `arduino_client/esp32` folder, including example. Currently it's untested and may contains bug or unexpected error, so be careful!

To use the library, please make sure both `SMServer.h` and `SMServer.cpp` is imported to your project folder, and install `PubSubClient` from Arduino library.

<a name="ai"></a>
## 🤖 Ask an AI
To start asking to ai (ex. Chatgpt), first host the project on railway, grab your api server url, then add path `/llms.txt`<br>
Example: `https://a-backend.up.railway.app/llms.txt`<br>
What this does, is to make sure the AI fetch the specifically made readme for AI to understand the project.

Then, go to the AI website, enable **Search** if available, paste the url, send, and let it fetch for the first time, to make sure it understand first.

Make sure the AI understand by asking few questions, and you're ready to go!

## 🌐 Endpoints

For use in application, API server will response a json format.<br>
More example can be see below.

- <a name="end-code"></a> `code`: **Result Code**<br>
This indicate for the response result.<br>
Common possible output: 
  - `OK`: Response success.
  - `UNAUTHORIZED`: You're unauthenticated (wrong credentials).
  - `FORBIDDEN`: You're not allowed to access a resource.
  - `NOT_FOUND`: The resource can not be found.
  - `NO_DATA`: Data is not available (no data).
  - `DEVICE_OFFLINE`: Action is not available (due to device is offline).
  - `ERROR`: Internal server error occured. (any unhandled exception can caused this, recommend enabling `DEBUG` mode)

- `message`: **Message / Explanation**
- `success`: **Response success `(true/false)`**

For MQTT, this may vary depending on which topic it is sent to.

### Authentication

#### User / Application
For API server, please use `Authorization` header, with basic auth (base64 data of `<username>:<password>`)<br>
Example header: `Authorization: Basic abcdef123`

For MQTT server, use that credential directly as username and password to login.

Username: provided in env `APP_USERNAME`<br>
Password: provided in env `APP_PASSWORD`

#### Device / IoT
For MQTT server, use that credential directly as username and password to login.

Username: provided in env `DEV_USERNAME`<br>
Password: provided in env `DEV_PASSWORD`

### API Server endpoints

To test the server endpoints, check `/docs` on your backend api server url.<br>
Note: API server endpoints are only meant to be accessed by user/app. For device, please use mqtt instead.

- `GET /api/login`: Check if login is correct<br>
Example output:
```json
{
    "success": true,
    "code": "OK",
    "message": "Login successful."
}
```
- `GET /api/online`: Get device online status<br>
Example output:
```json
{
    "success": true,
    "code": "OK",
    "message": "Device is online.",
    "data": {
        "online": true,
        "last_ping": "2025-04-18T00:13:16.039Z"
    }
}
```
- `GET /api/sensors`: Get current/cached sensors data<br>
Example output:
```json
{
    "success": true,
    "code": "OK",
    "message": "Sensor data retrieved successfully.",
    "data": {
        "air_temp": 30.2,
        "humidity": 64,
        "food_level": 24,
        "water_temp": 25.5,
        "water_level": 93,
        "water_acidity": 7.5,
        "water_turbidity": 0.8
    }
}
```
- `POST /api/action`: Send device an action to do<br>
Param input (application/json): `{ "action": "..." }`<br>
Valid action: `food_refill`,`water_refill`,`water_drain`<br>
Example output:
```json
{
    "success": true,
    "code": "OK",
    "message": "Action successfully sent to device."
}
```

### MQTT Topics

**Device**<br>
Device will have access based on this:
```yaml
device/ping       -- subscribe/publish
device/remote     -- subscribe
device/sensors/+  -- publish
```

**User / Application**<br>
User will have access based on this:
```yaml
device/ping       -- subscribe
device/remote     -- subscribe
device/sensors/+  -- subscribe
```

If you want to do manual ping/action, please use the API server instead.

### MQTT Commands

**Device**

All of this command are in text/string (not parsed, like json).

Topic: `/device/ping`<br>
Valid send command: `pong` (ping are only from server)
```js
// Received from server
ping

// Should response
pong
```

Topic: `/device/sensors/+` (send only)<br>
Valid sensor key: `water_temp`,`water_acidity`,`water_turbidity`,`water_level`,`air_temp`,`humidity`,`food_level`<br>
Value must be a valid float (in text/string).
```js
// Example (topic: /device/sensors/water_acidity)
2.3
```

Topic: `/device/remote` (receive only)<br>
Valid command response: `food_refill`,`water_refill`,`water_drain`
```js
// Received from server
water_refill
```

## Credits

- [EMQX](https://www.emqx.io) - MQTT Broker
- [Hono](https://hono.dev) - Web Framework  
- [Drizzle](https://orm.drizzle.team) - Database ORM
- [Bun](https://bun.sh) - JavaScript Runtime

## License & Credit

- Code made by Realzzy, with some code parts are originally from AI (ChatGPT, Claude, etc.).
- Readme is generated with help from: [ChatGPT](https://chatgpt.com)<br>
(Also originally) (Why? kind of lazy tbh goodluck!)
