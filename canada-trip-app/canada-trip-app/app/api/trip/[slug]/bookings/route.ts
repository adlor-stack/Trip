import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await ensureTables();
    const b = await req.json();
    await sql`
      INSERT INTO general_bookings
        (id, trip_slug, type, name, link, direction, date, time, pickup_date, pickup_time, return_date, return_time)
      VALUES
        (${b.id}, ${params.slug}, ${b.type}, ${b.name}, ${b.link || null}, ${b.direction || null},
         ${b.date || null}, ${b.time || null}, ${b.pickupDate || null}, ${b.pickupTime || null},
         ${b.returnDate || null}, ${b.returnTime || null})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
