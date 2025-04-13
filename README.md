# ~~Simple~~ IoT Server

A (probably) lightweight IoT server implementation for managing and monitoring smart devices with MQTT support.

This readme only provides some explanation for the codebase that might be uncompleted. Please review the source code carefully to fully understand the architecture and functionality before making any modifications.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/template/3Jbbxj?referralCode=4iJO-9)

- There's some important step to look before you deploy. Please check them first. ([here](#hosting))

## What's This?

This is an IoT server that provides:
- Device authentication and management
- MQTT message broker for device communication  
- Support for master (controller) and agent devices
- Token-based authentication with JWT
- Rate limiting and security features
- Automatic device reconnection handling
- Structured logging system with prefixes
- Database migrations and ORM support
- Deploy-ready deployment configurations

## Project Structure

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

## Used Services

- **API Server**: [Bun](https://bun.sh) + [Hono](https://hono.dev)
- **MQTT Broker**: [EMQX](https://www.emqx.io)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: JWT tokens
- **Logging**: Pino with pretty printing
- **Deployment**: [Railway](https://railway.app) (Recommended)

## Hosting

1. Click the "Deploy on Railway" button above
2. Configure the required environment variables:
   - `MQTT_ADMIN_PASSWORD`: EMQX dashboard admin password
   - `DEVICE_MASTER_SECRET_KEY`: Secret for master device registration request
   - `DEVICE_AGENT_SECRET_KEY`: Secret for agent device registration request
   - `DEBUG`: Set to "true" for debug logging (optional)
3. **Important!!** <br>After first time deploy, you must set the EMQX API Gateway domain for Backend EMQX API access or the **Backend server might crash**.<br><br>Go to the `EMQX` service >> `Settings` >> `Networking` then add domain for API gateway (generate or use custom domain), then **redeploy** the Backend service.

## Arduino Client Lib (ESP8266)

A library for esp8266 is available at `arduino_client/esp8266` folder, including example. Currently it's untested and may contains bug or unexpected error, so be careful!

To use the library, please make sure both `KV` and `SMServer` is imported to your project, and install `PubSubClient` and `ArduinoJson` from Arduino library.

## API Endpoints

Both API server and gateway will response a json format.<br>
More example can be see below.

- `c`: **Result Code**<br>
This indicate for the response result.<br>
Possible output: 
  - `OK`: Response success.
  - `FORBIDDEN`: You're unauthenticated or trying to access unallowed resource.
  - `NOT_REGISTERED`: The device isn't registered yet.
  - `ERROR`: Internal server error occured.

- `t`: **Session Token**<br>
Used to authenticate to all other endpoints/mqtt server.<br>
Can be obtained from device registration endpoint.<br>
Possible output: `JWT string`

- `ip`: **MQTT Server IP**<br>
This response is specific for API endpoint `/mqtt` when requesting server ip.<br>
Possible output: `A resolvable IP`

### Authentication
- `GET /auth/devices/request?uuid={deviceId}`<br>
Request device registration and token.<br>
Example output: `{"c":"OK","t":"eyJkZXZpY2i...M2n5I"}`<br>
**Note:** This server **does not check** for uuid device registry, and allows **any valid uuid** with valid secret key to be registered to the database. This is by default for making device registration easier. Be careful!

- `GET /mqtt`<br>
Get MQTT broker connection details.<br>
Example output: `{"c":"OK","ip":"gateway.rlwy.net:12345"}`

### MQTT Topics

**Master devices**<br>
Master devices can publish/subscribe to:
```yaml
device/{masterUUID}/ping
device/{masterUUID}/data
```
and related agent devices
```yaml
device/{agentUUID}/master
```

**Agent devices**<br>
Agent devices can publish/subscribe to:
```yaml
device/{agentUUID}/ping
device/{agentUUID}/data
device/{masterUUID}/master
```

### MQTT Commands

Currently, it only support `PING` command, but will add more soon.

**Master/Agent devices**

Topic: `/device/{deviceUUID}/ping`
```js
{"c":"PING"}

// Expect response from server: 
{"c":"PONG"}
```

## Credits

- [EMQX](https://www.emqx.io) - MQTT Broker
- [Hono](https://hono.dev) - Web Framework  
- [Drizzle](https://orm.drizzle.team) - Database ORM
- [Bun](https://bun.sh) - JavaScript Runtime

## License & Credit

- Code made by Realzzy, with some code parts are originally from AI (ChatGPT, Claude, etc.).
- 90% Readme is generated with: [ChatGPT](https://chatgpt.com)<br>
(Why? lazy tbh goodluck!)