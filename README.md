# ~~Simple~~ IoT Server

A (probably) lightweight IoT server implementation for managing and monitoring smart devices with MQTT support.

This readme only provides some explanation for the codebase that might be uncompleted. Please review the source code carefully to fully understand the architecture and functionality before making any modifications.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/template/3Jbbxj?referralCode=4iJO-9)

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

```
├── mqtt/               # MQTT broker (EMQX) container
│   ├── Dockerfile
│   └── docker-entrypoint.sh
└── server/            # Main API server
    ├── src/
    │   ├── controllers/   # API route handlers
    │   ├── db/           # Database schema and migrations 
    │   └── utils/        # Helper utilities
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
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret for JWT token generation
   - `DEVICE_MASTER_SECRET_KEY`: Secret for master device registration request
   - `DEVICE_AGENT_SECRET_KEY`: Secret for agent device registration request
   - `MQTT_SECRET_KEY`: Secret for MQTT broker authentication
   - `MQTT_ADMIN_PASSWORD`: EMQX dashboard admin password
   - `DEBUG`: Set to "true" for debug logging (optional)

## API Endpoints

### Authentication
- `GET /auth/devices/request?uuid={deviceId}`: Request device registration
- `POST /mqtt/auth`: MQTT broker authentication endpoint
- `GET /mqtt`: Get MQTT broker connection details

### MQTT Topics

**Master devices**<br>
Master devices can publish/subscribe to:
```
device/{masterUUID}/ping
device/{masterUUID}/data
```
and related agent devices
```
device/{agentUUID}/master
```

**Agent devices**<br>
Agent devices can publish/subscribe to:
```
device/{agentUUID}/ping
device/{agentUUID}/data
device/{masterUUID}/master
```

## Credits

- [EMQX](https://www.emqx.io) - MQTT Broker
- [Hono](https://hono.dev) - Web Framework  
- [Drizzle](https://orm.drizzle.team) - Database ORM
- [Bun](https://bun.sh) - JavaScript Runtime

## License & Credit

- Code made by Realzzy, with some code parts are originally from AI (ChatGPT, Claude, etc.).
- Readme fully generated with: [ChatGPT](https://chatgpt.com)<br>
(Why? lazy tbh goodluck!)