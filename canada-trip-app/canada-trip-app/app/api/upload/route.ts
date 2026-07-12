import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }
    const filename = `trip-images/${Date.now()}-${(file as File).name || 'photo.jpg'}`;
    const blob = await put(filename, file as File, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
