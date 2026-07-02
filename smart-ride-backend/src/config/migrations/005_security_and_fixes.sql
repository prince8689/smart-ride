-- ========== FILE: src/config/migrations/005_security_and_fixes.sql ==========
-- Add password_changed_at for token invalidation
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Add abandoned_at for abandoned payments tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP;

-- Add last_active tracking for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Update last_active_at via trigger on login (add trigger)
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_active_at = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Index for abandoned payment cleanup
CREATE INDEX IF NOT EXISTS idx_payments_pending_old 
ON payments(status, created_at) 
WHERE status = 'pending';

-- Index for password_changed_at (used in every auth check)
CREATE INDEX IF NOT EXISTS idx_users_password_changed 
ON users(id, password_changed_at);

-- Partial index for active unassigned subscriptions (most queried admin view)
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_unassigned
ON user_subscriptions(route_id, created_at)
WHERE status = 'active' AND driver_id IS NULL;

-- Add soft delete tracking
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
UPDATE complaints SET resolved_at = updated_at WHERE status IN ('resolved', 'closed') AND resolved_at IS NULL;
-- ========== END ==========
