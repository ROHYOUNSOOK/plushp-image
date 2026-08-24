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
  // 기본 정보 — upsert에 사용하며, assign/complete/confirm에도 함께 실어 보내
  // 시트에 행이 없을 때(자동기록 누락 등) Apps Script가 이 값들로 행을 새로 만들 수 있게 한다.
  reqDate?: string;         // A 요청일자 (YYYY-MM-DD)
  upDate?: string;          // B 업로드일자
  accountId?: string;       // E 아이디
  keyword?: string;         // H 키워드
  team?: string;            // J 팀 (작성자 소속팀)
  marketer?: string;        // K 마케터
  // assign 전용 (upsert 시에도 이미 배정된 디자이너를 함께 기록)
  designerName?: string;    // P 디자이너 (빈값 = 미배분/미지정)
  // complete/confirm 전용
  checked?: boolean;        // false면 해제 (수정요청 등)
}

/**
 * 협업시트로 동기화 요청 전송.
 * - keepalive: 저장 직후 페이지를 이동/종료해도 요청이 취소되지 않고 서버까지 도달한다.
 * - 재시도: 순간 네트워크 실패나 시트 잠금(busy)으로 실패하면 1회 더 시도한다.
 *   (모든 액션은 UUID로 행을 매칭하는 멱등 연산이라 재시도해도 중복이 생기지 않는다)
 * - Promise 반환: 저장처럼 완료를 보장하고 싶은 곳에서는 await 할 수 있다. 실패해도 throw하지 않음(best-effort).
 */
export async function syncSheet(payload: SyncPayload): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('/api/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (d?.ok) return; // 성공
      console.warn(`[sheetSync] 실패(시도 ${attempt}/2):`, payload.action, d?.error);
    } catch (e) {
      console.warn(`[sheetSync] 네트워크 실패(시도 ${attempt}/2):`, payload.action, e);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 800)); // 재시도 전 잠깐 대기
  }
}
