import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await ensureTables();
    const s = await req.json();
    await sql`
      INSERT INTO stops
        (id, trip_slug, city, start_date, end_date, drive_time, hotel_name, hotel_link, hotel_address, checkin, checkout, activities, city_image, hotel_image)
      VALUES
        (${s.id}, ${params.slug}, ${s.city}, ${s.start || null}, ${s.end || null}, ${s.driveTime || null},
         ${s.hotelName || null}, ${s.hotelLink || null}, ${s.hotelAddress || null}, ${s.checkin || null}, ${s.checkout || null},
         ${JSON.stringify(s.activities || [])}::jsonb, ${s.cityImage || null}, ${s.hotelImage || null})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
