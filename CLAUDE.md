# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Plus 레이어 편집기 — 개발 가이드

## 프로젝트 개요

병원 SNS 포스팅용 이미지 편집기. 스케줄(기획안)을 선택하면 문구 페이지 N장 + 원장님 페이지 + 의료법 페이지를 자동 생성하고, 캔버스에서 레이어를 편집 후 이미지로 내보내는 도구다.

**배포:** Vercel (https://plushp-image.vercel.app)  
**스택:** Next.js 16 (App Router) · React 19 · Zustand 5 · Supabase · TailwindCSS 4 · TypeScript

---

## 개발 명령어

```bash
cd plus-next
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드 + 타입 체크
npm run lint     # ESLint 검사
npx tsc --noEmit # 타입 체크만
```

`.env.local` 필요:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> **주의:** 로컬(HTTP)에서는 Vultr 이미지 직접 fetch가 CORS로 실패함. 스케줄 이미지 관련 기능은 Vercel 배포 환경에서 테스트 필요.

---

## 인프라 구조

```
브라우저 (Vercel HTTPS)
  ↓
/api/proxy-image  ← HTTP→HTTPS Mixed Content 우회
  ↓
Vultr 서버 (http://158.247.227.8)
  ├── nginx: /image/... (정적 이미지 서빙)
  └── Node Express :3002  (/api/plus/...)
        ├── POST /api/plus/template/save
        ├── GET  /api/plus/template/:folderName
        ├── GET  /api/plus/templates
        └── POST /api/plus/schedule/upload
```

**Vultr 서버 관리:**
- 서버 파일: `/var/www/html/image/plushospital/server.js`
- PM2 프로세스명: `plus-nextjs`
- 재시작: `pm2 restart plus-nextjs`
- 스케줄 이미지 경로: `/var/www/html/image/plushospital/schedule/폴더명/N.jpg`

**Supabase 테이블:**
- `plus_schedule` — 스케줄(기획안) 데이터 (`started`, `completed`, `confirmed` 불리언으로 상태 관리)
- `plus_doctors` — 의사 정보 (이름, 전문과, 진료과, 이미지 ID)
- `users` — 직원 정보 (id=auth UUID, role, department, team)

---

## 아키텍처

### 역할(Role) 시스템

```
isAdmin    = role === '관리자'
isDesigner = department === '디자인부'
isMarketer = department === '마케팅부'
```

- **관리자**: 편집기 항상 편집 가능, 모든 스케줄 조회
- **디자이너**: 본인 배분 스케줄만, 디자인완료 후 읽기 전용
- **마케터**: 편집기 항상 읽기 전용, 본인 생성 스케줄만

### 5단계 스케줄 상태 (`lib/scheduleStatus.ts`)

```
unassigned → assigned → in_progress → design_done → confirmed
(미배분)    (배분완료)   (진행중)      (디자인완료)   (컨펌완료)
```

판정 순서: `confirmed → completed → started → assigned_to → unassigned`

### 편집기 진입 흐름

모든 편집기 진입은 `navigateToEditor(row, allDoctors)` 경유가 원칙.  
직접 `/editor` 링크로 접근 시 `EditorShell` 마운트 effect가 DB 최신값으로 재적용.

```
navigateToEditor()
  → resetEditor()
  → DB 최신 row 재조회 (fresh fetch)
  → maybeMarkStarted() (배분완료 → 진행중 자동 전환)
  → checkTemplateExists() → applyCloudTemplate() or applyRandomFlow()
  → sessionStorage.setItem('plusEditorApplied', '1')  ← 중복 재적용 방지
  → router.push('/editor')
```

### 편집기 읽기 전용 (`editorStore.editorReadOnly`)

`EditorShell`이 `permissions + currentScheduleRow.completed` 기준으로 판정 후 `setEditorReadOnly()` 호출. 캔버스 이벤트·레이어 패널·툴바 버튼이 이 플래그를 보고 비활성화됨.

---

## 핵심 데이터 흐름

### 스케줄 적용
```
SchedulePanel (UI)
  → useScheduleApplication.applySelectedSchedule()
    → loadDoctorImages()        ← Vultr /plus_doctors/{id}.jpg
    → loadRandomFrameImages()   ← Vultr /plus_frame/ 랜덤
    → loadScheduleInnerImages() ← Vultr /schedule/폴더명/N.jpg
    → editorStore.applySchedule()
      → buildSchedulePages()    ← 순수 함수, 페이지 배열 생성
    → applyBgToAllPages()       ← 랜덤 배경 전 페이지 적용
```

### 캔버스 렌더링
```
CanvasArea (requestAnimationFrame)
  → draw.ts
    → drawBg / drawFrame / drawTextbox / drawLogo / drawImage
    → drawMedicalLaw (의료법 페이지만 별도 처리)
```

### 템플릿 저장/불러오기
```
클라우드 저장: saveCloudTemplate() → /api/plus-template → Vultr 폴더명.json
클라우드 로드: loadCloudTemplate() → applyScheduleImagesToTemplatePages()
                                    → applyScheduleTextsToTemplatePages()  ← 문구 항상 최신 덮어씀
                                    → mergeTemplateIntoPage()
```

템플릿 저장 실패 원인: Vultr 서버 다운, PM2 프로세스 종료, JSON 페이로드 과대(blob URL 포함 시).

---

## 페이지 구조

스케줄 적용 시 생성되는 페이지 순서:
1. **문구 페이지** × N장 (texts 배열 수) — frame + textbox + logo
2. **원장님 페이지** × 1장 (doctors 있을 때) — doctor-card + logo
3. **의료법 페이지** × 1장 — medConfig로 독자 렌더링

---

## 의료법 페이지 특수 동작

다른 페이지와 달리 `layers` 배열이 아닌 `medConfig` 객체 하나로 렌더링.
`drawMedicalLaw.ts`가 `medConfig` 값으로 박스·텍스트·로고를 직접 계산해서 그림.
컬러 동기화, 템플릿 저장/불러오기에서 별도 분기 처리 필요.

---

## UI 컴포넌트 규칙

### 브라우저 기본 스타일 제거 필수
네이티브 `<select>`는 사용 금지 — 반드시 `CustomSelect` (`components/ui/CustomSelect.tsx`) 사용.  
`<input type="checkbox">` → `CustomCheckbox` 사용.  
`<input type="range">` → `accent-blue-500` 클래스 추가.  
`<button>` 요소에 명시적 text color 클래스 없으면 OS 테마에 따라 텍스트가 옅게 보임.

### CustomSelect 주의사항
- 드롭다운은 `createPortal`로 `document.body`에 렌더링 (overflow:hidden 부모 영향 없음)
- `dropdownMaxWidth` prop으로 드롭다운 최대 너비 제한 가능
- 컨테이너 div에 `[color-scheme:light]` 사용 금지 → Chrome이 흰 배경을 자동 삽입함

---

## 이미지 URL 정책

| 환경 | 동작 |
|---|---|
| HTTPS (Vercel) | `toProxyUrl()` → `/api/proxy-image?url=...` 경유 |
| HTTP (로컬) | Vultr 직접 요청 (nginx CORS 헤더 없어서 fetch 실패) |

- `proxy-image` 응답: `Cache-Control: no-store` (캐시 없음)
- `loadScheduleInnerImages`: `?_t=timestamp` cache-busting으로 CDN 우회

---

## 스케줄 폴더명 규칙

```
날짜_아이디_키워드
예) 260511_plushospital10_송도정형외과
```

- 이미지: `폴더명/1.jpg`, `폴더명/2.jpg`, ... (페이지 인덱스 1-based)
- 템플릿: `폴더명/폴더명.json` (구버전: `template.json` fallback 있음)

---

## 색상 동기화 규칙

배경 이미지 변경 시 `extractDominantColor()`로 대표색 추출 후:
- **textbox** → `calcAutoFillColor(bgColor)` (배경 밝기 기준 대비색)
- **logo stroke/shadow** → autoColor / shadowColor
- **frame mask** → `replaceTextboxImageColors()` (PNG 색 치환)
- **의료법 titleColor** → autoColor

---

## 배포

GitHub `main` 브랜치 push → Vercel 자동 배포.

```bash
git add -A
git commit -m "변경 내용"
git push
```

---

## 자주 건드리는 파일과 주의사항

| 파일 | 수정 시 주의 |
|---|---|
| `lib/applySchedule.ts` | buildSchedulePages는 순수 함수. 이미지 로드 로직은 여기 없음 |
| `lib/templateIO.ts` | serializeLayerCloud에서 blob URL 이미지 제외, remote URL만 저장 |
| `canvas/drawMedicalLaw.ts` | 의료법 전용 렌더러. Page.layers 미사용 |
| `store/editorStore.ts` | 모든 상태 변경 집중. 여기서 직접 이미지 로드 금지 |
| `app/api/proxy-image/route.ts` | Cache-Control: no-store 유지 필수 |
| `app/auth/callback/route.ts` | Google OAuth 콜백. @daplan.com 외 계정 강제 로그아웃 |
| Vultr `server.js` | 수정 후 반드시 `pm2 restart plus-nextjs` |
