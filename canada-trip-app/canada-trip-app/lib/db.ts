import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL!);

export async function ensureTables() {
  await sql`
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
    )
  `;
  await sql`
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
    )
  `;
  await sql`ALTER TABLE stops ADD COLUMN IF NOT EXISTS city_image TEXT`;
  await sql`ALTER TABLE stops ADD COLUMN IF NOT EXISTS hotel_image TEXT`;
}
