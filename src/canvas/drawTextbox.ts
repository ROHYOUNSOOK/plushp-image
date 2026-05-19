/* ===========================
   Textbox Layer Drawing
   — 원본: plus_page_spread_통합.html 2946~3018행
=========================== */

import type { TextboxLayer } from '@/types/layer';
import { hexToRgb, calcAutoFillColor, calcShadowColor } from '@/lib/colorHelpers';
import { calcTextboxPos } from '@/lib/utils';
import { rrPath } from './pathHelpers';
import { wrapText } from './drawText';
import { W } from '@/types/constants';

export function drawTextbox(
  ctx: CanvasRenderingContext2D,
  layer: TextboxLayer,
  bgKeyColor: string,
  editMode = false,
): void {
  const fs = layer.fontSize || 48;
  const padT = layer.paddingTop ?? 20;
  const padR = layer.paddingRight ?? 20;
  const padB = layer.paddingBottom ?? 20;
  const padL = layer.paddingLeft ?? 20;
  const fontStr = `${layer.fontWeight || '700'} ${fs}px ${layer.font || 'Pretendard'}`;

  // ── autoSize: 텍스트 길이 + 패딩으로 w/h 자동 계산 ──
  ctx.save();
  ctx.font = fontStr;
  let lines: string[];
  if (layer.autoSize !== false) {
    lines = (layer.content || ' ').split('\n').map(l => l || ' ');
    let maxLineW = 0;
    lines.forEach(l => { maxLineW = Math.max(maxLineW, ctx.measureText(l).width); });
    const lh = fs * (layer.lineHeight || 1);
    layer.w = Math.max(W, Math.ceil(maxLineW + padL + padR));
    layer.h = Math.ceil((lines.length - 1) * lh + fs + padT + padB);
    if (layer.positionPreset && !layer.freePos) {
      const pos = calcTextboxPos(layer.positionPreset, layer.w, layer.h);
      layer.x = pos.x; layer.y = pos.y;
    }
  } else {
    lines = wrapText(ctx, layer.content || '', layer.w - padL - padR);
  }
  ctx.restore();

  // ── 배경 박스 ──
  ctx.save();
  if (layer.shadow?.enabled) {
    const { r, g, b } = hexToRgb(layer.shadow.color || calcShadowColor(bgKeyColor));
    ctx.shadowColor = `rgba(${r},${g},${b},${layer.shadow.alpha ?? 0.2})`;
    ctx.shadowBlur = layer.shadow.blur ?? 10;
    ctx.shadowOffsetX = layer.shadow.offsetX ?? 0;
    ctx.shadowOffsetY = layer.shadow.offsetY ?? 20;
  }

  if (layer.processedImg) {
    // PNG 이미지 템플릿 모드: 색상 치환된 이미지를 레이어 크기에 맞춰 그리기
    ctx.globalAlpha = layer.fillAlpha ?? 1;
    ctx.drawImage(layer.processedImg, layer.x, layer.y, layer.w, layer.h);
    ctx.globalAlpha = 1;
  } else {
    const _fillHex = layer.fillColor || calcAutoFillColor(bgKeyColor);
    const { r: fr, g: fg, b: fb } = hexToRgb(_fillHex);
    ctx.fillStyle = `rgba(${fr},${fg},${fb},${layer.fillAlpha ?? 1})`;
    ctx.beginPath();
    rrPath(ctx, layer.x, layer.y, layer.w, layer.h, layer.radius || 0);
    ctx.fill();

    if (layer.border?.enabled) {
      const { r: br, g: bg, b: bb } = hexToRgb(layer.border.color || '#ffffff');
      ctx.strokeStyle = `rgba(${br},${bg},${bb},${layer.border.alpha ?? 1})`;
      ctx.lineWidth = layer.border.width || 2;
      ctx.beginPath();
      rrPath(ctx, layer.x, layer.y, layer.w, layer.h, layer.radius || 0);
      ctx.stroke();
    }
  }
  ctx.restore();

  // ── 텍스트 ──
  if (editMode) return;
  if (!layer.content) return;
  ctx.save();
  ctx.font = fontStr;
  ctx.fillStyle = layer.textColor || '#ffffff';
  ctx.textAlign = layer.textAlign || 'left';
  ctx.textBaseline = 'top';
  const lh = fs * (layer.lineHeight || 1);
  const totalTextH = (lines.length - 1) * lh + fs;
  const vAlign = layer.vAlign || 'center';
  let curY = vAlign === 'center' ? layer.y + (layer.h - totalTextH) / 2
           : vAlign === 'bottom' ? layer.y + layer.h - padB - totalTextH
           :                       layer.y + padT;
  const ax = layer.textAlign === 'center' ? layer.x + padL + (layer.w - padL - padR) / 2
           : layer.textAlign === 'right'  ? layer.x + layer.w - padR
           :                                layer.x + padL;
  lines.forEach(line => { ctx.fillText(line, ax, curY); curY += lh; });
  ctx.restore();
}
