import { NextRequest, NextResponse } from 'next/server';

const VULTR_BASE = 'http://158.247.227.8/api/plus';

export async function POST(req: NextRequest) {
  try {
    const { folderName, filename } = await req.json();
    if (!folderName || !filename) {
      return NextResponse.json({ error: 'folderName, filename 필요' }, { status: 400 });
    }

    const res = await fetch(`${VULTR_BASE}/schedule/delete-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName, filename }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Vultr 연결 실패' }, { status: 502 });
  }
}
