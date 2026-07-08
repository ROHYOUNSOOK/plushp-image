/** ============================================================
 * Plus 기획안 → 협업시트(구글 스프레드시트) 자동기록 Apps Script
 * ============================================================
 * [사용법]
 * 1. 시트 편집 권한 계정으로 스프레드시트 열기 → 확장 프로그램 → Apps Script
 * 2. 이 파일 내용 전체를 붙여넣기
 * 3. SECRET 값을 랜덤 문자열로 변경 (앱 환경변수 SHEET_SYNC_SECRET과 동일해야 함)
 * 4. 배포 → 새 배포 → 웹 앱 / 실행: 나 / 액세스: 모든 사용자
 * 5. 웹 앱 URL을 앱 환경변수 APPS_SCRIPT_URL에 등록
 *
 * [액션 종류]
 * - upsert  : 기획안 저장 → 행 추가/덮어쓰기 (A,B,C,E,F,H,J,K,M)
 * - assign  : 디자이너 배분 → P열
 * - complete: 디자인완료 → Q열 'O' (checked:false면 해제 — 수정요청 시)
 * - confirm : 컨펌완료 → L열 'O' (checked:false면 해제)
 * - delete  : 기획안 삭제 → 행 제거
 *
 * 행 매칭 키: M열(상세기획안 링크)에 포함된 기획안 UUID
 * ============================================================ */

// ▼▼ 이 값만 원하는 랜덤 문자열로 바꾸세요 (앱 환경변수에도 동일하게 넣을 값) ▼▼
const SECRET = 'plus-sheet-sync-2026-CHANGE-ME';

const SHEET_NAME = '국내입력';
const HEADER_ROW = 12;            // 헤더 행 (데이터는 13행부터)
const BRANCH_NAME = '플러스정형외과'; // F열 지점 고정값 — 드롭다운 표기와 정확히 일치해야 함
const CHANNEL_NAME = '블로그(기획형)'; // C열 채널 구분 고정값 — 드롭다운 표기와 정확히 일치해야 함
const CHECK_VALUE = 'O';          // L/Q열 체크 값

// 열 번호 (A=1)
const COL = {
  reqDate: 1,    // A 요청일자
  upDate: 2,     // B 업로드일자
  channel: 3,    // C 채널 구분
  accountId: 5,  // E 아이디
  branch: 6,     // F 지점
  keyword: 8,    // H 키워드
  team: 10,      // J 팀
  marketer: 11,  // K 마케터
  confirm: 12,   // L 컨펌완료
  planLink: 13,  // M 상세기획안
  designer: 16,  // P 디자이너
  done: 17,      // Q 작업완료
};

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.secret !== SECRET) return json_({ ok: false, error: 'unauthorized' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return json_({ ok: false, error: 'sheet not found: ' + SHEET_NAME });

    const row = findRowById_(sheet, p.id); // 기획안 UUID로 M열 검색

    switch (p.action) {
      case 'upsert': {
        const link = 'https://plushp-image.vercel.app/plan?id=' + p.id;
        const targetRow = row > 0 ? row : sheet.getLastRow() + 1;
        // M열(행 매칭 키)을 가장 먼저 기록 — 다른 칸이 드롭다운 규칙 등으로 실패해도
        // 행 매칭이 가능해 재저장 시 중복 행이 생기지 않는다.
        const skipped = [];
        setSafe_(sheet, targetRow, COL.planLink, link, skipped, 'planLink');
        setSafe_(sheet, targetRow, COL.reqDate, p.reqDate || '', skipped, 'reqDate');
        setSafe_(sheet, targetRow, COL.upDate, p.upDate || '', skipped, 'upDate');
        setSafe_(sheet, targetRow, COL.channel, CHANNEL_NAME, skipped, 'channel');
        setSafe_(sheet, targetRow, COL.accountId, p.accountId || '', skipped, 'accountId');
        setSafe_(sheet, targetRow, COL.branch, BRANCH_NAME, skipped, 'branch');
        setSafe_(sheet, targetRow, COL.keyword, p.keyword || '', skipped, 'keyword');
        setSafe_(sheet, targetRow, COL.team, p.team || '', skipped, 'team');
        setSafe_(sheet, targetRow, COL.marketer, p.marketer || '', skipped, 'marketer');
        return json_({ ok: true, mode: row > 0 ? 'updated' : 'inserted', row: targetRow, skipped: skipped });
      }
      case 'assign': { // 디자이너 배분 → P열 (미배분 처리 시 빈값)
        if (row < 0) return json_({ ok: false, error: 'row not found' });
        const skipped = [];
        setSafe_(sheet, row, COL.designer, p.designerName || '', skipped, 'designer');
        return json_({ ok: true, row: row, skipped: skipped });
      }
      case 'complete': { // 디자인완료 → Q열 O / 수정요청 시 checked:false로 해제
        if (row < 0) return json_({ ok: false, error: 'row not found' });
        const skipped = [];
        setSafe_(sheet, row, COL.done, p.checked === false ? '' : CHECK_VALUE, skipped, 'done');
        return json_({ ok: true, row: row, skipped: skipped });
      }
      case 'confirm': { // 컨펌완료 → L열 O / 해제 가능
        if (row < 0) return json_({ ok: false, error: 'row not found' });
        const skipped = [];
        setSafe_(sheet, row, COL.confirm, p.checked === false ? '' : CHECK_VALUE, skipped, 'confirm');
        return json_({ ok: true, row: row, skipped: skipped });
      }
      case 'delete': { // 기획안 삭제 → 행 제거
        if (row < 0) return json_({ ok: true, mode: 'not-found' }); // 없으면 조용히 통과
        sheet.deleteRow(row);
        return json_({ ok: true, mode: 'deleted' });
      }
      case 'inspect': { // 진단용: 특정 행의 드롭다운(데이터 확인) 규칙 확인
        const r = p.row || (HEADER_ROW + 1);
        const targets = { team: COL.team, marketer: COL.marketer, channel: COL.channel, branch: COL.branch };
        const info = {};
        for (var k in targets) {
          var dv = sheet.getRange(r, targets[k]).getDataValidation();
          if (!dv) { info[k] = 'no-validation'; continue; }
          var t = String(dv.getCriteriaType());
          var vals = dv.getCriteriaValues();
          if (t === 'VALUE_IN_RANGE') {
            var rng = vals[0];
            // 전체 값을 평탄화해 반환 (가로/세로/2차원 범위 모두) + 공백 문자 확인용 JSON 인코딩
            var flat = [];
            rng.getValues().forEach(function (r2) { r2.forEach(function (v) { if (v !== '') flat.push(JSON.stringify(v)); }); });
            info[k] = {
              type: t,
              range: rng.getSheet().getName() + '!' + rng.getA1Notation(),
              values: flat.slice(0, 60),
            };
          } else if (t === 'VALUE_IN_LIST') {
            info[k] = { type: t, list: vals[0] };
          } else {
            info[k] = { type: t };
          }
        }
        return json_({ ok: true, row: r, info: info });
      }
      default:
        return json_({ ok: false, error: 'unknown action: ' + p.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * 셀 하나를 안전하게 기록 — 드롭다운(데이터 확인) 규칙 위반 등으로 실패해도
 * 해당 칸만 건너뛰고 나머지 기록은 계속 진행한다.
 * 주의: 검증 오류는 flush 시점(함수 종료 후)에 터지므로, 셀마다 즉시 flush해서
 * try 안에서 잡히게 한다. 실패 시 해당 칸을 비워 pending 상태를 정리한다.
 */
function setSafe_(sheet, row, col, value, skipped, label) {
  const range = sheet.getRange(row, col);
  try {
    range.setValue(value);
    SpreadsheetApp.flush();
  } catch (e) {
    // 검증 거부 시: 규칙 임시 해제 → 값 기록 → 규칙 복원
    // (앱에서 오는 값은 통제된 값이므로 안전. 사람이 쓰는 드롭다운은 복원되어 유지됨)
    try {
      const rule = range.getDataValidation();
      range.setDataValidation(null);
      range.setValue(value);
      SpreadsheetApp.flush();
      if (rule) { range.setDataValidation(rule); SpreadsheetApp.flush(); }
    } catch (e2) {
      skipped.push(label + ': ' + String(e2));
      try { range.setDataValidation(null); range.setValue(''); SpreadsheetApp.flush(); } catch (e3) { /* noop */ }
    }
  }
}

/** M열(상세기획안 링크)에서 기획안 UUID가 포함된 행 번호 반환, 없으면 -1 */
function findRowById_(sheet, id) {
  if (!id) return -1;
  const last = sheet.getLastRow();
  if (last <= HEADER_ROW) return -1;
  const links = sheet.getRange(HEADER_ROW + 1, COL.planLink, last - HEADER_ROW, 1).getValues();
  for (let i = 0; i < links.length; i++) {
    if (String(links[i][0]).indexOf(id) !== -1) return HEADER_ROW + 1 + i;
  }
  return -1;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
