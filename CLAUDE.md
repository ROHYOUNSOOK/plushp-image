@AGENTS.md

# Plus 레이어 편집기 — 개발 가이드

## 프로젝트 개요

병원 SNS 포스팅용 이미지 편집기. 스케줄(기획안)을 선택하면 문구 페이지 N장 + 원장님 페이지 + 의료법 페이지를 자동 생성하고, 캔버스에서 레이어를 편집 후 이미지로 내보내는 도구다.

**배포:** Vercel (https://plushp-image.vercel.app)  
**스택:** Next.js 16 (App Router) · React 19 · Zustand 5 · Supabase · TailwindCSS 4 · TypeScript

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
- `plus_schedule` — 스케줄(기획안) 데이터
- `plus_doctors` — 의사 정보 (이름, 전문과, 진료과, 이미지 ID)

---

## 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── proxy-image/      ← Vultr HTTP 이미지 프록시 (Cache-Control: no-store)
│   │   ├── plus-template/    ← 클라우드 템플릿 저장/불러오기 프록시
│   │   └── upload-schedule-image/ ← 프레임 내부 이미지 업로드 프록시
│   └── editor/               ← 편집기 페이지
│
├── canvas/                   ← 캔버스 렌더링 (순수 TS, React 없음)
│   ├── draw.ts               ← 메인 렌더 진입점
│   ├── drawFrame.ts          ← 프레임 레이어 렌더
│   ├── drawTextbox.ts        ← 텍스트박스 렌더
│   ├── drawMedicalLaw.ts     ← 의료법 페이지 전용 렌더러
│   └── export.ts             ← 이미지 내보내기
│
├── components/
│   ├── editor/
│   │   ├── EditorShell.tsx   ← 편집기 전체 레이아웃 + 툴바
│   │   ├── SchedulePanel.tsx ← 스케줄 선택 UI (로직은 hooks로 분리)
│   │   ├── CanvasArea.tsx    ← 캔버스 + 인터랙션
│   │   └── PropsPanel.tsx    ← 레이어 속성 패널
│   └── props/                ← 레이어 타입별 속성 컴포넌트
│
├── hooks/
│   ├── useScheduleData.ts    ← 스케줄/의사 데이터 로딩
│   ├── useScheduleApplication.ts ← 스케줄 적용 + 배경 로직
│   ├── useSyncColors.ts      ← 배경 변경 시 색상 자동 동기화
│   └── usePlanForm.ts        ← 기획안 저장/수정 (DB + 에디터 초기화)
│
├── lib/
│   ├── applySchedule.ts      ← 스케줄 → 페이지 빌드 순수 함수
│   ├── colorSync.ts          ← 전 페이지 색상 동기화 순수 함수
│   ├── colorHelpers.ts       ← HSL 색상 계산 유틸
│   ├── templateIO.ts         ← 템플릿 저장/불러오기 (로컬 + 클라우드)
│   ├── imageUpload.ts        ← 이미지 적용 유틸 (applyBgToAllPages 포함)
│   ├── supabase.ts           ← DB 클라이언트 + 이미지 로드 유틸
│   ├── doctorCardTemplate.ts ← 원장님 페이지 레이아웃 계산
│   └── backgroundLoader.ts  ← 랜덤 배경 이미지 로드
│
├── store/
│   ├── editorStore.ts        ← Zustand 전역 상태 (모든 액션 집중)
│   ├── historySlice.ts       ← Undo/Redo 로직
│   ├── imageCache.ts         ← HTMLImageElement 세션 캐시
│   └── colorSync.ts          ← (lib/colorSync.ts 참조)
│
└── types/
    ├── layer.ts              ← 레이어 타입 정의
    ├── page.ts               ← Page, MedConfig 타입
    └── constants.ts          ← 캔버스 크기 (W=1080, H=1080)
```

---

## 핵심 데이터 흐름

### 스케줄 적용
```
SchedulePanel (UI)
  → useScheduleApplication.applySelectedSchedule()
    → loadDoctorImages()       ← Vultr /plus_doctors/{id}.jpg
    → loadRandomFrameImages()  ← Vultr /plus_frame/ 랜덤
    → loadScheduleInnerImages() ← Vultr /schedule/폴더명/N.jpg
    → editorStore.applySchedule()
      → buildSchedulePages()   ← 순수 함수, 페이지 배열 생성
    → applyBgToAllPages()      ← 랜덤 배경 전 페이지 적용
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
로컬 저장: saveTemplate() → JSON 다운로드
클라우드 저장: saveCloudTemplate() → /api/plus-template → Vultr 폴더명.json
클라우드 불러오기: loadCloudTemplate() → currentScheduleRow 기준 폴더 자동 탐색
```

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

## 로컬 개발 환경

```bash
cd plus-next
npm install
npm run dev   # http://localhost:3000
```

`.env.local` 필요:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> **주의:** 로컬(HTTP)에서는 Vultr 이미지 직접 fetch가 CORS로 실패함.
> 스케줄 이미지 관련 기능은 Vercel 배포 환경에서 테스트 필요.

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
| `lib/templateIO.ts` | serializeLayer에서 blob URL은 base64 변환, remote URL은 그대로 저장 |
| `canvas/drawMedicalLaw.ts` | 의료법 전용 렌더러. Page.layers 미사용 |
| `store/editorStore.ts` | 모든 상태 변경 집중. 여기서 직접 이미지 로드 금지 |
| `app/api/proxy-image/route.ts` | Cache-Control: no-store 유지 필수 |
| Vultr `server.js` | 수정 후 반드시 `pm2 restart plus-nextjs` |
