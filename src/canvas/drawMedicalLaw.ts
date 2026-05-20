/* ===========================
   Medical Law Page Drawing + med_ 헬퍼 함수
   — 원본: plus_page_spread_통합.html 2380~2586행
   — 순수 TS, React 의존 없음
=========================== */

import type { Page } from '@/types/page';
import type { BackgroundLayer, LogoLayer, MedBoxLayer, MedTitleLayer, MedDescLayer } from '@/types/layer';
import { calcAutoFillColor } from '@/lib/colorHelpers';
import { drawLogo } from './drawLogo';

/* ===========================
   med_ 헬퍼 함수들
=========================== */

interface StyledSegment {
  text: string;
  hl: boolean;
}

export function med_hexToRgba(hex: string, a = 1): string {
  const s = (hex || '#000').replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function med_measureTextWidth(ctx: CanvasRenderingContext2D, text: string, ls: number): number {
  if (!text) return 0;
  if (Math.abs(ls) <= 0.01) return ctx.measureText(text).width;
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += ctx.measureText(text[i]).width;
    if (i < text.length - 1) w += ls;
  }
  return w;
}

function med_wrapLinesTracking(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, ls: number,
): string[] {
  const paras = (text || '').split('\n'), out: string[] = [];
  for (const p of paras) {
    if (p === '') { out.push(''); continue; }
    const tokens = p.split(/(\s+)/);
    let line = '';
    for (const t of tokens) {
      const test = line + t;
      if (med_measureTextWidth(ctx, test, ls) > maxWidth && line !== '') {
        out.push(line); line = t.trimStart();
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

function med_drawLineWithTracking(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: string, ls: number,
): void {
  if (Math.abs(ls) <= 0.01) {
    const w = ctx.measureText(text).width;
    let sx = x;
    if (align === 'center') sx = x - w / 2;
    if (align === 'right') sx = x - w;
    ctx.fillText(text, sx, y);
    return;
  }
  const w = med_measureTextWidth(ctx, text, ls);
  let sx = x;
  if (align === 'center') sx = x - w / 2;
  if (align === 'right') sx = x - w;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    ctx.fillText(ch, sx, y);
    sx += ctx.measureText(ch).width + ls;
  }
}

function med_drawLines(
  ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lh: number, align: string, ls: number,
): void {
  for (const ln of lines) {
    med_drawLineWithTracking(ctx, ln, x, y, align, ls);
    y += lh;
  }
}

function med_parseStyledSegments(text: string): StyledSegment[] {
  if (!text) return [{ text: '', hl: false }];
  const out: StyledSegment[] = [];
  let buf = '';
  let inBrace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{' || ch === '}') {
      if (buf) { out.push({ text: buf, hl: inBrace }); buf = ''; }
      if (ch === '{') inBrace = true; else inBrace = false;
      continue;
    }
    buf += ch;
  }
  if (buf) out.push({ text: buf, hl: inBrace });
  return out;
}

function med_splitSegmentsByWhitespace(segments: StyledSegment[]): StyledSegment[] {
  const out: StyledSegment[] = [];
  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/);
    for (const p of parts) {
      if (p === '') continue;
      out.push({ text: p, hl: seg.hl });
    }
  }
  return out;
}

function med_measureSegmentsWidth(ctx: CanvasRenderingContext2D, segs: StyledSegment[], ls: number): number {
  let w = 0;
  for (const s of segs) w += med_measureTextWidth(ctx, s.text, ls);
  return w;
}

function med_wrapStyledSegments(
  ctx: CanvasRenderingContext2D, segments: StyledSegment[], maxWidth: number, ls: number,
): StyledSegment[][] {
  const tokens = med_splitSegmentsByWhitespace(segments);
  const lines: StyledSegment[][] = [];
  let line: StyledSegment[] = [];
  let width = 0;
  for (const t of tokens) {
    if (/\n/.test(t.text)) { lines.push(line); line = []; width = 0; continue; }
    const tw = med_measureTextWidth(ctx, t.text, ls);
    if (width > 0 && width + tw > maxWidth) {
      lines.push(line); line = [t]; width = tw;
    } else {
      line.push(t); width += tw;
    }
  }
  lines.push(line);
  return lines;
}

function med_drawStyledLine(
  ctx: CanvasRenderingContext2D, segs: StyledSegment[],
  x: number, y: number, align: string, ls: number,
  baseColor: string, accentColor: string | null,
): void {
  const totalW = med_measureSegmentsWidth(ctx, segs, ls);
  let sx = x;
  if (align === 'center') sx = x - totalW / 2;
  if (align === 'right') sx = x - totalW;
  const savedFont = ctx.font;
  for (const s of segs) {
    ctx.fillStyle = s.hl ? (accentColor || baseColor) : baseColor;
    if (s.hl) {
      const parts = savedFont.split(' ');
      if (parts.length >= 3) ctx.font = `bold ${parts[1]} ${parts[2]}`;
    } else {
      ctx.font = savedFont;
    }
    med_drawLineWithTracking(ctx, s.text, sx, y, 'left', ls);
    sx += med_measureTextWidth(ctx, s.text, ls);
  }
  ctx.font = savedFont;
}

function med_drawStyledLines(
  ctx: CanvasRenderingContext2D, lines: StyledSegment[][],
  x: number, y: number, lh: number, align: string, ls: number,
  baseColor: string, accentColor: string | null,
): void {
  for (const line of lines) {
    med_drawStyledLine(ctx, line, x, y, align, ls, baseColor, accentColor);
    y += lh;
  }
}

export function med_roundedRect4(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  rtl: number, rtr: number, rbr: number, rbl: number,
): void {
  const tl = Math.min(rtl, w / 2, h / 2);
  const tr = Math.min(rtr, w / 2, h / 2);
  const br = Math.min(rbr, w / 2, h / 2);
  const bl = Math.min(rbl, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.arcTo(x + w, y, x + w, y + h, tr);
  ctx.arcTo(x + w, y + h, x, y + h, br);
  ctx.arcTo(x, y + h, x, y, bl);
  ctx.arcTo(x, y, x + w, y, tl);
  ctx.closePath();
}


/* ===========================
   drawMedicalLawPage 메인 함수
=========================== */

export function drawMedicalLawPage(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  page: Page,
  bgKeyColor: string,
  firstPageBg?: { img: HTMLImageElement | null; solidColor?: string },
): void {
  // 배경
  const bgLayer = page.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
  const bgImg = bgLayer?.img ?? firstPageBg?.img ?? null;
  const bgSolid = firstPageBg?.solidColor ?? bgLayer?.solidColor ?? '#e8f4f7';
  if (bgImg) {
    const scale = Math.max(canvasW / bgImg.naturalWidth, canvasH / bgImg.naturalHeight);
    const dw = bgImg.naturalWidth * scale, dh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = bgSolid;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // 제목/설명 레이어
  const titleLayer = page.layers.find(l => l.type === 'med-title') as MedTitleLayer | undefined;
  const descLayer  = page.layers.find(l => l.type === 'med-desc')  as MedDescLayer  | undefined;

  const title            = titleLayer?.content      ?? '';
  const titleSize        = titleLayer?.fontSize      ?? 38;
  const titleWeight      = titleLayer?.fontWeight    ?? 700;
  const titleColor       = titleLayer?.color         ?? null;
  const titleAccentColor = titleLayer?.accentColor   ?? null;
  const titleFont        = titleLayer?.font          ?? 'GmarketSans';
  const titleTrack       = titleLayer?.letterSpacing ?? 0;
  const titleLineHeight  = titleLayer?.lineHeight    ?? 1.6;
  const titleAlign       = titleLayer?.align         ?? 'center';

  const desc            = descLayer?.content       ?? '';
  const descSize        = descLayer?.fontSize       ?? 28;
  const descWeight      = descLayer?.fontWeight     ?? 400;
  const descColor       = descLayer?.color          ?? '#555555';
  const descFont        = descLayer?.font           ?? 'GmarketSans';
  const descTrack       = descLayer?.letterSpacing  ?? 0;
  const descLineHeight  = descLayer?.lineHeight     ?? 1.6;
  const descAlign       = descLayer?.align          ?? 'center';

  // 박스 레이어
  const boxLayer = page.layers.find(l => l.type === 'med-box') as MedBoxLayer | undefined;
  const boxX = boxLayer?.x ?? 20;
  const boxY = boxLayer?.y ?? 20;
  const boxW = boxLayer?.w ?? (canvasW - 40);
  const boxH = boxLayer?.h ?? (canvasH - 40);
  const _boxColor    = boxLayer?.boxColor         ?? '#ffffff';
  const _boxAlpha    = boxLayer?.boxAlpha          ?? 0.9;
  const _strokeOn    = boxLayer?.boxStrokeEnabled  ?? false;
  const _strokeW     = boxLayer?.boxStrokeWidth    ?? 2;
  const _strokeColor = boxLayer?.boxStrokeColor    ?? '#e0e0e0';
  const _shadowColor = boxLayer?.shadowColor       ?? '#000000';
  const _shadowAlpha = boxLayer?.shadowAlpha       ?? 0.15;
  const _shadowBlur  = boxLayer?.shadowBlur        ?? 20;
  const _shadowX     = boxLayer?.shadowX           ?? 0;
  const _shadowY     = boxLayer?.shadowY           ?? 8;
  const _rtl = boxLayer?.radiusTL ?? 16;
  const _rtr = boxLayer?.radiusTR ?? 16;
  const _rbr = boxLayer?.radiusBR ?? 16;
  const _rbl = boxLayer?.radiusBL ?? 16;
  const padL = boxLayer?.padL ?? 20;
  const padR = boxLayer?.padR ?? 20;
  const padT = boxLayer?.padT ?? 35;
  const padB = boxLayer?.padB ?? 35;

  // 박스 그림자
  ctx.save();
  ctx.shadowColor = med_hexToRgba(_shadowColor, _shadowAlpha);
  ctx.shadowBlur = _shadowBlur;
  ctx.shadowOffsetX = _shadowX;
  ctx.shadowOffsetY = _shadowY;
  ctx.fillStyle = med_hexToRgba(_boxColor, _boxAlpha);
  med_roundedRect4(ctx, boxX, boxY, boxW, boxH, _rtl, _rtr, _rbr, _rbl);
  ctx.fill();
  ctx.restore();

  // 박스 획
  if (_strokeOn && _strokeW > 0) {
    ctx.save();
    ctx.strokeStyle = med_hexToRgba(_strokeColor, 1);
    ctx.lineWidth = _strokeW;
    med_roundedRect4(ctx, boxX + 1, boxY + 1, boxW - 2, boxH - 2, _rtl, _rtr, _rbr, _rbl);
    ctx.stroke();
    ctx.restore();
  }

  // 클리핑 후 텍스트
  ctx.save();
  med_roundedRect4(ctx, boxX, boxY, boxW, boxH, _rtl, _rtr, _rbr, _rbl);
  ctx.clip();

  const innerX = boxX + padL, innerY = boxY + padT, innerW = boxW - padL - padR, innerH = boxH - padT - padB;
  ctx.textBaseline = 'top';

  ctx.font = `${titleWeight} ${titleSize}px "${titleFont}", system-ui, sans-serif`;
  const titleSegs = med_parseStyledSegments(title);
  const wrappedTitle = med_wrapStyledSegments(ctx, titleSegs, innerW, titleTrack);
  const titleH = wrappedTitle.length * titleSize * titleLineHeight;

  ctx.font = `${descWeight} ${descSize}px "${descFont}", system-ui, sans-serif`;
  const descLines = med_wrapLinesTracking(ctx, desc, innerW, descTrack);
  const descH = descLines.length * descSize * descLineHeight;

  const gap = desc ? descSize * 0.8 : 0;
  let ty = innerY + (innerH - (titleH + gap + descH)) / 2;

  ctx.font = `${titleWeight} ${titleSize}px "${titleFont}", system-ui, sans-serif`;
  const _titleColor = titleColor || calcAutoFillColor(bgSolid || bgKeyColor);
  ctx.fillStyle = _titleColor;
  let titleTx = innerX + innerW / 2;
  if (titleAlign === 'left') titleTx = innerX;
  if (titleAlign === 'right') titleTx = innerX + innerW;
  med_drawStyledLines(ctx, wrappedTitle, titleTx, ty, titleSize * titleLineHeight, titleAlign, titleTrack, _titleColor, titleAccentColor || null);
  ty += titleH + gap;

  ctx.font = `${descWeight} ${descSize}px "${descFont}", system-ui, sans-serif`;
  ctx.fillStyle = descColor;
  let descTx = innerX + innerW / 2;
  if (descAlign === 'left') descTx = innerX;
  if (descAlign === 'right') descTx = innerX + innerW;
  med_drawLines(ctx, descLines, descTx, ty, descSize * descLineHeight, descAlign, descTrack);
  ctx.restore();

  // 로고: LogoLayer에서 읽어 drawLogo로 렌더
  const logoLayer = page.layers.find(l => l.type === 'logo') as LogoLayer | undefined;
  if (logoLayer?.img) {
    ctx.save();
    drawLogo(ctx, logoLayer, bgKeyColor, false);
    ctx.restore();
  }
}
