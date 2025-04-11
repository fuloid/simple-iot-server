# Simple IoT Server

A lightweight IoT server implementation for managing and monitoring smart devices with MQTT support.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YOUR_TEMPLATE_ID)

## What's This?

This is a simple IoT server that provides:
- Device authentication and management
- MQTT message broker for device communication  
- Support for master (controller) and agent devices
- Token-based authentication
- Rate limiting and security features

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
- **Deployment**: [Railway](https://railway.app)

## Hosting

1. Click the "Deploy on Railway" button above
2. Configure the required environment variables:
   - `JWT_SECRET`: Secret for JWT token generation
   - `DEVICE_MASTER_SECRET_KEY`: Secret for master device registration request
   - `DEVICE_AGENT_SECRET_KEY`: Secret for agent device registration request
   - `MQTT_ADMIN_PASSWORD`: EMQX dashboard admin password

## API Endpoints

### Authentication
- `GET /auth/devices/request?uuid={deviceId}&type={master|agent}`: Request device registration

### MQTT Topics

Master devices can publish/subscribe to:
```
device/{masterUUID}/ping
device/{masterUUID}/data
device/{masterUUID}/data/{agentUUID}
```

Agent devices can publish/subscribe to:
```
device/{agentUUID}/ping
device/{agentUUID}/data
device/{masterUUID}/data/{agentUUID}
```

System can access:
```
device/+/ping
device/+/data
```

## Credits

- [EMQX](https://www.emqx.io) - MQTT Broker
- [Hono](https://hono.dev) - Web Framework  
- [Drizzle](https://orm.drizzle.team) - Database ORM
- [Bun](https://bun.sh) - JavaScript Runtime

## License

Licensed by Realzzy, do not use without permission.