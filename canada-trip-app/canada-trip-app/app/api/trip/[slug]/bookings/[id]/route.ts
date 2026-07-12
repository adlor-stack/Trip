import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    await ensureTables();
    const b = await req.json();
    await sql`
      UPDATE general_bookings SET
        type = ${b.type},
        name = ${b.name},
        link = ${b.link || null},
        direction = ${b.direction || null},
        date = ${b.date || null},
        time = ${b.time || null},
        pickup_date = ${b.pickupDate || null},
        pickup_time = ${b.pickupTime || null},
        return_date = ${b.returnDate || null},
        return_time = ${b.returnTime || null},
        updated_at = now()
      WHERE id = ${params.id} AND trip_slug = ${params.slug}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    await sql`DELETE FROM general_bookings WHERE id = ${params.id} AND trip_slug = ${params.slug}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
