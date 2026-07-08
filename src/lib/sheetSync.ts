'use client';

/* ===========================
   협업시트(구글 스프레드시트) 동기화 헬퍼
   — 모든 호출은 best-effort: 실패해도 앱 동작(저장/배분/완료)에 영향 없음
   — 행 매칭 키: 시트 M열(상세기획안 링크)에 포함된 기획안 UUID
=========================== */

type SyncAction = 'upsert' | 'assign' | 'complete' | 'confirm' | 'delete';

interface SyncPayload {
  action: SyncAction;
  id: string;               // 기획안 UUID
  // upsert 전용
  reqDate?: string;         // A 요청일자 (YYYY-MM-DD)
  upDate?: string;          // B 업로드일자
  accountId?: string;       // E 아이디
  keyword?: string;         // H 키워드
  team?: string;            // J 팀 (작성자 소속팀)
  marketer?: string;        // K 마케터
  // assign 전용
  designerName?: string;    // P 디자이너 (빈값 = 미배분)
  // complete/confirm 전용
  checked?: boolean;        // false면 해제 (수정요청 등)
}

/** 협업시트로 동기화 요청 전송 (fire-and-forget) */
export function syncSheet(payload: SyncPayload): void {
  try {
    void fetch('/api/sync-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then((d: { ok?: boolean; error?: string }) => {
        if (!d?.ok) console.warn('[sheetSync] 실패:', payload.action, d?.error);
      })
      .catch(() => { /* 네트워크 실패 무시 */ });
  } catch { /* noop */ }
}
