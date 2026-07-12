import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function geocode(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'canada-trip-app (usage personnel)' }
  });
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!from || !to) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    const [a, b] = await Promise.all([geocode(from), geocode(to)]);
    if (!a || !b) {
      return NextResponse.json({ error: 'geocode_failed' }, { status: 404 });
    }

    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    const routeRes = await fetch(routeUrl);
    const routeJson = await routeRes.json();
    if (!routeJson.routes || routeJson.routes.length === 0) {
      return NextResponse.json({ error: 'route_failed' }, { status: 404 });
    }

    const seconds = routeJson.routes[0].duration;
    const meters = routeJson.routes[0].distance;
    return NextResponse.json({
      driveTime: formatDuration(seconds),
      distanceKm: Math.round(meters / 1000)
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
