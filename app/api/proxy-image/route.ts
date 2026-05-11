import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('http://158.247.227.8/')) {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse('Not found', { status: 404 });

    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Fetch failed', { status: 500 });
  }
}
