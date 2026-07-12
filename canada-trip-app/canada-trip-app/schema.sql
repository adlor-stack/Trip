-- Ces tables sont créées automatiquement par l'app au premier appel.
-- Ce fichier n'est que pour référence / création manuelle si besoin.

CREATE TABLE IF NOT EXISTS general_bookings (
  id TEXT PRIMARY KEY,
  trip_slug TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  link TEXT,
  direction TEXT,
  date TEXT,
  time TEXT,
  pickup_date TEXT,
  pickup_time TEXT,
  return_date TEXT,
  return_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stops (
  id TEXT PRIMARY KEY,
  trip_slug TEXT NOT NULL,
  city TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  drive_time TEXT,
  hotel_name TEXT,
  hotel_link TEXT,
  hotel_address TEXT,
  checkin TEXT,
  checkout TEXT,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ancienne table (modèle "un seul bloc JSON"), plus utilisée : peut être supprimée.
-- DROP TABLE IF EXISTS trips;
