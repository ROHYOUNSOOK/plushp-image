/* ===========================
   Image Upload Helpers
   — 원본: plus_page_spread_통합.html 3766~3841, 3875~3927행
=========================== */

import type { BackgroundLayer, FrameLayer, ImageLayer, LogoLayer } from '@/types/layer';
import type { Page } from '@/types/page';
import { W, H } from '@/types/constants';
import { loadImage } from './utils';
import { extractDominantColor, calcAutoFillColor, calcShadowColor } from './colorHelpers';
import { recolorFrameByHueRotate } from '@/canvas/imageFilters';
import { makeLayer } from './layerFactory';

/** 배경 이미지 적용 + 전 페이지 색상 동기화 */
export function applyBackgroundImage(
  layer: BackgroundLayer,
  img: HTMLImageElement,
  url: string,
  pages: Page[],
): void {
  layer.img = img;
  layer.url = url;
  layer.solidColor = extractDominantColor(img);

  const autoColor = calcAutoFillColor(layer.solidColor);
  const shadowColor = calcShadowColor(layer.solidColor);

  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'textbox') l.fillColor = autoColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'med-title') (l as import('@/types/layer').MedTitleLayer).color = autoColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'logo' && l.stroke?.enabled) l.stroke.color = autoColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'logo' && l.shadow?.enabled) l.shadow.color = shadowColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'image' && l.shadow) l.shadow.color = shadowColor;
  }));
  // 프레임 마스크 색상 재처리 (배경 dominant color 기준)
  // 그리기 경로(drawFrame)와 동일한 함수·캐시 키를 사용해야 결과가 어긋나지 않는다.
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'frame' && (l as FrameLayer).frameMaskImg) {
      const fr = l as FrameLayer;
      fr.frameMaskProcessed = recolorFrameByHueRotate(fr.frameMaskImg!, layer.solidColor);
      fr._processedMaskKey = `${fr.frameMaskUrl || ''}__${layer.solidColor}`;
    }
  }));
}

/** PNG 마스크 업로드 시 dominant color 추출 → 전 페이지 색상 동기화 */
export function applyMaskImageColors(
  maskImg: HTMLImageElement,
  pages: Page[],
): void {
  const dominant = extractDominantColor(maskImg);
  const autoColor = calcAutoFillColor(dominant);
  const shadowColor = calcShadowColor(dominant);

  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'textbox') (l as import('@/types/layer').TextboxLayer).fillColor = autoColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'med-title') (l as import('@/types/layer').MedTitleLayer).color = autoColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'logo' && (l as import('@/types/layer').LogoLayer).stroke?.enabled)
      (l as import('@/types/layer').LogoLayer).stroke.color = autoColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'logo' && (l as import('@/types/layer').LogoLayer).shadow?.enabled)
      (l as import('@/types/layer').LogoLayer).shadow.color = shadowColor;
  }));
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'image' && (l as import('@/types/layer').ImageLayer).shadow)
      (l as import('@/types/layer').ImageLayer).shadow.color = shadowColor;
  }));
}

/** 프레임에 이미지 적용 (크기 맞춤) */
export function applyFrameImage(layer: FrameLayer, img: HTMLImageElement, url: string): void {
  const sc = Math.max(layer.w / img.naturalWidth, layer.h / img.naturalHeight);
  layer.img = img;
  layer.url = url;
  layer.imgScale = sc;
  layer.imgOffsetX = (layer.w - img.naturalWidth * sc) / 2;
  layer.imgOffsetY = (layer.h - img.naturalHeight * sc) / 2;
}

/** 이미지 레이어에 이미지 적용 (캔버스 맞춤) */
export function applyImageLayerImage(layer: ImageLayer, img: HTMLImageElement, url: string): void {
  layer.img = img;
  layer.url = url;
  const sc = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  layer.w = Math.round(img.naturalWidth * sc);
  layer.h = Math.round(img.naturalHeight * sc);
  layer.x = Math.round((W - layer.w) / 2);
  layer.y = Math.round((H - layer.h) / 2);
}

/** 로고에 이미지 적용 (고정 높이 86px) */
export function applyLogoImage(layer: LogoLayer, img: HTMLImageElement, url: string): void {
  layer.img = img;
  layer.url = url;
  const aspect = img.naturalWidth / img.naturalHeight;
  layer.h = 86;
  layer.w = Math.round(86 * aspect);
}

/** 캔버스 빈 공간에 드롭 시 새 이미지 레이어 생성 */
export function createDroppedImageLayer(
  img: HTMLImageElement,
  url: string,
  dropX: number,
  dropY: number,
): ImageLayer {
  const layer = makeLayer('image') as ImageLayer;
  const sc = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  layer.w = Math.round(img.naturalWidth * sc);
  layer.h = Math.round(img.naturalHeight * sc);
  layer.x = Math.round(dropX - layer.w / 2);
  layer.y = Math.round(dropY - layer.h / 2);
  layer.img = img;
  layer.url = url;
  return layer;
}

/** 전 페이지에 배경 이미지 일괄 적용 (의료법 페이지 제외) */
export function applyBgToAllPages(img: HTMLImageElement, url: string, pages: Page[]): void {
  pages.forEach(pg => {
    if (pg.isMedicalLaw) return; // 의료법 페이지는 배경 레이어 불필요
    if (!pg.layers.find(l => l.type === 'background')) {
      pg.layers.unshift(makeLayer('background') as BackgroundLayer);
    }
  });
  const page1Bg = pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
  if (page1Bg) applyBackgroundImage(page1Bg, img, url, pages);
  pages.slice(1).forEach(pg => {
    if (pg.isMedicalLaw) return;
    const bg = pg.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
    if (bg) { bg.img = img; bg.url = url; bg.solidColor = page1Bg?.solidColor ?? ''; }
  });
}

/** 파일에서 이미지 로드 (URL.createObjectURL 사용) */
/** 캔버스에 투명 픽셀이 있는지 검사 (PNG 투명 배경 보존 여부 판단용) */
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

// Vercel 서버리스 함수 요청 본문 한도(4.5MB)보다 낮은 안전 목표치.
// 압축 결과가 이 값을 넘으면 품질·해상도를 단계적으로 낮춰 재압축한다.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** 지정 해상도로 리샘플링한 캔버스를 만든다 (createImageBitmap 우선, 미지원 시 단계 리사이즈). */
async function resampleToCanvas(img: HTMLImageElement, targetW: number, targetH: number): Promise<HTMLCanvasElement> {
  const { naturalWidth: w, naturalHeight: h } = img;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(img, { resizeWidth: targetW, resizeHeight: targetH, resizeQuality: 'high' });
  } catch { /* 미지원 브라우저 → fallback */ }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
  } else {
    let curW = w, curH = h;
    let src: HTMLImageElement | HTMLCanvasElement = img;
    while (curW > targetW * 2 || curH > targetH * 2) {
      curW = Math.max(Math.round(curW / 2), targetW);
      curH = Math.max(Math.round(curH / 2), targetH);
      const step = document.createElement('canvas');
      step.width = curW; step.height = curH;
      const sCtx = step.getContext('2d')!;
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(src, 0, 0, curW, curH);
      src = step;
    }
    ctx.drawImage(src, 0, 0, targetW, targetH);
  }
  return canvas;
}

export async function compressForUpload(img: HTMLImageElement): Promise<Blob> {
  const toBlob = (canvas: HTMLCanvasElement, mime: string, q: number) =>
    new Promise<Blob>(res => canvas.toBlob(b => res(b!), mime, q));

  const { naturalWidth: w, naturalHeight: h } = img;
  // 해상도 후보: 큰 이미지가 목표 용량을 못 맞추면 순차적으로 더 줄인다.
  const MAX_PX_STEPS = [2160, 1920, 1600, 1280];

  let lastBlob: Blob | null = null;

  for (const maxPx of MAX_PX_STEPS) {
    const finalScale = Math.min(1, maxPx / Math.max(w, h));
    const targetW = Math.round(w * finalScale);
    const targetH = Math.round(h * finalScale);
    const canvas = await resampleToCanvas(img, targetW, targetH);

    // PNG 투명 배경 보존: 알파 채널 있으면 PNG로 저장 (JPEG는 알파 미지원 → 투명이 검게 채워짐).
    // PNG는 품질 조절이 안 되므로 용량이 크면 해상도를 낮춰 재시도한다.
    if (hasTransparency(canvas)) {
      const png = await toBlob(canvas, 'image/png', 1.0);
      lastBlob = png;
      if (png.size <= MAX_UPLOAD_BYTES) return png;
      continue; // 다음(더 작은) 해상도로 재시도
    }

    // 불투명 이미지: Unsharp Mask 적용 후 JPEG 품질을 단계적으로 낮춰 목표 용량 이하로.
    const output = document.createElement('canvas');
    output.width = targetW;
    output.height = targetH;
    const oCtx = output.getContext('2d')!;
    oCtx.filter = 'contrast(1.08) saturate(1.05)';
    oCtx.drawImage(canvas, 0, 0);
    oCtx.filter = 'none';

    for (const q of [1.0, 0.92, 0.85, 0.78]) {
      const jpg = await toBlob(output, 'image/jpeg', q);
      lastBlob = jpg;
      if (jpg.size <= MAX_UPLOAD_BYTES) return jpg;
    }
    // 이 해상도의 최저 품질로도 목표 초과 → 다음(더 작은) 해상도로 재시도
  }

  // 모든 단계를 거쳐도 목표를 못 맞추면 마지막 결과라도 반환 (최선의 노력)
  return lastBlob!;
}

export async function loadImageFromFile(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return { img, url };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('이미지 로드 실패');
  }
}

/**
 * 업로드용으로 압축한 뒤, 그 압축본을 다시 이미지로 로드해서 함께 반환한다.
 * 편집 시 표시하는 이미지와 서버에 저장되는 이미지의 해상도를 일치시켜,
 * 프레임 내부 이미지의 imgScale/offset이 템플릿 재로드 시에도 어긋나지 않게 한다.
 */
export async function compressForUploadWithImage(
  src: HTMLImageElement,
): Promise<{ blob: Blob; img: HTMLImageElement; url: string }> {
  const blob = await compressForUpload(src);
  const url = URL.createObjectURL(blob);
  const img = await loadImage(url);
  return { blob, img, url };
}

/**
 * 스케줄 폴더에 이미지를 업로드한다 (Vultr schedule/폴더명/pageIndex[_suffix].jpg).
 * suffix 없으면 프레임 내부 이미지(N.jpg)와 동일한 파일명 규칙,
 * suffix 있으면 이미지 레이어 전용 파일명으로 분리 저장되어 프레임과 충돌하지 않는다.
 */
export async function uploadScheduleImage(
  folderName: string,
  pageIndex: number,
  blob: Blob,
  suffix?: string,
): Promise<string | null> {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const formData = new FormData();
  formData.append('file', blob, `image.${ext}`);
  formData.append('folderName', folderName);
  formData.append('pageIndex', String(pageIndex));
  if (suffix) formData.append('suffix', suffix);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch('/api/upload-schedule-image', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return data.url ?? null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// 이미지 레이어 전용 파일명 패턴 (숫자_img접미사.ext) — 프레임 내부 이미지(숫자.ext)는 매치되지 않음
const IMAGE_LAYER_FILENAME_RE = /^\d+_img[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

/** url이 이미지 레이어 전용 파일명 패턴(_img 접미사)인지 검사 */
export function isImageLayerUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const filename = url.split('/').pop() ?? '';
  return IMAGE_LAYER_FILENAME_RE.test(filename);
}

/**
 * 스케줄 폴더의 파일 하나를 삭제한다 (서버가 _img 접미사 패턴만 허용 — 이중 안전장치로 여기서도 검사).
 * 실패해도 무시(best-effort).
 */
async function deleteScheduleFile(folderName: string, filename: string): Promise<void> {
  if (!IMAGE_LAYER_FILENAME_RE.test(filename)) return;
  try {
    await fetch('/api/delete-schedule-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName, filename }),
    });
  } catch { /* best-effort, 실패 무시 */ }
}

/**
 * 이미지 레이어를 교체할 때, 그 레이어가 이전에 서버에 올렸던 파일을 삭제한다.
 * (같은 레이어 인스턴스 안에서 이미지를 바꾸는 경우 전용 — 레이어 삭제/Undo와는 무관)
 */
export async function deleteOldImageLayerFile(folderName: string, oldUrl: string | null): Promise<void> {
  if (!oldUrl) return;
  const filename = oldUrl.split('/').pop() ?? '';
  await deleteScheduleFile(folderName, filename);
}

/**
 * 템플릿 저장 시점에 호출 — 스케줄 폴더의 _img 접미사 파일 중,
 * 지금 저장되는 최종 페이지 상태에서 더 이상 어떤 레이어도 참조하지 않는 파일을 정리한다.
 * Undo로 되돌린 뒤 저장하면 그 레이어의 url이 referencedUrls에 다시 포함되므로 삭제되지 않는다
 * (레이어 삭제 즉시 지우지 않고 "저장(확정) 시점"에만 정리 → Undo와 충돌 없음).
 * 프레임 내부 이미지(_img 접미사 없음)는 애초에 목록에서 걸러지므로 절대 삭제되지 않는다.
 */
export async function pruneOrphanedImageLayerFiles(
  folderName: string,
  referencedUrls: (string | null | undefined)[],
): Promise<void> {
  try {
    const { listScheduleFolderFiles } = await import('./supabase');
    const allFiles = await listScheduleFolderFiles(folderName);
    const imageLayerFiles = allFiles.filter(f => IMAGE_LAYER_FILENAME_RE.test(f));
    if (imageLayerFiles.length === 0) return;

    const referencedFilenames = new Set(
      referencedUrls.filter(Boolean).map(u => (u as string).split('/').pop())
    );
    const orphaned = imageLayerFiles.filter(f => !referencedFilenames.has(f));
    await Promise.all(orphaned.map(f => deleteScheduleFile(folderName, f)));
  } catch { /* best-effort, 실패 무시 */ }
}
