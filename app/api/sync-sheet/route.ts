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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 일부 구글 엔드포인트는 UA 없는 요청을 거부하므로 명시
        'User-Agent': 'plus-next-sheet-sync',
      },
      body: JSON.stringify({ ...body, secret }),
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); }
    catch {
      // JSON이 아니면 원문 앞부분을 담아 원인 파악 가능하게
      data = { ok: false, error: 'non-json response', status: res.status, snippet: text.slice(0, 300) };
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'apps script fetch failed', detail: String(err) },
      { status: 502 },
    );
  }
}
