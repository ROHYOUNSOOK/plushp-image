import { NextRequest, NextResponse } from 'next/server';

const VULTR_UPLOAD = 'http://158.247.227.8/api/plus/schedule/upload';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const res = await fetch(VULTR_UPLOAD, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Vultr 업로드 실패' }, { status: 502 });
  }
}
