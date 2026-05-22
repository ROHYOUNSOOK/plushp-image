import { NextRequest, NextResponse } from 'next/server';

const VULTR_BASE = 'http://158.247.227.8/api/plus';

export async function POST(req: NextRequest) {
  try {
    const { folderName } = await req.json();
    if (!folderName) return NextResponse.json({ error: 'folderName 필요' }, { status: 400 });

    const res = await fetch(`${VULTR_BASE}/schedule/delete-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Vultr 연결 실패' }, { status: 502 });
  }
}
