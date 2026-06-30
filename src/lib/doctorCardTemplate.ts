/* ===========================
   Doctor Card Template — 1~4인 자동 배치
   — 원본: plus_page_spread_통합.html 1814~1910행
=========================== */

import type { DoctorCardLayer, TextboxLayer, Layer } from '@/types/layer';
import { W, H } from '@/types/constants';
import { uid } from './utils';
import { makeLayer } from './layerFactory';
import type { Page } from '@/types/page';

const MARGIN = 40;
const MARGIN_4 = 10;

const PRESETS: Record<number, { subjectSize: number; nameSize: number; suffixSize: number; specialtySize: number; lineGap: number }> = {
  1: { subjectSize: 30, nameSize: 80, suffixSize: 40, specialtySize: 28, lineGap: 16 },
  2: { subjectSize: 26, nameSize: 72, suffixSize: 38, specialtySize: 24, lineGap: 14 },
  3: { subjectSize: 22, nameSize: 60, suffixSize: 32, specialtySize: 20, lineGap: 12 },
  4: { subjectSize: 20, nameSize: 56, suffixSize: 30, specialtySize: 18, lineGap: 11 },
};

/** 인원수별 이미지 높이 프리셋 (원본 HTML과 동일) */
export const IMG_H_PRESETS: Record<number, number> = { 1: 920, 2: 820, 3: 730, 4: 680 };
export const Y_OFFSETS: Record<number, number> = { 1: 80, 2: 80, 3: 30, 4: -30 };

export function applyDoctorCardTemplate(
  page: Page,
  count: 1 | 2 | 3 | 4,
  doctorNames?: string[],
  doctorSpecialty?: string,
  doctorSpecialties?: string[],
  doctorDepartments?: string[],
): Page {
  const p = PRESETS[count];
  const margin = count === 4 ? MARGIN_4 : MARGIN;
  const usableW = W - margin * 2;
  const zoneW = usableW / count;

  // 기존 카드 x순 정렬
  let cards = page.layers
    .filter((l): l is DoctorCardLayer => l.type === 'doctor-card')
    .sort((a, b) => a.x - b.x);

  let layers = [...page.layers];

  // 부족한 카드 생성 (마지막 카드 복제 or 기본값)
  const need = count - cards.length;
  if (need > 0) {
    const template = cards.at(-1) ?? null;
    for (let i = 0; i < need; i++) {
      const newCard: DoctorCardLayer = template
        ? { ...template, id: uid(), name: `의사 카드 ${cards.length + i + 1}` }
        : { ...(makeLayer('doctor-card') as DoctorCardLayer), id: uid(), name: `의사 카드 ${cards.length + i + 1}` };
      layers.push(newCard);
      cards.push(newCard);
    }
  }

  // 초과 카드 제거
  if (cards.length > count) {
    const excessIds = new Set(cards.slice(count).map(l => l.id));
    layers = layers.filter(l => !excessIds.has(l.id));
    cards = cards.slice(0, count);
  }

  // 텍스트 너비 측정용 임시 캔버스
  const tmpCanvas = document.createElement('canvas');
  const tmpCtx = tmpCanvas.getContext('2d')!;

  // 카드 재배치
  const updatedCards: DoctorCardLayer[] = cards.map((l, i) => {
    const card: DoctorCardLayer = { ...l };
    if (doctorNames && doctorNames[i]) {
      card.doctorName = doctorNames[i];
      card.name = doctorNames[i];
    }
    // 진료과목은 의사 진료과(department)만 따름 — 없으면 빈 값 (페이지 제목·기본값 따라가지 않음)
    card.subject = (doctorDepartments && doctorDepartments[i]) ? doctorDepartments[i] : '';
    if (doctorSpecialties && doctorSpecialties[i]) card.specialty = doctorSpecialties[i];
    card.subjectSize = p.subjectSize;
    card.nameSize = p.nameSize;
    card.suffixSize = p.suffixSize;
    card.specialtySize = p.specialtySize;
    card.lineGap = p.lineGap;

    // 최대 텍스트 너비 측정
    let maxW = 0;
    if ((card.subject || '').trim()) {
      tmpCtx.font = `${card.subjectWeight || 400} ${p.subjectSize}px ${card.subjectFont || 'GmarketSans'}`;
      maxW = Math.max(maxW, tmpCtx.measureText(card.subject).width);
    }
    if ((card.doctorName || '').trim()) {
      tmpCtx.font = `${card.nameWeight || 700} ${p.nameSize}px ${card.nameFont || 'GmarketSans'}`;
      const nw = tmpCtx.measureText(card.doctorName).width;
      tmpCtx.font = `${card.suffixWeight || 700} ${p.suffixSize}px ${card.nameFont || 'GmarketSans'}`;
      const sfxW = tmpCtx.measureText(card.suffixText || '원장').width;
      maxW = Math.max(maxW, nw + (card.nameSuffixGap || 8) + sfxW);
    }
    if ((card.specialty || '').trim()) {
      tmpCtx.font = `${card.specialtyWeight || 400} ${p.specialtySize}px ${card.specialtyFont || 'GmarketSans'}`;
      maxW = Math.max(maxW, tmpCtx.measureText(card.specialty).width);
    }

    // 구역 중앙에 배치 — _zoneCenter 저장 (이미지 배치 시 참조)
    const zoneStart = margin + i * zoneW;
    const zoneCenter = zoneStart + zoneW / 2;
    card.x = Math.round(zoneCenter - maxW / 2);
    (card as DoctorCardLayer & { _zoneCenter: number })._zoneCenter = zoneCenter;

    // 하단 기준 y 계산
    let actualH = p.nameSize;
    if ((card.subject || '').trim()) actualH += p.subjectSize + p.lineGap;
    if ((card.specialty || '').trim()) actualH += p.lineGap + p.specialtySize;
    card.y = H - MARGIN - actualH;

    return card;
  });

  // layers에서 카드 교체
  const updatedCardIds = new Set(updatedCards.map(c => c.id));
  layers = layers.map(l =>
    updatedCardIds.has(l.id) ? (updatedCards.find(c => c.id === l.id) as Layer) : l
  );

  // 기존 배경박스 제거
  layers = layers.filter(l => !(l as TextboxLayer)._isDoctorCardBg);

  // 배경 텍스트박스 생성
  const minCardY = Math.min(...updatedCards.map(c => c.y));
  const bgLayer: TextboxLayer = {
    id: uid(),
    type: 'textbox',
    name: '의사카드 배경',
    visible: true,
    locked: false,
    _isDoctorCardBg: true,
    x: 0, y: minCardY - 40, w: W, h: 250,
    positionPreset: null,
    freePos: true,
    img: null, url: null, processedImg: null,
    fillColor: null, fillAlpha: 1, radius: 0, autoSize: false,
    shadow: { enabled: false, color: null, alpha: 0.2, blur: 10, offsetX: 0, offsetY: 20 },
    border: { enabled: false, color: '#ffffff', width: 2, alpha: 1 },
    content: '', font: 'GmarketSans', fontSize: 1, fontWeight: '700',
    textColor: '#ffffff', textAlign: 'left', vAlign: 'center', lineHeight: 1,
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  };

  // 첫 번째 의사카드 앞에 삽입
  const firstCardIdx = layers.findIndex(l => l.type === 'doctor-card');
  if (firstCardIdx >= 0) {
    layers.splice(firstCardIdx, 0, bgLayer);
  } else {
    layers.push(bgLayer);
  }

  return { ...page, layers };
}
