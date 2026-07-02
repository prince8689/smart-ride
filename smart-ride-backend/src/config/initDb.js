/**
 * Database Initialization Script (V2 Rewrite)
 * Run: node src/config/initDb.js
 * Creates all tables and inserts default data for the Subscription Platform.
 */

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== DROP EXISTING TABLES =====
DROP TABLE IF EXISTS shared_ride_groups CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS driver_payouts CASCADE;
DROP TABLE IF EXISTS platform_wallet CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS subscription_requests CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS pricing_config CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS driver_attendance CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS contact_queries CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;

-- ===== PRICING CONFIG =====
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  per_km_rate_monthly DECIMAL(8,2) NOT NULL DEFAULT 180.00,
  per_km_rate_quarterly DECIMAL(8,2) NOT NULL DEFAULT 165.00,
  per_km_rate_half_yearly DECIMAL(8,2) NOT NULL DEFAULT 150.00,
  per_km_rate_yearly DECIMAL(8,2) NOT NULL DEFAULT 130.00,
  vehicle_multipliers JSONB NOT NULL DEFAULT '{"sedan":1.0,"suv":1.3,"hatchback":0.9,"van":1.5,"mini_bus":2.0,"bus":3.0}',
  gst_percentage DECIMAL(4,2) NOT NULL DEFAULT 18.00,
  platform_commission_percentage DECIMAL(4,2) NOT NULL DEFAULT 15.00,
  admin_upi_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== USERS =====
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_photo TEXT,
  is_email_verified BOOLEAN DEFAULT false,
  is_phone_verified BOOLEAN DEFAULT false,
  email_otp VARCHAR(6),
  phone_otp VARCHAR(6),
  otp_expires_at TIMESTAMP,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(15),
  home_address TEXT,
  home_lat DECIMAL(10,8),
  home_lng DECIMAL(11,8),
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','driver','admin')),
  password_changed_at TIMESTAMP,
  last_active_at TIMESTAMP,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fix FK for pricing_config now that users exists
ALTER TABLE pricing_config ADD CONSTRAINT fk_pricing_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- ===== DRIVERS =====
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  license_expiry DATE NOT NULL,
  license_photo TEXT,
  aadhar_number VARCHAR(20) UNIQUE NOT NULL,
  aadhar_photo TEXT,
  profile_photo TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  bank_account_number VARCHAR(20),
  bank_ifsc VARCHAR(15),
  bank_account_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== VEHICLES =====
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_number VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('sedan','suv','hatchback','van','mini_bus','bus')),
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  color VARCHAR(30) NOT NULL,
  seating_capacity INTEGER NOT NULL,
  vehicle_photo TEXT,
  rc_document TEXT,
  insurance_document TEXT,
  insurance_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== SUBSCRIPTION REQUESTS =====
CREATE TABLE subscription_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  drop_address TEXT NOT NULL,
  drop_lat DECIMAL(10,8) NOT NULL,
  drop_lng DECIMAL(11,8) NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL,
  estimated_duration_min INTEGER NOT NULL,
  morning_pickup_time TIME NOT NULL,
  evening_return_time TIME,
  wants_evening_return BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  preferred_vehicle_type VARCHAR(30) NOT NULL,
  number_of_passengers INTEGER DEFAULT 1,
  calculated_monthly_price DECIMAL(10,2) NOT NULL,
  calculated_quarterly_price DECIMAL(10,2) NOT NULL,
  calculated_half_yearly_price DECIMAL(10,2) NOT NULL,
  calculated_yearly_price DECIMAL(10,2) NOT NULL,
  pricing_config_id UUID REFERENCES pricing_config(id),
  status VARCHAR(30) DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','admin_reviewing','driver_notified',
                      'driver_assigned','rejected','modification_requested')),
  admin_notes TEXT,
  admin_id UUID REFERENCES users(id),
  assigned_driver_id UUID REFERENCES drivers(id),
  rejection_reason TEXT,
  modification_notes TEXT,
  is_shared_ride_suggested BOOLEAN DEFAULT false,
  shared_ride_group_id UUID,
  reference_number VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== SUBSCRIPTION PLANS =====
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES subscription_requests(id),
  user_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID REFERENCES drivers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly','quarterly','half_yearly','yearly')),
  subtotal DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  platform_commission DECIMAL(10,2) NOT NULL,
  driver_amount DECIMAL(10,2) NOT NULL,
  savings_amount DECIMAL(10,2) DEFAULT 0,
  distance_km DECIMAL(6,2) NOT NULL,
  per_km_rate_used DECIMAL(8,2) NOT NULL,
  vehicle_multiplier_used DECIMAL(4,2) NOT NULL,
  base_fare_used DECIMAL(10,2) NOT NULL,
  pricing_config_id UUID REFERENCES pricing_config(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  drop_address TEXT NOT NULL,
  drop_lat DECIMAL(10,8) NOT NULL,
  drop_lng DECIMAL(11,8) NOT NULL,
  morning_pickup_time TIME NOT NULL,
  evening_return_time TIME,
  wants_evening_return BOOLEAN DEFAULT false,
  preferred_vehicle_type VARCHAR(30) NOT NULL,
  number_of_passengers INTEGER DEFAULT 1,
  status VARCHAR(30) DEFAULT 'waiting_payment'
    CHECK (status IN ('waiting_payment','waiting_driver_assignment','active','paused','cancelled','expired')),
  is_shared_ride BOOLEAN DEFAULT false,
  shared_with_user_ids JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== PAYMENTS =====
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  amount DECIMAL(10,2) NOT NULL,
  platform_commission DECIMAL(10,2) NOT NULL,
  driver_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','refunded')),
  payment_method VARCHAR(50),
  invoice_number VARCHAR(50) UNIQUE,
  invoice_html TEXT,
  payment_receipt_url TEXT,
  refund_id VARCHAR(100),
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== PLATFORM WALLET =====
CREATE TABLE platform_wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('credit','debit')),
  description TEXT NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== DRIVER PAYOUTS =====
CREATE TABLE driver_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  amount DECIMAL(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  trips_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed')),
  paid_at TIMESTAMP,
  transaction_reference VARCHAR(100),
  initiated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== TRIPS =====
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  slot VARCHAR(10) CHECK (slot IN ('morning','evening')),
  scheduled_pickup_time TIME NOT NULL,
  actual_pickup_time TIMESTAMP,
  actual_drop_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','driver_on_way','arrived_at_pickup','picked_up','completed','missed','cancelled')),
  driver_lat_at_pickup DECIMAL(10,8),
  driver_lng_at_pickup DECIMAL(11,8),
  distance_covered_km DECIMAL(6,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subscription_plan_id, date, slot)
);

-- ===== COMPLAINTS =====
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  driver_id UUID REFERENCES drivers(id),
  trip_id UUID REFERENCES trips(id),
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== NOTIFICATIONS =====
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== REVIEWS =====
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  trip_id UUID REFERENCES trips(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

-- ===== SHARED RIDE GROUPS =====
CREATE TABLE shared_ride_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_area_description TEXT,
  drop_area_description TEXT,
  pickup_lat_center DECIMAL(10,8),
  pickup_lng_center DECIMAL(11,8),
  drop_lat_center DECIMAL(10,8),
  drop_lng_center DECIMAL(11,8),
  radius_km DECIMAL(4,2) DEFAULT 2.0,
  user_ids JSONB,
  subscription_request_ids JSONB,
  users_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'suggested'
    CHECK (status IN ('suggested','notified','accepted','rejected')),
  discount_percentage DECIMAL(4,2) DEFAULT 30.00,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default pricing config (insert on first run)
INSERT INTO pricing_config (base_fare, per_km_rate_monthly, per_km_rate_quarterly,
per_km_rate_half_yearly, per_km_rate_yearly, vehicle_multipliers, gst_percentage,
platform_commission_percentage)
VALUES (500.00, 180.00, 165.00, 150.00, 130.00,
'{"sedan":1.0,"suv":1.3,"hatchback":0.9,"van":1.5,"mini_bus":2.0,"bus":3.0}',
18.00, 15.00);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscription_req_user_id ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_id ON subscription_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_driver_id ON subscription_plans(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_status ON subscription_plans(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
`;

const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Connecting to PostgreSQL...');
    console.log('🔄 Running V2 schema migration...\\n');

    await client.query(schema);

    console.log('✅ All tables created successfully!');
    console.log('✅ Performance indexes created!');
    console.log('✅ Default pricing configuration inserted!');
    console.log('\\n🎉 V2 Database initialization complete!\\n');

    // Print table summary
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 Tables in database:');
    tablesResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });

    console.log('\n✅ Database is ready for Smart Ride V2! 🚗\n');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

initializeDatabase();
