# Smart Ride API Documentation
Base URL: `https://your-backend.railway.app/api`
Authentication: Bearer token in `Authorization` header

## Auth Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | No | `{ full_name, email, phone, password, role }` | `{ message: "Registration successful. OTP sent.", user }` |
| POST | `/auth/verify-otp` | No | `{ email, otp }` | `{ message: "OTP verified successfully.", token, user }` |
| POST | `/auth/resend-otp` | No | `{ email }` | `{ message: "New OTP sent to your email." }` |
| POST | `/auth/login` | No | `{ email, password }` | `{ message: "Login successful.", token, user }` |
| GET | `/auth/me` | Yes | None | `{ user }` |
| PATCH | `/auth/change-password` | Yes | `{ currentPassword, newPassword }` | `{ message: "Password updated successfully" }` |
| POST | `/auth/forgot-password` | No | `{ email }` | `{ message: "Password reset OTP sent." }` |
| POST | `/auth/reset-password` | No | `{ email, otp, newPassword }` | `{ message: "Password reset successfully." }` |
| POST | `/auth/logout` | Yes | None | `{ message: "Logged out successfully." }` |

## User Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/users/profile` | Yes | None | `{ profile }` |
| PATCH | `/users/profile` | Yes | `{ full_name, phone }` | `{ message: "Profile updated", profile }` |
| DELETE | `/users/account` | Yes | None | `{ message: "Account deleted" }` |
| GET | `/users/notifications` | Yes | None | `{ notifications }` |
| PATCH | `/users/notifications/:id/read` | Yes | None | `{ message: "Notification marked as read" }` |
| POST | `/users/complaints` | Yes | `{ subject, description, driver_id?, subscription_id? }` | `{ message: "Complaint registered", complaint }` |
| GET | `/users/complaints` | Yes | None | `{ complaints }` |

## Driver Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/drivers/onboard` | Driver | `{ aadhar_number, driving_license_number, address }` | `{ message: "Driver profile created", profile }` |
| GET | `/drivers/profile` | Driver | None | `{ profile }` |
| PATCH | `/drivers/profile` | Driver | `{ address }` | `{ profile }` |
| POST | `/drivers/vehicles` | Driver | `{ vehicle_type, brand, model, vehicle_number, seating_capacity }` | `{ vehicle }` |
| GET | `/drivers/vehicles` | Driver | None | `{ vehicles }` |
| PATCH | `/drivers/location` | Driver | `{ current_lat, current_lng }` | `{ message: "Location updated" }` |
| PATCH | `/drivers/status` | Driver | `{ is_available }` | `{ message: "Status updated" }` |
| POST | `/drivers/attendance` | Driver | `{ subscription_id, is_present, reason? }` | `{ attendance }` |
| GET | `/drivers/earnings` | Driver | Query: `?month=YYYY-MM` | `{ earnings, total }` |

## Routes Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/routes` | Admin | `{ route_name, pickup_location, pickup_lat, pickup_lng, drop_location, drop_lat, drop_lng, morning_pickup_time, evening_pickup_time, city }` | `{ route }` |
| GET | `/routes` | Yes | Query: `?city=Delhi` | `{ routes }` |
| GET | `/routes/:id` | Yes | None | `{ route }` |
| PUT | `/routes/:id` | Admin | `{ ...route_data }` | `{ route }` |
| PATCH | `/routes/:id/status` | Admin | `{ is_active }` | `{ message: "Route status updated" }` |
| DELETE | `/routes/:id` | Admin | None | `{ message: "Route deleted" }` |
| POST | `/routes/distance` | Admin | `{ pickup_lat, pickup_lng, drop_lat, drop_lng }` | `{ distance_km, duration_min }` |

## Subscription Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/subscriptions/plans` | Admin | `{ plan_name, plan_type, description, price, duration_days }` | `{ plan }` |
| GET | `/subscriptions/plans` | Yes | Query: `?plan_type=monthly` | `{ plans }` |
| POST | `/subscriptions` | VehicleOwner | `{ plan_id, route_id, pickup_address, drop_address, pickup_lat, pickup_lng, drop_lat, drop_lng, morning_slot, evening_slot }` | `{ subscription }` |
| GET | `/subscriptions/my-subscriptions` | VehicleOwner | None | `{ subscriptions }` |
| GET | `/subscriptions/:id` | Yes | None | `{ subscription }` |
| PATCH | `/subscriptions/:id/status` | VehicleOwner | `{ status }` (paused, cancelled) | `{ subscription }` |
| PATCH | `/subscriptions/:id/renew` | VehicleOwner | None | `{ subscription }` |

## Payment Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/payments/create-order` | VehicleOwner | `{ subscription_id }` | `{ order_id, amount, currency }` |
| POST | `/payments/verify` | VehicleOwner | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, subscription_id }` | `{ message: "Payment successful" }` |
| POST | `/payments/webhook` | None | Webhook payload | `{ status: 'ok' }` |
| GET | `/payments/my-payments` | VehicleOwner | None | `{ payments }` |
| GET | `/payments/:id/invoice` | Yes | None | HTML Invoice (returns HTML) |
| POST | `/payments/:id/refund` | Admin | `{ amount }` | `{ message: "Refund initiated" }` |

## Admin Endpoints
| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/admin/dashboard` | Admin | None | `{ online_drivers, active_subscriptions, total_revenue... }` |
| GET | `/admin/users` | Admin | Query filters | `{ users, total }` |
| PATCH | `/admin/users/:id/status` | Admin | `{ is_active }` | `{ message: "User status updated" }` |
| GET | `/admin/drivers` | Admin | Query filters | `{ drivers }` |
| PATCH | `/admin/drivers/:id/verify` | Admin | None | `{ message: "Driver verified" }` |
| POST | `/admin/assign` | Admin | `{ subscription_id, driver_id, vehicle_id }` | `{ message: "Driver assigned" }` |
| POST | `/admin/assign/bulk` | Admin | `{ assignments: [...] }` | `{ success_count, failure_count }` |
| GET | `/admin/analytics/revenue` | Admin | Query: `?start_date=&end_date=` | `{ monthly_trend, by_plan_type, by_city }` |

## Socket.io Events
For Sockets Reference check `src/socket/SOCKET_DOCS.md`

## Standard Responses
**Error Response Format**
```json
{
  "success": false,
  "message": "Error description",
  "errors": null
}
```

**Success Response Format**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

## HTTP Status Codes Used
| Code | Meaning | When used |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (creation) |
| 400 | Bad Request | Validation errors, invalid logic |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Token valid but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Data already exists (e.g., email) |
| 429 | Too Many Requests | Rate limiter triggered |
| 500 | Internal Error | Server crash, DB failure |
