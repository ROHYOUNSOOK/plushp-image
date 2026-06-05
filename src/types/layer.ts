/* ===========================
   Layer Type Definitions
=========================== */

export type LayerType = 'background' | 'frame' | 'image' | 'textbox' | 'text' | 'logo' | 'doctor-card' | 'med-box' | 'med-title' | 'med-desc';

export type FrameShapeId = 'rect' | 'circle' | 'triangle' | 'rhombus' | 'pentagon' | 'hexagon' | 'star';

export type TextAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'center' | 'bottom';

export type PositionPreset =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | null;

/* ── 공통 서브 타입 ── */

export interface StrokeConfig {
  enabled: boolean;
  color: string | null;
  width: number;
  alpha: number;
}

export interface LogoStrokeConfig {
  enabled: boolean;
  color: string | null;
  width: number;
  radius: number;
}

export interface ShadowConfig {
  enabled: boolean;
  color: string | null;
  alpha: number;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface BorderConfig {
  enabled: boolean;
  color: string;
  width: number;
  alpha: number;
}

export interface BgTransform {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  scale: number;
}

/* ── 레이어 베이스 ── */

interface LayerBase {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  groupId?: string;
}

/* ── 레이어 타입별 정의 ── */

export interface BackgroundLayer extends LayerBase {
  type: 'background';
  img: HTMLImageElement | null;
  url: string | null;
  solidColor: string;
  transform: BgTransform;
}

export interface FrameLayer extends LayerBase {
  type: 'frame';
  x: number; y: number; w: number; h: number;
  radius: number;
  shape: FrameShapeId;
  rotation?: number;
  img: HTMLImageElement | null;
  url: string | null;
  imgOffsetX: number;
  imgOffsetY: number;
  imgScale: number;
  imgRotation: number;
  imgLightness: number;
  imgTemperature: number;
  imgContrast: number;
  imgHighlights: number;
  imgShadows: number;
  imgVibrance: number;
  imgSaturation: number;
  fill: string | null;
  stroke: StrokeConfig;
  opacity: number;
  shadow: ShadowConfig;
  // PNG 마스크
  frameMaskImg?: HTMLImageElement | null;
  frameMaskUrl?: string | null;
  frameMaskProcessed?: HTMLCanvasElement | null; // 배경색 치환된 마스크
  frameType?: string;
  // 내부 캐시 (직렬화 제외)
  _imgFilterCache?: { filterKey: string; url: string | null; canvas: HTMLCanvasElement } | null;
  _holeCanvas?: HTMLCanvasElement | null;
  _holeCacheKey?: string;
  _holeW?: number;
  _holeH?: number;
  _processedMaskKey?: string;
  _maskHasTransparency?: boolean;      // hasTransparentPixels 결과 캐시
  _maskTransparencyUrl?: string | null; // 캐시 키
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  x: number; y: number; w: number; h: number;
  img: HTMLImageElement | null;
  url: string | null;
  opacity: number;
  rotation: number;
  shadow: ShadowConfig;
}

export interface TextboxLayer extends LayerBase {
  type: 'textbox';
  x: number; y: number; w: number; h: number;
  positionPreset: PositionPreset;
  freePos: boolean;
  _isDoctorCardBg?: boolean;
  // PNG 이미지 템플릿
  img: HTMLImageElement | null;
  url: string | null;
  processedImg: HTMLCanvasElement | null;
  fillColor: string | null;
  fillAlpha: number;
  radius: number;
  // 모서리별 둥글기 (미설정 시 radius로 폴백)
  radiusTL?: number;
  radiusTR?: number;
  radiusBR?: number;
  radiusBL?: number;
  autoSize: boolean;
  shadow: ShadowConfig;
  border: BorderConfig;
  content: string;
  font: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  textAlign: TextAlign;
  vAlign: VAlign;
  lineHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  x: number; y: number; w: number; h: number;
  content: string;
  font: string;
  size: number;
  weight: number;
  color: string;
  align: TextAlign;
  lineHeight: number;
}

export interface LogoLayer extends LayerBase {
  type: 'logo';
  x: number; y: number; w: number; h: number;
  img: HTMLImageElement | null;
  url: string | null;
  opacity: number;
  rotation: number;
  stroke: LogoStrokeConfig;
  shadow: ShadowConfig;
}

export interface DoctorCardLayer extends LayerBase {
  type: 'doctor-card';
  x: number; y: number; w: number; h: number;
  img: HTMLImageElement | null;
  imageUrl: string | null;
  subject: string;
  subjectSize: number;
  subjectWeight: number;
  subjectColor: string;
  subjectFont: string;
  doctorName: string;
  nameSize: number;
  nameWeight: number;
  nameColor: string;
  nameFont: string;
  suffixText: string;
  suffixSize: number;
  suffixWeight: number;
  suffixColor: string;
  nameSuffixGap: number;
  specialty: string;
  specialtySize: number;
  specialtyWeight: number;
  specialtyColor: string;
  specialtyFont: string;
  lineGap: number;
  align: TextAlign;
}

export interface MedBoxLayer extends LayerBase {
  type: 'med-box';
  x: number; y: number; w: number; h: number;
  boxColor: string;
  boxAlpha: number;
  boxStrokeEnabled: boolean;
  boxStrokeWidth: number;
  boxStrokeColor: string;
  shadowColor: string;
  shadowAlpha: number;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  radiusTL: number;
  radiusTR: number;
  radiusBR: number;
  radiusBL: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
}

export interface MedTitleLayer extends LayerBase {
  type: 'med-title';
  content: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  color: string | null;
  accentColor: string | null;
  letterSpacing: number;
  lineHeight: number;
  align: TextAlign;
}

export interface MedDescLayer extends LayerBase {
  type: 'med-desc';
  content: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  align: TextAlign;
}

/* ── 유니온 타입 ── */

export type Layer =
  | BackgroundLayer
  | FrameLayer
  | ImageLayer
  | TextboxLayer
  | TextLayer
  | LogoLayer
  | DoctorCardLayer
  | MedBoxLayer
  | MedTitleLayer
  | MedDescLayer;

/* ── 좌표가 있는 레이어 (배경·med텍스트 제외) ── */

export type PositionedLayer = Exclude<Layer, BackgroundLayer | MedTitleLayer | MedDescLayer>;
