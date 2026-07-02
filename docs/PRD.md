# Product Requirements Document (PRD)

## Project Name: Smart Ride – Monthly Pickup & Drop Subscription Platform

### 1. Introduction
The **Smart Ride** platform is a subscription-based transportation solution specifically designed to address the daily commuting struggles of office employees, students, and regular travelers. By offering long-term contracts (monthly, quarterly, yearly), the platform ensures fixed pickup/drop timings, reliable vehicles, the same drivers daily, and predictable pricing. This eliminates the uncertainty of daily ride-hailing services.

### 2. Problem Statement
Daily commuters currently face several key problems with on-demand ride services:
* **Unpredictability**: Inconsistent cab availability, especially during peak hours.
* **Pricing Fluctuations**: Surge pricing making regular travel expensive and unpredictable.
* **Safety Concerns**: Traveling with different, unknown drivers and vehicles every day.
* **Time Inefficiency**: Wasted time booking rides every single morning/evening.

### 3. Objectives
**Primary Objectives:**
* Provide reliable and fixed daily pickup & drop services.
* Ensure consistency with the same driver and vehicle.
* Offer predictable pricing through subscription plans.
* Eliminate the dependency on daily ride bookings.

**Secondary Objectives:**
* Improve commuter safety through trusted, verified drivers.
* Enable steady recurring revenue via subscriptions.
* Simplify management for users, drivers, and administrators.
* Provide long-term engagement for driver partners.

### 4. Scope
#### In-Scope:
* User registration and subscription plan management.
* Fixed route, driver, and vehicle allocation.
* Online payment gateway integration and automated invoicing.
* Push notifications and status alerts (e.g., driver arrived, ride started).
* Comprehensive Admin monitoring and support system.
* Driver tracking and attendance management.

#### Out of Scope:
* On-demand or ad-hoc ride booking.
* Inter-city travel or cargo services.
* Real-time fare negotiation.

### 5. Functional Requirements
#### 5.1 User Module
* **Authentication**: Signup/Login via email with OTP verification.
* **Profile**: Management of personal details and default pickup/drop locations.
* **Subscription Management**: Ability to view, purchase, pause, resume, and cancel plans (monthly/quarterly/yearly).
* **Ride Tracking**: Visibility of fixed schedules, assigned driver details, vehicle details, and live driver tracking via map.
* **Payments & Billing**: Online payments (via Razorpay), viewing transaction history, and downloading invoices.
* **Notifications**: Alerts for driver arrival, trip updates, and subscription renewals.
* **Complaints**: Ability to raise support tickets/complaints.

#### 5.2 Driver Module
* **Onboarding**: Registration and submission of KYC documents (Aadhar, PAN, Driving License) for verification.
* **Vehicle Management**: Registering primary vehicle details.
* **Dashboard**: Viewing assigned daily routes and active passenger list.
* **Attendance**: Tracking daily morning/evening trips, marking passengers as picked up/dropped off, or missed.
* **Location Sharing**: Live broadcasting of GPS location to assigned passengers.
* **Earnings**: Dashboard showing subscription revenue share (e.g., 80% payout), payment records, and monthly trends.

#### 5.3 Admin Module
* **User Management**: Overseeing registered commuters and managing their status.
* **Driver Management**: Verifying driver KYC documents, approving drivers, and tracking driver metrics.
* **Subscription & Route Control**: Defining available subscription plans, assigning drivers to routes and users.
* **Customer Support**: Managing and resolving user complaints.
* **Analytics**: Dashboard for tracking Key Performance Indicators (KPIs) like MRR, active users, and driver utilization.
* **Broadcast**: Sending push notifications to specific users or drivers.

### 6. Non-Functional Requirements
* **Performance**: Fast API response times (< 3 seconds) and lightweight frontend.
* **Security**: JWT-based authentication, password hashing (Bcrypt), secure payment handoffs, input sanitization against SQLi/XSS.
* **Usability**: Mobile-first responsive UI built with Tailwind CSS, supporting Progressive Web App (PWA) features for mobile installability.
* **Availability**: Hosted on reliable infrastructure (Railway/Vercel) aiming for 99.5% uptime.

### 7. Key Performance Indicators (KPIs)
* Number of active subscriptions.
* Monthly Recurring Revenue (MRR).
* User retention rate (renewal rate).
* Driver utilization rate (assigned routes vs capacity).
* Average complaint resolution time.

### 8. Assumptions & Constraints
* **Assumptions**: Users value reliability and fixed pricing over flexible daily scheduling. Drivers are willing to commit to recurring daily routes.
* **Constraints**: Regional transport regulations, driver availability in specific geo-fenced zones, unpredictable traffic affecting exact ETA.

### 9. Future Enhancements
* Dedicated Native Mobile Apps (React Native or Flutter).
* AI-based route optimization for drivers picking up multiple passengers.
* Corporate and bulk B2B subscription portals.
* SOS emergency features directly linked to local authorities.
