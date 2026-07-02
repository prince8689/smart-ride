-- ============================================================================
-- Migration 007: SmartRide V2 Tables
-- Adds driver routes, matching, attendance, wallet, pricing rules, etc.
-- All tables use IF NOT EXISTS for idempotency.
-- ============================================================================

-- ─── DRIVER ROUTES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_lat DECIMAL(10,8) NOT NULL,
  start_lng DECIMAL(11,8) NOT NULL,
  start_address TEXT NOT NULL,
  start_place_id VARCHAR(255),
  end_lat DECIMAL(10,8) NOT NULL,
  end_lng DECIMAL(11,8) NOT NULL,
  end_address TEXT NOT NULL,
  end_place_id VARCHAR(255),
  working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  morning_time TIME NOT NULL,
  evening_time TIME,
  total_distance DECIMAL(8,2),
  estimated_duration INTEGER,
  vehicle_type VARCHAR(30) NOT NULL,
  vehicle_capacity INTEGER NOT NULL DEFAULT 4,
  available_seats INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── ROUTE SEGMENTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_route_id UUID NOT NULL REFERENCES driver_routes(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  address TEXT,
  distance_from_start DECIMAL(8,2),
  estimated_arrival_time TIME,
  traffic_buffer_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── DRIVER ATTENDANCE V2 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_attendance_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_route_id UUID REFERENCES driver_routes(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','unavailable','auto_unavailable')),
  marked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(driver_id, date)
);

-- ─── DRIVER AVAILABILITY ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','busy','unavailable')),
  last_updated TIMESTAMP DEFAULT NOW(),
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8)
);

-- ─── DRIVER WALLET ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  last_settlement_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── PLATFORM WALLET V2 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_wallet_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(14,2) NOT NULL DEFAULT 0,
  pending_driver_payments DECIMAL(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── WALLET TRANSACTIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_type VARCHAR(30),
  from_id UUID,
  to_type VARCHAR(30),
  to_id UUID,
  amount DECIMAL(12,2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  subscription_id UUID,
  reference_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── PRICING RULES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_type VARCHAR(30) NOT NULL,
  base_price_per_km DECIMAL(8,2) NOT NULL,
  fuel_cost_per_km DECIMAL(8,2) NOT NULL,
  peak_hour_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.2,
  traffic_light_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  traffic_moderate_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.15,
  traffic_heavy_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.3,
  platform_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 15,
  monthly_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  quarterly_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 5,
  half_yearly_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
  yearly_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 15,
  working_days_per_month INTEGER NOT NULL DEFAULT 22,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── ASSIGNMENT LOGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  old_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  new_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignment_type VARCHAR(30) NOT NULL CHECK (assignment_type IN ('auto_initial','auto_replacement','manual')),
  reason TEXT,
  matching_score DECIMAL(6,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── TRIP SCHEDULES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_route_id UUID REFERENCES driver_routes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  pickup_time TIME,
  estimated_dropoff_time TIME,
  actual_pickup_time TIMESTAMP,
  actual_dropoff_time TIMESTAMP,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  pickup_address TEXT,
  drop_lat DECIMAL(10,8),
  drop_lng DECIMAL(11,8),
  drop_address TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','driver_replaced')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── SUBSCRIPTION HISTORY ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL CHECK (action IN ('created','renewed','cancelled','driver_changed')),
  old_plan VARCHAR(30),
  new_plan VARCHAR(30),
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  old_driver_id UUID,
  new_driver_id UUID,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── DRIVER STATUS HISTORY ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- ─── SHARED RIDE GROUPS V2 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_ride_groups_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_route_id UUID REFERENCES driver_routes(id) ON DELETE SET NULL,
  trip_date DATE NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 4,
  booked_seats INTEGER NOT NULL DEFAULT 0,
  pickup_area_lat DECIMAL(10,8),
  pickup_area_lng DECIMAL(11,8),
  pickup_radius_km DECIMAL(4,2) DEFAULT 1.5,
  savings_percent DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_v2_route_segments_driver_route ON route_segments(driver_route_id);
CREATE INDEX IF NOT EXISTS idx_v2_driver_attendance_driver_date ON driver_attendance_v2(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_v2_trip_schedules_subscription ON trip_schedules(subscription_id);
CREATE INDEX IF NOT EXISTS idx_v2_trip_schedules_driver_date ON trip_schedules(driver_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_v2_driver_availability_driver ON driver_availability(driver_id);
CREATE INDEX IF NOT EXISTS idx_v2_assignment_logs_subscription ON assignment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_v2_driver_routes_driver ON driver_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_v2_driver_routes_status ON driver_routes(status);
CREATE INDEX IF NOT EXISTS idx_v2_wallet_transactions_from ON wallet_transactions(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_v2_wallet_transactions_to ON wallet_transactions(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_v2_pricing_rules_vehicle ON pricing_rules(vehicle_type, is_active);
CREATE INDEX IF NOT EXISTS idx_v2_subscription_history_sub ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_v2_driver_status_history_driver ON driver_status_history(driver_id);

-- ─── SEED: PRICING RULES ───────────────────────────────────────────────────
INSERT INTO pricing_rules (vehicle_type, base_price_per_km, fuel_cost_per_km, peak_hour_multiplier, platform_commission_percent, working_days_per_month)
SELECT 'sedan', 12.00, 4.00, 1.2, 15, 22
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE vehicle_type = 'sedan' AND is_active = true);

INSERT INTO pricing_rules (vehicle_type, base_price_per_km, fuel_cost_per_km, peak_hour_multiplier, platform_commission_percent, working_days_per_month)
SELECT 'suv', 16.00, 5.50, 1.2, 15, 22
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE vehicle_type = 'suv' AND is_active = true);

INSERT INTO pricing_rules (vehicle_type, base_price_per_km, fuel_cost_per_km, peak_hour_multiplier, platform_commission_percent, working_days_per_month)
SELECT 'minivan', 14.00, 5.00, 1.2, 15, 22
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE vehicle_type = 'minivan' AND is_active = true);

INSERT INTO pricing_rules (vehicle_type, base_price_per_km, fuel_cost_per_km, peak_hour_multiplier, platform_commission_percent, working_days_per_month)
SELECT 'bus', 8.00, 3.00, 1.1, 15, 22
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE vehicle_type = 'bus' AND is_active = true);

-- ─── SEED: PLATFORM WALLET V2 ──────────────────────────────────────────────
INSERT INTO platform_wallet_v2 (total_revenue, total_commission, pending_driver_payments)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM platform_wallet_v2);
