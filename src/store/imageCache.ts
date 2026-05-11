/* ===========================
   Image Cache Singleton
   — HTMLImageElement는 Zustand 스토어에 넣으면 안 됨 (직렬화 불가)
   — 이 Map에만 보관하고, 스토어에는 url(string)만 저장
   — 원본: plus_page_spread_통합.html 1338행
=========================== */

/** 레이어 ID + 접미사 → HTMLImageElement 매핑 */
const _imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(key: string): HTMLImageElement | null {
  return _imageCache.get(key) ?? null;
}

export function setCachedImage(key: string, img: HTMLImageElement): void {
  _imageCache.set(key, img);
}

export function deleteCachedImage(key: string): void {
  _imageCache.delete(key);
}

export function clearImageCache(): void {
  _imageCache.clear();
}

export default _imageCache;
