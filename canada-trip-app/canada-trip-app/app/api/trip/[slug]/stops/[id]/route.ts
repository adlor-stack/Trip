import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    await ensureTables();
    const s = await req.json();
    await sql`
      UPDATE stops SET
        city = ${s.city},
        start_date = ${s.start || null},
        end_date = ${s.end || null},
        drive_time = ${s.driveTime || null},
        hotel_name = ${s.hotelName || null},
        hotel_link = ${s.hotelLink || null},
        hotel_address = ${s.hotelAddress || null},
        checkin = ${s.checkin || null},
        checkout = ${s.checkout || null},
        activities = ${JSON.stringify(s.activities || [])}::jsonb,
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
    await sql`DELETE FROM stops WHERE id = ${params.id} AND trip_slug = ${params.slug}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
