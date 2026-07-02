# Smart Ride — Monthly Pickup & Drop Subscription Platform

## Overview
Smart Ride is a premium, monthly subscription-based cab aggregation platform designed to solve the daily commute problem for professionals and students. Instead of booking a cab every day with fluctuating prices and unreliable wait times, Smart Ride allows users to subscribe to a fixed monthly route with dedicated drivers. This guarantees a reliable, fixed-price commute experience while providing steady, predictable monthly income for drivers.

## Live Demo
- **Frontend (Commuter/Driver/Admin):** [Vercel URL]
- **Backend API:** [Railway URL]
- **API Health:** [Railway URL]/api/health

## Test Accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@smartride.in | Admin@1234 |
| Commuter | user1@test.in | User@1234 |
| Driver | driver1@test.in | Driver@1234 |

## Features

### For Commuters (vehicle_owner)
- End-to-end OTP-based authentication and secure JWT login
- Browse monthly subscription plans and designated routes
- Interactive Map-based exact pickup & drop point selection
- Real-time driver assignment tracking
- Secure Payment Gateway integration (Razorpay)
- View active and past subscriptions
- Automatic subscription renewal reminders (Push Notifications)
- Driver Rating system and reviews
- Real-time live tracking of assigned driver (Socket.io)
- File and track complaints

### For Drivers
- Secure registration and structured onboarding workflow
- Digital submission of License, Aadhar, and Vehicle details
- Status tracking (Pending/Verified)
- View assigned daily passengers and routes
- One-click daily attendance marking per passenger
- View monthly earnings and payout history
- Real-time location broadcasting to passengers
- Offline/Online toggle state

### For Admin
- Comprehensive analytics dashboard (Users, Revenue, Drivers)
- Advanced driver verification workflow with modal previews
- Smart Driver-Passenger Matching (Haversine distance + workload + rating algorithm)
- Subscription management and status overriding
- Real-time system health and broadcast messaging
- Complaint resolution dashboard
- Advanced search and filtering for all tables
- Live revenue trends and charts (Recharts)

## Tech Stack
| Category | Technology | Purpose |
|---|---|---|
| **Backend** | Node.js + Express | Fast, scalable REST API server |
| **Frontend** | React.js (CRA) | Interactive SPA architecture |
| **Styling** | Tailwind CSS + Framer Motion | Modern, responsive UI with animations |
| **Database** | PostgreSQL + pg | Relational data storage |
| **Auth** | JWT + bcrypt | Secure stateless authentication |
| **Real-time** | Socket.io | Live location and instant admin broadcasts |
| **Maps** | Google Maps API / Mappls | Route visualization and coordinate selection |
| **Payments** | Razorpay | Subscription payments and invoicing |
| **Email** | Nodemailer | Transactional emails (OTP, receipts) |
| **Push** | Web Push | Service worker based push notifications |
| **Deployment** | Railway (API) / Vercel (Web) | Serverless edge deployment |
| **Testing** | Jest + MSW + RTL | End-to-end and component unit testing |

## Project Structure
```
├── smart-ride-backend/
│   ├── src/
│   │   ├── config/      # Database config, schema, and migrations
│   │   ├── middlewares/ # Auth, RBAC, and validation middlewares
│   │   ├── modules/     # Domain logic (auth, users, drivers, etc.)
│   │   ├── socket/      # Real-time WebSockets event handlers
│   │   └── utils/       # Helpers, email, scheduler, push notifications
│   └── .env.example     # Backend environment variables template
└── smart-ride-frontend/
    ├── public/          # Static assets, manifest, PWA service worker
    ├── src/
    │   ├── api/         # Axios API clients for each backend module
    │   ├── components/  # Reusable UI components (buttons, cards, modals)
    │   ├── context/     # React Context (Auth, Socket)
    │   ├── hooks/       # Custom React hooks (useAuth, useSocket)
    │   ├── pages/       # Route-level components (Admin, Driver, User)
    │   └── tests/       # Jest and MSW testing suites
    └── tailwind.config.js # Tailwind design system configuration
```

## Getting Started (Local Development)

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### Backend Setup
1. Clone repo
2. `cd smart-ride-backend`
3. `npm install`
4. `cp .env.example .env` (Fill in DB details, Razorpay keys, Email credentials)
5. Create PostgreSQL database `smartride`
6. Run schema: `psql $DATABASE_URL -f src/config/schema.sql`
7. Run migrations:
   - `psql $DATABASE_URL -f src/config/migrations/001_add_invoice_html.sql`
   - `psql $DATABASE_URL -f src/config/migrations/002_performance_indexes.sql`
   - `psql $DATABASE_URL -f src/config/migrations/003_push_subscriptions.sql`
   - `psql $DATABASE_URL -f src/config/migrations/004_ratings.sql`
8. Run seed: `npm run seed`
9. Start dev server: `npm run dev`

### Frontend Setup
1. Clone repo
2. `cd smart-ride-frontend`
3. `npm install`
4. `cp .env.example .env` (Point API_URL to localhost:5000)
5. Generate PWA icons: `cd public/icons && npm install sharp && node generate-icons.js`
6. Start dev server: `npm start`

## API Documentation
Please refer to [API_DOCS.md](./API_DOCS.md) for full REST endpoints.

## Socket.io Events
Please refer to [src/socket/SOCKET_DOCS.md](./smart-ride-backend/src/socket/SOCKET_DOCS.md).

## Environment Variables
| Variable | Required | Description | Example |
|---|---|---|---|
| DATABASE_URL | Yes | PostgreSQL connection string | postgres://user:pass@localhost:5432/db |
| PORT | No | Backend API port | 5000 |
| JWT_SECRET | Yes | Secret for JWT signing | supersecretkey |
| FRONTEND_URL | Yes | CORS allowed origin | http://localhost:3000 |
| RAZORPAY_KEY_ID | Yes | Razorpay account Key ID | rzp_test_xxxxx |
| RAZORPAY_KEY_SECRET | Yes | Razorpay account Secret | xxxxxxxxxxxxx |
| VAPID_PUBLIC_KEY | Yes | Web Push Public Key | BE_xxxxx... |

## Database Schema
1. **users:** Core user records (email, phone, role)
2. **driver_profiles:** Driver specific onboarding details (license, aadhar)
3. **vehicles:** Driver vehicle details (plate, brand, capacity)
4. **routes:** Pre-defined serviceable routes (cities, coordinates)
5. **subscription_plans:** Available plans (pricing, features, duration)
6. **user_subscriptions:** Active/Past passenger subscriptions
7. **payments:** Transaction history and razorpay references
8. **driver_attendance:** Daily pickup status records
9. **notifications:** In-app notification history
10. **complaints:** Passenger and Driver support tickets
11. **push_subscriptions:** Browser VAPID subscription endpoints

## Deployment
### Backend (Railway)
Connected to GitHub. Pushes to `main` branch trigger automatic Railway builds via Nixpacks.
### Frontend (Vercel)
Connected to GitHub. Pushes to `main` branch trigger automatic Vercel React builds.

## Testing
- `npm test` — Run all unit and e2e test suites
- `npm run test:coverage` — Generate Istanbul coverage report
- Expected coverage > 60%

## PWA Features
- Add to Home Screen (A2HS) capabilities
- Offline fallback page (`/offline.html`)
- Static asset caching via Service Worker
- Background sync for push notifications

## Future Enhancements (Roadmap)
- Mobile apps (React Native) [High Effort]
- AI route optimization [High Effort]
- Corporate bulk subscriptions [Medium Effort]
- SOS emergency features [Medium Effort]
- Multi-language support (Hindi) [Medium Effort]
- UPI direct integration [Low Effort]
- Driver earnings wallet [Medium Effort]
- Live chat support [High Effort]

## Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
MIT License

## Author
Smart Ride Team
