import { NextRequest, NextResponse } from 'next/server';

const VULTR_BASE = 'http://158.247.227.8/api/plus';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder');

  const url = folder
    ? `${VULTR_BASE}/template/${encodeURIComponent(folder)}`
    : `${VULTR_BASE}/templates`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Vultr 연결 실패' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder') ?? '';

  try {
    const res = await fetch(`${VULTR_BASE}/template/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName: folder, templateData: JSON.parse(body) }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Vultr 저장 실패' }, { status: 502 });
  }
}
