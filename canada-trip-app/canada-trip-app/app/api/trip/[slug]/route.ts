import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const rows = await sql`
      SELECT data, updated_at FROM trips WHERE slug = ${params.slug}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
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
    const body = await req.json();
    const rows = await sql`
      UPDATE trips
      SET data = ${JSON.stringify(body.data)}::jsonb, updated_at = now()
      WHERE slug = ${params.slug}
      RETURNING data, updated_at
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ data: rows[0].data, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
