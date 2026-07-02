# Smart Ride — REST API Documentation

## Base URL
- **Production:** `https://your-backend.railway.app/api`
- **Development:** `http://localhost:5000/api`

## Authentication
Most endpoints require a JWT token passed in the Authorization header.
```http
Authorization: Bearer <your_jwt_token_here>
```

## Response Format
**Success Response**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```
**Error Response**
```json
{
  "success": false,
  "message": "Error description here",
  "errorCode": "SPECIFIC_ERROR_CODE"
}
```

## Rate Limiting
| Route Group | Limit | Window |
|---|---|---|
| `/api/auth/verify-otp` | 5 req | 15 mins |
| `/api/auth/*` | 20 req | 15 mins |
| Standard Endpoints | 100 req | 15 mins |

## Status Codes Used
| Code | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET, PUT, POST |
| 201 | Created | Successful resource creation (Register, Create Sub) |
| 400 | Bad Request | Validation errors, missing fields |
| 401 | Unauthorized | Missing/Invalid JWT token |
| 403 | Forbidden | Valid token but insufficient role privileges |
| 404 | Not Found | Resource does not exist |
| 500 | Server Error | Unhandled backend exception |

---

## Modules

### AUTH MODULE (`/api/auth`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| POST `/register` | No | `{full_name, email, phone, role, password}` | `{message}` | Sends OTP |
| POST `/verify-otp` | No | `{email, otp}` | `{token, user}` | Issues JWT |
| POST `/resend-otp` | No | `{email}` | `{message}` | |
| POST `/login` | No | `{email, password}` | `{token, user}` | |
| POST `/logout` | Yes | - | `{message}` | |
| POST `/forgot-password`| No | `{email}` | `{message}` | |
| POST `/reset-password` | No | `{email, otp, new_password}` | `{message}` | |
| PUT `/change-password` | Yes | `{old_password, new_password}` | `{message}` | |
| GET `/me` | Yes | - | `{user}` | Returns current user |

### USERS MODULE (`/api/users`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| GET `/profile` | Yes | - | `{profile}` | |
| PUT `/profile` | Yes | `{full_name, phone, profile_photo}` | `{profile}` | |
| DELETE `/account` | Yes | - | `{message}` | Soft delete |
| POST `/complaints` | Yes | `{subject, description}` | `{complaint}` | |
| GET `/complaints` | Yes | - | `{complaints}` | |
| GET `/notifications` | Yes | - | `{notifications}` | |
| PUT `/notifications/:id/read` | Yes | - | `{message}` | |
| PUT `/notifications/read-all`| Yes | - | `{message}` | |
| (Plus 2 admin overrides) |

### DRIVERS MODULE (`/api/drivers`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| POST `/profile` | Driver | `{license, aadhar}` | `{profile}` | |
| GET `/profile/me` | Driver | - | `{profile, vehicle}` | |
| POST `/vehicle` | Driver | `{plate, brand, model...}` | `{vehicle}` | |
| PUT `/status` | Driver | `{is_online}` | `{message}` | |
| GET `/dashboard-stats` | Driver | - | `{stats}` | |
| GET `/assigned-passengers` | Driver | - | `{passengers}` | |
| POST `/attendance` | Driver | `{sub_id, status, type}` | `{message}` | |
| GET `/attendance/history` | Driver | - | `{history}` | |
| GET `/earnings` | Driver | - | `{earnings}` | |
| GET `/earnings/payouts` | Driver | - | `{payouts}` | |

### ROUTES MODULE (`/api/routes`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| GET `/cities` | Yes | - | `{cities}` | |
| GET `/` | Yes | `?city=X` | `{routes}` | |
| GET `/:id` | Yes | - | `{route}` | |
| POST `/` | Admin | `{city, pickup, drop...}` | `{route}` | |
| PUT `/:id` | Admin | `{details}` | `{route}` | |
| DELETE `/:id` | Admin | - | `{message}` | |
| PUT `/:id/status` | Admin | `{is_active}` | `{route}` | |

### SUBSCRIPTIONS MODULE (`/api/subscriptions`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| GET `/plans` | Yes | - | `{plans}` | |
| POST `/` | Yes | `{plan_id, route_id...}` | `{subscription}` | |
| GET `/my-subscriptions`| Yes | - | `{subscriptions}`| |
| GET `/:id` | Yes | - | `{subscription}` | |
| POST `/:id/cancel` | Yes | - | `{message}` | |
| (Admin CRUD operations - 6 endpoints) |

### PAYMENTS MODULE (`/api/payments`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| POST `/create-order` | Yes | `{subscription_id}` | `{order}` | Rzp order |
| POST `/verify` | Yes | `{rzp_data}` | `{payment}` | Verify sig |
| GET `/my-payments` | Yes | - | `{payments}` | |
| GET `/:id/invoice` | Yes | - | HTML string | Renders invoice |
| (Admin endpoints - 3 endpoints) |

### ADMIN MODULE (`/api/admin`)
Extensive module containing 25 endpoints for managing Users, Drivers, Subscriptions, Payments, Complaints, System Stats, Revenue Analytics, and Smart Matching.

| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| GET `/dashboard-stats` | Admin | - | `{stats}` | |
| GET `/drivers/unverified` | Admin | - | `{drivers}` | |
| POST `/drivers/:id/verify` | Admin | - | `{message}` | |
| GET `/smart-match/:id` | Admin | - | `{recommendations}`| Scoring |
| POST `/subscriptions/:id/assign`| Admin| `{driver_id}`| `{message}` | |
| GET `/analytics/revenue` | Admin | - | `{data}` | |
| POST `/system/broadcast`| Admin | `{message}` | `{message}` | |

### RATINGS MODULE (`/api/ratings`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| POST `/` | Yes | `{driver_id, rating, review}` | `{rating}` | Rate driver |
| GET `/driver/:id` | Yes | - | `{ratings}` | Get reviews |
| GET `/my-ratings` | Yes | - | `{ratings}` | User history |
| DELETE `/:id` | Admin| - | `{message}` | Moderation |

### PUSH NOTIFICATIONS (`/api/push`)
| Method + Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|
| GET `/public-key` | Yes | - | `{publicKey}` | |
| POST `/subscribe` | Yes | `{subscription}` | `{message}` | Save webpush sub |
| DELETE `/unsubscribe`| Yes | `{endpoint}` | `{message}` | |

## Error Reference
| Code | Status | Meaning |
|---|---|---|
| `EMAIL_EXISTS` | 400 | Email already registered |
| `INVALID_OTP` | 400 | OTP is incorrect or expired |
| `INSUFFICIENT_PERMISSIONS`| 403 | Not an admin/driver |
| `ROUTE_NOT_FOUND` | 404 | Invalid route ID requested |
| `PAYMENT_VERIFICATION_FAILED`| 400 | Razorpay signature mismatch |
