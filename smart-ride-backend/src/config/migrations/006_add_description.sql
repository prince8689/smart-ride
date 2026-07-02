-- Migration 006: Add missing columns for seed data compatibility
-- Add description column to subscription_plans (used by seed and plan display)
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description TEXT;

-- Add address column to driver_profiles (used by driver onboarding and seed)
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS address TEXT;
