-- Add missing ETA, SLA, and timing columns to daily_loads
-- These are critical for dispatch operations: tracking pickup/delivery windows,
-- monitoring ETAs, and enforcing SLA deadlines.

ALTER TABLE daily_loads
  ADD COLUMN IF NOT EXISTS estimated_pickup_time  timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_delivery_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_pickup_time     timestamptz,
  ADD COLUMN IF NOT EXISTS actual_delivery_time   timestamptz,
  ADD COLUMN IF NOT EXISTS current_eta            timestamptz,
  ADD COLUMN IF NOT EXISTS eta_status             text DEFAULT 'on_time'
    CHECK (eta_status IN ('on_time', 'at_risk', 'delayed', 'unknown')),
  ADD COLUMN IF NOT EXISTS sla_deadline           timestamptz,
  ADD COLUMN IF NOT EXISTS sla_met                boolean;

-- Add missing columns to drivers for mobile app integration
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS user_id              uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS device_token         text,
  ADD COLUMN IF NOT EXISTS notification_preference text DEFAULT 'push'
    CHECK (notification_preference IN ('push', 'sms', 'both', 'none'));

-- Index for ETA monitoring queries (dispatchers filtering by eta_status)
CREATE INDEX IF NOT EXISTS idx_daily_loads_eta_status ON daily_loads (eta_status)
  WHERE status NOT IN ('delivered', 'cancelled');

-- Index for SLA deadline monitoring
CREATE INDEX IF NOT EXISTS idx_daily_loads_sla_deadline ON daily_loads (sla_deadline)
  WHERE sla_met IS NULL AND status NOT IN ('delivered', 'cancelled');

-- Index for driver user lookup (mobile app login)
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers (user_id)
  WHERE user_id IS NOT NULL;

-- Add route_alerts table if it doesn't exist (referenced in code but may be missing)
CREATE TABLE IF NOT EXISTS route_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id       uuid REFERENCES daily_loads(id) ON DELETE CASCADE,
  alert_type    text NOT NULL CHECK (alert_type IN ('delay', 'eta_change', 'sla_risk', 'geofence', 'weather', 'traffic')),
  severity      text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message       text NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  triggered_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable realtime on route_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE route_alerts;

-- Index for active alerts dashboard
CREATE INDEX IF NOT EXISTS idx_route_alerts_active ON route_alerts (status, triggered_at DESC)
  WHERE status = 'active';

-- Add driver_sessions table for shift tracking
CREATE TABLE IF NOT EXISTS driver_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  start_location jsonb,
  end_location  jsonb,
  total_miles   numeric(8,2),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_sessions_active ON driver_sessions (driver_id, status)
  WHERE status = 'active';
