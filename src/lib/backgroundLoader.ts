import { toProxyUrl } from './supabase';

const BG_BUCKET = `http://158.247.227.8/image/original-images/Cardnews_image/background_image`;

async function listFilesFromDir(dirUrl: string): Promise<string[]> {
  try {
    const res = await fetch(toProxyUrl(dirUrl + '/'));
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+\.(?:png|jpg|jpeg|webp))"/gi)];
    return matches.map(m => m[1]);
  } catch {
    return [];
  }
}

export async function pickRandomBackground(): Promise<{ img: HTMLImageElement; url: string }> {
  const files = await listFilesFromDir(BG_BUCKET);
  if (files.length === 0) throw new Error('배경 이미지 없음');
  const file = files[Math.floor(Math.random() * files.length)];
  const url = `${BG_BUCKET}/${file}`;
  const res = await fetch(toProxyUrl(url));
  if (!res.ok) throw new Error(`이미지 로드 실패: ${url}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  // 원본 이미지를 그대로 사용 (랜덤 색조 제거 — 저장된 배경과 항상 일치하도록)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = blobUrl;
  });
  return { img, url };
}
