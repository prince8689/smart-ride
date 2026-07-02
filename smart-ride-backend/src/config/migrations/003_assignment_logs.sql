-- =========================================================================
-- Migration: 003_assignment_logs.sql
-- Description: Create assignment_logs table for auto-assign, reassign, 
--              and admin override events.
-- =========================================================================

CREATE TABLE IF NOT EXISTS assignment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    old_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    new_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('auto_assign', 'reassign', 'admin_override')),
    reason TEXT,
    ranked_list JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_assignment_logs_subscription ON assignment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_event_type ON assignment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_created_at ON assignment_logs(created_at);
