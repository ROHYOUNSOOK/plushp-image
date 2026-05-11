/* ===========================
   Color Utility Functions
   — 원본: plus_page_spread_통합.html 1384~1516행
=========================== */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

export function darkenHex(hex: string, amount = 30): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

export function lightenHex(hex: string, amount = 30): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + amount));
}

/** 배경 밝기에 따라 텍스트박스 배경색 계산 */
export function calcAutoFillColor(bgHex: string): string {
  const { h, s, l } = hexToHsl(bgHex);
  let targetL: number;
  if (l > 60) targetL = 20;
  else if (l < 40) targetL = 75;
  else targetL = 25;
  const targetS = Math.min(100, Math.max(40, s));
  return hslToHex(h, targetS, targetL);
}

/** 그림자/외곽선색: calcAutoFillColor보다 밝기 +10, 채도 +15 */
export function calcShadowColor(bgHex: string): string {
  const { h, s, l } = hexToHsl(bgHex);
  let targetL: number;
  if (l > 60) targetL = 30;
  else if (l < 40) targetL = 85;
  else targetL = 40;
  const targetS = Math.min(100, Math.max(50, s + 15));
  return hslToHex(h, targetS, targetL);
}

/** 프레임 배경색: 배경 색상 계열 + 높은 밝기 (연한 계열) */
export function calcFrameFillColor(bgHex: string): string {
  const { h, s, l } = hexToHsl(bgHex);
  const targetL = Math.min(88, l + 45);
  const targetS = Math.max(10, s * 0.45);
  return hslToHex(h, targetS, targetL);
}

/** RGB → HSL (0-360, 0-100, 0-100) */
export function rgbToHslArr(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

/** HSL (0-360, 0-100, 0-100) → RGB (0-255) */
export function hslToRgbArr(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** 이미지에서 지배 색상 픽셀 샘플링 추출 (채도 + 중앙 가중치, 알파 포함) */
export function extractDominantColor(img: HTMLImageElement): string {
  const size = 200;
  const oc = document.createElement('canvas');
  oc.width = oc.height = size;
  const ox = oc.getContext('2d')!;
  ox.drawImage(img, 0, 0, size, size);
  const data = ox.getImageData(0, 0, size, size).data;

  const cx = size / 2, cy = size / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const colorWeights: Record<string, { r: number; g: number; b: number; w: number }> = {};

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

      if (a < 128) continue; // 투명 픽셀 제외
      const brightness = (r + g + b) / 3;
      if (brightness < 20 || brightness > 235) continue;

      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const centerW = 1 - (dist / maxDist) * 0.5;

      // 채도 계산 (간이)
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const finalW = centerW * (0.5 + saturation * 0.5);

      const key = `${Math.floor(r / 5) * 5},${Math.floor(g / 5) * 5},${Math.floor(b / 5) * 5}`;
      if (!colorWeights[key]) colorWeights[key] = { r: 0, g: 0, b: 0, w: 0 };
      colorWeights[key].r += r * finalW;
      colorWeights[key].g += g * finalW;
      colorWeights[key].b += b * finalW;
      colorWeights[key].w += finalW;
    }
  }

  let maxW = 0, dr = 74, dg = 171, db = 184;
  for (const key in colorWeights) {
    const cw = colorWeights[key];
    if (cw.w > maxW) {
      maxW = cw.w;
      dr = Math.round(cw.r / cw.w);
      dg = Math.round(cw.g / cw.w);
      db = Math.round(cw.b / cw.w);
    }
  }
  return '#' + [dr, dg, db].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * 이미지에 투명 픽셀이 있는지 확인 (PNG 마스크 여부 판별용)
 * 투명 픽셀이 없으면 일반 사진이므로 색상 치환 불필요
 */
export function hasTransparentPixels(img: HTMLImageElement): boolean {
  const c = document.createElement('canvas');
  c.width = Math.min(img.naturalWidth, 100);
  c.height = Math.min(img.naturalHeight, 100);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) return true;
  }
  return false;
}

/**
 * 텍스트박스 PNG 이미지의 채도 높은 컬러 요소를 targetHex 색상으로 치환
 * — 원본 카드뉴스 replaceTextBoxColors 로직 포팅
 */
export function replaceTextboxImageColors(
  img: HTMLImageElement,
  targetHex: string,
): HTMLCanvasElement {
  const [th, ts, tl] = rgbToHslArr(...((): [number, number, number] => {
    const { r, g, b } = hexToRgb(targetHex);
    return [r, g, b];
  })());

  const oc = document.createElement('canvas');
  oc.width = img.naturalWidth;
  oc.height = img.naturalHeight;
  const ctx = oc.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const id = ctx.getImageData(0, 0, oc.width, oc.height);
  const data = id.data;

  // 채도 높은 픽셀 수집 + dominant hue 탐색
  const colorPixels: { i: number; h: number; s: number; l: number }[] = [];
  const hueCount: Record<number, number> = {};
  let maxHueCount = 0, dominantHue = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;
    const [h, s, l] = rgbToHslArr(data[i], data[i + 1], data[i + 2]);
    if (s < 30) continue; // 무채색 제외
    colorPixels.push({ i, h, s, l });
    const hk = Math.floor(h / 10) * 10;
    hueCount[hk] = (hueCount[hk] || 0) + 1;
    if (hueCount[hk] > maxHueCount) { maxHueCount = hueCount[hk]; dominantHue = hk; }
  }

  // dominant hue 범위(±30°) 픽셀만 목표 색으로 치환
  colorPixels.forEach(({ i, h, s, l }) => {
    const diff = Math.abs(h - dominantHue);
    if (diff >= 30 && diff <= 330) return; // 허용 범위 밖
    const blendedS = ts * 0.9 + s * 0.1;
    const blendedL = tl * 0.5 + l * 0.5;
    const [nr, ng, nb] = hslToRgbArr(th, blendedS, blendedL);
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  });

  ctx.putImageData(id, 0, 0);
  return oc;
}
