import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

function rowToBooking(r: any) {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    link: r.link || '',
    direction: r.direction || undefined,
    date: r.date || undefined,
    time: r.time || undefined,
    pickupDate: r.pickup_date || undefined,
    pickupTime: r.pickup_time || undefined,
    returnDate: r.return_date || undefined,
    returnTime: r.return_time || undefined
  };
}

function rowToStop(r: any) {
  return {
    id: r.id,
    city: r.city,
    start: r.start_date || undefined,
    end: r.end_date || undefined,
    driveTime: r.drive_time || undefined,
    hotelName: r.hotel_name || undefined,
    hotelLink: r.hotel_link || undefined,
    hotelAddress: r.hotel_address || undefined,
    checkin: r.checkin || undefined,
    checkout: r.checkout || undefined,
    activities: r.activities || []
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await ensureTables();
    const bookingRows = await sql`
      SELECT * FROM general_bookings WHERE trip_slug = ${params.slug} ORDER BY created_at ASC
    `;
    const stopRows = await sql`
      SELECT * FROM stops WHERE trip_slug = ${params.slug} ORDER BY start_date ASC NULLS LAST, created_at ASC
    `;
    return NextResponse.json({
      generalBookings: bookingRows.map(rowToBooking),
      stops: stopRows.map(rowToStop)
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
