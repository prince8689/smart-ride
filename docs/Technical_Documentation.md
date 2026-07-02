# Technical Documentation

## Project: Smart Ride – Monthly Pickup & Drop Subscription Platform

### 1. Architecture Overview
The platform follows a traditional Client-Server architecture utilizing a RESTful API and a real-time Socket.io layer for live updates.
* **Frontend**: React.js Single Page Application (SPA) with Tailwind CSS, configured as a Progressive Web App (PWA).
* **Backend**: Node.js with Express framework.
* **Database**: PostgreSQL (relational DB ideal for structured financial and user data).
* **Real-time Layer**: Socket.IO for live driver location tracking and instant notifications.

### 2. Technology Stack
#### Frontend:
* **Framework**: React 19 + React Router v7
* **Styling**: Tailwind CSS + Framer Motion (for animations)
* **Icons**: Lucide React
* **State Management**: React Context API
* **Maps**: Google Maps API (fallback ready for Mappls API)
* **Charts**: Recharts

#### Backend:
* **Runtime**: Node.js (v18+)
* **Framework**: Express.js
* **Database**: PostgreSQL with `pg` module
* **Authentication**: JSON Web Tokens (JWT) & Bcryptjs
* **Real-Time**: Socket.IO
* **Payments**: Razorpay Node SDK
* **Notifications**: Web-Push (VAPID) and Nodemailer
* **Security**: Helmet, Express-Rate-Limit, Custom sanitization middleware

### 3. Database Schema Overview
The database uses a robust relational schema:
* **users**: Stores authentication details, roles (admin, user, driver), and contact info.
* **driver_profiles**: Extended profile for drivers containing KYC (license, aadhar) and verification status.
* **vehicles**: Registered vehicles linked to drivers.
* **subscription_plans**: Admin-defined tier pricing (e.g., Monthly Basic, Yearly Premium).
* **routes**: Admin-defined geofenced pickup/drop areas.
* **user_subscriptions**: Link between user, plan, route, and assigned driver.
* **payments**: Razorpay transaction logs linked to subscriptions.
* **driver_attendance**: Daily logs for morning/evening trips per passenger.
* **driver_ratings**: passenger feedback for completed trips.
* **complaints**: User support tickets.
* **notifications**: Centralized system alerts.

### 4. API Endpoints Summary (REST)
All sensitive endpoints require a Bearer JWT Token in the `Authorization` header.

#### 4.1 Authentication (`/api/auth`)
* `POST /register`: Create new user.
* `POST /login`: Authenticate and return JWT.
* `POST /verify-otp`: Validate email OTP.
* `POST /change-password`: Update authenticated user password.

#### 4.2 User Operations (`/api/users` & `/api/subscriptions`)
* `GET /profile`: Get logged-in user profile.
* `PUT /profile`: Update profile info.
* `POST /subscriptions`: Create a new subscription.
* `GET /subscriptions`: List active subscriptions.
* `POST /payments/create-order`: Generate Razorpay order ID.
* `POST /payments/verify`: Confirm successful Razorpay payment.

#### 4.3 Driver Operations (`/api/drivers`)
* `POST /profile`: Submit KYC for verification.
* `GET /dashboard`: Daily stats and passenger counts.
* `GET /passengers`: List assigned passengers for the day.
* `POST /attendance`: Mark passenger pickup/drop status.
* `GET /earnings`: Retrieve calculated payout based on 80% revenue share.
* `PATCH /location`: REST fallback for location tracking.

#### 4.4 Admin Operations (`/api/admin`)
* `GET /dashboard`: Platform-wide stats (MRR, active users).
* `GET /users`, `GET /drivers`: Directory listing and management.
* `POST /assign-driver`: Map an active subscription to a driver/vehicle.
* `POST /broadcast`: Trigger bulk push notifications.

### 5. Real-Time Socket Architecture
The system uses `Socket.IO` attached to the Express server for real-time capabilities.
* **Connection**: Authenticated via JWT handshake.
* **Rooms**: 
  * `user:<user_id>`: Private room for user-specific alerts.
  * `driver:<driver_id>`: Private room for driver-specific alerts.
  * `admin`: Broadcast room for admin dashboard live updates.
  * `ride:<subscription_id>`: Dedicated channel for a specific passenger-driver pair.
* **Key Events**:
  * `driver:location`: Driver emits lat/lng. Broadcasts to assigned passengers.
  * `driver:arrived`: Driver reaches pickup point. Triggers push notification to user.
  * `ride:started` / `ride:completed`: Trip status updates.
  * `notification:new`: Immediate delivery of system alerts to active users.

### 6. Security Implementation
* **Helmet**: Sets secure HTTP headers (X-Frame-Options, Content-Security-Policy).
* **Rate Limiting**: Dedicated limits for `/auth` (brute-force prevention) and general API.
* **Data Sanitization**: Custom middleware to deeply clean `req.body` and `req.query` avoiding XSS and SQL injection characters.
* **Role-Based Access Control (RBAC)**: Middleware strictly isolates routes to `user`, `driver`, or `admin` roles.

### 7. Deployment Configuration
* **Frontend**: Optimized for Vercel/Netlify. Contains `vercel.json` with route rewriting rules to support React Router SPAs.
* **Backend**: Optimized for Railway. Includes `railway.json` and `nixpacks.toml` to automatically manage the Node.js environment and startup commands.
* **Database**: PostgreSQL hosted on Railway, automatically seeded via startup scripts.

### 8. Development Setup Guide
1. Clone the repository.
2. Inside `/smart-ride-backend`:
   * Run `npm install`
   * Copy `.env.example` to `.env` and fill in DB credentials and API keys.
   * Run `npm run db:init` and `npm run seed` to setup schema and dummy data.
   * Run `npm run dev` to start server on port 5000.
3. Inside `/smart-ride-frontend`:
   * Run `npm install`
   * Verify `.env.development` points to `localhost:5000`.
   * Run `npm start` to launch React dev server.
