/* ===========================
   Image Layer Drawing
   — 원본: plus_page_spread_통합.html 2905~2944행
=========================== */

import type { ImageLayer } from '@/types/layer';
import { hexToRgb, calcShadowColor } from '@/lib/colorHelpers';
import { applyFrameColorFilter } from './imageFilters';
import { applyFiltersWebGL, isFilterFrozen, type CameraRawFilters } from './webglFilters';

function buildFilterKey(layer: ImageLayer): string {
  return `${layer.imgLightness||0}|${layer.imgTemperature||0}|${layer.imgContrast||0}|${layer.imgHighlights||0}|${layer.imgShadows||0}|${layer.imgVibrance||0}|${layer.imgSaturation||0}`;
}

function hasAnyFilter(layer: ImageLayer): boolean {
  return (layer.imgLightness||0) !== 0 || (layer.imgTemperature||0) !== 0 ||
    (layer.imgContrast||0) !== 0 || (layer.imgHighlights||0) !== 0 ||
    (layer.imgShadows||0) !== 0 || (layer.imgVibrance||0) !== 0 || (layer.imgSaturation||0) !== 0;
}

/** 필터 적용된 캔버스를 반환 (프레임과 동일 방식, design 분기 없음). 필터 없으면 원본 그대로. */
function getFilteredSrc(layer: ImageLayer): HTMLImageElement | HTMLCanvasElement {
  if (!layer.img || !hasAnyFilter(layer)) return layer.img!;
  const filterKey = buildFilterKey(layer);
  const cached = layer._imgFilterCache;
  const hit = cached && cached.filterKey === filterKey && cached.url === layer.url;
  if (!hit && !isFilterFrozen()) {
    const f: CameraRawFilters = {
      exposure: layer.imgLightness || 0,
      temperature: layer.imgTemperature || 0,
      contrast: layer.imgContrast || 0,
      highlights: layer.imgHighlights || 0,
      shadows: layer.imgShadows || 0,
      vibrance: layer.imgVibrance || 0,
      saturation: layer.imgSaturation || 0,
    };
    const canvas = applyFiltersWebGL(layer.img, f)
      ?? applyFrameColorFilter(layer.img, f.exposure, f.temperature);
    layer._imgFilterCache = { filterKey, url: layer.url, canvas };
  }
  return layer._imgFilterCache?.canvas ?? layer.img;
}

export function drawImgLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  bgKeyColor: string,
  isExporting: boolean,
): void {
  if (!layer.img) {
    if (!isExporting) {
      const cx = layer.x + layer.w / 2;
      const cy = layer.y + layer.h / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(200,200,200,0.4)';
      ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
      ctx.strokeStyle = 'rgba(150,150,150,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(layer.x + 1, layer.y + 1, layer.w - 2, layer.h - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = '500 20px Pretendard';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('이미지를 드래그&드롭 또는 클릭하여 업로드', cx, cy);
      ctx.restore();
    }
    return;
  }

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (layer.shadow?.enabled) {
    const { r, g, b } = hexToRgb(layer.shadow.color || calcShadowColor(bgKeyColor));
    ctx.shadowColor = `rgba(${r},${g},${b},${layer.shadow.alpha ?? 0.2})`;
    ctx.shadowBlur = layer.shadow.blur ?? 10;
    ctx.shadowOffsetX = layer.shadow.offsetX ?? 0;
    ctx.shadowOffsetY = layer.shadow.offsetY ?? 20;
  }
  const src = getFilteredSrc(layer);
  if (layer.rotation) {
    ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
    ctx.rotate(layer.rotation * Math.PI / 180);
    ctx.drawImage(src, -layer.w / 2, -layer.h / 2, layer.w, layer.h);
  } else {
    ctx.drawImage(src, layer.x, layer.y, layer.w, layer.h);
  }
  ctx.restore();
}
