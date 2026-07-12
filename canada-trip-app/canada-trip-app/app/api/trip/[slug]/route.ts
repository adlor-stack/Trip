import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

async function ensureTrip(slug: string) {
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data JSONB NOT NULL DEFAULT '{"generalBookings":[],"stops":[]}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    INSERT INTO trips (slug) VALUES (${slug})
    ON CONFLICT (slug) DO NOTHING
  `;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await ensureTrip(params.slug);
    const rows = await sql`
      SELECT data, updated_at FROM trips WHERE slug = ${params.slug}
    `;
    return NextResponse.json({ data: rows[0].data, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await ensureTrip(params.slug);
    const body = await req.json();
    const rows = await sql`
      UPDATE trips
      SET data = ${JSON.stringify(body.data)}::jsonb, updated_at = now()
      WHERE slug = ${params.slug}
      RETURNING data, updated_at
    `;
    return NextResponse.json({ data: rows[0].data, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
