import type { FrameShapeId, LayerType } from './layer';

/* ── 캔버스 크기 ── */
export const W = 1080;
export const H = 1080;
export const ML_H = 380; // 의료법 페이지 높이

/* ── 인터랙션 ── */
export const SNAP = 15;
export const HANDLE_R = 8;
export const MAX_HISTORY = 50;

/* ── 레이어 라벨/아이콘 ── */
export const LAYER_LABELS: Record<LayerType, string> = {
  background: '배경',
  frame: '프레임',
  image: '이미지',
  textbox: '텍스트박스',
  text: '텍스트',
  logo: '로고',
  'doctor-card': '의사 카드',
};

export const LAYER_ICONS: Record<LayerType, string> = {
  background: '🌄',
  frame: '🖼',
  image: '🗃',
  textbox: '📦',
  text: '✏️',
  logo: '🏷',
  'doctor-card': '🩺',
};

/* ── 프레임 도형 목록 ── */
export interface FrameShapeDef {
  id: FrameShapeId;
  icon: string;
  label: string;
}

export const FRAME_SHAPES: FrameShapeDef[] = [
  { id: 'rect', icon: '▭', label: '사각형' },
  { id: 'circle', icon: '○', label: '원' },
  { id: 'triangle', icon: '△', label: '삼각형' },
  { id: 'rhombus', icon: '◇', label: '마름모' },
  { id: 'pentagon', icon: '⬠', label: '오각형' },
  { id: 'hexagon', icon: '⬡', label: '육각형' },
  { id: 'star', icon: '☆', label: '별' },
];
