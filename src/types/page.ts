import type { Layer } from './layer';

/* ── 페이지 ── */

export interface Page {
  id: number;
  name: string;
  layers: Layer[];
  isMedicalLaw?: boolean;
}
