/* ===========================
   Frame Layer Drawing
   — 원본: plus_page_spread_통합.html 2744~2903행
=========================== */

import type { FrameLayer } from '@/types/layer';
import { hexToRgb, calcShadowColor, calcFrameFillColor, hasTransparentPixels } from '@/lib/colorHelpers';
import { recolorFrameByHueRotate } from './imageFilters';
import { frameShapePath } from './pathHelpers';
import { applyFrameColorFilter, buildInnerHoleMask } from './imageFilters';

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  layer: FrameLayer,
  bgKeyColor: string,
  isExporting: boolean,
): void {
  const shape = layer.shape || 'rect';
  const rad = layer.radius || 0;
  const rotation = layer.rotation || 0;
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (rotation) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
  }

  // ── PNG 마스크 클리핑 모드 ──
  if (layer.frameMaskImg) {
    _drawPngMaskFrame(ctx, layer, bgKeyColor, isExporting);
    ctx.restore();
    return;
  }

  // ── 1. 그림자 ──
  if (layer.shadow?.enabled) {
    ctx.save();
    const { r, g, b } = hexToRgb(layer.shadow.color || calcShadowColor(bgKeyColor));
    ctx.shadowColor = `rgba(${r},${g},${b},${layer.shadow.alpha ?? 0.2})`;
    ctx.shadowBlur = layer.shadow.blur ?? 10;
    ctx.shadowOffsetX = layer.shadow.offsetX ?? 0;
    ctx.shadowOffsetY = layer.shadow.offsetY ?? 20;
    ctx.beginPath();
    frameShapePath(ctx, layer.x, layer.y, layer.w, layer.h, shape, rad, 0);
    ctx.fillStyle = layer.fill || calcFrameFillColor(bgKeyColor);
    ctx.fill();
    ctx.restore();
  }

  // ── 2. 클리핑 후 내부 콘텐츠 ──
  ctx.save();
  ctx.beginPath();
  frameShapePath(ctx, layer.x, layer.y, layer.w, layer.h, shape, rad, 0);
  ctx.clip();
  ctx.fillStyle = layer.fill || calcFrameFillColor(bgKeyColor);
  ctx.fillRect(layer.x, layer.y, layer.w, layer.h);

  if (layer.img) {
    const imgRot = layer.imgRotation || 0;
    const iw = layer.img.naturalWidth * layer.imgScale;
    const ih = layer.img.naturalHeight * layer.imgScale;
    const ix = layer.x + layer.imgOffsetX + iw / 2;
    const iy = layer.y + layer.imgOffsetY + ih / 2;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate((imgRot - rotation) * Math.PI / 180);

    const _lv = layer.imgLightness || 0, _tv = layer.imgTemperature || 0;
    let _drawSrc: HTMLImageElement | HTMLCanvasElement = layer.img;
    if (layer.frameType !== 'design' && (_lv !== 0 || _tv !== 0)) {
      const _c = layer._imgFilterCache;
      if (!_c || _c.lightness !== _lv || _c.temperature !== _tv || _c.url !== layer.url) {
        layer._imgFilterCache = { lightness: _lv, temperature: _tv, url: layer.url, canvas: applyFrameColorFilter(layer.img, _lv, _tv) };
      }
      _drawSrc = layer._imgFilterCache!.canvas;
    }
    ctx.drawImage(_drawSrc, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  } else if (!isExporting) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = '500 20px Pretendard';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('이미지를 드래그&드롭 또는 클릭하여 업로드', cx, cy);
  }
  ctx.restore();

  // ── 3. 외곽선 ──
  if (layer.stroke?.enabled) {
    ctx.save();
    const sw = layer.stroke.width || 3;
    const { r: sr, g: sg, b: sb } = hexToRgb(layer.stroke.color || '#000000');
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${layer.stroke.alpha ?? 1})`;
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    frameShapePath(ctx, layer.x, layer.y, layer.w, layer.h, shape, rad, sw / 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/* ── PNG 마스크 프레임 내부 함수 ── */

function _drawPngMaskFrame(
  ctx: CanvasRenderingContext2D,
  layer: FrameLayer,
  bgKeyColor: string,
  isExporting: boolean,
): void {
  const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
  const pw = Math.round(layer.w * dpr);
  const ph = Math.round(layer.h * dpr);

  // ── 투명도 및 내부 구멍 캐시 ──
  if (layer._maskTransparencyUrl !== layer.frameMaskUrl || layer._maskHasTransparency === undefined) {
    try {
      layer._maskHasTransparency = hasTransparentPixels(layer.frameMaskImg!);
    } catch {
      layer._maskHasTransparency = true; // CORS 오류 시 투명으로 간주
    }
    layer._maskTransparencyUrl = layer.frameMaskUrl;
  }

  // 내부 구멍 마스크 빌드/캐시
  let holeCanvas: HTMLCanvasElement | null = null;
  if (layer._maskHasTransparency) {
    // frameMaskUrl 없을 때 img src로 캐시 키 구성
    const maskKey = layer.frameMaskUrl ?? layer.frameMaskImg?.src ?? '';
    const holeCacheKey = `${maskKey}__${layer.w}__${layer.h}`;
    if (!layer._holeCanvas || layer._holeCacheKey !== holeCacheKey) {
      try {
        layer._holeCanvas = buildInnerHoleMask(layer.frameMaskImg!, layer.w, layer.h);
      } catch {
        layer._holeCanvas = null;
      }
      layer._holeCacheKey = holeCacheKey;
    }
    holeCanvas = layer._holeCanvas;
  }

  // ── 내부 이미지 오프스크린 ──
  const ofc = document.createElement('canvas');
  ofc.width = pw; ofc.height = ph;
  const oCtx = ofc.getContext('2d')!;
  oCtx.scale(dpr, dpr);

  oCtx.fillStyle = layer.fill || calcFrameFillColor(bgKeyColor);
  oCtx.fillRect(0, 0, layer.w, layer.h);

  if (layer.img) {
    const imgRot = layer.imgRotation || 0;
    const iw = layer.img.naturalWidth * layer.imgScale;
    const ih = layer.img.naturalHeight * layer.imgScale;
    oCtx.save();
    oCtx.translate(layer.imgOffsetX + iw / 2, layer.imgOffsetY + ih / 2);
    oCtx.rotate((imgRot - (layer.rotation || 0)) * Math.PI / 180);
    const _lv = layer.imgLightness || 0, _tv = layer.imgTemperature || 0;
    let _drawSrc: HTMLImageElement | HTMLCanvasElement = layer.img;
    if (_lv !== 0 || _tv !== 0) {
      const _c = layer._imgFilterCache;
      if (!_c || _c.lightness !== _lv || _c.temperature !== _tv || _c.url !== layer.url) {
        layer._imgFilterCache = { lightness: _lv, temperature: _tv, url: layer.url, canvas: applyFrameColorFilter(layer.img, _lv, _tv) };
      }
      _drawSrc = layer._imgFilterCache!.canvas;
    }
    oCtx.drawImage(_drawSrc, -iw / 2, -ih / 2, iw, ih);
    oCtx.restore();
  } else if (!isExporting) {
    oCtx.fillStyle = 'rgba(0,0,0,0.25)';
    oCtx.font = '500 20px Pretendard';
    oCtx.textAlign = 'center'; oCtx.textBaseline = 'middle';
    oCtx.fillText('이미지를 업로드하세요', layer.w / 2, layer.h / 2);
  }

  // 내부 구멍에만 클리핑 (destination-in)
  if (holeCanvas) {
    oCtx.globalCompositeOperation = 'destination-in';
    oCtx.drawImage(holeCanvas, 0, 0, layer.w, layer.h);
    oCtx.globalCompositeOperation = 'source-over';
  }

  // 메인 캔버스에 내부 이미지 배치 (구멍 영역만)
  ctx.drawImage(ofc, layer.x, layer.y, layer.w, layer.h);

  // PNG 마스크를 장식으로 위에 그리기 — 색상 치환 (캐시)
  const _maskKey = `${layer.frameMaskUrl || ''}__${bgKeyColor}`;
  if (layer._maskHasTransparency) {
    if (!layer.frameMaskProcessed || layer._processedMaskKey !== _maskKey) {
      // 배경색보다 밝게(+30) 치환해서 마스크가 배경에 묻히지 않도록
      layer.frameMaskProcessed = recolorFrameByHueRotate(layer.frameMaskImg!, bgKeyColor);
      layer._processedMaskKey = _maskKey;
    }
  } else {
    // 일반 사진(투명 없음) — 색상 치환 없이 원본 그대로
    layer.frameMaskProcessed = null;
    layer._processedMaskKey = undefined;
  }
  const maskToDraw = layer.frameMaskProcessed ?? layer.frameMaskImg!;

  // 비율 유지(contain) — 원본 마스크 비율 그대로 프레임 중앙에 오버레이
  const _origW = layer.frameMaskImg!.naturalWidth;
  const _origH = layer.frameMaskImg!.naturalHeight;
  const _sc = Math.min(layer.w / _origW, layer.h / _origH);
  const _mw = _origW * _sc, _mh = _origH * _sc;
  const _mx = layer.x + (layer.w - _mw) / 2;
  const _my = layer.y + (layer.h - _mh) / 2;

  if (layer.shadow?.enabled) {
    ctx.save();
    const { r, g, b } = hexToRgb(layer.shadow.color || calcShadowColor(bgKeyColor));
    ctx.shadowColor = `rgba(${r},${g},${b},${layer.shadow.alpha ?? 0.2})`;
    ctx.shadowBlur = layer.shadow.blur ?? 10;
    ctx.shadowOffsetX = layer.shadow.offsetX ?? 0;
    ctx.shadowOffsetY = layer.shadow.offsetY ?? 20;
    ctx.drawImage(maskToDraw, _mx, _my, _mw, _mh);
    ctx.restore();
  } else {
    ctx.drawImage(maskToDraw, _mx, _my, _mw, _mh);
  }
}
