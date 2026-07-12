CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{"generalBookings":[],"stops":[]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
