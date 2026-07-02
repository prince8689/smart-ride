-- Migration 008: Add advanced pricing fields to pricing_config

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS fuel_price DECIMAL(10,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS diesel_price DECIMAL(10,2) DEFAULT 90.00,
ADD COLUMN IF NOT EXISTS price_per_km DECIMAL(10,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS platform_fixed_fee DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS vehicle_maintenance_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS driver_incentive DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS service_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS peak_hour_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS night_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS traffic_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS waiting_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS minimum_fare DECIMAL(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS maximum_fare DECIMAL(10,2) DEFAULT 100000.00,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(4,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS round_off_method VARCHAR(20) DEFAULT 'nearest_50';

-- Update the existing default config with sensible initial values if they are active
UPDATE pricing_config SET price_per_km = 15.00 WHERE is_active = true;
