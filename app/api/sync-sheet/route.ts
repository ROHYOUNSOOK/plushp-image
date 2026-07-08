import { NextRequest, NextResponse } from 'next/server';

/**
 * 협업시트(구글 스프레드시트) 동기화 프록시
 * — Apps Script 웹앱 URL과 secret을 서버에만 두고, 브라우저 CORS 문제를 우회한다.
 * — Apps Script는 POST 후 302로 결과를 반환하므로 redirect follow 필수 (fetch 기본값).
 */
export async function POST(req: NextRequest) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.SHEET_SYNC_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ ok: false, error: 'sheet sync not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, secret }),
      redirect: 'follow',
    });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { ok: false, error: 'non-json response from apps script' }; }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: 'apps script 연결 실패' }, { status: 502 });
  }
}
