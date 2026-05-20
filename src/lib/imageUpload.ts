/* ===========================
   Image Upload Helpers
   — 원본: plus_page_spread_통합.html 3766~3841, 3875~3927행
=========================== */

import type { Layer, BackgroundLayer, FrameLayer, ImageLayer, LogoLayer } from '@/types/layer';
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
export async function compressForUpload(img: HTMLImageElement, maxBytes = 4 * 1024 * 1024): Promise<Blob> {
  const toBlob = (canvas: HTMLCanvasElement, q: number) =>
    new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', q));
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  for (const q of [0.85, 0.7, 0.5]) {
    const blob = await toBlob(canvas, q);
    if (blob.size <= maxBytes) return blob;
  }
  const scale = Math.sqrt(maxBytes / (img.naturalWidth * img.naturalHeight * 3));
  canvas.width = Math.floor(img.naturalWidth * scale);
  canvas.height = Math.floor(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return toBlob(canvas, 0.85);
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
