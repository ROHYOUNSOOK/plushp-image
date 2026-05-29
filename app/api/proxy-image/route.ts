import { NextRequest, NextResponse } from 'next/server';

// 스케줄 이미지(자주 교체됨)는 no-store, 그 외 정적 자원(의사/프레임/배경/로고)은 장시간 캐시
function getCacheControl(url: string): string {
  if (url.includes('/plushospital/schedule/')) return 'no-store';
  return 'public, max-age=86400, immutable';
}

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
        'Cache-Control': getCacheControl(url),
      },
    });
  } catch {
    return new NextResponse('Fetch failed', { status: 500 });
  }
}
