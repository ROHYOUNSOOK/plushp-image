/* ===========================
   Layer Factory
   — 원본: plus_page_spread_통합.html 1532~1587행
=========================== */

import type { Layer, LayerType } from '@/types/layer';
import { W, H, ML_H, LAYER_LABELS } from '@/types/constants';
import { uid, calcTextboxPos } from './utils';

/** 레이어 타입별 기본값으로 새 레이어 생성 */
export function makeLayer(type: LayerType): Layer {
  const base = { id: uid(), type, name: LAYER_LABELS[type], visible: true, locked: false };

  switch (type) {
    case 'background':
      return {
        ...base, type: 'background',
        img: null, url: null, solidColor: '#4aabb8',
        transform: { rotation: 0, flipH: false, flipV: false, scale: 1.01 },
      };

    case 'frame':
      return {
        ...base, type: 'frame',
        x: 0, y: 0, w: W, h: H, radius: 0, shape: 'rect',
        img: null, url: null,
        imgOffsetX: 0, imgOffsetY: 0, imgScale: 1, imgRotation: 0,
        imgLightness: 0, imgTemperature: 0,
        imgContrast: 0, imgHighlights: 0, imgShadows: 0, imgVibrance: 0, imgSaturation: 0,
        fill: null,
        stroke: { enabled: false, color: '#111111', width: 3, alpha: 1 },
        opacity: 1,
        shadow: { enabled: false, color: null, alpha: 0.2, blur: 10, offsetX: 0, offsetY: 20 },
      };

    case 'image':
      return {
        ...base, type: 'image',
        x: 100, y: 100, w: 880, h: 880,
        img: null, url: null, opacity: 1, rotation: 0,
        shadow: { enabled: false, color: null, alpha: 0.2, blur: 10, offsetX: 0, offsetY: 20 },
      };

    case 'textbox': {
      const preset = 'bottom-left' as const;
      const w = 900, h = 220;
      const { x, y } = calcTextboxPos(preset, w, h);
      return {
        ...base, type: 'textbox',
        name: '텍스트박스', positionPreset: preset, w, h, x, y, freePos: false,
        img: null, url: null, processedImg: null,
        fillColor: null, fillAlpha: 1, radius: 0, autoSize: true,
        shadow: { enabled: false, color: null, alpha: 0.2, blur: 10, offsetX: 0, offsetY: 20 },
        border: { enabled: false, color: '#ffffff', width: 2, alpha: 1 },
        content: '텍스트를 입력하세요', font: 'GmarketSans', fontSize: 110, fontWeight: '900',
        textColor: '#ffffff', textAlign: 'left', vAlign: 'center', lineHeight: 1,
        paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20,
      };
    }

    case 'text':
      return {
        ...base, type: 'text',
        x: 80, y: 420, w: 920, h: 220,
        content: '텍스트를 입력하세요', font: 'Pretendard', size: 80, weight: 700,
        color: '#000000', align: 'center', lineHeight: 1.3,
      };

    case 'logo':
      return {
        ...base, type: 'logo',
        x: 30, y: 30, w: 70, h: 70,
        img: null, url: null, opacity: 1, rotation: 0,
        stroke: { enabled: true, color: null, width: 3, radius: 0 },
        shadow: { enabled: false, color: null, alpha: 0.4, blur: 5, offsetX: 0, offsetY: 5 },
      };

    case 'med-box':
      return {
        ...base, type: 'med-box',
        x: 20, y: 20, w: W - 40, h: ML_H - 40,
        boxColor: '#ffffff', boxAlpha: 0.9,
        boxStrokeEnabled: false, boxStrokeWidth: 2, boxStrokeColor: '#e0e0e0',
        shadowColor: '#000000', shadowAlpha: 0.15, shadowBlur: 20, shadowX: 0, shadowY: 8,
        radiusTL: 16, radiusTR: 16, radiusBR: 16, radiusBL: 16,
        padL: 20, padR: 20, padT: 35, padB: 35,
      };

    case 'med-title':
      return {
        ...base, type: 'med-title',
        content: '본 포스팅은 본원에서\n의료법 제 56조 1항을 준수하여 직접 작성한 게시물입니다.',
        font: 'GmarketSans', fontSize: 38, fontWeight: 700,
        color: null, accentColor: '#e02020',
        letterSpacing: 0, lineHeight: 1.6, align: 'center' as const,
      };

    case 'med-desc':
      return {
        ...base, type: 'med-desc',
        content: '모든 시술 및 수술 후에는 개인에 따라 염증, 출혈, 신경 손상 등의\n부작용이 발생할 수 있으므로 의료진과 충분한 상담을 권장드립니다.',
        font: 'GmarketSans', fontSize: 28, fontWeight: 400,
        color: '#555555',
        letterSpacing: 0, lineHeight: 1.6, align: 'center' as const,
      };

    case 'doctor-card':
      return {
        ...base, type: 'doctor-card',
        name: '의사 카드',
        x: 60, y: 830, w: 960, h: 200,
        img: null, imageUrl: null,
        subject: '척추중점진료',
        subjectSize: 30, subjectWeight: 400, subjectColor: '#ffffff', subjectFont: 'GmarketSans',
        doctorName: '강석봉',
        nameSize: 80, nameWeight: 700, nameColor: '#ffffff', nameFont: 'GmarketSans',
        suffixText: '원장',
        suffixSize: 40, suffixWeight: 700, suffixColor: '#ffffff',
        nameSuffixGap: 8,
        specialty: '정형외과/스포츠의학과 전문의',
        specialtySize: 30, specialtyWeight: 400, specialtyColor: '#ffffff', specialtyFont: 'GmarketSans',
        lineGap: 16, align: 'center',
      };
  }
}
