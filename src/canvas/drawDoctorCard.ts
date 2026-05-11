/* ===========================
   Doctor Card Layer Drawing
   — 원본: plus_page_spread_통합.html 3033~3113행
=========================== */

import type { DoctorCardLayer } from '@/types/layer';


/**
 * 의사 카드 그리기.
 * 주의: 이 함수는 layer.w, layer.h를 렌더링 중 직접 변경함 (side effect).
 * 향후 리팩터링 시 계산된 크기를 반환하고 외부에서 업데이트하는 방식으로 분리 권장.
 */
export function drawDoctorCard(ctx: CanvasRenderingContext2D, layer: DoctorCardLayer): void {
  const {
    x, y,
    subject = '', subjectSize = 36, subjectWeight = 700, subjectColor = '#333333', subjectFont = 'Pretendard',
    doctorName = '', nameSize = 80, nameWeight = 900, nameColor = '#111111', nameFont = 'Pretendard',
    suffixText = '원장', suffixSize = 44, suffixWeight = 700, suffixColor = '#111111',
    nameSuffixGap = 8,
    specialty = '', specialtySize = 36, specialtyWeight = 400, specialtyColor = '#555555', specialtyFont = 'Pretendard',
    lineGap = 16, align = 'left',
  } = layer;

  // ── 텍스트 너비 자동 계산 ──
  let maxW = 0;
  if (subject.trim()) {
    ctx.font = `${subjectWeight} ${subjectSize}px ${subjectFont}`;
    maxW = Math.max(maxW, ctx.measureText(subject).width);
  }
  if (doctorName.trim()) {
    ctx.font = `${nameWeight} ${nameSize}px ${nameFont}`;
    const nw = ctx.measureText(doctorName).width;
    ctx.font = `${suffixWeight} ${suffixSize}px ${nameFont}`;
    const sfxW2 = suffixText ? ctx.measureText(suffixText).width : 0;
    maxW = Math.max(maxW, nw + (suffixText ? nameSuffixGap + sfxW2 : 0));
  }
  if (specialty.trim()) {
    ctx.font = `${specialtyWeight} ${specialtySize}px ${specialtyFont}`;
    maxW = Math.max(maxW, ctx.measureText(specialty).width);
  }
  const w = Math.ceil(maxW) || layer.w || 10;
  layer.w = w;

  ctx.textBaseline = 'top';
  let curY = y;

  // ── 1. 진료과목 ──
  if (subject.trim()) {
    ctx.font = `${subjectWeight} ${subjectSize}px ${subjectFont}`;
    ctx.fillStyle = subjectColor;
    const sw = ctx.measureText(subject).width;
    const sx = align === 'center' ? x + w / 2 - sw / 2 : align === 'right' ? x + w - sw : x;
    ctx.fillText(subject, sx, curY);
    curY += subjectSize + lineGap;
  }

  // ── 2. 원장이름 + suffix ──
  if (doctorName.trim()) {
    ctx.font = `${nameWeight} ${nameSize}px ${nameFont}`;
    const nameW = ctx.measureText(doctorName).width;
    ctx.font = `${suffixWeight} ${suffixSize}px ${nameFont}`;
    const sfxW = suffixText ? ctx.measureText(suffixText).width : 0;
    const totalW = nameW + (suffixText ? nameSuffixGap + sfxW : 0);
    const nameX = align === 'center' ? x + w / 2 - totalW / 2 : align === 'right' ? x + w - totalW : x;

    ctx.font = `${nameWeight} ${nameSize}px ${nameFont}`;
    ctx.fillStyle = nameColor;
    ctx.fillText(doctorName, nameX, curY);

    if (suffixText) {
      ctx.font = `${suffixWeight} ${suffixSize}px ${nameFont}`;
      ctx.fillStyle = suffixColor;
      const sfxY = curY + (nameSize - suffixSize);
      ctx.fillText(suffixText, nameX + nameW + nameSuffixGap, sfxY);
    }
    curY += nameSize + lineGap;
  }

  // ── 3. 전문의 ──
  if (specialty.trim()) {
    ctx.font = `${specialtyWeight} ${specialtySize}px ${specialtyFont}`;
    ctx.fillStyle = specialtyColor;
    const spw = ctx.measureText(specialty).width;
    const spx = align === 'center' ? x + w / 2 - spw / 2 : align === 'right' ? x + w - spw : x;
    ctx.fillText(specialty, spx, curY);
    curY += specialtySize;
  }

  // 높이 자동 업데이트
  layer.h = Math.max(curY - y, 10);
}
