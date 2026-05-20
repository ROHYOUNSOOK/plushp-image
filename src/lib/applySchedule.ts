/* ===========================
   applySchedule — 스케줄 적용 순수 함수
   editorStore.ts에서 분리
=========================== */

import type { Page } from '@/types/page';
import type { TextboxLayer, LogoLayer, ImageLayer, FrameLayer, BackgroundLayer, MedBoxLayer, MedTitleLayer, MedDescLayer } from '@/types/layer';
import { makeLayer } from '@/lib/layerFactory';
import { calcTextboxPos } from '@/lib/utils';
import { applyDoctorCardTemplate, IMG_H_PRESETS, Y_OFFSETS } from '@/lib/doctorCardTemplate';
import { calcAutoFillColor, calcShadowColor } from '@/lib/colorHelpers';
import { W, H, ML_H } from '@/types/constants';

const TB_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
type TbCorner = typeof TB_CORNERS[number];
const OPPOSITE_CORNER: Record<TbCorner, TbCorner> = {
  'top-left': 'bottom-right', 'top-right': 'bottom-left',
  'bottom-left': 'top-right', 'bottom-right': 'top-left',
};
const LOGO_MARGIN = 30;

function calcLogoCornerPos(corner: TbCorner, lw: number, lh: number) {
  return {
    x: corner.includes('right') ? W - lw - LOGO_MARGIN : LOGO_MARGIN,
    y: corner.includes('bottom') ? H - lh - LOGO_MARGIN : LOGO_MARGIN,
  };
}

export interface ApplyScheduleParams {
  texts: string[];
  doctors: string[];
  doctorSpecialty: string;
  doctorSpecialties: string[];
  doctorDepartments: string[];
  doctorImageUrls: (string | null)[];
  doctorImages: (HTMLImageElement | null)[];
  frameImages: { img: HTMLImageElement | null; url: string | null }[];
  frameInnerImages?: { img: HTMLImageElement | null; url: string | null }[];
  currentPages: Page[];
}

export function buildSchedulePages({
  texts,
  doctors,
  doctorSpecialty,
  doctorSpecialties,
  doctorDepartments,
  doctorImageUrls,
  doctorImages,
  frameImages,
  frameInnerImages = [],
  currentPages,
}: ApplyScheduleParams): Page[] {
  const textCount = texts.length;
  const hasDoctors = doctors.length > 0;
  const totalCount = textCount + (hasDoctors ? 1 : 0) + 1; // +1 의료법

  // 기존 페이지 재활용 or 추가/제거
  let pages: Page[] = [...currentPages];
  while (pages.length > totalCount) pages = pages.slice(0, -1);
  while (pages.length < totalCount) {
    pages = [...pages, { id: Date.now() + pages.length, name: '', layers: [] }];
  }

  // 새로 추가된 빈 페이지에 page 1 배경 레이어 복사
  const srcBg = pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
  if (srcBg) {
    pages = pages.map(pg =>
      pg.layers.find(l => l.type === 'background')
        ? pg
        : { ...pg, layers: [{ ...srcBg, id: makeLayer('background').id }, ...pg.layers] }
    );
  }

  // 기존 페이지에서 로고 이미지 참조 (이미지 자동 복사용)
  const refLogo = currentPages
    .flatMap(pg => pg.layers)
    .find(l => l.type === 'logo' && (l as LogoLayer).img) as LogoLayer | undefined;

  // 문구 페이지 (0 ~ textCount-1)
  pages = pages.map((pg, i) => {
    if (i >= textCount) return pg;

    const tbCorner = TB_CORNERS[Math.floor(Math.random() * 4)];
    const tbW = 900, tbH = 220;
    const { x: tbX, y: tbY } = calcTextboxPos(tbCorner, tbW, tbH);

    const existingTb = pg.layers.find(l => l.type === 'textbox') as TextboxLayer | undefined;
    const tb: TextboxLayer = {
      ...(existingTb ?? (makeLayer('textbox') as TextboxLayer)),
      content: texts[i],
      positionPreset: tbCorner,
      w: tbW, h: tbH, x: tbX, y: tbY, freePos: false,
    };

    const logoCorner = OPPOSITE_CORNER[tbCorner];
    const existingLogo = pg.layers.find(l => l.type === 'logo') as LogoLayer | undefined;
    const logoBase: LogoLayer = existingLogo ?? (() => {
      const l = makeLayer('logo') as LogoLayer;
      l.stroke = { enabled: true, color: null, width: 3, radius: 0 };
      if (refLogo) { l.img = refLogo.img; l.url = refLogo.url; l.w = refLogo.w; l.h = refLogo.h; }
      return l;
    })();
    const { x: logoX, y: logoY } = calcLogoCornerPos(logoCorner, logoBase.w, logoBase.h);
    const logoLayer: LogoLayer = { ...logoBase, x: logoX, y: logoY };

    const frameMask = frameImages[i] ?? { img: null, url: null };
    const innerImage = frameInnerImages[i] ?? null;
    const existingFrame = pg.layers.find(l => l.type === 'frame') as FrameLayer | undefined;
    const baseFrame = existingFrame ?? (makeLayer('frame') as FrameLayer);
    const innerImg = innerImage?.img ?? null;
    const innerSc = innerImg
      ? Math.max(baseFrame.w / innerImg.naturalWidth, baseFrame.h / innerImg.naturalHeight)
      : baseFrame.imgScale;
    const frameLayer: FrameLayer = {
      ...baseFrame,
      frameMaskImg: frameMask.img ?? existingFrame?.frameMaskImg ?? null,
      frameMaskUrl: frameMask.url ?? existingFrame?.frameMaskUrl ?? null,
      frameMaskProcessed: null,
      _processedMaskKey: undefined,
      img: innerImg,
      url: innerImage?.url ?? null,
      imgScale: innerSc,
      imgOffsetX: innerImg ? (baseFrame.w - innerImg.naturalWidth * innerSc) / 2 : baseFrame.imgOffsetX,
      imgOffsetY: innerImg ? (baseFrame.h - innerImg.naturalHeight * innerSc) / 2 : baseFrame.imgOffsetY,
    };

    const baseLayers = pg.layers.filter(l => l.type !== 'textbox' && l.type !== 'logo' && l.type !== 'frame');

    return {
      ...pg,
      name: '',
      isMedicalLaw: false,
      layers: [...baseLayers, frameLayer, tb, logoLayer],
    };
  });

  // 원장님 페이지
  if (hasDoctors) {
    const doctorPageIdx = textCount;
    const drExistingLogo = pages[doctorPageIdx].layers.find(l => l.type === 'logo') as LogoLayer | undefined;
    const drLogoLayer: LogoLayer = drExistingLogo ?? (() => {
      const l = makeLayer('logo') as LogoLayer;
      l.stroke = { enabled: true, color: null, width: 3, radius: 0 };
      if (refLogo) { l.img = refLogo.img; l.url = refLogo.url; l.w = refLogo.w; l.h = refLogo.h; }
      return l;
    })();

    pages[doctorPageIdx] = {
      ...pages[doctorPageIdx],
      name: '원장님',
      isMedicalLaw: false,
      layers: [
        ...pages[doctorPageIdx].layers.filter(l => l.type !== 'logo' && l.type !== 'textbox' && !(l as unknown as TextboxLayer)._isDoctorCardBg),
        drLogoLayer,
      ],
    };

    const dc = Math.min(Math.max(doctors.length, 1), 4) as 1 | 2 | 3 | 4;
    pages[doctorPageIdx] = applyDoctorCardTemplate(pages[doctorPageIdx], dc, doctors, doctorSpecialty, doctorSpecialties, doctorDepartments);

    if (doctorImages && doctorImages.some(img => img !== null)) {
      pages[doctorPageIdx] = {
        ...pages[doctorPageIdx],
        layers: pages[doctorPageIdx].layers.filter(l => !(l as ImageLayer & { _isDoctorImg?: boolean })._isDoctorImg),
      };

      const doctorCards = pages[doctorPageIdx].layers
        .filter(l => l.type === 'doctor-card')
        .sort((a, b) => a.x - b.x) as (import('@/types/layer').DoctorCardLayer & { _zoneCenter?: number })[];

      const imgH = IMG_H_PRESETS[dc] ?? 630;
      const yOffset = Y_OFFSETS[dc] ?? -20;
      const slotW = Math.floor(1080 / dc);
      const newImgLayers: ImageLayer[] = [];

      for (let i = 0; i < dc; i++) {
        const img = doctorImages[i];
        if (!img) continue;
        const aspect = img.naturalWidth / img.naturalHeight;
        const imgW = Math.round(imgH * aspect);
        const card = doctorCards[i];
        let imgX: number, imgY: number;
        if (card) {
          const centerX = (card as { _zoneCenter?: number })._zoneCenter ?? (card.x + (card.w || 0) / 2);
          imgX = Math.round(centerX - imgW / 2);
          imgY = card.y - imgH + yOffset;
        } else {
          imgX = Math.round(slotW * i + (slotW - imgW) / 2);
          imgY = 1080 - imgH - 160;
        }

        const imgLayer = {
          ...(makeLayer('image') as ImageLayer),
          _isDoctorImg: true,
          name: doctors[i] ?? `원장님 ${i + 1}`,
          img,
          url: doctorImageUrls?.[i] ?? null,
          x: imgX, y: imgY, w: imgW, h: imgH,
          shadow: { enabled: true, color: null, alpha: 0.2, blur: 10, offsetX: 0, offsetY: 20 },
        } as ImageLayer & { _isDoctorImg: boolean };
        newImgLayers.push(imgLayer);
      }

      const tbIdx = pages[doctorPageIdx].layers.findIndex(l => l.type === 'textbox');
      const layersCopy = [...pages[doctorPageIdx].layers];
      layersCopy.splice(tbIdx >= 0 ? tbIdx : layersCopy.length, 0, ...newImgLayers);
      pages[doctorPageIdx] = { ...pages[doctorPageIdx], layers: layersCopy };
    }

    const drExistingTb = pages[doctorPageIdx].layers.find(
      l => l.type === 'textbox' && !(l as TextboxLayer)._isDoctorCardBg
    ) as TextboxLayer | undefined;
    const drTb: TextboxLayer = drExistingTb
      ? { ...drExistingTb, content: doctorSpecialty }
      : {
          ...(makeLayer('textbox') as TextboxLayer),
          content: doctorSpecialty,
          freePos: false,
          positionPreset: 'top-center' as const,
          w: 900, h: 220,
        };
    pages[doctorPageIdx] = {
      ...pages[doctorPageIdx],
      layers: drExistingTb
        ? pages[doctorPageIdx].layers.map(l => l.id === drExistingTb.id ? drTb : l)
        : [...pages[doctorPageIdx].layers, drTb],
    };
  }

  // 의료법 페이지
  const medIdx = totalCount - 1;

  // 로고 레이어
  const medExistingLogo = pages[medIdx].layers.find(l => l.type === 'logo') as LogoLayer | undefined;
  const medLogoLayer: LogoLayer = medExistingLogo ?? (() => {
    const l = makeLayer('logo') as LogoLayer;
    l.stroke = { enabled: true, color: null, width: 3, radius: 0 };
    if (refLogo) { l.img = refLogo.img; l.url = refLogo.url; l.w = refLogo.w; l.h = refLogo.h; }
    return l;
  })();

  // 박스 레이어
  const medExistingBox = pages[medIdx].layers.find(l => l.type === 'med-box') as MedBoxLayer | undefined;
  const medBoxLayer: MedBoxLayer = medExistingBox ?? (makeLayer('med-box') as MedBoxLayer);

  // 제목/설명 레이어
  const medExistingTitle = pages[medIdx].layers.find(l => l.type === 'med-title') as MedTitleLayer | undefined;
  const medTitleLayer: MedTitleLayer = medExistingTitle ?? (makeLayer('med-title') as MedTitleLayer);

  const medExistingDesc = pages[medIdx].layers.find(l => l.type === 'med-desc') as MedDescLayer | undefined;
  const medDescLayer: MedDescLayer = medExistingDesc ?? (makeLayer('med-desc') as MedDescLayer);

  const medBaseLayers = pages[medIdx].layers.filter(
    l => l.type !== 'logo' && l.type !== 'med-box' && l.type !== 'med-title' && l.type !== 'med-desc'
  );
  pages[medIdx] = {
    ...pages[medIdx], name: '의료법', isMedicalLaw: true,
    layers: [...medBaseLayers, medBoxLayer, medTitleLayer, medDescLayer, medLogoLayer],
  };

  // 전체 색상 동기화
  const bgLayer = pages[0]?.layers.find(l => l.type === 'background');
  const bgColor = (bgLayer as { solidColor?: string })?.solidColor ?? '#ffffff';
  const autoColor = calcAutoFillColor(bgColor);
  const shadowColor = calcShadowColor(bgColor);
  pages = pages.map(pg => ({
    ...pg,
    layers: pg.layers.map(l => {
      if (l.type === 'textbox') return { ...l, fillColor: autoColor };
      if (l.type === 'med-title') return { ...l, color: autoColor };
      if (l.type === 'logo' && (l as LogoLayer).stroke?.enabled)
        return { ...l, stroke: { ...(l as LogoLayer).stroke, color: autoColor } };
      if (l.type === 'logo' && (l as LogoLayer).shadow?.enabled)
        return { ...l, shadow: { ...(l as LogoLayer).shadow, color: shadowColor } };
      return l;
    }),
  }));

  return pages;
}
