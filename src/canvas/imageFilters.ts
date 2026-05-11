/* ===========================
   Image Filters (순수 TS, React 의존 없음)
   — 원본: plus_page_spread_통합.html 1492~1516행
=========================== */

import { clamp } from '@/lib/utils';
import { rgbToHslArr, hslToRgbArr, hexToRgb } from '@/lib/colorHelpers';

/** 프레임 이미지 색상 필터 (밝기 + 색온도) — 결과를 canvas로 반환 (동기) */
export function applyFrameColorFilter(
  img: HTMLImageElement,
  lightness: number,
  temperature: number,
): HTMLCanvasElement {
  const oc = document.createElement('canvas');
  oc.width = img.naturalWidth;
  oc.height = img.naturalHeight;
  const oct = oc.getContext('2d')!;
  oct.drawImage(img, 0, 0);
  const id = oct.getImageData(0, 0, oc.width, oc.height);
  const d = id.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    // 색온도 (쿨톤 ↔ 웜톤)
    if (temperature > 0) {
      r += temperature * 0.5;
      g += temperature * 0.2;
      b -= temperature * 0.3;
    } else {
      r += temperature * 0.3;
      g += temperature * 0.1;
      b -= temperature * 0.5;
    }

    // 밝기 (HSL lightness shift)
    if (lightness !== 0) {
      r = clamp(Math.round(r), 0, 255);
      g = clamp(Math.round(g), 0, 255);
      b = clamp(Math.round(b), 0, 255);
      const hsl = rgbToHslArr(r, g, b);
      hsl[2] = Math.max(0, Math.min(100, hsl[2] + lightness));
      const rgb = hslToRgbArr(hsl[0], hsl[1], hsl[2]);
      r = rgb[0]; g = rgb[1]; b = rgb[2];
    }

    d[i] = clamp(Math.round(r), 0, 255);
    d[i + 1] = clamp(Math.round(g), 0, 255);
    d[i + 2] = clamp(Math.round(b), 0, 255);
  }

  oct.putImageData(id, 0, 0);
  return oc;
}

/**
 * 프레임 PNG의 dominant hue를 배경 색상 hue로 회전시켜 재색상화
 * replaceTextboxImageColors 대신 사용 — 채도 무관하게 모든 컬러 픽셀에 적용
 */
export function recolorFrameByHueRotate(
  img: HTMLImageElement,
  targetHex: string,
): HTMLCanvasElement {
  const { r, g, b } = hexToRgb(targetHex);
  const [targetH] = rgbToHslArr(r, g, b);

  // 프레임 dominant hue 추출 (성능상 128px 이하로 샘플링)
  let hueDiff = targetH; // fallback: 그냥 targetH만큼 회전
  try {
    const sampleSize = Math.min(img.naturalWidth, 128);
    const tmp = document.createElement('canvas');
    tmp.width = sampleSize;
    tmp.height = Math.round(sampleSize * (img.naturalHeight / img.naturalWidth));
    const tCtx = tmp.getContext('2d')!;
    tCtx.drawImage(img, 0, 0, tmp.width, tmp.height);
    const data = tCtx.getImageData(0, 0, tmp.width, tmp.height).data;

    const hueCount: Record<number, number> = {};
    let maxCount = 0, dominantH = -1;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) continue;
      const [h, s] = rgbToHslArr(data[i], data[i + 1], data[i + 2]);
      if (s < 20) continue;
      const hk = Math.floor(h / 5) * 5;
      hueCount[hk] = (hueCount[hk] || 0) + 1;
      if (hueCount[hk] > maxCount) { maxCount = hueCount[hk]; dominantH = hk; }
    }

    if (dominantH >= 0) {
      hueDiff = targetH - dominantH;
      if (hueDiff > 180) hueDiff -= 360;
      if (hueDiff < -180) hueDiff += 360;
    }
  } catch { /* CORS 등 실패 시 fallback */ }

  const out = document.createElement('canvas');
  out.width = img.naturalWidth;
  out.height = img.naturalHeight;
  const ctx = out.getContext('2d')!;
  ctx.filter = `hue-rotate(${hueDiff}deg)`;
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';
  return out;
}

/** PNG 마스크에서 "내부 구멍"만 추출하는 마스크 캔버스 생성 (BFS). 구멍 없으면 null 반환 */
export function buildInnerHoleMask(
  maskImg: HTMLImageElement,
  w: number,
  h: number,
): HTMLCanvasElement | null {
  const SCALE = Math.min(1, 2048 / Math.max(w, h));
  const sw = Math.round(w * SCALE), sh = Math.round(h * SCALE);

  const tmp = document.createElement('canvas');
  tmp.width = sw; tmp.height = sh;
  const tCtx = tmp.getContext('2d')!;
  const _mAspW = maskImg.naturalWidth, _mAspH = maskImg.naturalHeight;
  const _sc = Math.min(sw / _mAspW, sh / _mAspH);
  const _mw = _mAspW * _sc, _mh = _mAspH * _sc;
  const _mx = (sw - _mw) / 2, _my = (sh - _mh) / 2;
  tCtx.drawImage(maskImg, _mx, _my, _mw, _mh);
  const data = tCtx.getImageData(0, 0, sw, sh).data;
  const total = sw * sh;

  // BFS: 가장자리에서 시작해 투명(α<16) 픽셀을 "외부"로 표시
  const HOLE_THRESH = 16;
  const isExterior = new Uint8Array(total);
  const queue: number[] = [];
  const enqueue = (idx: number) => {
    if (!isExterior[idx] && data[idx * 4 + 3] < HOLE_THRESH) {
      isExterior[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < sw; x++) { enqueue(x); enqueue((sh - 1) * sw + x); }
  for (let y = 1; y < sh - 1; y++) { enqueue(y * sw); enqueue(y * sw + sw - 1); }

  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const x2 = idx % sw, y2 = (idx / sw) | 0;
    if (x2 > 0)      enqueue(idx - 1);
    if (x2 < sw - 1) enqueue(idx + 1);
    if (y2 > 0)      enqueue(idx - sw);
    if (y2 < sh - 1) enqueue(idx + sw);
  }

  // 내부 구멍(투명 + 외부 아님) → 불투명, 나머지 → 투명
  const maskOut = tCtx.createImageData(sw, sh);
  let holePixelCount = 0;
  for (let i = 0; i < total; i++) {
    const isInnerHole = data[i * 4 + 3] < HOLE_THRESH && !isExterior[i];
    maskOut.data[i * 4] = maskOut.data[i * 4 + 1] = maskOut.data[i * 4 + 2] = 255;
    maskOut.data[i * 4 + 3] = isInnerHole ? 255 : 0;
    if (isInnerHole) holePixelCount++;
  }

  // 내부 구멍이 없으면 null 반환 → destination-in 건너뜀
  if (holePixelCount === 0) return null;

  tCtx.putImageData(maskOut, 0, 0);

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const outCtx = out.getContext('2d')!;
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(tmp, 0, 0, w, h);
  return out;
}
