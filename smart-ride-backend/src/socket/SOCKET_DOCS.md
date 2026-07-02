# Smart Ride — Socket.io Events Documentation

## Connection
URL: `ws://localhost:5000` (or your backend URL)
Auth: Pass JWT token in handshake:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});
```

## Rooms (auto-joined on connect)
| Room | Who Joins | Purpose |
|------|-----------|---------|
| `user:[userId]` | Every authenticated user | Personal notifications |
| `driver:[driverProfileId]` | Drivers only | Driver-specific events |
| `admin:global` | Admins only | Admin broadcasts + stats |
| `drivers:online` | Online drivers | Presence tracking |
| `subscription:[id]` | Driver + Passenger | Real-time ride updates |

## Events Reference
### Client → Server
| Event | Role | Payload | Description |
|-------|------|---------|-------------|
| `location:driver_update` | driver | `{ lat, lng, heading?, speed_kmh? }` | Update live location |
| `location:driver_arrived` | driver | `{ subscription_id, location_type }` | Notify arrival |
| `location:request` | vehicle_owner | `{ subscription_id }` | Request driver location |
| `ride:started` | driver | `{ subscription_id, slot }` | Mark ride started |
| `ride:completed` | driver | `{ subscription_id, slot }` | Mark ride completed |
| `ride:eta_update` | driver | `{ subscription_id, eta_minutes }` | Update ETA |
| `room:join` | any | `{ subscription_id }` | Join subscription room |
| `notification:mark_read` | any | `{ notification_id }` or `{ all: true }` | Mark notifications read |
| `admin:broadcast` | admin | `{ message, target }` | Broadcast message |
| `ping` | any | `{ timestamp }` | Health check |

### Server → Client
| Event | Who Receives | Payload | Description |
|-------|-------------|---------|-------------|
| `auth:success` | connector | `{ user }` | Connection authenticated |
| `location:broadcast` | passengers | `{ lat, lng, timestamp }` | Driver location update |
| `location:driver_arrived` | passenger | `{ message, subscription_id }` | Driver arrived |
| `location:driver_online` | admin | `{ driverProfileId }` | Driver came online |
| `location:driver_offline` | admin | `{ driverProfileId }` | Driver went offline |
| `ride:started` | passenger | `{ message, driver_name }` | Ride started |
| `ride:completed` | passenger | `{ message }` | Ride completed |
| `ride:eta_update` | passenger | `{ eta_minutes, message }` | ETA update |
| `notification:new` | user | `{ title, message, type }` | New notification |
| `notification:count` | user | `{ count }` | Unread count |
| `admin:stats_update` | admin | `{ online_drivers, active_subs... }` | Live dashboard stats |
| `admin:new_subscription` | admin | `{ subscription details }` | New subscription alert |
| `admin:new_complaint` | admin | `{ complaint details }` | New complaint alert |
| `pong` | connector | `{ timestamp, server_time }` | Ping response |
