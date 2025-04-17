# Simple IoT Server

A lightweight IoT server implementation for managing and monitoring smart devices with MQTT support.

This readme only provides some explanation for the codebase that might be uncompleted. Please review the source code carefully to fully understand the architecture and functionality before making any modifications.

### ⚠️ Also note that this is not Production ready!
This server are only intended for testing and development. I do not recommend to use this for production, as this may still contains bug and vulnerability hidden in the code.

And btw, if you interested in the complex version one, why not check branch `hardcore`?

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/template/3Jbbxj?referralCode=4iJO-9)

- There's some important step to look before you deploy. Please check them first. ([here](#hosting))

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

## ♾️ Arduino Client Lib (ESP8266)

A library for esp32 is available at `arduino_client/esp32` folder, including example. Currently it's untested and may contains bug or unexpected error, so be careful!

To use the library, please make sure both `KV` and `SMServer` is imported to your project, and install `PubSubClient` from Arduino library.

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

### Authentication

#### User / Application
For API server, please use `Authorization` header, with basic auth (base64 data of `<username>:<password>`)

For MQTT server, use that credential directly as username and password to login.

Username: provided in env `APP_USERNAME`<br>
Password: provided in env `APP_PASSWORD`

#### Device / IoT
For MQTT server, use that credential directly as username and password to login.

Username: provided in env `DEV_USERNAME`<br>
Password: provided in env `DEV_PASSWORD`

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
