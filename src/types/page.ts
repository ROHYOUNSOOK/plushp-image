import type { Layer } from './layer';

/* ── 의료법 페이지 로고 설정 ── */

export interface MedLogoConfig {
  img: HTMLImageElement | null;
  url?: string | null;
  xPct: number;
  yPct: number;
  sizePct: number;
  strokeEnabled: boolean;
  strokeWidth: number;
  strokeColor: string | null;
}

/* ── 의료법 페이지 전체 설정 ── */

export interface MedConfig {
  marginX: number;
  marginY: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  boxAlpha: number;
  boxColor: string;
  boxStrokeEnabled: boolean;
  boxStrokeWidth: number;
  boxStrokeColor: string;
  midFillEnabled: boolean;
  midFillColor: string;
  shadowAlpha: number;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  shadowColor: string;
  radiusTL: number;
  radiusTR: number;
  radiusBR: number;
  radiusBL: number;
  title: string;
  desc: string;
  titleSize: number;
  titleWeight: number;
  titleColor: string | null;
  titleAccentColor: string | null;
  titleFont: string;
  titleTrack: number;
  descSize: number;
  descWeight: number;
  descColor: string;
  descFont: string;
  descTrack: number;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  titleLineHeight: number;
  descLineHeight: number;
  bgColor?: string;
  bgImg?: HTMLImageElement | null;
  bgUrl?: string | null;
  logo: MedLogoConfig | null;
}

/* ── 페이지 ── */

export interface Page {
  id: number;
  name: string;
  layers: Layer[];
  isMedicalLaw?: boolean;
  medConfig?: MedConfig;
}
