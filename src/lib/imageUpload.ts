/* ===========================
   Image Upload Helpers
   — 원본: plus_page_spread_통합.html 3766~3841, 3875~3927행
=========================== */

import type { BackgroundLayer, FrameLayer, ImageLayer, LogoLayer } from '@/types/layer';
import type { Page } from '@/types/page';
import { W, H } from '@/types/constants';
import { loadImage } from './utils';
import { extractDominantColor, calcAutoFillColor, calcShadowColor, replaceTextboxImageColors } from './colorHelpers';
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
  pages.forEach(pg => pg.layers.forEach(l => {
    if (l.type === 'frame' && (l as FrameLayer).frameMaskImg) {
      (l as FrameLayer).frameMaskProcessed = replaceTextboxImageColors(
        (l as FrameLayer).frameMaskImg!,
        layer.solidColor,
      );
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

export async function compressForUpload(img: HTMLImageElement): Promise<Blob> {
  const MAX_PX = 2160;
  const toBlob = (canvas: HTMLCanvasElement, mime: string, q: number) =>
    new Promise<Blob>(res => canvas.toBlob(b => res(b!), mime, q));

  const { naturalWidth: w, naturalHeight: h } = img;
  const finalScale = Math.min(1, MAX_PX / Math.max(w, h));
  const targetW = Math.round(w * finalScale);
  const targetH = Math.round(h * finalScale);

  // 1. createImageBitmap으로 고품질 리샘플링 (브라우저 최적 알고리즘)
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(img, {
      resizeWidth: targetW,
      resizeHeight: targetH,
      resizeQuality: 'high',
    });
  } catch { /* 미지원 브라우저 → fallback */ }

  // 최종 캔버스
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
    // fallback: 단계적 리사이즈
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

  // PNG 투명 배경 보존: 알파 채널 있으면 JPEG(불투명 강제) 대신 PNG로 저장
  // (JPEG는 알파를 지원하지 않아 투명 영역이 검은색으로 채워짐)
  if (hasTransparency(canvas)) {
    return toBlob(canvas, 'image/png', 1.0);
  }

  // 2. Unsharp Mask — 새 캔버스에 contrast/sharpen 필터 적용 (자기 자신에게 적용 금지)
  const output = document.createElement('canvas');
  output.width = targetW;
  output.height = targetH;
  const oCtx = output.getContext('2d')!;
  oCtx.filter = 'contrast(1.08) saturate(1.05)';
  oCtx.drawImage(canvas, 0, 0);
  oCtx.filter = 'none';

  return toBlob(output, 'image/jpeg', 1.0);
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
