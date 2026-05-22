import { NextRequest, NextResponse } from 'next/server';

const VULTR_BASE = 'http://158.247.227.8/api/plus';

export async function POST(req: NextRequest) {
  try {
    const { folderName } = await req.json();
    if (!folderName) return NextResponse.json({ exists: false });
    const res = await fetch(`${VULTR_BASE}/template/check/${encodeURIComponent(folderName)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ exists: false });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ exists: false });
  }
}
